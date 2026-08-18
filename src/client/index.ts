/**
 * dsh-github-picker client plugin: the browser half of the GitHub picker.
 * Mounts the githubPicker Remote namespace, the settings section, and the composer
 * control — a GitHub-mark button in the input box's right tool row
 * (`conversation.input.right` list slot, the seat next to the send button).
 * Clicking it opens a searchable popup of the workspace repository's issues
 * and pull requests; picking inserts the configured reference text through
 * the framework input machine. The settings page manages the insert format
 * (there is no enable switch — the picker is always on); the Host owns all
 * data access.
 */
// Type-only: the ctx.remote merge and the forwarded Host-event face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: brings the settings.section SlotMap declaration into this program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { GH_ISSUE_REMOTE } from './remote.ts'
import { HashCache } from './cache.ts'
import { classifySearchError, type SearchErrorKind } from './search.ts'
import { GhIssuePickerButton, type PickerInjected } from './picker.tsx'
import { GhIssueSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { NS, zh, en } from './locales.ts'
import { adoptStyles } from './styles.ts'
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate, GitHubSearchResult } from '../contract.ts'

/** Required services: the Remote face, the slot registry, and locale. */
export const inject = ['remote', 'slots', 'locale']

/** The mounted githubPicker namespace service's callable face. */
interface GhIssueFace {
  search(query: string, page: number, sessionId: SessionId, signal?: AbortSignal): Promise<{ ok: true; value: GitHubSearchResult } | { ok: false; error: { code: string; message: string; details: object } }>
  getSettings(): Promise<{ ok: true; value: GhIssueSettings } | { ok: false; error: { code: string; message: string; details: object } }>
  updateSettings(update: GhIssueSettingsUpdate): Promise<{ ok: true; value: GhIssueSettings } | { ok: false; error: { code: string; message: string; details: object } }>
  getGhAuthStatus(): Promise<{ ok: true; value: GhAuthStatus } | { ok: false; error: { code: string; message: string; details: object } }>
}

/** Map a gateway wire error to a picker error kind (message-based). */
function wireErrorKind(code: string, message: string): SearchErrorKind {
  return classifySearchError(code, message)
}

/**
 * Compose the GitHub picker surface.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-github-picker: dictionaries')

  // The plugin's own settings snapshot (loaded from the Host on mount).
  let settings: GhIssueSettings = { insertFormat: 'ref' }
  const settingsListeners = new Set<() => void>()
  const notifySettings = (): void => {
    for (const listener of [...settingsListeners]) listener()
  }
  const subscribeSettings = (listener: () => void): (() => void) => {
    settingsListeners.add(listener)
    return () => { settingsListeners.delete(listener) }
  }

  let remote: GhIssueFace | undefined

  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount(GH_ISSUE_REMOTE)
    remote = (ctx.reflect as unknown as { get(name: string): unknown }).get('remote.githubPicker') as GhIssueFace | undefined
    if (remote === undefined) {
      throw new Error('dsh-github-picker: the githubPicker Remote namespace did not mount')
    }
    // Load the durable settings snapshot once the wire is live.
    const settingsResult = await remote.getSettings()
    if (settingsResult.ok) {
      settings = settingsResult.value
      notifySettings()
    }
    return () => {
      remote = undefined
      void dispose()
    }
  }, 'dsh-github-picker: remote')

  // The per-session result cache (session- and page-keyed inside HashCache).
  const cache = new HashCache(async (query, page, sessionId, signal) => {
    if (remote === undefined) throw new Error('dsh-github-picker: the githubPicker Remote is not mounted')
    const result = await remote.search(query, page, sessionId, signal)
    if (!result.ok) {
      const error = new Error(result.error.message) as Error & { kind?: string }
      error.kind = wireErrorKind(result.error.code, result.error.message)
      throw error
    }
    return result.value
  })

  // The shared settings snapshot (one source of truth for the settings page
  // and the composer control; both bind it through the slots hooks seat).
  // The reserved `hooks` compartment must hold HostObservable sources — the
  // slot system binds them into `use<Name>` selector hooks and REMOVES them
  // from the component props (the dsh-at-file `hooks: { scope }` pattern).
  const settingsSnapshot: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<GhIssueSettings> = {
    getSnapshot: () => settings,
    subscribe: subscribeSettings,
  }

  // The composer control: an icon in the input box's right tool row. Clicking
  // it opens a searchable popup of the workspace repo's issues and PRs; the
  // pick text follows the configured insert format and goes through the
  // framework input machine (inputActions.setDraft), so the Host's mention
  // scanner always marks the pick.
  ctx.effect(() => {
    const dispose = ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
      name: 'conversation.input.right',
      id: 'gh-issue-picker',
      order: 100,
      label: () => t('nav'),
      locale: NS,
      inject: (): PickerInjected => ({
        hooks: { settings: settingsSnapshot },
        search: (query, page, sessionId, signal) => cache.resolve(query, page, sessionId, signal),
      }),
    }, GhIssuePickerButton))
    return dispose
  }, 'dsh-github-picker: composer input slot')

  // The settings section: insert format and the gh account-connection status
  // card. The repository is always resolved from the workspace git remote —
  // no override field, no enable switch.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'github-settings',
    order: 55,
    label: () => t('nav'),
    locale: NS,
    inject: (): SettingsSectionInjected => ({
      hooks: { settings: settingsSnapshot },
      update: async (update: GhIssueSettingsUpdate) => {
        if (remote === undefined) throw new Error('dsh-github-picker: the githubPicker Remote is not mounted')
        const result = await remote.updateSettings(update)
        if (!result.ok) throw new Error(result.error.message)
        settings = result.value
        notifySettings()
      },
      getGhAuthStatus: async () => {
        if (remote === undefined) throw new Error('dsh-github-picker: the githubPicker Remote is not mounted')
        const result = await remote.getGhAuthStatus()
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
    }),
  }, GhIssueSection))

  // Reconnect may have rebuilt the host: the cache dies with it.
  ctx.on('connection/reset', () => {
    cache.invalidateAll()
  })
}