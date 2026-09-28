import type { Context } from '@deepseek-ai/cordis';
/**
 * Loader entry id (cordis.patch.yml) — also the settings namespace the Host
 * serves. Spelled here rather than imported: a client bundle must not depend
 * on a Host module.
 */
export declare const GH_PICKER_ENTRY_ID = "dsh-github-picker";
/** Required services: the Remote face, the slot registry, locale, and the shared config forms. */
export declare const inject: string[];
/**
 * Compose the GitHub picker surface.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
