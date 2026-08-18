/** The Host-side # mention marker: scanning, boundary rules, and injection. */
import { describe, expect, it, vi } from 'vitest'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import { expandMentions, mentionPreStep, referenceKeysOf, scanMentions } from '../src/mention.ts'
import type { GitHubRepoRef } from '../src/contract.ts'

const repo: GitHubRepoRef = { owner: 'owner', name: 'name' }

/** One user-authored message with text content. */
function userMessage(text: string): UserMessage {
  return createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  })
}

describe('scanMentions', () => {
  it('finds #number tokens at word boundaries against the workspace repo', () => {
    expect(scanMentions('fix #123 please', repo)).toEqual([{ owner: 'owner', name: 'name', number: 123 }])
    expect(scanMentions('#123 #456 #123', repo)).toEqual([
      { owner: 'owner', name: 'name', number: 123 },
      { owner: 'owner', name: 'name', number: 456 },
    ])
    expect(scanMentions('see (#42) and #7.', repo)).toEqual([
      { owner: 'owner', name: 'name', number: 42 },
      { owner: 'owner', name: 'name', number: 7 },
    ])
  })

  it('ignores non-boundary tokens and non-numbers', () => {
    expect(scanMentions('user#123', repo)).toEqual([])
    expect(scanMentions('#123abc', repo)).toEqual([])
    expect(scanMentions('#abc', repo)).toEqual([])
    expect(scanMentions('abc#', repo)).toEqual([])
  })

  it('handles Chinese punctuation boundaries', () => {
    expect(scanMentions('修复（#42）的问题。', repo)).toEqual([{ owner: 'owner', name: 'name', number: 42 }])
  })

  it('scans GitHub URLs with their own repository', () => {
    expect(scanMentions('see https://github.com/bitxeno/atvloadly/issues/125 now', repo)).toEqual([
      { owner: 'bitxeno', name: 'atvloadly', number: 125 },
    ])
    expect(scanMentions('pr at https://github.com/o/r/pull/7', repo)).toEqual([
      { owner: 'o', name: 'r', number: 7 },
    ])
  })

  it('scans the @owner/repo#number reference form', () => {
    expect(scanMentions('see @bitxeno/atvloadly#125 now', repo)).toEqual([
      { owner: 'bitxeno', name: 'atvloadly', number: 125 },
    ])
  })

  it('deduplicates across forms', () => {
    expect(scanMentions('#125 and https://github.com/owner/name/issues/125 and @owner/name#125', repo))
      .toEqual([{ owner: 'owner', name: 'name', number: 125 }])
  })

  it('returns nothing for empty text', () => {
    expect(scanMentions('', repo)).toEqual([])
  })
})

describe('expandMentions', () => {
  it('injects reference markers for every unique mention', () => {
    const injections = expandMentions([userMessage('fix #123 and #456 and #123')], repo)
    expect(injections).toHaveLength(2)
    expect(injections[0]?.content[0]?.type).toBe('text')
    expect(injections[0]?.source).toMatchObject({ kind: 'github-picker-mention', number: 123 })
    const text = (injections[0]?.content[0] as { type: 'text'; text: string }).text
    expect(text).toBe('<github-reference repo="owner/name" number="123" />')
  })

  it('returns nothing without a repo', () => {
    expect(expandMentions([userMessage('#123')], undefined)).toEqual([])
  })

  it('only scans user-authored text', () => {
    const assistant = createUserMessage({
      content: [{ type: 'text', text: '#999' }],
      source: { kind: 'assistant' as never },
    })
    expect(expandMentions([assistant], repo)).toEqual([])
  })

  it('skips non-text content blocks', () => {
    const withImage = createUserMessage({
      content: [
        { type: 'image', src: 'data:image/png;base64,x' },
        { type: 'text', text: '#55' },
      ],
      source: { kind: 'user' },
    }) as UserMessage
    const injections = expandMentions([withImage], repo)
    expect(injections).toHaveLength(1)
    expect(injections[0]?.source).toMatchObject({ number: 55 })
  })

  it('escapes the repository attribute', () => {
    const weird: GitHubRepoRef = { owner: 'a&b', name: 'c"d' }
    const injections = expandMentions([userMessage('#1')], weird)
    const text = (injections[0]?.content[0] as { type: 'text'; text: string }).text
    expect(text).toBe('<github-reference repo="a&amp;b/c&quot;d" number="1" />')
  })

  it('skips markers a sibling plugin already injected', () => {
    const existing = new Set(['owner/name#123'])
    const injections = expandMentions([userMessage('#123 and #7')], repo, existing)
    expect(injections).toHaveLength(1)
    expect(injections[0]?.source).toMatchObject({ number: 7 })
  })
})

describe('referenceKeysOf', () => {
  it('collects the keys of present reference markers', () => {
    const marked = createUserMessage({
      content: [{ type: 'text', text: '<github-reference repo="owner/name" number="125" />' }],
      source: { kind: 'github-picker-mention', number: 125 },
    })
    const keys = referenceKeysOf([marked, userMessage('plain text')])
    expect(keys).toEqual(new Set(['owner/name#125']))
  })

  it('ignores non-text blocks and unmarked text', () => {
    const withImage = createUserMessage({
      content: [
        { type: 'image', src: 'data:image/png;base64,x' },
        { type: 'text', text: '"#5 and <github-reference repo="o/r" number="9" />"' },
      ],
      source: { kind: 'user' },
    }) as UserMessage
    const keys = referenceKeysOf([withImage])
    expect(keys).toEqual(new Set(['o/r#9']))
  })
})

describe('mentionPreStep', () => {
  it('appends injections to the downstream decision', async () => {
    const next = vi.fn(async () => ({ kind: 'enter', messages: [userMessage('keep')] }))
    const resolver = {
      resolve: vi.fn(async () => repo),
    }
    const decision = await mentionPreStep(
      { session: { header: { cwd: '/work' } } },
      resolver,
      [userMessage('fix #123')],
      new AbortController().signal,
      next,
    )
    expect(decision.kind).toBe('enter')
    if (decision.kind === 'enter') {
      expect(decision.messages).toHaveLength(2)
    }
  })

  it('skips references a sibling plugin already marked downstream', async () => {
    const already = createUserMessage({
      content: [{ type: 'text', text: '<github-reference repo="owner/name" number="123" />' }],
      source: { kind: 'github-picker-mention', number: 123 },
    })
    const next = vi.fn(async () => ({ kind: 'enter', messages: [already] }))
    const resolver = { resolve: vi.fn(async () => repo) }
    const decision = await mentionPreStep(
      { session: { header: { cwd: '/work' } } },
      resolver,
      [userMessage('#123')],
      new AbortController().signal,
      next,
    )
    expect(decision.kind).toBe('enter')
    if (decision.kind === 'enter') expect(decision.messages).toHaveLength(1)
  })

  it('passes rejected decisions through untouched', async () => {
    const next = vi.fn(async () => ({ kind: 'reject', reason: 'no' }))
    const resolver = { resolve: vi.fn(async () => repo) }
    const decision = await mentionPreStep(
      { session: { header: { cwd: '/work' } } },
      resolver,
      [userMessage('#1')],
      new AbortController().signal,
      next,
    )
    expect(decision).toEqual({ kind: 'reject', reason: 'no' })
    expect(resolver.resolve).not.toHaveBeenCalled()
  })

  it('skips without a cwd', async () => {
    const next = vi.fn(async () => ({ kind: 'enter', messages: [userMessage('x')] }))
    const resolver = { resolve: vi.fn(async () => repo) }
    const noCwd = await mentionPreStep(
      { session: { header: {} } },
      resolver,
      [userMessage('#1')],
      new AbortController().signal,
      next,
    )
    expect(noCwd.kind).toBe('enter')
    if (noCwd.kind === 'enter') expect(noCwd.messages).toHaveLength(1)
    expect(resolver.resolve).not.toHaveBeenCalled()
  })

  it('skips when no mentions or no repo resolve', async () => {
    const next = vi.fn(async () => ({ kind: 'enter', messages: [userMessage('x')] }))
    const none = await mentionPreStep(
      { session: { header: { cwd: '/work' } } },
      { resolve: vi.fn(async () => repo) },
      [userMessage('no mentions')],
      new AbortController().signal,
      next,
    )
    expect(none.kind).toBe('enter')
    if (none.kind === 'enter') expect(none.messages).toHaveLength(1)

    const noRepo = await mentionPreStep(
      { session: { header: { cwd: '/work' } } },
      { resolve: vi.fn(async () => undefined) },
      [userMessage('#1')],
      new AbortController().signal,
      next,
    )
    expect(noRepo.kind).toBe('enter')
    if (noRepo.kind === 'enter') expect(noRepo.messages).toHaveLength(1)
  })
})
