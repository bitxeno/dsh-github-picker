/**
 * gh CLI account-connection status for the Web settings page. The plugin only
 * ever uses gh (no device flow, no stored tokens): `gh auth status --json
 * hosts` reports every logged-in account with its host, login, active flag,
 * and scopes — the picker-facing snapshot the settings card renders. No token
 * material is read or kept; the same subprocess seam the search provider
 * uses keeps this unit-testable.
 */
import type { GhCommand } from './providers/gh.ts'

/** One logged-in gh account (only connection facts, never the token). */
export interface GhAuthAccount {
  /** The host the account is logged into (e.g. github.com). */
  readonly host: string
  /** The gh/account login name. */
  readonly login: string
  /** Whether this is the active account for git operations. */
  readonly active: boolean
  /** The comma-separated token scopes the account holds ('' when unknown). */
  readonly scopes: string
}

/** The gh account-connection status surfaced to the browser. */
export interface GhAuthStatus {
  /** Every logged-in account, in gh's reported order; empty when none. */
  readonly accounts: readonly GhAuthAccount[]
  /** Stable failure kind when the status could not be read (search-style). */
  readonly error?: 'gh-missing' | 'not-authenticated' | 'unknown'
}

/** The raw `gh auth status --json hosts` envelope. */
interface RawHostsPayload {
  readonly hosts?: Record<string, readonly RawAccount[] | undefined>
}

/** One raw account inside the hosts payload. */
interface RawAccount {
  readonly host: string
  readonly login: string
  readonly active: boolean
  readonly state: string
  readonly scopes: string
}

/** Classify a `gh auth status` subprocess failure (gh missing vs. other). */
export function classifyAuthError(error: unknown): 'gh-missing' | 'unknown' {
  if (error instanceof Error && 'code' in error) {
    if ((error as { code?: unknown }).code === 'ENOENT') return 'gh-missing'
  }
  return 'unknown'
}

/**
 * Read the gh account-connection status through the subprocess seam.
 * @param command - the gh command runner (defaults to the real one).
 * @param timeoutMs - subprocess timeout.
 * @returns the account list, plus a stable error kind when the read failed.
 */
export async function readGhAuthStatus(
  command: GhCommand,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<GhAuthStatus> {
  let stdout: string
  try {
    stdout = await command.run(['auth', 'status', '--json', 'hosts'], signal, timeoutMs)
  } catch (error) {
    signal.throwIfAborted()
    return { accounts: [], error: classifyAuthError(error) }
  }
  let payload: RawHostsPayload
  try {
    payload = JSON.parse(stdout) as RawHostsPayload
  } catch (error) {
    /* v8 ignore next -- gh emits JSON on success; a parse failure means an unexpected shape. */
    return { accounts: [], error: 'unknown' }
  }
  const accounts: GhAuthAccount[] = []
  for (const [host, list] of Object.entries(payload.hosts ?? {})) {
    for (const account of list ?? []) {
      if (typeof account?.login !== 'string' || account.login === '') continue
      accounts.push({
        host: account.host || host,
        login: account.login,
        active: account.active === true,
        scopes: typeof account.scopes === 'string' ? account.scopes : '',
      })
    }
  }
  return { accounts }
}