/**
 * GitHub-style state icons for the @ menu candidates, matching the octicon
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
import type { ReactElement } from 'react';
import type { GitHubEntry } from '../contract.ts';
/** GitHub's state colors (light-theme palette, readable on both themes). */
export declare const GH_COLORS: {
    readonly open: "#1f883d";
    readonly issueClosed: "#8250df";
    readonly prClosed: "#cf222e";
    readonly merged: "#8250df";
    readonly draft: "#8b949e";
};
/** The icon for one entry: octicon + state color like GitHub's list rows. */
export declare function ghIcon(entry: Pick<GitHubEntry, 'kind' | 'state' | 'merged' | 'draft'>): ReactElement;
/** The GitHub Octocat mark, colored to adapt to the current theme. */
export declare function GitHubMarkIcon(): ReactElement;
/** The failure-hint icon: a small gray alert triangle. */
export declare function AlertIcon(): ReactElement;
