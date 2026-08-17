/**
 * Package-owned invariant companion for `dsh-github-picker`.
 * @module dsh-github-picker/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-github-picker'

/** Cordis companion plugin name. */
export const name = 'dsh-github-picker-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: search results are derived per call from the live
 * data source, the strict Typert manifest and the settings namespace are
 * registry-owned registrations, and the pre-step marker validates numbers
 * and injects reference-only markers without cross-plugin mutable state.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
