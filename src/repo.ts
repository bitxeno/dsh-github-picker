/**
 * Workspace repository identity resolution: parse the owner/repo pair from
 * the workspace's git remote URL (https, ssh, git@ forms) or honor the
 * settings override. Resolution results are cached per workspace for the
 * configured TTL because the git child process is expensive; the # picker
 * and the pre-step mention marker share this resolver.
 */
import { execFile } from 'node:child_process'
import type { GitHubRepoRef } from './contract.ts'

/** One git remote URL form the parser understands. */
export type RemoteUrlForm = 'https' | 'ssh' | 'git-at' | 'git-protocol'

/** The parsed identity of one git remote URL, or undefined when it is not GitHub. */
export interface ParsedRemote {
  readonly owner: string
  readonly name: string
}

/** Strip a trailing `.git` and a trailing slash from a repository path. */
function normalizeRepoPath(path: string): string {
  let value = path
  if (value.endsWith('.git')) value = value.slice(0, -'.git'.length)
  value = value.replace(/\/+$/u, '')
  return value
}

/** Extract owner/name from a `github.com/owner/name` style path. */
function parseGithubPath(path: string): ParsedRemote | undefined {
  const normalized = normalizeRepoPath(path)
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length < 2) return undefined
  const owner = segments[segments.length - 2] as string
  const name = segments[segments.length - 1] as string
  if (owner === '' || name === '' || name === 'github.com') return undefined
  return { owner, name }
}

/** Parse one git remote URL into the owner/repo pair (GitHub only). */
export function parseRemoteUrl(url: string): ParsedRemote | undefined {
  const trimmed = url.trim()
  if (trimmed === '') return undefined
  // https://github.com/owner/name.git and https://user:token@github.com/...
  const https = /^https?:\/\/(?:[^/@]+@)?github\.com\/(.+)$/iu.exec(trimmed)
  if (https !== null) return parseGithubPath(https[1] as string)
  // git@github.com:owner/name.git
  const gitAt = /^git@github\.com:(.+)$/u.exec(trimmed)
  if (gitAt !== null) return parseGithubPath(gitAt[1] as string)
  // ssh://git@github.com/owner/name.git
  const ssh = /^ssh:\/\/git@github\.com\/(.+)$/u.exec(trimmed)
  if (ssh !== null) return parseGithubPath(ssh[1] as string)
  // git://github.com/owner/name.git
  const gitProtocol = /^git:\/\/github\.com\/(.+)$/u.exec(trimmed)
  if (gitProtocol !== null) return parseGithubPath(gitProtocol[1] as string)
  return undefined
}

/** The `git remote get-url` seam (unit tests stub this). */
export interface RepoCommand {
  run(url: string, cwd: string): Promise<string>
}

/** Real git subprocess seam over `git remote get-url <name>` (runs in the workspace). */
export const gitRemoteCommand: RepoCommand = {
  run(url, cwd) {
    return new Promise((resolve, reject) => {
      execFile('git', ['remote', 'get-url', url], { encoding: 'utf8', cwd }, (error, stdout) => {
        /* v8 ignore next -- requires a real git failure (no remote); the resolver tests stub the seam. */
        if (error !== null) {
          reject(error)
          return
        }
        resolve(stdout.trim())
      })
    })
  },
}

/** One cached resolution entry. */
interface RepoCacheEntry {
  readonly repo: GitHubRepoRef
  readonly at: number
}

/** Resolve the workspace repository, honoring the settings override. */
export class RepoResolver {
  private readonly cache = new Map<string, RepoCacheEntry>()

  /**
   * @param command - the git subprocess seam.
   * @param now - monotonic clock (default Date.now).
   * @param ttlMs - how long one resolution stays cached.
   * @param remoteName - the git remote to query (default 'origin').
   */
  constructor(
    private readonly command: RepoCommand = gitRemoteCommand,
    private readonly now: () => number = () => Date.now(),
    private readonly ttlMs: number = 30_000,
    private readonly remoteName = 'origin',
  ) {}

  /** Drop every cached resolution (host restart / settings change). */
  invalidate(): void {
    this.cache.clear()
  }

  /**
   * Resolve the repository for one workspace directory.
   * @param cwd - the workspace root (agent session header cwd).
   * @param override - settings override ('' = auto).
   * @param signal - caller lifetime.
   * @returns the owner/name pair, or undefined when nothing resolves.
   */
  async resolve(cwd: string, override: string, signal: AbortSignal): Promise<GitHubRepoRef | undefined> {
    const key = `${cwd}\u0000${override}`
    const existing = this.cache.get(key)
    if (existing !== undefined && this.now() - existing.at < this.ttlMs) {
      return existing.repo
    }
    let repo: GitHubRepoRef | undefined
    if (override !== '') {
      const parsed = parseRemoteUrl(override)
      if (parsed !== undefined) repo = parsed
      // The override may be the shorthand `owner/name` (no scheme).
      if (repo === undefined) {
        const shorthand = /^([\w.-]+)\/([\w.-]+)$/u.exec(override)
        if (shorthand !== null) repo = { owner: shorthand[1] as string, name: shorthand[2] as string }
      }
    }
    if (repo === undefined) {
      signal.throwIfAborted()
      const raw = await this.command.run(this.remoteName, cwd).catch(() => '')
      signal.throwIfAborted()
      const parsed = parseRemoteUrl(raw)
      if (parsed !== undefined) repo = parsed
    }
    if (repo === undefined) return undefined
    this.cache.set(key, { repo, at: this.now() })
    return repo
  }
}
