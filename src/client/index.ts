/**
 * dsh-github-picker client plugin: the browser half of the GitHub @ mention.
 * Mounts the ghIssue Remote namespace and registers a STANDARD
 * input-trigger source under `@` (sharing the trigger with dsh-at-file's
 * path picker — the pipeline groups sources by trigger). Trigger detection,
 * the grouped menu, keyboard navigation, and per-session wiring are all
 * framework-owned; the plugin only supplies candidates (the host search
 * through a per-session cache) and the pick text (the configured insert
 * format). The Host owns all data access.
 */
// Type-only: the ctx.remote merge and the forwarded Host-event face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: brings the settings.section SlotMap declaration into this program.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InputTriggerServiceContract } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { GH_ISSUE_REMOTE } from './remote.ts'
import { HashCache } from './cache.ts'
import { createGhSource } from './source.ts'
import { classifySearchError, type SearchErrorKind } from './search.ts'
import { GhIssueSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { NS, zh, en } from './locales.ts'
import { adoptStyles } from './styles.ts'
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate, GitHubSearchResult } from '../contract.ts'

/** Required services: input triggers (source roster), Remote face, slots, and locale. */
export const inject = ['inputTriggers', 'remote', 'slots', 'locale']

/** The mounted ghIssue namespace service's callable face. */
interface GhIssueFace {
  search(query: string, sessionId: SessionId, signal?: AbortSignal): Promise<{ ok: true; value: GitHubSearchResult } | { ok: false; error: { code: string; message: string; details: object } }>
  getSettings(): Promise<{ ok: true; value: GhIssueSettings } | { ok: false; error: { code: string; message: string; details: object } }>
  updateSettings(update: GhIssueSettingsUpdate): Promise<{ ok: true; value: GhIssueSettings } | { ok: false; error: { code: string; message: string; details: object } }>
  getGhAuthStatus(): Promise<{ ok: true; value: GhAuthStatus } | { ok: false; error: { code: string; message: string; details: object } }>
}

/** Map a gateway wire error to a picker error kind (message-based). */
function wireErrorKind(code: string, message: string): SearchErrorKind {
  return classifySearchError(code, message)
}

/**
 * Compose the GitHub @ mention surface.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  adoptStyles()
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-github-picker: dictionaries')

  // The plugin's own settings snapshot (loaded from the Host on mount).
  let settings: GhIssueSettings = { enabled: true, insertFormat: 'ref' }
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
    remote = (ctx.reflect as unknown as { get(name: string): unknown }).get('remote.ghIssue') as GhIssueFace | undefined
    if (remote === undefined) {
      throw new Error('dsh-github-picker: the ghIssue Remote namespace did not mount')
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

  // The per-session result cache (session-keyed inside HashCache).
  const cache = new HashCache(async (query, sessionId, signal) => {
    if (remote === undefined) throw new Error('dsh-github-picker: the ghIssue Remote is not mounted')
    const result = await remote.search(query, sessionId, signal)
    if (!result.ok) {
      const error = new Error(result.error.message) as Error & { kind?: string }
      error.kind = wireErrorKind(result.error.code, result.error.message)
      throw error
    }
    return result.value
  })

  // The standard `@` source: candidates come from the host search, the pick
  // text follows the configured insert format. The pipeline owns the menu.
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
  ctx.effect(() => {
    const dispose = inputTriggers.registerSource(createGhSource({
      search: (query, sessionId, signal) => cache.resolve(query, sessionId, signal),
      settings: () => settings,
      t,
    }))
    return dispose
  }, 'dsh-github-picker: @ source')

  // The settings section: enable, insert format, and the gh account-connection
  // status card. The repository is always resolved from the workspace git
  // remote — no override field.
  // The reserved `hooks` compartment must hold HostObservable sources — the
  // slot system binds them into `use<Name>` selector hooks and REMOVES them
  // from the component props (the dsh-at-file `hooks: { scope }` pattern).
  const settingsSnapshot: import('@deepseek-ai/dsh-client-runtime/client').ObservableSnapshot<GhIssueSettings> = {
    getSnapshot: () => settings,
    subscribe: subscribeSettings,
  }
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'at-github',
    order: 55,
    label: () => t('nav'),
    locale: NS,
    inject: (): SettingsSectionInjected => ({
      hooks: { settings: settingsSnapshot },
      update: async (update: GhIssueSettingsUpdate) => {
        if (remote === undefined) throw new Error('dsh-github-picker: the ghIssue Remote is not mounted')
        const result = await remote.updateSettings(update)
        if (!result.ok) throw new Error(result.error.message)
        settings = result.value
        notifySettings()
      },
      getGhAuthStatus: async () => {
        if (remote === undefined) throw new Error('dsh-github-picker: the ghIssue Remote is not mounted')
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
