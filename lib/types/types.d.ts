/**
 * Resolved plugin configuration: schema defaults applied at load time.
 */
/** The Loader-facing config shape (schema defaults not yet applied). */
export interface ConfigInput {
    defaultLimit?: number;
    searchTimeoutMs?: number;
    repoCacheTtl?: number;
}
/** The validated configuration the runtime consumes. */
export interface ResolvedConfig {
    /** Hard cap on entries per search round-trip. */
    readonly defaultLimit: number;
    /** Search provider timeout in milliseconds. */
    readonly searchTimeoutMs: number;
    /** How long a resolved repository identity stays cached, in milliseconds. */
    readonly repoCacheTtl: number;
}
/** Resolve the Loader-validated config through the schema defaults. */
export declare function resolveConfig(config: ConfigInput | undefined): ResolvedConfig;
