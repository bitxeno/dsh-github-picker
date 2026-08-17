/**
 * The `gh-issue` settings namespace: the durable insert format managed from
 * the Web settings page. Registered with the settings provider at plugin
 * load; the runtime reads the owner scope's live value on every call, so a
 * change takes effect without a restart. There is no enable switch — the
 * picker is always on. The data source is always the gh CLI and the
 * repository always resolves from the workspace git remote — there is no
 * device flow, no stored token, no override field.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type SettingsScope } from '@deepseek-ai/dsh-settings';
import type { GhIssueSettings } from './contract.ts';
/** The branded namespace name (the Web allowlist must list the same string). */
export declare const GH_ISSUE_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Schemastery schema of the `gh-issue` namespace section. */
export declare const GhIssueSettingsSchema: z<GhIssueSettings>;
/**
 * Register the namespace with the settings provider and return its owner scope.
 * @param ctx - the plugin context carrying the settings provider.
 * @returns the owner scope backing the runtime's live reads.
 */
export declare function registerGhIssueSettings(ctx: Context): SettingsScope<GhIssueSettings>;
