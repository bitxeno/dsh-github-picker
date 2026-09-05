/**
 * dsh-github-picker client plugin: the browser half of the GitHub picker.
 * Mounts the githubPicker Remote namespace (search + gh auth status), the
 * official plugin-configuration card (`settings.plugin.item`, keyed on the
 * `github-picker` settings namespace), and the composer control — a
 * GitHub-mark button in the input box's right tool row
 * (`conversation.input.right` list slot, the seat next to the send button).
 * Clicking it opens a searchable popup of the workspace repository's issues
 * and pull requests; picking inserts the configured reference text through
 * the framework input machine. The insert format lives in the plugin-owned
 * settings namespace and is read and written through the official settings
 * scope (there is no enable switch — the picker is always on); the Host
 * owns all data access.
 */
// Type-only: the ctx.remote merge and the forwarded Host-event face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
// Type-only: the ObservableSnapshot face of the slots hooks seat.
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
// Type-only: the ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the ctx.slots service (SlotRegistry lives on the renderer).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the conversation.input.right SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: the ctx.settingsScope service (official settings transport).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: brings the keyed settings.plugin.item SlotMap declaration (the
// plugin-configuration tab dispatches one card per served namespace).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { GH_PICKER_REMOTE } from './remote.ts'
import { HashCache } from './cache.ts'
import { classifySearchError, type SearchErrorKind } from './search.ts'
import { GhPickerButton, type PickerInjected } from './picker.tsx'
import { GhPickerSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { NS, zh, en } from './locales.ts'
import { adoptStyles } from './styles.ts'
import type { GhAuthStatus, GhPickerSettings, GhPickerSettingsUpdate, GitHubSearchResult } from '../contract.ts'

/** Required services: the Remote face, the slot registry, locale, and the settings scope. */
export const inject = ['remote', 'slots', 'locale', 'settingsScope']

/** The mounted githubPicker namespace service's callable face. */
interface GhPickerFace {
  search(query: string, page: number, sessionId: SessionId, signal?: AbortSignal): Promise<{ ok: true; value: GitHubSearchResult } | { ok: false; error: { code: string; message: string; details: object } }>
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
export function apply(ctx: Context): void {
  adoptStyles()
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-github-picker: dictionaries')

  // The official settings transport: the bound scope directly mirrors the
  // Host's `github-picker` namespace (registered in settings.ts). The card
  // writes through scope.set (revision-fenced); the composer picker reads
  // the same section for its insert format.
  const ghScope = ctx.settingsScope.bind<GhPickerSettings>({ namespace: 'github-picker' })

  let remote: GhPickerFace | undefined

  ctx.effect(async () => {
    const dispose = await ctx.remote.$mount(GH_PICKER_REMOTE)
    remote = (ctx.reflect as unknown as { get(name: string): unknown }).get('remote.githubPicker') as GhPickerFace | undefined
    if (remote === undefined) {
      throw new Error('dsh-github-picker: the githubPicker Remote namespace did not mount')
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

  // The shared settings snapshot (one source of truth for the settings card
  // and the composer control; both bind it through the slots hooks seat).
  // The scope starts 'loading' (value undefined) until the first accepted
  // Host section, so the adapter falls back to the schema default.
  // The reserved `hooks` compartment must hold HostObservable sources — the
  // slot system binds them into `use<Name>` selector hooks and REMOVES them
  // from the component props (the dsh-at-file `hooks: { scope }` pattern).
  const settingsSnapshot: ObservableSnapshot<GhPickerSettings> = {
    getSnapshot: () => ghScope.getSnapshot().value ?? { insertFormat: 'ref' },
    subscribe: listener => ghScope.subscribe(listener),
  }

  // The composer control: an icon in the input box's right tool row. Clicking
  // it opens a searchable popup of the workspace repo's issues and PRs; the
  // pick text follows the configured insert format and goes through the
  // framework input machine (inputActions.setDraft), so the Host's mention
  // scanner always marks the pick.
  ctx.effect(() => {
    const dispose = ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
      name: 'conversation.input.right',
      id: 'gh-picker',
      order: 100,
      label: () => t('nav'),
      locale: NS,
      inject: (): PickerInjected => ({
        hooks: { settings: settingsSnapshot },
        search: (query, page, sessionId, signal) => cache.resolve(query, page, sessionId, signal),
      }),
    }, GhPickerButton))
    return dispose
  }, 'dsh-github-picker: composer input slot')

  // The official plugin-configuration card (insert format + the gh
  // account-connection card). The tab pairs this keyed registration with the
  // host-served `github-picker` namespace; the card's `update` writes the
  // insert format straight through the bound settings scope.
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: 'github-picker',
    locale: NS,
    inject: (): SettingsSectionInjected => ({
      hooks: { settings: settingsSnapshot },
      update: (update: GhPickerSettingsUpdate) => ghScope.set(update.field, update.value),
      getGhAuthStatus: async () => {
        if (remote === undefined) throw new Error('dsh-github-picker: the githubPicker Remote is not mounted')
        const result = await remote.getGhAuthStatus()
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
    }),
  }, GhPickerSection))

  // Reconnect may have rebuilt the host: the cache dies with it.
  ctx.on('connection/reset', () => {
    cache.invalidateAll()
  })
}