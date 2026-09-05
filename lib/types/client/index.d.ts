import type { Context } from '@deepseek-ai/cordis';
/** Required services: the Remote face, the slot registry, locale, and the settings scope. */
export declare const inject: string[];
/**
 * Compose the GitHub picker surface.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
