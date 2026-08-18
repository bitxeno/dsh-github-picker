/**
 * dsh-github-picker host plugin: mounts the `githubPicker` Typert Remote service
 * (GitHub issue/PR search for the browser's composer picker), registers its
 * strict Typert manifest, and registers the settings namespace (insert
 * format; there is no enable switch — the picker is always on). All data
 * flows through the gh CLI — there is no device flow and nothing is stored.
 * The plugin never reads issue bodies; the Host marks validated `#number`
 * references at each agent's pre-step boundary. The client half ships in the
 * same package (`./client`); the web server serves it under
 * /plugins/dsh-github-picker/client.js.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type ConfigInput } from './types.ts';
/** Cordis plugin name (the Loader entry and client bundle id). */
export declare const name = "dsh-github-picker";
/** Services required before load: the Typert registry, settings provider, and agent registry. */
export declare const inject: string[];
/** Host plugin configuration, validated at load by the Loader (partial input; schema defaults applied). */
export interface Config extends ConfigInput {
}
/**
 * Configuration schema: deployment-varying bounds stay tunable from
 * the profile patch. The inferred schema type keeps the callable form accepting
 * partial input, so `Config({})` yields the defaults (what the Loader does
 * for Loader compositions). The search result cap is fixed — the popup pages
 * through every result the provider returns (12 per page).
 */
export declare const Config: z<Schemastery.ObjectS<{
    searchTimeoutMs: z<number, number>;
    repoCacheTtl: z<number, number>;
}>, Schemastery.ObjectT<{
    searchTimeoutMs: z<number, number>;
    repoCacheTtl: z<number, number>;
}>>;
/**
 * Mount the githubPicker service and its settings namespace.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
