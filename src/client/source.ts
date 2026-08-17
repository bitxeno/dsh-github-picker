/**
 * The `@` input-trigger source for GitHub issue/PR search: registered under
 * the STANDARD pipeline (the same trigger as dsh-at-file's path picker), so
 * trigger detection, the grouped menu, keyboard navigation, and per-session
 * wiring are all framework-owned. The source only supplies candidates (the
 * existing host search through the session cache) and the pick text (the
 * configured insert format). A search failure is rendered as one localized
 * hint row — the framework's `source-failed` path silently closes the menu,
 * which would hide "gh is not installed" behind a console log.
 */
import type { InputTriggerCandidate, InputTriggerSource, PickOutcome } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { GitHubEntry, GitHubRepoRef, GhIssueSettings } from '../contract.ts'
import type { SearchErrorKind } from './search.ts'
import { AlertIcon, ghIcon } from './icons.tsx'

/** Owner source name (the menu group label and routing key). */
export const SOURCE_NAME = 'github'

/** Menu group order relative to the other @ sources (at-file is 0). */
export const SOURCE_ORDER = 20

/** Design cap on visible picker rows (mirrors dsh-at-file). */
export const MAX_CANDIDATES = 12

declare module '@deepseek-ai/dsh-client-ui-input-trigger/client' {
  interface InputTriggerCandidate {
    /** The issue/PR kind for the icon. */
    readonly ghKind?: GitHubEntry['kind']
    /** The entry number. */
    readonly ghNumber?: number
    /** The GitHub URL (the default insert format). */
    readonly ghUrl?: string
    /** The repository identity (for the @owner/repo#number format). */
    readonly ghRepo?: GitHubRepoRef
    /** Marks the search-failure hint row: rendered, never pickable. */
    readonly ghError?: boolean
  }
}

/** The search seam the wiring layer injects (Remote-backed, cached). */
export interface GhSearch {
  (query: string, sessionId: SessionId, signal: AbortSignal): Promise<{ entries: readonly GitHubEntry[]; repo: GitHubRepoRef }>
}

/** The source's injected deps. */
export interface GhSourceDeps {
  search: GhSearch
  /** Live settings read (insert format + enable gate). */
  settings(): GhIssueSettings
  /** Localized copy lookup for the hint row (e.g. `ctx.locale.bind(NS)`). */
  t(key: string): string
}

/** The locale key of the hint row for one search failure kind. */
export const ERROR_HINT_KEY: Record<SearchErrorKind, string> = {
  'no-repo': 'menu.no-repo',
  'gh-missing': 'menu.error.gh-missing',
  'not-authenticated': 'menu.error.not-authenticated',
  'rate-limited': 'menu.error.rate-limited',
  'repo-not-found': 'menu.error.repo-not-found',
  'network': 'menu.error.network',
  'unknown': 'menu.error.unknown',
}

/** One failure hint row: the localized message, a muted alert, unpickable. */
function errorCandidate(kind: SearchErrorKind, t: (key: string) => string): InputTriggerCandidate {
  return {
    name: t(ERROR_HINT_KEY[kind]),
    icon: AlertIcon() as unknown as string,
    ghError: true,
  }
}

/** Project one search entry into a menu candidate carrying the pick data. */
export function toCandidate(entry: GitHubEntry, repo: GitHubRepoRef): InputTriggerCandidate {
  // GitHub-style row: the TITLE leads (name = 40% slot) and the `#number`
  // tag trails in the wide description slot — no "Issue"/"PR" prefix; the
  // state rides the leading octicon. The icon is a real SVG element (the
  // dsh-at-file trick: React renders the element; only plain strings render
  // as text).
  return {
    name: entry.title,
    description: `#${entry.number}`,
    // The candidate icon slot renders React elements as real SVGs (the
    // dsh-at-file trick); only plain strings render as text.
    icon: ghIcon(entry) as unknown as string,
    ghKind: entry.kind,
    ghNumber: entry.number,
    ghUrl: entry.url,
    ghRepo: repo,
  }
}

/** The pick text for one entry under the configured insert format. */
export function pickText(entry: GitHubEntry, repo: GitHubRepoRef, settings: GhIssueSettings): string {
  if (settings.insertFormat === 'ref') {
    return `@${repo.owner}/${repo.name}#${entry.number} `
  }
  return `${entry.url} `
}

/**
 * Build the `@` trigger source over the injected deps.
 * @param deps - the search seam, live settings, and the localized copy.
 * @returns the source to register with `inputTriggers.registerSource`.
 */
export function createGhSource(deps: GhSourceDeps): InputTriggerSource {
  return {
    trigger: '@',
    name: SOURCE_NAME,
    order: SOURCE_ORDER,
    async candidates(session, { query, signal }) {
      if (!deps.settings().enabled) return []
      try {
        const result = await deps.search(query, session.sessionId, signal)
        return result.entries.slice(0, MAX_CANDIDATES).map(entry => toCandidate(entry, result.repo))
      } catch (error) {
        // The cache classifies the wire failure into a SearchErrorKind.
        const kind = (error as { kind?: SearchErrorKind }).kind ?? 'unknown'
        return [errorCandidate(kind, deps.t)]
      }
    },
    onPick({ candidate }): PickOutcome {
      if (candidate.ghError === true) return undefined
      if (candidate.ghNumber === undefined || candidate.ghRepo === undefined) return undefined
      const entry: GitHubEntry = {
        number: candidate.ghNumber,
        title: candidate.name,
        kind: candidate.ghKind ?? 'issue',
        state: 'open',
        url: candidate.ghUrl ?? '',
      }
      return { text: pickText(entry, candidate.ghRepo, deps.settings()) }
    },
  }
}
