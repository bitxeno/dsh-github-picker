/** The settings.plugin.item card: disclosure, the insert-format select, and
 * the gh account-connection status. The card follows the official plugin
 * cards: collapsed by default behind a disclosure header, controls inside. */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { GhPickerSection, type SettingsSectionProps } from '../src/client/SettingsSection.tsx'
import type { GhAuthStatus, GhPickerSettings, GhPickerSettingsUpdate } from '../src/contract.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** A locale stub that renders the key itself (asserts the key, not the copy);
 * the one template key interpolates its message parameter. */
const t = (key: string, params?: Record<string, string>): string => params?.message ?? key

/** The card harness: live settings holder + update/getGhAuthStatus spies. */
function harness(over: Partial<Record<string, unknown>> = {}) {
  const settings: GhPickerSettings = { insertFormat: 'ref' }
  const update = vi.fn<(_: GhPickerSettingsUpdate) => Promise<void>>().mockResolvedValue(undefined)
  const getGhAuthStatus = vi.fn<(params?: unknown) => Promise<GhAuthStatus>>().mockResolvedValue({ accounts: [] })
  const props = {
    useSettings: (selector: (snapshot: GhPickerSettings) => unknown) => selector(settings),
    update,
    getGhAuthStatus,
    t,
    ...over,
  } as unknown as SettingsSectionProps
  return { settings, update, getGhAuthStatus, props }
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

async function render(props: SettingsSectionProps): Promise<void> {
  await act(async () => { root.render(<GhPickerSection {...props} />) })
}

const header = (): HTMLButtonElement => {
  const button = container.querySelector('button')
  if (button === null) throw new Error('no header button rendered')
  return button
}

const select = (): HTMLSelectElement => {
  const field = container.querySelector('select')
  if (field === null) throw new Error('no insert-format select rendered')
  return field
}

describe('the settings card', () => {
  it('renders collapsed: header with title, description, and closed chevron', async () => {
    const { props } = harness()
    await render(props)
    const button = header()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-label')).toBe('settings.expand: settings.title')
    expect(button.textContent).toContain('settings.title')
    expect(button.textContent).toContain('settings.description')
    const chevron = button.querySelector('svg.dsh_atGh_cardChevron')
    expect(chevron).not.toBeNull()
    expect(button.querySelector('svg.dsh_atGh_cardChevronOpen')).toBeNull()
    // The controls stay out of the tree while collapsed.
    expect(container.querySelector('select')).toBeNull()
  })

  it('discloses the controls on click and collapses again', async () => {
    const { getGhAuthStatus, props } = harness()
    getGhAuthStatus.mockResolvedValue({ accounts: [] })
    await render(props)
    await act(async () => { header().click() })
    expect(header().getAttribute('aria-expanded')).toBe('true')
    expect(header().getAttribute('aria-label')).toBe('settings.collapse: settings.title')
    expect(header().querySelector('svg.dsh_atGh_cardChevronOpen')).not.toBeNull()
    // The connection card appears with the controls, then resolves to the
    // not-connected pill when the auth probe reports no accounts.
    expect(container.querySelector('.dsh_atGh_connCard')).not.toBeNull()
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toContain('settings.authStatus.notConnected')
    expect(container.textContent).toContain('settings.authStatus.none')
    const insert = select()
    expect(insert.value).toBe('ref')
    await act(async () => { header().click() })
    expect(header().getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('select')).toBeNull()
  })

  it('writes the insert format through update on change', async () => {
    const { update, props } = harness()
    await render(props)
    await act(async () => { header().click() })
    await act(async () => {
      const insert = select()
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(insert, 'url')
      insert.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(update).toHaveBeenCalledWith({ field: 'insertFormat', value: 'url' })
  })

  it('shows the loading copy until the status probe settles', async () => {
    let resolveStatus!: (status: GhAuthStatus) => void
    const { getGhAuthStatus, props } = harness()
    getGhAuthStatus.mockReturnValue(new Promise(resolve => { resolveStatus = resolve }))
    await render(props)
    await act(async () => { header().click() })
    expect(container.textContent).toContain('settings.authStatus.loading')
    await act(async () => { resolveStatus({ accounts: [{ host: 'github.com', login: 'bitxeno', active: true, scopes: 'repo' }] }) })
    expect(container.textContent).toContain('settings.authStatus.connected')
  })

  it('reports a probe failure as the failed copy', async () => {
    const { getGhAuthStatus, props } = harness()
    getGhAuthStatus.mockRejectedValue(new Error('boom'))
    await render(props)
    await act(async () => { header().click() })
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toContain('settings.authStatus.notConnected')
    expect(container.textContent).toContain('settings.authStatus.failed')
  })

  it('ignores a probe that resolves after the card unmounts', async () => {
    let resolveStatus!: (status: GhAuthStatus) => void
    const { getGhAuthStatus, props } = harness()
    getGhAuthStatus.mockReturnValue(new Promise(resolve => { resolveStatus = resolve }))
    await render(props)
    act(() => { root.unmount() })
    // The settlement lands on a dead card: the alive guard drops it.
    await act(async () => { resolveStatus({ accounts: [] }) })
    expect(getGhAuthStatus).toHaveBeenCalledTimes(1)
  })

  it('ignores a probe that fails after the card unmounts', async () => {
    let rejectStatus!: (reason: unknown) => void
    const { getGhAuthStatus, props } = harness()
    getGhAuthStatus.mockReturnValue(new Promise((_resolve, reject) => { rejectStatus = reject }))
    await render(props)
    act(() => { root.unmount() })
    await act(async () => { rejectStatus(new Error('late')) })
    expect(getGhAuthStatus).toHaveBeenCalledTimes(1)
  })
})