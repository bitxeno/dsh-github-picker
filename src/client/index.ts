/**
 * dsh-github-picker client plugin: the browser half of the GitHub picker.
 * Mounts the githubPicker Remote namespace (search + gh auth status), the
 * plugin-configuration card (`plugins.item`, while the Host serves this
 * entry), and the composer control — a GitHub-mark button in the input box's
 * right tool row (`conversation.input.right` list slot, the seat next to the
 * send button). Clicking it opens a searchable popup of the workspace
 * repository's issues and pull requests; picking inserts the configured
 * reference text through the framework input machine. The insert format lives
 * in the entry's volatile Config field and is read and written through the
 * shared config forms (there is no enable switch — the picker is always on);
 * the Host owns all data access.
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
// Type-only: the ctx.configForms service (shared Host configuration forms).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: brings the `plugins.item` SlotMap declaration (the Plugins page
// lists one official entry per registration).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { GH_PICKER_REMOTE } from './remote.ts'
import { HashCache } from './cache.ts'
import { classifySearchError, type SearchErrorKind } from './search.ts'
import { GhPickerButton, type PickerInjected } from './picker.tsx'
import { GhPickerSection, type SettingsSectionInjected } from './SettingsSection.tsx'
import { NS, zh, en } from './locales.ts'
import { adoptStyles } from './styles.ts'
import type { GhAuthStatus, GhPickerSettings, GhPickerSettingsUpdate, GitHubSearchResult } from '../contract.ts'

/**
 * Loader entry id (cordis.patch.yml) — also the settings namespace the Host
 * serves. Spelled here rather than imported: a client bundle must not depend
 * on a Host module.
 */
export const GH_PICKER_ENTRY_ID = 'dsh-github-picker'

/** Required services: the Remote face, the slot registry, locale, and the shared config forms. */
export const inject = ['remote', 'slots', 'locale', 'configForms']

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

  // The shared entry form: the Host serves the volatile `insertFormat` Config
  // field under this entry id. Reads ride the shared describe mirror; writes
  // carry the latest known revision and fold their answers back into it.
  const ghForm = ctx.configForms.get<GhPickerSettings>(GH_PICKER_ENTRY_ID)

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
  // The form starts 'loading' (value undefined) until the first accepted
  // Host section, so the adapter falls back to the schema default.
  // The reserved `hooks` compartment must hold HostObservable sources — the
  // slot system binds them into `use<Name>` selector hooks and REMOVES them
  // from the component props (the dsh-at-file `hooks: { scope }` pattern).
  const settingsSnapshot: ObservableSnapshot<GhPickerSettings> = {
    getSnapshot: () => ghForm.getSnapshot().value ?? { insertFormat: 'ref' },
    subscribe: listener => ghForm.subscribe(listener),
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

  // The Plugins-page card (insert format + the gh account-connection card).
  // Registered while the Host serves this entry, so a deployment without the
  // plugin shows no trace of it. The card's `update` writes the insert format
  // through the shared entry form; `view: 'summary'` is the list one-liner.
  ctx.effect(() => ctx.configForms.whileServed([GH_PICKER_ENTRY_ID], () => ctx.slots.inject('plugins.item', () => ctx.slots.register({
    name: 'plugins.item',
    id: 'github-picker',
    order: 50,
    label: () => t('settings.title'),
    locale: NS,
    inject: (): SettingsSectionInjected => ({
      hooks: { settings: settingsSnapshot },
      update: async (update: GhPickerSettingsUpdate) => { await ghForm.set(update.field, update.value) },
      getGhAuthStatus: async () => {
        if (remote === undefined) throw new Error('dsh-github-picker: the githubPicker Remote is not mounted')
        const result = await remote.getGhAuthStatus()
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
    }),
  }, GhPickerSection))), 'dsh-github-picker: plugins item')

  // Reconnect may have rebuilt the host: the cache dies with it.
  ctx.on('connection/reset', () => {
    cache.invalidateAll()
  })
}