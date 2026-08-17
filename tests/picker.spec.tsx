/** The composer picker button and popup: open, search, pick, hint rows. */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { ERROR_HINT_KEY, GhIssuePickerButton, MAX_CANDIDATES, pickText, type PickerProps } from '../src/client/picker.tsx'
import type { GhIssueSettings, GitHubRepoRef, GitHubSearchResult } from '../src/contract.ts'
import { RESULT_TTL_MS } from '../src/client/cache.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const repo: GitHubRepoRef = { owner: 'bitxeno', name: 'atvloadly' }

function entry(number: number, over: Partial<Parameters<typeof pickText>[0]> = {}) {
  return {
    number,
    title: `issue ${number}`,
    kind: 'issue' as const,
    state: 'open' as const,
    url: `https://github.com/bitxeno/atvloadly/issues/${number}`,
    ...over,
  }
}

function result(entries: Parameters<typeof pickText>[0][] = [entry(1)]): GitHubSearchResult {
  return { entries, repo, source: 'gh', truncated: false }
}

/** A locale stub that renders the key itself (asserts the key, not the copy). */
const t = (key: string): string => key

/** The component harness: live settings holder + search/setDraft spies. */
function harness(over: Partial<Record<string, unknown>> = {}) {
  const settings: GhIssueSettings = { insertFormat: 'ref' }
  const search = vi.fn()
  const setDraft = vi.fn()
  const props = {
    session: { sessionId: 's1' },
    input: { draft: 'hello' },
    sessionId: 's1',
    useSession: () => ({ sessionId: 's1' }),
    useSessions: () => ({}),
    useWorkspaces: () => ({}),
    useProjection: () => undefined,
    useInput: (selector: (state: { draft: string }) => unknown) => selector({ draft: 'fallback draft' }),
    inputActions: { setDraft },
    useSettings: (selector: (snapshot: GhIssueSettings) => unknown) => selector(settings),
    search,
    t,
    ...over,
  } as unknown as PickerProps
  return { settings, search, setDraft, props }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

async function render(props: PickerProps): Promise<void> {
  await act(async () => { root.render(<GhIssuePickerButton {...props} />) })
}

const openButton = (): HTMLButtonElement => {
  const button = container.querySelector('button')
  if (button === null) throw new Error('no button rendered')
  return button
}

const searchInput = (): HTMLInputElement => {
  const input = container.querySelector('input')
  if (input === null) throw new Error('no search input rendered')
  return input
}

const rowButtons = (): HTMLButtonElement[] => [...container.querySelectorAll('button')].slice(1)

/** Drive the React-controlled search input like a keystroke would. */
async function typeQuery(value: string): Promise<void> {
  await act(async () => {
    const input = searchInput()
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('pickText', () => {
  it('inserts the @owner/repo#number form by default', () => {
    expect(pickText(entry(125), repo, { insertFormat: 'ref' })).toBe('@bitxeno/atvloadly#125 ')
  })

  it('inserts the GitHub URL when configured', () => {
    expect(pickText(entry(125), repo, { insertFormat: 'url' })).toBe('https://github.com/bitxeno/atvloadly/issues/125 ')
  })
})

describe('ERROR_HINT_KEY', () => {
  it('maps every search failure kind to a locale key', () => {
    expect(ERROR_HINT_KEY['no-repo']).toBe('picker.no-repo')
    expect(ERROR_HINT_KEY['gh-missing']).toBe('picker.error.gh-missing')
    expect(ERROR_HINT_KEY['not-authenticated']).toBe('picker.error.not-authenticated')
    expect(ERROR_HINT_KEY['rate-limited']).toBe('picker.error.rate-limited')
    expect(ERROR_HINT_KEY['repo-not-found']).toBe('picker.error.repo-not-found')
    expect(ERROR_HINT_KEY['network']).toBe('picker.error.network')
    expect(ERROR_HINT_KEY['unknown']).toBe('picker.error.unknown')
  })
})

describe('the button', () => {
  it('renders the GitHub-mark trigger with the popup closed', async () => {
    const { props } = harness()
    await render(props)
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('[role="dialog"], input')).toBeNull()
  })

})

describe('opening the popup', () => {
  it('does not search without a session', async () => {
    const { props, search } = harness()
    await render({ ...props, session: undefined })
    await act(async () => { openButton().click() })
    expect(search).not.toHaveBeenCalled()
  })

  it('loads the recent list once on open and shows the loading copy', async () => {
    const { props, search } = harness()
    let resolveSearch!: (value: GitHubSearchResult) => void
    search.mockImplementation(() => new Promise((resolve) => { resolveSearch = resolve }))
    await render(props)
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledWith('', 's1', expect.any(AbortSignal))
    expect(container.textContent).toContain('picker.loading')
    await act(async () => { resolveSearch(result()) })
    expect(container.querySelectorAll('button').length).toBe(2) // trigger + one row
  })

  it('reopens from the hot cache without refetching', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() }) // open + load
    await act(async () => { openButton().click() }) // close
    await act(async () => { openButton().click() }) // reopen: fresh list, no refetch
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('refetches on reopen after the cache TTL', async () => {
    vi.useFakeTimers()
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    await act(async () => { openButton().click() })
    vi.advanceTimersByTime(RESULT_TTL_MS)
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('searching and picking', () => {
  it('filters rows by number and title, ranking the number prefix first', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result([
      entry(100, { title: 'crash on login' }),
      entry(3, { title: 'fix login button' }),
      entry(7, { title: 'docs: login flow' }),
    ]))
    await render(props)
    await act(async () => { openButton().click() })
    const titles = () => [...container.querySelectorAll('button')].slice(1).map((button) => button.textContent)
    await typeQuery('10')
    // The number-prefix match leaves one row: #100.
    expect(titles().map((title) => title?.trim())).toEqual(['crash on login#100'])
    await typeQuery('login')
    // Number-exact first, then title contains (by match position).
    expect(titles().map((title) => title?.trim())).toEqual(['fix login button#3', 'docs: login flow#7', 'crash on login#100'])
  })

  it('shows the empty copy when nothing matches', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result([entry(1)]))
    await render(props)
    await act(async () => { openButton().click() })
    await typeQuery('zzz')
    expect(container.textContent).toContain('picker.empty')
  })

  it('caps the visible rows', async () => {
    const many = Array.from({ length: 20 }, (_, index) => entry(index + 1))
    const { props, search } = harness()
    search.mockResolvedValue(result(many))
    await render(props)
    await act(async () => { openButton().click() })
    expect(container.querySelectorAll('button').length).toBe(MAX_CANDIDATES + 1)
  })

  it('highlights a row on hover and resets it on leave', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render(props)
    await act(async () => { openButton().click() })
    const row = rowButtons()[0]
    if (row === undefined) throw new Error('no row rendered')
    await act(async () => {
      row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null }))
    })
    expect(row.style.background).toContain('rgba(128,128,128,0.12)')
    await act(async () => {
      row.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
    })
    expect(row.style.background).toBe('transparent')
  })

  it('picks the ref text into the draft through setDraft and closes', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render(props)
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('hello @bitxeno/atvloadly#125 ')
    expect(container.querySelector('input')).toBeNull()
  })

  it('separates the pick from a draft that does not end with whitespace', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render({ ...props, input: { draft: 'fix' } })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('fix @bitxeno/atvloadly#125 ')
  })

  it('picks the URL format when configured', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(7, { kind: 'pr', url: 'https://github.com/bitxeno/atvloadly/pull/7' })]))
    await render({ ...props, useSettings: (selector: (s: GhIssueSettings) => unknown) => selector({ insertFormat: 'url' }) })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('hello https://github.com/bitxeno/atvloadly/pull/7 ')
  })

  it('falls back to the useInput hook when the owner input share is absent', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render({ ...props, input: undefined })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('fallback draft @bitxeno/atvloadly#125 ')
  })

  it('survives a throwing draft read and still writes the pick text', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render({
      ...props,
      input: undefined,
      useInput: () => { throw new Error('store gone') },
    })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(consoleError).toHaveBeenCalled()
    expect(setDraft).toHaveBeenCalledWith('@bitxeno/atvloadly#125 ')
    consoleError.mockRestore()
  })

  it('reads neither share when both are absent and picks bare text', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render({ ...props, input: undefined, useInput: undefined })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('@bitxeno/atvloadly#125 ')
  })

  it('survives a missing inputActions face (draft write skipped)', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render({ ...props, inputActions: undefined })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    // The popup still closes; no draft write was attempted.
    expect(container.querySelector('input')).toBeNull()
  })
})

describe('failure handling', () => {
  it('renders a localized hint row for a classified failure', async () => {
    const { props, search } = harness()
    search.mockRejectedValue(Object.assign(new Error('spawn gh ENOENT'), { kind: 'gh-missing' }))
    await render(props)
    await act(async () => { openButton().click() })
    expect(container.textContent).toContain('picker.error.gh-missing')
    expect(container.querySelector('input')).not.toBeNull()
    // No pickable rows; typing cannot change the hint.
    await typeQuery('1')
    expect(container.textContent).toContain('picker.error.gh-missing')
  })

  it('falls back to the unknown hint for unclassified failures', async () => {
    const { props, search } = harness()
    search.mockRejectedValue(new Error('boom'))
    await render(props)
    await act(async () => { openButton().click() })
    expect(container.textContent).toContain('picker.error.unknown')
  })

  it('retries the search when reopened after a failure', async () => {
    const { props, search } = harness()
    search.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    expect(container.textContent).toContain('picker.error.unknown')
    await act(async () => { openButton().click() })
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledTimes(2)
    expect(container.querySelectorAll('button').length).toBeGreaterThan(1)
  })

  it('drops the in-flight result when the popup closes before it settles', async () => {
    const { props, search } = harness()
    let rejectSearch!: (error: Error) => void
    search.mockImplementation(() => new Promise((_resolve, reject) => { rejectSearch = reject }))
    await render(props)
    await act(async () => { openButton().click() })
    await act(async () => { openButton().click() }) // close while pending (aborts the load)
    await act(async () => { rejectSearch(new Error('late failure')) })
    // The superseded result must not surface as an error row.
    expect(container.textContent).not.toContain('picker.error')
  })
})

describe('closing', () => {
  it('closes on an outside pointer-down', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    expect(container.querySelector('input')).not.toBeNull()
    await act(async () => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })
    expect(container.querySelector('input')).toBeNull()
  })

  it('stays open for a pointer-down inside the box', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    await act(async () => { searchInput().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('closes on Escape and stays open on other keys', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true })) })
    expect(container.querySelector('input')).not.toBeNull()
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(container.querySelector('input')).toBeNull()
  })
})
