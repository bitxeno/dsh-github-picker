/** The standard `@` input-trigger source: candidates and pick text. */
import { describe, expect, it, vi } from 'vitest'
import { createGhSource, ERROR_HINT_KEY, pickText, SOURCE_NAME, toCandidate } from '../src/client/source.ts'
import type { GhIssueSettings } from '../src/contract.ts'

const repo = { owner: 'bitxeno', name: 'atvloadly' }

function settings(over: Partial<GhIssueSettings> = {}): GhIssueSettings {
  return { enabled: true, insertFormat: 'url', ...over }
}

const entry = (number: number, over: Partial<Parameters<typeof toCandidate>[0]> = {}) => ({
  number,
  title: `issue ${number}`,
  kind: 'issue' as const,
  state: 'open' as const,
  url: `https://github.com/bitxeno/atvloadly/issues/${number}`,
  ...over,
})

/** A locale stub that renders the key itself (asserts the key, not the copy). */
const t = (key: string): string => key

/** Source deps with overridable search/settings. */
function deps(over: Partial<Parameters<typeof createGhSource>[0]> = {}) {
  return {
    search: async () => ({ entries: [], repo }),
    settings: () => settings(),
    t,
    ...over,
  }
}

describe('toCandidate', () => {
  it('projects an entry into a menu candidate carrying pick data', () => {
    const candidate = toCandidate(entry(125), repo)
    // GitHub-style row: title in the name slot, the #number tag in description.
    expect(candidate.name).toBe('issue 125')
    expect(candidate.description).toBe('#125')
    expect(typeof candidate.icon).not.toBe('string') // a React element (SVG)
    expect(candidate.ghNumber).toBe(125)
    expect(candidate.ghUrl).toBe('https://github.com/bitxeno/atvloadly/issues/125')
    expect(candidate.ghRepo).toEqual(repo)
    expect(candidate.ghKind).toBe('issue')
  })

  it('projects closed pull requests with their state icon', () => {
    const candidate = toCandidate({ ...entry(7), kind: 'pr', state: 'closed' }, repo)
    expect(candidate.name).toBe('issue 7')
    expect(candidate.description).toBe('#7')
    expect(typeof candidate.icon).not.toBe('string')
  })
})

describe('pickText', () => {
  it('inserts the GitHub URL by default', () => {
    expect(pickText(entry(125), repo, settings())).toBe('https://github.com/bitxeno/atvloadly/issues/125 ')
  })

  it('inserts the @owner/repo#number form when configured', () => {
    expect(pickText(entry(125), repo, settings({ insertFormat: 'ref' }))).toBe('@bitxeno/atvloadly#125 ')
  })
})

describe('createGhSource', () => {
  it('registers under @ with the unique source name', () => {
    const source = createGhSource(deps())
    expect(source.trigger).toBe('@')
    expect(source.name).toBe(SOURCE_NAME)
  })

  it('returns empty candidates when disabled', async () => {
    const search = vi.fn()
    const source = createGhSource(deps({ search, settings: () => settings({ enabled: false }) }))
    const result = await source.candidates?.({ sessionId: 's1' }, { query: 'bug', position: 'inline', signal: new AbortController().signal })
    expect(result).toEqual([])
    expect(search).not.toHaveBeenCalled()
  })

  it('returns capped candidates from the search', async () => {
    const many = Array.from({ length: 20 }, (_, index) => entry(index + 1))
    const source = createGhSource(deps({ search: async () => ({ entries: many, repo }) }))
    const result = await source.candidates?.({ sessionId: 's1' }, { query: '', position: 'inline', signal: new AbortController().signal })
    expect(result).toHaveLength(12)
  })

  it('renders a localized hint row when the search fails', async () => {
    const failed = Object.assign(new Error('spawn gh ENOENT'), { kind: 'gh-missing' })
    const source = createGhSource(deps({ search: async () => { throw failed } }))
    const result = await source.candidates?.({ sessionId: 's1' }, { query: 'bug', position: 'inline', signal: new AbortController().signal })
    expect(result).toHaveLength(1)
    const [hint] = result as Array<{ name?: string; ghError?: boolean; description?: string }>
    expect(hint.name).toBe(ERROR_HINT_KEY['gh-missing'])
    expect(hint.ghError).toBe(true)
    expect(hint.description).toBeUndefined()
  })

  it('falls back to the unknown hint for unclassified failures', async () => {
    const source = createGhSource(deps({ search: async () => { throw new Error('boom') } }))
    const result = await source.candidates?.({ sessionId: 's1' }, { query: '', position: 'inline', signal: new AbortController().signal })
    expect((result as Array<{ name?: string }>)[0]?.name).toBe(ERROR_HINT_KEY['unknown'])
  })

  it('picks the URL text with the candidate data', () => {
    const source = createGhSource(deps({ search: async () => ({ entries: [entry(125)], repo }) }))
    const outcome = source.onPick?.({
      candidate: toCandidate(entry(125), repo),
      session: { sessionId: 's1' },
      position: 'inline',
      via: 'menu',
      span: { start: 0, end: 1, draftRev: 0 },
    })
    expect(outcome).toEqual({ text: 'https://github.com/bitxeno/atvloadly/issues/125 ' })
  })

  it('picks the ref text when configured', () => {
    const source = createGhSource(deps({ search: async () => ({ entries: [entry(7)], repo }), settings: () => settings({ insertFormat: 'ref' }) }))
    const outcome = source.onPick?.({
      candidate: toCandidate({ ...entry(7), kind: 'pr', url: 'https://github.com/bitxeno/atvloadly/pull/7' }, repo),
      session: { sessionId: 's1' },
      position: 'inline',
      via: 'menu',
      span: { start: 0, end: 1, draftRev: 0 },
    })
    expect(outcome).toEqual({ text: '@bitxeno/atvloadly#7 ' })
  })

  it('never picks the error hint row', () => {
    const source = createGhSource(deps())
    const outcome = source.onPick?.({
      candidate: { name: 'hint', ghError: true },
      session: { sessionId: 's1' },
      position: 'inline',
      via: 'menu',
      span: { start: 0, end: 1, draftRev: 0 },
    })
    expect(outcome).toBeUndefined()
  })

  it('returns undefined for candidates without pick data', () => {
    const source = createGhSource(deps())
    const outcome = source.onPick?.({
      candidate: { name: 'no data' },
      session: { sessionId: 's1' },
      position: 'inline',
      via: 'menu',
      span: { start: 0, end: 1, draftRev: 0 },
    })
    expect(outcome).toBeUndefined()
  })

  it('falls back for candidates missing the kind and URL', () => {
    const source = createGhSource(deps())
    const outcome = source.onPick?.({
      candidate: { name: '#9 t', ghNumber: 9, ghRepo: repo },
      session: { sessionId: 's1' },
      position: 'inline',
      via: 'menu',
      span: { start: 0, end: 1, draftRev: 0 },
    })
    // Missing URL falls back to '' — the pick text is just the trailing space.
    expect(outcome).toEqual({ text: ' ' })
  })
})
