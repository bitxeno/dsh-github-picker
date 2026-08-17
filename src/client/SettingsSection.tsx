/**
 * The settings page section for dsh-github-picker: the insert format and the
 * gh CLI account-connection status card. Reads and writes go through the
 * plugin-owned settings snapshot and the Remote updateSettings path — the
 * public DSH package does not expose the gh-issue namespace to the browser.
 * There is no enable switch: the picker is always on. All dsh imports are
 * type-only.
 */
import { useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate } from '../contract.ts'
import { GitHubMarkIcon } from './icons.tsx'
import type { NS } from './locales.ts'

/**
 * The injected business face. The reserved `hooks` compartment must carry
 * HostObservable sources only: the slot system binds each into a `use<Name>`
 * selector hook (`hooks.settings` → `useSettings`) and REMOVES `hooks` from
 * the component props — so the component never reads `hooks` directly.
 */
export interface SettingsSectionInjected {
  hooks: {
    settings: ObservableSnapshot<GhIssueSettings>
  }
  update(update: GhIssueSettingsUpdate): Promise<void>
  getGhAuthStatus(): Promise<GhAuthStatus>
}

/** Full section props: runtime share + injected face + locale seat. */
export type SettingsSectionProps = PropsRuntime<'settings.section'> & InjectFace<SettingsSectionInjected> & PropsLocale<typeof NS>

/** The gh account-connection card's live state. */
type AuthCardState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready' }
  | { readonly phase: 'error'; readonly message: string }

/** The settings section component. */
export function GhIssueSection({ useSettings, update, getGhAuthStatus, t }: SettingsSectionProps) {
  // The `hooks.settings` ObservableSnapshot arrives as the bound useSettings
  // selector hook (the slot system's reserved-hooks binding).
  const settings = useSettings(snapshot => snapshot)
  const [auth, setAuth] = useState<AuthCardState>({ phase: 'loading' })
  const [saving, setSaving] = useState(false)

  // Load the gh account-connection status once on mount ("initialization").
  useEffect(() => {
    let alive = true
    void getGhAuthStatus().then(
      status => {
        if (!alive) return
        setAuth(status.accounts.length > 0 ? { phase: 'ready' } : { phase: 'error', message: t('settings.authStatus.none') })
      },
      () => {
        if (alive) setAuth({ phase: 'error', message: t('settings.authStatus.failed') })
      },
    )
    return () => { alive = false }
  }, [getGhAuthStatus, t])

  const setField = (next: GhIssueSettingsUpdate): void => {
    setSaving(true)
    void update(next).finally(() => { setSaving(false) })
  }

  const connected = auth.phase === 'ready'
  const statusPillClass = auth.phase === 'error'
    ? 'dsh_atGh_statusPill dsh_atGh_statusPill_off'
    : 'dsh_atGh_statusPill dsh_atGh_statusPill_on'

  return (
    <section className="dsh_atGh_section" aria-labelledby="dsh-github-picker-settings-title">
      <h2 id="dsh-github-picker-settings-title" className="dsh_atGh_title">{t('settings.title')}</h2>
      {/* The GitHub-branded connection card (github ↔ gh CLI ↔ Connected). */}
      <div className="dsh_atGh_connCard">
        <span className="dsh_atGh_connMark"><GitHubMarkIcon /></span>
        <span className="dsh_atGh_connBody">
          <span className="dsh_atGh_connTitle">{t('settings.authStatus.title')}</span>
          <span className="dsh_atGh_connVia">
            {t('settings.authStatus.via')}
            <code className="dsh_atGh_connCli">{t('settings.authStatus.cli')}</code>
            {t('settings.authStatus.period')}
          </span>
        </span>
        {auth.phase === 'loading'
          ? <span className="dsh_atGh_connLoading">{t('settings.authStatus.loading')}</span>
          : (
            <span className={statusPillClass}>
              {connected ? t('settings.authStatus.connected') : t('settings.authStatus.notConnected')}
            </span>
          )}
      </div>
      {auth.phase === 'error' && <span className="dsh_atGh_connError">{t('settings.authStatus.error', { message: auth.message })}</span>}
      <div className="dsh_atGh_field">
        <span>{t('settings.insertFormat')}</span>
        <select
          className="dsh_atGh_select"
          value={settings.insertFormat}
          disabled={saving}
          onChange={event => { void setField({ field: 'insertFormat', value: event.target.value as 'url' | 'ref' }) }}
        >
          <option value="ref">{t('settings.insertFormat.ref')}</option>
          <option value="url">{t('settings.insertFormat.url')}</option>
        </select>
        <span>{t('settings.insertFormatDesc')}</span>
      </div>
    </section>
  )
}