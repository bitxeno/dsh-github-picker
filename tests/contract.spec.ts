/** Wire codec round-trips for the ghPicker contract. */
import { describe, expect, it } from 'vitest'
import {
  GH_PICKER_INVOCATIONS,
  ghAuthAccountSchema,
  ghAuthStatusSchema,
  gitHubEntrySchema,
  gitHubRepoRefSchema,
  gitHubSearchResultSchema,
} from '../src/contract.ts'
import { GH_PICKER_ENTRY_ID, GH_PICKER_NAMESPACE, GhPickerSettingsSchema } from '../src/settings.ts'
import { Config as GhPickerConfig } from '../src/index.ts'

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
    // The settings ride the volatile Config field (DSH >= 0.1.7 serves it to
    // ctx.configForms under the loader entry id); the legacy namespace id is
    // kept for reference. Schemastery schemas are the whole settings contract.
    expect(GH_PICKER_ENTRY_ID).toBe('dsh-github-picker')
    expect(GH_PICKER_NAMESPACE).toBe('github-picker')
    // The insert-format default stands when the section comes back empty.
    expect(GhPickerSettingsSchema.type).toBe('object')
    expect(Object.keys(GhPickerSettingsSchema.dict)).toEqual(['insertFormat'])
    const insertFormat = GhPickerSettingsSchema.dict.insertFormat
    expect(insertFormat.type).toBe('union')
    expect(insertFormat.toString()).toBe('"url" | "ref"')
    expect(insertFormat.meta.default).toBe('ref')
    // The Host Config serves the same field as volatile for the shared forms.
    const hostInsert = (GhPickerConfig as unknown as { dict: Record<string, { meta: { volatile?: boolean; default?: unknown }; type: string; toString(): string }> }).dict.insertFormat
    expect(hostInsert.meta.volatile).toBe(true)
    expect(hostInsert.meta.default).toBe('ref')
    expect(hostInsert.toString()).toBe('"url" | "ref"')
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

  it('materializes strict codecs per process realm', () => {
    // The gateway calls `create()` on first boundary use (host and browser
    // hold separate zod realms); every descriptor must materialize a parser.
    expect(GH_PICKER_INVOCATIONS).toHaveLength(2)
    for (const invocation of GH_PICKER_INVOCATIONS) {
      for (const parameter of invocation.parameters) {
        if (parameter.codec.mode !== 'strict') throw new Error('expected a strict codec')
        expect(typeof parameter.codec.create().parse).toBe('function')
      }
      if (invocation.result.mode !== 'strict') throw new Error('expected a strict codec')
      expect(typeof invocation.result.create().parse).toBe('function')
    }
    // Spot-check the materialized parsers accept wire values.
    const search = GH_PICKER_INVOCATIONS[0]!
    expect(search.parameters[0]!.codec.mode).toBe('strict')
    if (search.parameters[0]!.codec.mode === 'strict') {
      expect(search.parameters[0]!.codec.create().parse('bug')).toBe('bug')
    }
    if (search.result.mode === 'strict') {
      expect(search.result.create().parse({
        entries: [],
        repo: { owner: 'o', name: 'r' },
        source: 'gh',
        truncated: false,
      })).toEqual({ entries: [], repo: { owner: 'o', name: 'r' }, source: 'gh', truncated: false })
    }
  })
})