import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: input triggers (source roster), Remote face, slots, and locale. */
export declare const inject: string[];
/**
 * Compose the GitHub @ mention surface.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
