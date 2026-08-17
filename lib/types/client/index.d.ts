import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: the Remote face, the slot registry, and locale. */
export declare const inject: string[];
/**
 * Compose the GitHub picker surface.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
