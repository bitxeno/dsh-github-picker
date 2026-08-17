/**
 * The data-source seam behind the @ picker. Only the gh CLI provider exists
 * (no device flow, no REST-API mode), so the runtime calls one provider
 * directly; the seam keeps the provider testable with a stubbed command.
 */
import type { GitHubEntry, GitHubRepoRef } from '../contract.ts'

/** One data-source search round-trip. */
export interface SearchProvider {
  /** The wire source label this provider reports. */
  readonly source: 'gh'
  /**
   * Search one repository.
   * @param repo - the resolved repository identity.
   * @param query - the typed @ query ('' lists recently updated).
   * @param signal - caller lifetime.
   * @returns the bounded entry list (already provider-sorted).
   */
  search(repo: GitHubRepoRef, query: string, signal: AbortSignal): Promise<GitHubEntry[]>
}
