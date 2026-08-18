/**
 * GitHub-style state icons for the picker popup rows, matching the octicon
 * glyphs GitHub shows in issue/PR lists:
 *
 *   open issue    – issue-opened            green
 *   closed issue  – issue-closed (check)    purple
 *   open PR       – git-pull-request        green
 *   draft PR      – git-pull-request-draft  gray
 *   closed PR     – git-pull-request-closed red (X)
 *   merged PR     – git-merge               purple
 *
 * The candidate icon slot renders whatever React receives — a real element
 * renders as an SVG (the dsh-at-file path-picker trick), only plain strings
 * render as text. Path data is the MIT-licensed Octicons set (16px), drawn
 * with `fill="currentColor"` so one `color` style switch recolors the glyph.
 */
import type { ReactElement } from 'react'
import type { GitHubEntry } from '../contract.ts'

/** GitHub's state colors (light-theme palette, readable on both themes). */
export const GH_COLORS = {
  open: '#1f883d',
  issueClosed: '#8250df',
  prClosed: '#cf222e',
  merged: '#8250df',
  draft: '#8b949e',
} as const

/** Issue-open octicon: circle outline with a center dot. */
const ISSUE_OPENED = [
  'M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z',
]

/** Issue-closed octicon: circle outline with a checkmark. */
const ISSUE_CLOSED = [
  'M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z',
  'M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z',
]

/** Open pull-request octicon: circle, stem, and target node. */
const GIT_PULL_REQUEST = [
  'M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z',
  'M3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z',
]

/** Draft pull-request octicon: PR glyph with a dashed connection. */
const GIT_PULL_REQUEST_DRAFT = [
  'M3.25 1A2.25 2.25 0 0 0 1 3.25v1.5a.75.75 0 0 0 1.5 0v-1.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 0 0-1.5h-1.5Z',
  'M13.75 1.5h-1.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 0 1.5 0v-1.5A2.25 2.25 0 0 0 13.75 1.5Z',
  'M6.427 2.427a.25.25 0 0 1 0 .354l-.927.927.927.927a.25.25 0 0 1-.354.354L5 3.75l-.927.927a.25.25 0 0 1-.354-.354l.927-.927-.927-.927a.25.25 0 0 1 .354-.354L5 3.042l.927-.927a.25.25 0 0 1 .354 0Z',
  'M14 7a2.25 2.25 0 0 1 1.5 2.122v5.256a2.251 2.251 0 1 1-1.5 0V9.122A2.25 2.25 0 0 1 14 7Z',
  'M3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z',
  'M5.5 10.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
]

/** Closed pull-request octicon: PR glyph with an X on the closes node. */
const GIT_PULL_REQUEST_CLOSED = [
  'M3.25 1A2.25 2.25 0 0 0 1 3.25v1.5a.75.75 0 0 0 1.5 0v-1.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 0 0-1.5h-1.5Z',
  'M13.75 1.5h-1.5a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 0 1.5 0v-1.5A2.25 2.25 0 0 0 13.75 1.5Z',
  'M14 7a2.25 2.25 0 0 1 1.5 2.122v5.256a2.251 2.251 0 1 1-1.5 0V9.122A2.25 2.25 0 0 1 14 7Zm-5.427.573.927-.927 2.104 2.104a.25.25 0 0 1 0 .354l-1.863 1.864a.25.25 0 0 1-.354 0L7.53 9.53a.75.75 0 0 1 0-1.06l.043-.043Z',
  'M3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z',
  'M5.5 10.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
]

/** Merged pull-request octicon: the git-merge glyph. */
const GIT_MERGE = [
  'M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z',
  'M4.25 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z',
]

/** One 16x16 octicon frame recolored for the entry state. */
function Octicon({ paths, color }: { paths: readonly string[]; color: string }): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden style={{ color }}>
      {paths.map(path => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}

/** The icon for one entry: octicon + state color like GitHub's list rows. */
export function ghIcon(entry: Pick<GitHubEntry, 'kind' | 'state' | 'merged' | 'draft'>): ReactElement {
  if (entry.kind === 'issue') {
    return entry.state === 'open'
      ? <Octicon paths={ISSUE_OPENED} color={GH_COLORS.open} />
      : <Octicon paths={ISSUE_CLOSED} color={GH_COLORS.issueClosed} />
  }
  // A closed PR is merged when the provider saw pull_request.merged_at.
  if (entry.state !== 'open') {
    return entry.merged === true
      ? <Octicon paths={GIT_MERGE} color={GH_COLORS.merged} />
      : <Octicon paths={GIT_PULL_REQUEST_CLOSED} color={GH_COLORS.prClosed} />
  }
  return entry.draft === true
    ? <Octicon paths={GIT_PULL_REQUEST_DRAFT} color={GH_COLORS.draft} />
    : <Octicon paths={GIT_PULL_REQUEST} color={GH_COLORS.open} />
}

/** Muted alert octicon for the search-failure hint row (not pickable). */
const ALERT = [
  'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
]

/** The GitHub Octocat mark octicon (mark-github) for the connection card. */
const GITHUB_MARK = [
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z',
]

/** The GitHub Octocat mark, colored to adapt to the current theme. */
export function GitHubMarkIcon(): ReactElement {
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d={GITHUB_MARK[0] as string} /></svg>
}

/** The failure-hint icon: a small gray alert triangle. */
export function AlertIcon(): ReactElement {
  return <Octicon paths={ALERT} color={GH_COLORS.draft} />
}

/**
 * The 14px chevron-down disclosure arrow of the official plugin cards
 * (dsh-client-ui-settings-plugins PluginCard): same viewBox and path data,
 * drawn locally so the single-file client bundle does not pull the whole
 * ui-primitives package. The open card rotates it 180° via the class.
 */
const CHEVRON_DOWN = [
  'M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z',
]

/** One 14x14 chevron-down glyph filled with the current color. */
export function ChevronDown14({ className }: { className?: string }): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden className={className}>
      <path d={CHEVRON_DOWN[0] as string} />
    </svg>
  )
}