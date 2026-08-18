/** Pure ranking for the # picker menu. */
import { describe, expect, it } from 'vitest'
import { classifySearchError, rankEntries } from '../src/client/search.ts'
import type { GitHubEntry } from '../src/contract.ts'

function entry(number: number, title: string, kind: 'issue' | 'pr' = 'issue'): GitHubEntry {
  return { number, title, kind, state: 'open', url: `https://github.com/o/r/issues/${number}` }
}

describe('rankEntries', () => {
  const entries = [
    entry(123, 'Fix the login bug'),
    entry(1234, 'Login with SSO'),
    entry(12, 'Add logout button'),
    entry(99, 'Refactor auth module'),
  ]

  it('keeps provider order for the empty query', () => {
    expect(rankEntries(entries, '').map(e => e.number)).toEqual([123, 1234, 12, 99])
  })

  it('ranks the exact number first', () => {
    expect(rankEntries(entries, '123').map(e => e.number)).toEqual([123, 1234])
  })

  it('ranks number prefixes before title matches', () => {
    expect(rankEntries(entries, '12').map(e => e.number)).toEqual([12, 123, 1234])
  })

  it('matches titles for non-numeric queries', () => {
    expect(rankEntries(entries, 'login').map(e => e.number)).toEqual([1234, 123])
  })

  it('returns nothing for unmatched queries', () => {
    expect(rankEntries(entries, 'zzz')).toEqual([])
  })

  it('never caps matches (the popup scrolls through every loaded page)', () => {
    expect(rankEntries(entries, '')).toHaveLength(entries.length)
    expect(rankEntries(entries, '1')).toHaveLength(3)
  })

  it('falls back to title search when a numeric-looking query is mixed', () => {
    // '12a' is not purely numeric, so it matches titles only.
    expect(rankEntries(entries, '12a')).toEqual([])
  })

  it('breaks score ties by number desc then title asc', () => {
    // Both entries contain 'login' at index 5, so their scores tie exactly.
    const tied = [
      entry(5, 'Zeta login'),
      entry(9, 'Zulu login'),
    ]
    expect(rankEntries(tied, 'login').map(e => e.number)).toEqual([9, 5])
    // Equal score and number: title ascending (and its mirror: title
    // descending order would come later in the comparator).
    const sameNumber = [
      entry(3, 'Beta login'),
      entry(3, 'Ceta login'),
    ]
    expect(rankEntries(sameNumber, 'login').map(e => e.title)).toEqual(['Beta login', 'Ceta login'])
    const reversed = [
      entry(3, 'Delta login'),
      entry(3, 'Celta login'),
    ]
    expect(rankEntries(reversed, 'login').map(e => e.title)).toEqual(['Celta login', 'Delta login'])
  })

  it('ranks the exact title match above contains matches', () => {
    const exact = [
      entry(1, 'Login'),
      entry(2, 'Login Button'),
    ]
    expect(rankEntries(exact, 'login').map(e => e.number)).toEqual([1, 2])
  })

  it('matches titles case-insensitively', () => {
    expect(rankEntries([entry(1, 'Login Button')], 'login').map(e => e.number)).toEqual([1])
    expect(rankEntries([entry(1, 'Login Button')], 'LOGIN').map(e => e.number)).toEqual([1])
  })

it('returns every matching entry, however many pages it took', () => {
    const many = Array.from({ length: 30 }, (_, index) => entry(index + 1, `issue ${index + 1}`))
    expect(rankEntries(many, 'issue')).toHaveLength(30)
  })
})

describe('classifySearchError', () => {
  it('classifies every host failure message into its hint kind', () => {
    expect(classifySearchError('internal', 'spawn gh ENOENT')).toBe('gh-missing')
    expect(classifySearchError('internal', 'gh: not logged in to github.com')).toBe('not-authenticated')
    expect(classifySearchError('internal', 'dsh-github-picker: the GitHub token is invalid or expired; sign in again')).toBe('not-authenticated')
    expect(classifySearchError('internal', 'API rate limit exceeded for user')).toBe('rate-limited')
    expect(classifySearchError('internal', 'HTTP 404: Not Found')).toBe('repo-not-found')
    expect(classifySearchError('internal', 'fetch failed: ECONNREFUSED')).toBe('network')
    expect(classifySearchError('internal', 'dsh-github-picker: no GitHub repository detected (set one in Settings or add a git remote)')).toBe('no-repo')
    expect(classifySearchError('internal', 'something else')).toBe('unknown')
  })

  it('never relies on the wire error code', () => {
    // The same message classifies identically whatever `code` the gateway
    // assigns to a thrown Error.
    expect(classifySearchError('custom', 'gh: not logged in to github.com')).toBe('not-authenticated')
    expect(classifySearchError('', 'spawn gh ENOENT')).toBe('gh-missing')
  })
})
