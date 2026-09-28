/** The Loader-facing config shape (schema defaults not yet applied). */
export interface ConfigInput {
    searchTimeoutMs?: number;
    repoCacheTtl?: number;
    /** Inserted reference format (volatile settings field; the Host never reads it). */
    insertFormat?: 'url' | 'ref';
}
/** The validated configuration the runtime consumes. */
export interface ResolvedConfig {
    /** Search provider timeout in milliseconds. */
    readonly searchTimeoutMs: number;
    /** How long a resolved repository identity stays cached, in milliseconds. */
    readonly repoCacheTtl: number;
}
/** Resolve the Loader-validated config through the schema defaults. */
export declare function resolveConfig(config: ConfigInput | undefined): ResolvedConfig;
