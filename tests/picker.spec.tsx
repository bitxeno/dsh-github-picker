/** The composer picker button and popup: open, search, pick, hint rows. */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { ERROR_HINT_KEY, GhPickerButton, pickText, type PickerProps } from '../src/client/picker.tsx'
import type { GhPickerSettings, GitHubRepoRef, GitHubSearchResult } from '../src/contract.ts'
import { RESULT_TTL_MS } from '../src/client/cache.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom here ships without localStorage; the persistence tests need one.
if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) },
    },
  })
}

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

function result(entries: Parameters<typeof pickText>[0][] = [entry(1)], truncated = false): GitHubSearchResult {
  return { entries, repo, source: 'gh', truncated }
}

/** A locale stub that renders the key itself (asserts the key, not the copy). */
const t = (key: string): string => key

/** The component harness: live settings holder + search/setDraft spies. */
function harness(over: Partial<Record<string, unknown>> = {}) {
  const settings: GhPickerSettings = { insertFormat: 'ref' }
  const search = vi.fn()
  const setDraft = vi.fn()
  const props = {
    sessionId: 's1' as never,
    useSession: () => ({ sessionId: 's1' }),
    useSessions: () => ({}),
    useWorkspaces: () => ({}),
    useProjection: () => undefined,
    useInput: (selector: (state: { draft: string }) => unknown) => selector({ draft: 'hello' }),
    inputActions: { setDraft },
    useSettings: (selector: (snapshot: GhPickerSettings) => unknown) => selector(settings),
    search,
    t,
    ...over,
  } as unknown as PickerProps
  return { settings, search, setDraft, props }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.removeItem('github-picker:state-filter')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

async function render(props: PickerProps): Promise<void> {
  await act(async () => { root.render(<GhPickerButton {...props} />) })
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

const rowButtons = (): HTMLButtonElement[] =>
  [...container.querySelectorAll('button')].filter((button) => button.dataset.clear === undefined && button.dataset.openLink === undefined).slice(1)

/** The hover-only "open on GitHub" link button of one row. */
const linkButtons = (): HTMLButtonElement[] =>
  [...container.querySelectorAll<HTMLButtonElement>('button[data-open-link]')]

/** Change the state-filter dropdown like a user selection would. */
async function pickFilter(value: string): Promise<void> {
  const select = container.querySelector('select')
  if (select === null) throw new Error('no filter select rendered')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

/** Scroll the list to the bottom (jsdom needs fake scroll metrics). */
async function scrollList(): Promise<HTMLDivElement | undefined> {
  // The row button sits inside its relative wrapper; the scrollable list is
  // the wrapper's parent.
  const list = rowButtons()[0]?.parentElement?.parentElement
  if (list === undefined) throw new Error('no list rendered')
  Object.defineProperties(list, {
    scrollTop: { value: 500, configurable: true },
    clientHeight: { value: 100, configurable: true },
    scrollHeight: { value: 620, configurable: true },
  })
  await act(async () => { list.dispatchEvent(new Event('scroll', { bubbles: false })) })
  return list
}

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
    await render({ ...props, sessionId: undefined })
    await act(async () => { openButton().click() })
    expect(search).not.toHaveBeenCalled()
  })

  it('loads the recent list once on open and shows the loading copy', async () => {
    const { props, search } = harness()
    let resolveSearch!: (value: GitHubSearchResult) => void
    search.mockImplementation(() => new Promise((resolve) => { resolveSearch = resolve }))
    await render(props)
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledWith('', 1, 's1', expect.any(AbortSignal))
    expect(container.textContent).toContain('picker.loading')
    await act(async () => { resolveSearch(result()) })
    expect(rowButtons().length).toBe(1) // one row
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
    const titles = () => [...container.querySelectorAll('button')].filter((button) => button.getAttribute('aria-pressed') === null && button.dataset.clear === undefined && button.dataset.openLink === undefined).slice(1).map((button) => button.textContent)
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

  it('shows every loaded entry, however many pages it took', async () => {
    const many = Array.from({ length: 30 }, (_, index) => entry(index + 1))
    const { props, search } = harness()
    search.mockResolvedValue(result(many))
    await render(props)
    await act(async () => { openButton().click() })
    expect(rowButtons().length).toBe(many.length)
  })

  it('does not page while the scroll is still far from the bottom', async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    const { props, search } = harness()
    search.mockResolvedValue(result(firstPage, true))
    await render(props)
    await act(async () => { openButton().click() })
    const list = rowButtons()[0]?.parentElement?.parentElement
    if (list === undefined) throw new Error('no list rendered')
    Object.defineProperties(list, {
      scrollTop: { value: 0, configurable: true },
      clientHeight: { value: 100, configurable: true },
      scrollHeight: { value: 620, configurable: true },
    })
    await act(async () => { list.dispatchEvent(new Event('scroll', { bubbles: false })) })
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('swallows a non-aborted page rejection', async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    let rejectPage2!: (reason?: unknown) => void
    const { props, search } = harness()
    search
      .mockImplementationOnce(async () => result(firstPage, true))
      .mockImplementationOnce(() => new Promise<GitHubSearchResult>((resolve, reject) => { rejectPage2 = reject }))
    await render(props)
    await act(async () => { openButton().click() })
    await scrollList()
    await act(async () => { rejectPage2(new Error('boom')) })
    expect(search).toHaveBeenCalledTimes(2)
    expect(rowButtons().length).toBe(12)
  })

  it('loads the next page when the list scrolls to the bottom', async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    const { props, search } = harness()
    search
      .mockImplementationOnce(async () => result(firstPage, true))
      .mockImplementationOnce(async () => result([entry(13), entry(14)], false))
    await render(props)
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledWith('', 1, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(12)
    await scrollList()
    expect(search).toHaveBeenCalledWith('', 2, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(14)
    expect(rowButtons().at(-1)?.textContent).toContain('14')
  })

  it('does not page a result set that is not truncated', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result(Array.from({ length: 12 }, (_, index) => entry(index + 1)), false))
    await render(props)
    await act(async () => { openButton().click() })
    await scrollList()
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('does not start a page fetch while one is already in flight', async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    let resolvePage2!: (value: GitHubSearchResult) => void
    const { props, search } = harness()
    search
      .mockImplementationOnce(async () => result(firstPage, true))
      .mockImplementationOnce(() => new Promise<GitHubSearchResult>(resolve => { resolvePage2 = resolve }))
    await render(props)
    await act(async () => { openButton().click() })
    await scrollList()
    await scrollList()
    expect(search).toHaveBeenCalledTimes(2)
    await act(async () => { resolvePage2(result([entry(13)], false)) })
    expect(rowButtons().length).toBe(13)
  })

  it('yields a page load once the popup closes mid-fetch', async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    let resolvePage2!: (value: GitHubSearchResult) => void
    const { props, search } = harness()
    search
      .mockImplementationOnce(async () => result(firstPage, true))
      .mockImplementationOnce(() => new Promise<GitHubSearchResult>(resolve => { resolvePage2 = resolve }))
    await render(props)
    await act(async () => { openButton().click() })
    await scrollList()
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledTimes(2)
    await act(async () => { resolvePage2(result([entry(13)], false)) })
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('swallows an aborted page rejection after the popup closes', async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    let rejectPage2!: (reason?: unknown) => void
    const { props, search } = harness()
    search
      .mockImplementationOnce(async () => result(firstPage, true))
      .mockImplementationOnce(() => new Promise<GitHubSearchResult>((resolve, reject) => { rejectPage2 = reject }))
    await render(props)
    await act(async () => { openButton().click() })
    await scrollList()
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledTimes(2)
    await act(async () => { rejectPage2(new DOMException('Aborted', 'AbortError')) })
    expect(search).toHaveBeenCalledTimes(2)
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
    await render({ ...props, useInput: (selector: (state: { draft: string }) => unknown) => selector({ draft: 'fix' }) })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('fix @bitxeno/atvloadly#125 ')
  })

  it('separates the pick from a draft ending in a newline', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render({ ...props, useInput: (selector: (state: { draft: string }) => unknown) => selector({ draft: 'fix\n' }) })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('fix\n@bitxeno/atvloadly#125 ')
  })

  it('picks the URL format when configured', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(7, { kind: 'pr', url: 'https://github.com/bitxeno/atvloadly/pull/7' })]))
    await render({ ...props, useSettings: (selector: (s: GhPickerSettings) => unknown) => selector({ insertFormat: 'url' }) })
    await act(async () => { openButton().click() })
    await act(async () => { rowButtons()[0]?.click() })
    expect(setDraft).toHaveBeenCalledWith('hello https://github.com/bitxeno/atvloadly/pull/7 ')
  })



})

describe('opening links', () => {
  it('reveals the open-link button only while its row is hovered', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result([entry(125)]))
    await render(props)
    await act(async () => { openButton().click() })
    const link = linkButtons()[0]
    if (link === undefined) throw new Error('no link button rendered')
    // Hidden (and click-through) until the row is hovered.
    expect(link.style.opacity).toBe('0')
    expect(link.style.pointerEvents).toBe('none')
    const row = link.parentElement
    if (row === null) throw new Error('no row wrapper')
    // The issue number sits in the link's place and is visible while idle.
    const number = [...row.querySelectorAll('span')].find((span) => span.textContent === '#125')
    if (number === undefined) throw new Error('no number span')
    expect(number.style.visibility).toBe('visible')
    await act(async () => { row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })) })
    expect(link.style.opacity).toBe('1')
    expect(link.style.pointerEvents).toBe('auto')
    // Hovering hides the number in place (its slot is kept, no layout shift).
    expect(number.style.visibility).toBe('hidden')
    await act(async () => { row.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })) })
    expect(link.style.opacity).toBe('0')
    expect(link.style.pointerEvents).toBe('none')
    expect(number.style.visibility).toBe('visible')
  })

  it('opens the entry URL in a new tab without picking it or closing the popup', async () => {
    const { props, search, setDraft } = harness()
    search.mockResolvedValue(result([entry(125)]))
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    await render(props)
    await act(async () => { openButton().click() })
    const link = linkButtons()[0]
    if (link === undefined) throw new Error('no link button rendered')
    expect(link.getAttribute('aria-label')).toBe('picker.openLink')
    await act(async () => { link.click() })
    expect(open).toHaveBeenCalledWith('https://github.com/bitxeno/atvloadly/issues/125', '_blank', 'noopener,noreferrer')
    // The click did not fall through to the row's pick handler, and the popup
    // stays open (only picking closes it).
    expect(setDraft).not.toHaveBeenCalled()
    expect(container.querySelector('input')).not.toBeNull()
    open.mockRestore()
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
    expect(rowButtons().length).toBeGreaterThan(0)
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

describe('the state filter', () => {
  it('applies the open/closed filter through the host search query', async () => {
    const { props, search } = harness()
    search.mockImplementation(async (query: string) => {
      if (query === 'is:open') return result([entry(1), entry(3, { kind: 'pr' })])
      if (query === 'is:closed') return result([entry(2, { state: 'closed' })])
      return result([
        entry(1),
        entry(2, { state: 'closed' }),
        entry(3, { state: 'closed', kind: 'pr', url: 'https://github.com/bitxeno/atvloadly/pull/3' }),
      ])
    })
    await render(props)
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledWith('', 1, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(3)
    // The dropdown renders next to the search input; 'all' is the default.
    const select = container.querySelector('select')
    expect(select?.getAttribute('aria-label')).toBe('picker.filter')
    expect((select as HTMLSelectElement).value).toBe('all')
    // Each filter refetches page 1 under its own search qualifier.
    await pickFilter('open')
    expect(search).toHaveBeenCalledWith('is:open', 1, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(2)
    await pickFilter('closed')
    expect(search).toHaveBeenCalledWith('is:closed', 1, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(1)
    await pickFilter('all')
    expect(search).toHaveBeenCalledWith('', 1, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(3)
  })

  it('ranks the filtered page locally by the typed query', async () => {
    const { props, search } = harness()
    search.mockImplementation(async (query: string) => (query === 'is:open'
      ? result([entry(10, { title: 'crash on login' }), entry(11, { title: 'crash again' })])
      : result([])))
    await render(props)
    await act(async () => { openButton().click() })
    await pickFilter('open')
    expect(rowButtons().length).toBe(2)
    await typeQuery('crash')
    expect(rowButtons().length).toBe(2)
    await typeQuery('login')
    expect(rowButtons().length).toBe(1)
    expect(rowButtons()[0].textContent).toContain('crash on login')
  })

  it('stops when the filtered result set itself is exhausted', async () => {
    localStorage.setItem('github-picker:state-filter', 'open')
    const { props, search } = harness()
    search.mockResolvedValue(result([entry(1), entry(2), entry(3)], false))
    await render(props)
    await act(async () => { openButton().click() })
    expect(search).toHaveBeenCalledWith('is:open', 1, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(3)
    // Three open entries are the whole filtered set: no extra page is fetched.
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('pages the filtered result set with the same qualifier', async () => {
    localStorage.setItem('github-picker:state-filter', 'open')
    const firstPage = Array.from({ length: 12 }, (_, index) => entry(index + 1))
    const { props, search } = harness()
    search
      .mockImplementationOnce(async () => result(firstPage, true))
      .mockImplementationOnce(async () => result([entry(13)], false))
    await render(props)
    await act(async () => { openButton().click() })
    expect(rowButtons().length).toBe(12)
    await scrollList()
    expect(search).toHaveBeenCalledWith('is:open', 2, 's1', expect.any(AbortSignal))
    expect(rowButtons().length).toBe(13)
  })

  it('persists the chosen filter and restores it on the next mount', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    await pickFilter('open')
    expect(localStorage.getItem('github-picker:state-filter')).toBe('open')

    // A fresh mount (a reloaded page) starts from the stored filter.
    act(() => { root.unmount() })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const next = harness()
    next.search.mockResolvedValue(result())
    await render(next.props)
    await act(async () => { openButton().click() })
    const select = container.querySelector('select')
    expect((select as HTMLSelectElement).value).toBe('open')
    localStorage.removeItem('github-picker:state-filter')
  })

  it('falls back to all when the stored filter is not a valid state', async () => {
    localStorage.setItem('github-picker:state-filter', 'bogus')
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    const select = container.querySelector('select')
    expect((select as HTMLSelectElement).value).toBe('all')
    localStorage.removeItem('github-picker:state-filter')
  })

  it('clears the query through the clear button inside the search box', async () => {
    const { props, search } = harness()
    search.mockResolvedValue(result())
    await render(props)
    await act(async () => { openButton().click() })
    await typeQuery('crash')
    const clear = container.querySelector<HTMLButtonElement>('button[data-clear]')
    expect(clear).not.toBeNull()
    expect(clear?.getAttribute('aria-label')).toBe('picker.clear')
    await act(async () => { clear!.click() })
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('')
    // The button hides again once the query is empty.
    expect(container.querySelector('button[data-clear]')).toBeNull()
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
