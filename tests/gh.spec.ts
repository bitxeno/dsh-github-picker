/** The gh CLI provider: query building, projection, and error classification. */
import { describe, expect, it, vi } from 'vitest'
import {
  buildQuery,
  classifyGhError,
  ghCommand,
  GhProvider,
  projectItem,
  searchError,
} from '../src/providers/gh.ts'
import type { GitHubRepoRef } from '../src/contract.ts'

const repo: GitHubRepoRef = { owner: 'owner', name: 'name' }

/** A command seam that returns a fixed payload and records the gh args. */
function capturingCommand(stdout: string) {
  const calls: string[][] = []
  return {
    calls,
    command: {
      run: async (args: readonly string[]): Promise<string> => {
        calls.push([...args])
        return stdout
      },
    },
  }
}

describe('buildQuery', () => {
  it('adds the repo clause and recency sort for the empty query', () => {
    expect(buildQuery(repo, '')).toBe('repo:owner/name sort:updated-desc')
  })

  it('scopes typed queries to the repository title and body', () => {
    expect(buildQuery(repo, '  bug  ')).toBe('repo:owner/name bug in:title,body')
  })
})

describe('projectItem', () => {
  it('projects an issue', () => {
    expect(projectItem({ number: 1, title: 't', state: 'open', html_url: 'u' }))
      .toEqual({ number: 1, title: 't', kind: 'issue', state: 'open', url: 'u' })
  })

  it('projects a pull request with its draft flag', () => {
    expect(projectItem({ number: 2, title: 'p', state: 'open', html_url: 'u', pull_request: { draft: true } }))
      .toEqual({ number: 2, title: 'p', kind: 'pr', state: 'open', url: 'u', draft: true })
  })

  it('projects a merged pull request from pull_request.merged_at', () => {
    expect(projectItem({ number: 4, title: 'm', state: 'closed', html_url: 'u', pull_request: { merged_at: '2024-01-01T00:00:00Z' } }))
      .toEqual({ number: 4, title: 'm', kind: 'pr', state: 'closed', url: 'u', merged: true })
  })

  it('ignores an empty merged_at string', () => {
    expect(projectItem({ number: 5, title: 'm', state: 'closed', html_url: 'u', pull_request: { merged_at: '' } }))
      .toEqual({ number: 5, title: 'm', kind: 'pr', state: 'closed', url: 'u' })
  })

  it('normalizes closed state and drops malformed items', () => {
    expect(projectItem({ number: 3, title: 'c', state: 'closed', html_url: 'u' })?.state).toBe('closed')
    expect(projectItem({ number: 0, title: 't', state: 'open', html_url: 'u' })).toBeUndefined()
    expect(projectItem({ number: 1, title: '', state: 'open', html_url: 'u' })).toBeUndefined()
  })
})

describe('classifyGhError', () => {
  it('classifies missing gh, auth, rate limit, repo, and network failures', () => {
    expect(classifyGhError(Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' }))).toBe('gh-missing')
    expect(classifyGhError(new Error('gh: not logged in to github.com'))).toBe('not-authenticated')
    expect(classifyGhError(new Error('API rate limit exceeded for user'))).toBe('rate-limited')
    expect(classifyGhError(new Error('HTTP 404: Not Found'))).toBe('repo-not-found')
    expect(classifyGhError(new Error('fetch failed: ECONNREFUSED'))).toBe('network')
    expect(classifyGhError(new Error('something else'))).toBe('unknown')
  })

  it('falls through a present non-ENOENT code and non-Error values', () => {
    expect(classifyGhError(Object.assign(new Error('boom'), { code: 'EACCES' }))).toBe('unknown')
    expect(classifyGhError('a plain string failure')).toBe('unknown')
  })
})

describe('GhProvider', () => {
  it('returns one bounded page and sends the page argument', async () => {
    const stdout = [
      JSON.stringify({ number: 1, title: 'one', state: 'open', html_url: 'u1', pull_request: null, draft: false }),
      JSON.stringify({ number: 2, title: 'two', state: 'open', html_url: 'u2', pull_request: { draft: false }, draft: false }),
      JSON.stringify({ number: 3, title: 'three', state: 'open', html_url: 'u3', pull_request: null, draft: false }),
    ].join('\n')
    const { command, calls } = capturingCommand(stdout)
    const provider = new GhProvider({ command, perPage: 2, timeoutMs: 1000 })
    const signal = new AbortController().signal
    const page1 = await provider.search(repo, 'bug', 1, signal)
    expect(page1).toHaveLength(2)
    expect(page1[0]).toMatchObject({ number: 1, kind: 'issue' })
    expect(page1[1]).toMatchObject({ number: 2, kind: 'pr' })
    expect(calls[0]).toEqual(expect.arrayContaining(['-f', 'per_page=2', '-f', 'page=1']))
    const page2 = await provider.search(repo, 'bug', 2, signal)
    expect(page2).toHaveLength(2)
    expect(calls[1]).toEqual(expect.arrayContaining(['-f', 'page=2']))
  })

  it('propagates classified search errors', async () => {
    const provider = new GhProvider({
      command: { run: async () => { throw searchError('rate-limited', 'rate limited') } },
      perPage: 10,
      timeoutMs: 1000,
    })
    const signal = new AbortController().signal
    await expect(provider.search(repo, '', 1, signal)).rejects.toMatchObject({ kind: 'rate-limited' })
  })

  it('classifies raw non-Error command failures', async () => {
    const provider = new GhProvider({
      command: { run: async () => { throw 'plain string failure' } },
      perPage: 10,
      timeoutMs: 1000,
    })
    const signal = new AbortController().signal
    await expect(provider.search(repo, '', 1, signal)).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('propagates abort reasons', async () => {
    const provider = new GhProvider({
      command: { run: async () => { throw new DOMException('Aborted', 'AbortError') } },
      perPage: 10,
      timeoutMs: 1000,
    })
    const controller = new AbortController()
    controller.abort()
    await expect(provider.search(repo, '', 1, controller.signal)).rejects.toThrow()
  })

  it('returns an empty list for empty JSON', async () => {
    const { command } = capturingCommand('[]')
    const provider = new GhProvider({ command, perPage: 10, timeoutMs: 1000 })
    const signal = new AbortController().signal
    await expect(provider.search(repo, '', 1, signal)).resolves.toEqual([])
  })
})

describe('ghCommand', () => {
  it('kills the child immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const promise = ghCommand.run(['--version'], controller.signal, 1000)
    // With a pre-aborted signal the child is killed before any output; the
    // promise settles with a non-zero exit from the kill.
    await expect(promise).rejects.toBeDefined()
  })

  it('settles with the stdout on success', async () => {
    const signal = new AbortController().signal
    // `gh --version` is a real, fast, offline subprocess call.
    const out = await ghCommand.run(['--version'], signal, 5000)
    expect(out).toContain('gh version')
  })
})
