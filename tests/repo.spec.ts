/** Repository identity parsing and caching. */
import { describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RepoResolver, gitRemoteCommand, parseRemoteUrl } from '../src/repo.ts'

describe('parseRemoteUrl', () => {
  it('parses https URLs with and without .git', () => {
    expect(parseRemoteUrl('https://github.com/owner/name.git')).toEqual({ owner: 'owner', name: 'name' })
    expect(parseRemoteUrl('https://github.com/owner/name')).toEqual({ owner: 'owner', name: 'name' })
  })

  it('parses https URLs with credentials and trailing slashes', () => {
    expect(parseRemoteUrl('https://user:token@github.com/o/r.git')).toEqual({ owner: 'o', name: 'r' })
    expect(parseRemoteUrl('https://github.com/o/r/')).toEqual({ owner: 'o', name: 'r' })
  })

  it('parses git@, ssh://, and git:// forms', () => {
    expect(parseRemoteUrl('git@github.com:o/r.git')).toEqual({ owner: 'o', name: 'r' })
    expect(parseRemoteUrl('ssh://git@github.com/o/r.git')).toEqual({ owner: 'o', name: 'r' })
    expect(parseRemoteUrl('git://github.com/o/r.git')).toEqual({ owner: 'o', name: 'r' })
  })

  it('rejects non-GitHub hosts and malformed paths', () => {
    expect(parseRemoteUrl('https://gitlab.com/o/r.git')).toBeUndefined()
    expect(parseRemoteUrl('git@gitlab.com:o/r.git')).toBeUndefined()
    expect(parseRemoteUrl('https://github.com/only-one.git')).toBeUndefined()
    expect(parseRemoteUrl('https://github.com/o/github.com')).toBeUndefined()
    expect(parseRemoteUrl('')).toBeUndefined()
    expect(parseRemoteUrl('not a url')).toBeUndefined()
  })
})

describe('RepoResolver', () => {
  it('honors the settings override before the git remote', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => 'https://github.com/ignored/remote.git')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const signal = new AbortController().signal
    await expect(resolver.resolve('/work', 'https://github.com/o/r.git', signal)).resolves.toEqual({ owner: 'o', name: 'r' })
    expect(run).not.toHaveBeenCalled()
  })

  it('accepts the owner/name shorthand override', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => '')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const signal = new AbortController().signal
    await expect(resolver.resolve('/work', 'o/r', signal)).resolves.toEqual({ owner: 'o', name: 'r' })
  })

  it('ignores an override that is neither a URL nor a shorthand', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => 'https://github.com/o/r.git')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const signal = new AbortController().signal
    await expect(resolver.resolve('/work', 'garbage', signal)).resolves.toEqual({ owner: 'o', name: 'r' })
    expect(run).toHaveBeenCalledWith('origin', '/work')
  })

  it('falls back to the git remote and parses its URL', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => 'git@github.com:o/r.git')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const signal = new AbortController().signal
    await expect(resolver.resolve('/work', '', signal)).resolves.toEqual({ owner: 'o', name: 'r' })
    expect(run).toHaveBeenCalledWith('origin', '/work')
  })

  it('returns undefined when nothing resolves', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => '')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const signal = new AbortController().signal
    await expect(resolver.resolve('/work', '', signal)).resolves.toBeUndefined()
  })

  it('caches per cwd/override and honors the TTL', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => 'https://github.com/o/r.git')
    let now = 1000
    const resolver = new RepoResolver({ run }, () => now, 30_000)
    const signal = new AbortController().signal
    await resolver.resolve('/work', '', signal)
    await resolver.resolve('/work', '', signal)
    expect(run).toHaveBeenCalledTimes(1)
    now = 31_001
    await resolver.resolve('/work', '', signal)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('invalidates the whole cache', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => 'https://github.com/o/r.git')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const signal = new AbortController().signal
    await resolver.resolve('/work', '', signal)
    resolver.invalidate()
    await resolver.resolve('/work', '', signal)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('propagates an aborted signal', async () => {
    const run = vi.fn(async (_url: string, _cwd: string) => 'https://github.com/o/r.git')
    const resolver = new RepoResolver({ run }, () => 1000, 30_000)
    const controller = new AbortController()
    controller.abort()
    await expect(resolver.resolve('/work', '', controller.signal)).rejects.toThrow()
  })
})

describe('gitRemoteCommand', () => {
  it('resolves the remote URL of a real git repository', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-github-picker-'))
    try {
      execFileSync('git', ['init', '-q'], { cwd: dir })
      execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/o/r.git'], { cwd: dir })
      await expect(gitRemoteCommand.run('origin', dir)).resolves.toBe('https://github.com/o/r.git')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
