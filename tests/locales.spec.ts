/** Locale dictionaries and template filling. */
import { describe, expect, it } from 'vitest'
import { en, fmt, NS, zh } from '../src/client/locales.ts'

describe('dictionaries', () => {
  it('keeps the English dictionary complete against the Chinese key set', () => {
    const zhKeys = Object.keys(zh).sort()
    const enKeys = Object.keys(en).sort()
    expect(enKeys).toEqual(zhKeys)
  })

  it('exports the stable namespace id', () => {
    expect(NS).toBe('gh-issue')
  })
})

describe('fmt', () => {
  it('fills placeholders and leaves unknown ones intact', () => {
    expect(fmt('remove #{number}', { number: '42' })).toBe('remove #42')
    expect(fmt('remove #{number}', {})).toBe('remove #{number}')
    expect(fmt('no params')).toBe('no params')
  })
})
