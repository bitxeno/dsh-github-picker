/**
 * The plugin-configuration card for dsh-github-picker: the insert format and
 * the gh CLI account-connection status card. Registers into the official
 * `settings.plugin.item` slot under the `github-picker` namespace key; reads
 * and writes go through the bound settings scope (the official settings
 * transport — the plugin's own namespace is served by the Host directly, no
 * custom wire method). There is no enable switch and no result limit: the
 * picker is always on and the popup scrolls through every page the provider
 * returns. All dsh imports are type-only.
 */
import { useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { GhAuthStatus, GhIssueSettings, GhIssueSettingsUpdate } from '../contract.ts'
import { ChevronDown14, GitHubMarkIcon } from './icons.tsx'
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

/** Full card props: runtime share + injected face + locale seat. */
export type SettingsSectionProps = PropsRuntime<'settings.plugin.item'> & InjectFace<SettingsSectionInjected> & PropsLocale<typeof NS>

/** The gh account-connection card's live state. */
type AuthCardState =
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready' }
  | { readonly phase: 'error'; readonly message: string }

/** The plugin-configuration card component (official PluginCard structure). */
export function GhIssueSection({ useSettings, update, getGhAuthStatus, t }: SettingsSectionProps) {
  // The `hooks.settings` ObservableSnapshot arrives as the bound useSettings
  // selector hook (the slot system's reserved-hooks binding).
  const settings = useSettings(snapshot => snapshot)
  const [open, setOpen] = useState(false)
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
  const title = t('settings.title')

  return (
    <section className={open ? 'dsh_atGh_card dsh_atGh_cardOpen' : 'dsh_atGh_card'}>
      {/* The disclosure header, mirroring the official PluginCard: a button
          that stacks the plugin title over one description line and chevron. */}
      <button
        type="button"
        className="dsh_atGh_cardHeader"
        aria-expanded={open}
        aria-label={`${t(open ? 'settings.collapse' : 'settings.expand')}: ${title}`}
        onClick={() => { setOpen(!open) }}
      >
        <span className="dsh_atGh_cardHeadText">
          <span className="dsh_atGh_cardName">{title}</span>
          <span className="dsh_atGh_cardDescription">{t('settings.description')}</span>
        </span>
        <ChevronDown14 className={open ? 'dsh_atGh_cardChevron dsh_atGh_cardChevronOpen' : 'dsh_atGh_cardChevron'} />
      </button>
      {open && (
        <div className="dsh_atGh_cardBody">
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
        </div>
      )}
    </section>
  )
}