/**
 * The data-source seam behind the composer picker. Only the gh CLI provider exists
 * (no device flow, no REST-API mode), so the runtime calls one provider
 * directly; the seam keeps the provider testable with a stubbed command.
 */
import type { GitHubEntry, GitHubRepoRef } from '../contract.ts'

/** One data-source search round-trip. */
export interface SearchProvider {
  /** The wire source label this provider reports. */
  readonly source: 'gh'
  /**
   * Search one repository page.
   * @param repo - the resolved repository identity.
   * @param query - the typed @ query ('' lists recently updated).
   * @param page - the 1-based page of the result set (PICKER_PAGE_SIZE per page).
   * @param signal - caller lifetime.
   * @returns the bounded page entries (already provider-sorted).
   */
  search(repo: GitHubRepoRef, query: string, page: number, signal: AbortSignal): Promise<GitHubEntry[]>
}
