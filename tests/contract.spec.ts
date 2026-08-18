/** Wire codec round-trips for the ghPicker contract. */
import { describe, expect, it } from 'vitest'
import {
  ghAuthAccountSchema,
  ghAuthStatusSchema,
  gitHubEntrySchema,
  gitHubRepoRefSchema,
  gitHubSearchResultSchema,
} from '../src/contract.ts'
import { GH_PICKER_NAMESPACE, GhPickerSettingsSchema } from '../src/settings.ts'

describe('ghPicker wire codecs', () => {
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

  it('shapes the github-picker settings namespace section', () => {
    // The settings reach the browser through the official settings scope
    // (namespace-schema resolved), so the namespace identity and its
    // Schemastery schema are the whole settings contract.
    expect(GH_PICKER_NAMESPACE).toBe('github-picker')
    // The insert-format default stands when the section comes back empty.
    expect(GhPickerSettingsSchema.type).toBe('object')
    expect(Object.keys(GhPickerSettingsSchema.dict)).toEqual(['insertFormat'])
    const insertFormat = GhPickerSettingsSchema.dict.insertFormat
    expect(insertFormat.type).toBe('union')
    expect(insertFormat.toString()).toBe('"url" | "ref"')
    expect(insertFormat.meta.default).toBe('ref')
    // The result limit and the enable switch are gone with the endless-scroll
    // pagination and the always-on surface.
    expect(insertFormat.toString()).not.toMatch(/limit|enabled/)
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