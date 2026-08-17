/**
 * The composer picker for dsh-github-picker: a GitHub-mark button mounted into
 * the composer's right tool row (the `conversation.input.right` list slot, the
 * seat just before the send button). Clicking it opens a searchable popup of
 * the workspace repository's issues and pull requests — fetched from the host
 * search once per open (the per-session cache keeps it hot) and filtered
 * locally per keystroke. Picking one inserts the configured reference text
 * (`@owner/repo#number` or the GitHub URL) into the draft through the
 * framework input machine (`inputActions.setDraft`), so the Host's mention
 * scanner always marks the pick.
 *
 * The popup is a plain sibling of the button inside a relative wrapper —
 * `position: absolute; bottom: calc(100% + 8px); right: 0` — the same
 * no-portal anchoring as the reference dsh-skill-picker. A search failure
 * renders as one localized hint row instead of a silent close. The control
 * is always mounted (the plugin has no enable switch).
 */
// Type-only: brings the conversation slot declarations and kit into the program.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ObservableSnapshot, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { GitHubEntry, GitHubRepoRef, GitHubSearchResult, GhIssueSettings } from '../contract.ts'
import type { SearchErrorKind } from './search.ts'
import { rankEntries } from './search.ts'
import { AlertIcon, GitHubMarkIcon, ghIcon } from './icons.tsx'
import type { NS, GhIssueKey } from './locales.ts'
import { RESULT_TTL_MS } from './cache.ts'

/** Design cap on visible popup rows (mirrors the former @-trigger menu cap). */
export const MAX_CANDIDATES = 12

/** The locale key of the hint row for one search failure kind. */
export const ERROR_HINT_KEY: Record<SearchErrorKind, GhIssueKey> = {
  'no-repo': 'picker.no-repo',
  'gh-missing': 'picker.error.gh-missing',
  'not-authenticated': 'picker.error.not-authenticated',
  'rate-limited': 'picker.error.rate-limited',
  'repo-not-found': 'picker.error.repo-not-found',
  'network': 'picker.error.network',
  'unknown': 'picker.error.unknown',
}

/** The injected business face (the reserved hooks compartment binds `useSettings`). */
export interface PickerInjected {
  hooks: {
    settings: ObservableSnapshot<GhIssueSettings>
  }
  /** The Remote-backed search seam (per-session cache, host-owned data). */
  search(query: string, sessionId: SessionId, signal: AbortSignal): Promise<GitHubSearchResult>
}

/** Full component props: owner InputZone + session kit + injected face + locale seat. */
export type PickerProps = PropsRuntime<'conversation.input.right'> & InjectFace<PickerInjected> & PropsLocale<typeof NS>

/** The popup's load lifecycle. */
type LoadState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready'; readonly result: GitHubSearchResult; readonly at: number }
  | { readonly phase: 'error'; readonly kind: SearchErrorKind }

/** Row height matches the resident chrome (access mode, plan, attach, model). */
const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  margin: '0 2px',
  padding: '0',
  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
  borderRadius: '8px',
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary, #c9d2e0)',
  cursor: 'pointer',
  flex: 'none',
}

const popoverStyle = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  right: '0',
  width: '360px',
  maxHeight: '340px',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--dsw-specific-tip, #1e2533)',
  border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.35))',
  borderRadius: '12px',
  boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
  overflow: 'hidden',
  zIndex: 1000,
} as const

const searchStyle = {
  boxSizing: 'border-box',
  width: 'calc(100% - 16px)',
  margin: '8px',
  padding: '6px 10px',
  border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.3))',
  borderRadius: '8px',
  background: 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.1))',
  color: 'var(--dsw-alias-label-primary, #e6ebf2)',
  fontSize: '13px',
  outline: 'none',
} as const

const listStyle = {
  overflowY: 'auto',
  // Wheel/touch scroll chaining must stop at the popup list — otherwise
  // scrolling past the ends of the list scrolls the conversation behind it.
  overscrollBehavior: 'contain',
  flex: 'auto',
  padding: '0 6px 8px',
} as const

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '7px 10px',
  border: 'none',
  borderRadius: '8px',
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary, #e6ebf2)',
  cursor: 'pointer',
  textAlign: 'left',
} as const

const itemTitleStyle = {
  flex: '1 1 auto',
  minWidth: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '13px',
} as const

const itemNumberStyle = {
  flex: 'none',
  color: 'var(--dsw-alias-label-tertiary, #8a94a6)',
  fontSize: '12px',
} as const

const statusStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px',
  color: 'var(--dsw-alias-label-tertiary, #8a94a6)',
  fontSize: '13px',
} as const

/**
 * The pick text for one entry under the configured insert format (stays
 * within the mention grammar the Host's pre-step scanner recognizes).
 */
export function pickText(entry: GitHubEntry, repo: GitHubRepoRef, settings: GhIssueSettings): string {
  if (settings.insertFormat === 'ref') {
    return `@${repo.owner}/${repo.name}#${entry.number} `
  }
  return `${entry.url} `
}

/** The composer picker control: the icon button and its searchable popup. */
export function GhIssuePickerButton(props: PickerProps): React.ReactElement {
  const { useSettings, search, t } = props
  const settings = useSettings(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'idle' })
  const boxRef = useRef<HTMLDivElement | null>(null)
  const loadController = useRef<AbortController | undefined>(undefined)

  const load = useCallback(async () => {
    const sessionId = props.session?.sessionId
    if (sessionId === undefined) return
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller
    setLoadState({ phase: 'loading' })
    try {
      const result = await search('', sessionId, controller.signal)
      setLoadState({ phase: 'ready', result, at: Date.now() })
    } catch (error) {
      if (controller.signal.aborted) return
      setLoadState({ phase: 'error', kind: (error as { kind?: SearchErrorKind }).kind ?? 'unknown' })
    }
  }, [search, props.session?.sessionId])

  const close = () => {
    loadController.current?.abort()
    setOpen(false)
  }

  const toggle = () => {
    if (!open) {
      // Idle, an aborted/hung load, a failure, or a stale list all reload;
      // a fresh list is served from the loaded state (and the cache TTL).
      const stale = loadState.phase === 'ready' && Date.now() - loadState.at >= RESULT_TTL_MS
      if (loadState.phase !== 'ready' || stale) {
        void load()
      }
      setOpen(true)
    } else {
      close()
    }
  }

  const pick = (entry: GitHubEntry, repo: GitHubRepoRef) => {
    let draft = ''
    try {
      if (typeof props.input?.draft === 'string') {
        draft = props.input.draft
      } else if (typeof props.useInput === 'function') {
        draft = props.useInput((snapshot) => snapshot).draft
      }
    } catch (cause) {
      console.error('[dsh-github-picker] reading the draft failed:', cause)
    }
    const separator = draft === '' || draft.endsWith(' ') || draft.endsWith('\n') ? '' : ' '
    const next = `${draft}${separator}${pickText(entry, repo, settings)}`
    if (typeof props.inputActions?.setDraft === 'function') {
      props.inputActions.setDraft(next)
    }
    close()
    setQuery('')
  }

  // Close on outside pointer-down (the shell's menu convention).
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      // The wrapper is always mounted while the popup is open.
      /* v8 ignore next 2 -- boxRef.current is non-null whenever the listener exists */
      if (boxRef.current === null) return
      if (!boxRef.current.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Escape closes the popup.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Abort any in-flight load when the component unmounts.
  useEffect(() => () => { loadController.current?.abort() }, [])

  const rows = loadState.phase === 'ready'
    ? rankEntries(loadState.result.entries, query, MAX_CANDIDATES)
    : []

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
      <button
        type="button"
        onClick={toggle}
        title={t('picker.open')}
        aria-label={t('picker.open')}
        style={{
          ...buttonStyle,
          ...(open ? { color: 'var(--dsw-alias-label-primary-bluish, #4cc9f0)' } : {}),
        }}
      >
        <GitHubMarkIcon />
      </button>
      {open && (
        <div style={popoverStyle}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('picker.search')}
            style={searchStyle}
            autoFocus
          />
          {loadState.phase === 'loading' && (
            <div style={statusStyle}>{t('picker.loading')}</div>
          )}
          {loadState.phase === 'error' && (
            <div style={statusStyle}>
              <span style={{ flex: 'none' }}>{AlertIcon()}</span>
              {t(ERROR_HINT_KEY[loadState.kind])}
            </div>
          )}
          {loadState.phase === 'ready' && (
            <div style={listStyle}>
              {rows.length === 0 ? (
                <div style={statusStyle}>{t('picker.empty')}</div>
              ) : (
                rows.map((entry) => (
                  <button
                    key={entry.number}
                    type="button"
                    onClick={() => pick(entry, loadState.result.repo)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.12))'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent'
                    }}
                    style={itemStyle}
                  >
                    <span style={{ flex: 'none', display: 'inline-flex' }}>{ghIcon(entry)}</span>
                    <span style={itemTitleStyle}>{entry.title}</span>
                    <span style={itemNumberStyle}>{`#${entry.number}`}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
