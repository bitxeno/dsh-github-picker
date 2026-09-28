/**
 * dsh-github-picker host plugin: mounts the `githubPicker` Typert Remote service
 * (GitHub issue/PR search for the browser's composer picker) and registers its
 * strict Typert manifest. The insert format lives in the plugin Config as a
 * volatile field (DSH >= 0.1.7 serves it automatically to
 * `ctx.configForms`; there is no `ctx.settings.register` anymore and no
 * enable switch — the picker is always on). The settings page card binds that
 * entry through the shared config forms; this half only serves it. All data
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
 * the profile patch; the insert format is a volatile settings field served
 * automatically to the browser's `ctx.configForms` (the Host never reads it).
 * The inferred schema type keeps the callable form accepting
 * partial input, so `Config({})` yields the defaults (what the Loader does
 * for Loader compositions). The search result cap is fixed — the popup pages
 * through every result the provider returns (12 per page).
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    searchTimeoutMs: z<number, number, "defined">;
    repoCacheTtl: z<number, number, "defined">;
    insertFormat: z<"url" | "ref", "url" | "ref", "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    searchTimeoutMs: z<number, number, "defined">;
    repoCacheTtl: z<number, number, "defined">;
    insertFormat: z<"url" | "ref", "url" | "ref", "volatile-defined">;
}>>, "plain">;
/**
 * Mount the githubPicker service and suppress its auto settings page.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
