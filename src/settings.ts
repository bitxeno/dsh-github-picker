/**
 * The `github-picker` settings namespace: the durable insert format and
 * result cap managed from the Web settings page. Registered with the settings
 * provider at plugin load; the runtime reads the owner scope's live value on
 * every call, so a change takes effect without a restart. There is no enable
 * switch — the picker is always on. The data source is always the gh CLI and
 * the repository always resolves from the workspace git remote — there is no
 * device flow, no stored token, no override field.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import type { GhPickerSettings } from './contract.ts'

/** The branded namespace name (the Web allowlist must list the same string). */
export const GH_PICKER_NAMESPACE = settingsNamespace('github-picker')

/** Schemastery schema of the `github-picker` namespace section. */
export const GhPickerSettingsSchema: z<GhPickerSettings> = z.object({
  insertFormat: z.union(['url', 'ref'] as const).default('ref'),
})

/**
 * Register the namespace with the settings provider and return its owner scope.
 * @param ctx - the plugin context carrying the settings provider.
 * @returns the owner scope backing the runtime's live reads.
 */
export function registerGhPickerSettings(ctx: Context): SettingsScope<GhPickerSettings> {
  return ctx.settings.register(GH_PICKER_NAMESPACE, GhPickerSettingsSchema, { applies: 'live' })
}