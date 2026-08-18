/** Wire codec round-trips for the ghIssue contract. */
import { describe, expect, it } from 'vitest'
import {
  ghAuthAccountSchema,
  ghAuthStatusSchema,
  ghIssueSettingsSchema,
  ghIssueSettingsUpdateSchema,
  gitHubEntrySchema,
  gitHubRepoRefSchema,
  gitHubSearchResultSchema,
} from '../src/contract.ts'

describe('ghIssue wire codecs', () => {
  it('round-trips one issue entry', () => {
    const value = { number: 123, title: 'Fix the thing', kind: 'issue', state: 'open', url: 'https://github.com/o/r/issues/123' }
    expect(gitHubEntrySchema.parse(value)).toEqual(value)
  })

  it('round-trips one draft pull request entry', () => {
    const value = { number: 456, title: 'WIP', kind: 'pr', state: 'open', url: 'https://github.com/o/r/pull/456', draft: true }
    expect(gitHubEntrySchema.parse(value)).toEqual(value)
  })

  it('round-trips one merged pull request entry', () => {
    const value = { number: 789, title: 'Landed', kind: 'pr', state: 'closed', url: 'https://github.com/o/r/pull/789', merged: true }
    expect(gitHubEntrySchema.parse(value)).toEqual(value)
  })

  it('rejects malformed entries', () => {
    expect(() => gitHubEntrySchema.parse({ number: -1, title: '', kind: 'issue', state: 'open', url: 'x' })).toThrow()
    expect(() => gitHubEntrySchema.parse({ number: 1, title: 't', kind: 'branch', state: 'open', url: 'x' })).toThrow()
  })

  it('round-trips the search result envelope', () => {
    const value = {
      entries: [{ number: 1, title: 't', kind: 'pr', state: 'closed', url: 'u' }],
      repo: { owner: 'owner', name: 'name' },
      source: 'gh',
      truncated: true,
    }
    expect(gitHubSearchResultSchema.parse(value)).toEqual(value)
    expect(gitHubRepoRefSchema.parse({ owner: 'o', name: 'r' })).toEqual({ owner: 'o', name: 'r' })
    // The source is locked to the gh CLI — no api mode remains.
    expect(() => gitHubSearchResultSchema.parse({ ...value, source: 'api' })).toThrow()
  })

  it('round-trips settings and the field updates', () => {
    const settings = { insertFormat: 'ref', defaultLimit: 20 }
    expect(ghIssueSettingsSchema.parse(settings)).toEqual(settings)
    expect(ghIssueSettingsUpdateSchema.parse({ field: 'insertFormat', value: 'url' })).toEqual({ field: 'insertFormat', value: 'url' })
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'insertFormat', value: 'html' })).toThrow()
    expect(ghIssueSettingsUpdateSchema.parse({ field: 'defaultLimit', value: 50 })).toEqual({ field: 'defaultLimit', value: 50 })
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'defaultLimit', value: 0 })).toThrow()
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'defaultLimit', value: 1.5 })).toThrow()
    expect(() => ghIssueSettingsSchema.parse({ insertFormat: 'ref', defaultLimit: 0 })).toThrow()
    // The enable switch is gone with the update surface.
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'enabled', value: true })).toThrow()
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'nope', value: 1 })).toThrow()
    // The mode/clientId/scope/repo fields are gone with the device flow and
    // the repository override.
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'mode', value: 'api' })).toThrow()
    expect(() => ghIssueSettingsUpdateSchema.parse({ field: 'repo', value: 'o/r' })).toThrow()
  })

  it('round-trips the gh account-connection status', () => {
    const account = { host: 'github.com', login: 'bitxeno', active: true, scopes: 'repo, workflow' }
    expect(ghAuthAccountSchema.parse(account)).toEqual(account)
    const status = { accounts: [account, { host: 'github.com', login: 'cxfksword', active: false, scopes: '' }] }
    expect(ghAuthStatusSchema.parse(status)).toEqual(status)
    expect(ghAuthStatusSchema.parse({ accounts: [], error: 'gh-missing' })).toEqual({ accounts: [], error: 'gh-missing' })
    expect(() => ghAuthStatusSchema.parse({ accounts: [], error: 'bogus' })).toThrow()
  })
})