/** The per-session result cache: sharing, TTL, and invalidation. */
import { describe, expect, it, vi } from 'vitest'
import { HashCache, RESULT_TTL_MS } from '../src/client/cache.ts'
import type { GitHubSearchResult } from '../src/contract.ts'

function result(numbers: readonly number[]): GitHubSearchResult {
  return {
    entries: numbers.map(number => ({
      number,
      title: `issue ${number}`,
      kind: 'issue',
      state: 'open',
      url: `https://github.com/o/r/issues/${number}`,
    })),
    repo: { owner: 'o', name: 'r' },
    source: 'gh',
    truncated: false,
  }
}

describe('HashCache', () => {
  it('serves the settled result for the same query without refetching', async () => {
    const search = vi.fn(async (_query: string, _id: unknown, _signal: AbortSignal) => result([1]))
    const cache = new HashCache(search)
    const signal = new AbortController().signal
    await cache.resolve('bug', 's1', signal)
    await cache.resolve('bug', 's1', signal)
    expect(search).toHaveBeenCalledTimes(1)
    expect(cache.settled('s1', 'bug')).toBeDefined()
  })

  it('refetches per session and per query', async () => {
    const search = vi.fn(async (query: string) => result(query === '' ? [1, 2] : [1]))
    const cache = new HashCache(search)
    const signal = new AbortController().signal
    await cache.resolve('', 's1', signal)
    await cache.resolve('bug', 's1', signal)
    await cache.resolve('', 's2', signal)
    expect(search).toHaveBeenCalledTimes(3)
  })

  it('refetches after the TTL expires', async () => {
    const search = vi.fn(async () => result([1]))
    let now = 1000
    const cache = new HashCache(search, () => now)
    const signal = new AbortController().signal
    await cache.resolve('bug', 's1', signal)
    now += RESULT_TTL_MS + 1
    await cache.resolve('bug', 's1', signal)
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('drops the settled snapshot when a query goes cold', async () => {
    const search = vi.fn(async () => result([1]))
    const cache = new HashCache(search, () => 1000)
    const signal = new AbortController().signal
    await cache.resolve('bug', 's1', signal)
    expect(cache.settled('s1', 'bug')).toBeDefined()
    cache.invalidateAll()
    expect(cache.settled('s1', 'bug')).toBeUndefined()
  })

  it('yields early for superseded signals without poisoning the cache', async () => {
    let resolveSearch: ((value: GitHubSearchResult) => void) | undefined
    const search = vi.fn(async () => new Promise<GitHubSearchResult>(resolve => { resolveSearch = resolve }))
    const cache = new HashCache(search)
    const controller = new AbortController()
    const pending = cache.resolve('bug', 's1', controller.signal)
    controller.abort()
    const settled = result([1])
    resolveSearch?.(settled)
    await expect(pending).rejects.toBeDefined()
    // The shared fetch still settled for later consumers.
    expect(cache.settled('s1', 'bug')).toBeDefined()
  })
})
