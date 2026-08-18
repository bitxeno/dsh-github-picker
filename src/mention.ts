/**
 * The Host-side # reference marker: recognizes `#number` tokens in the
 * outgoing user message at each agent's pre-step boundary and injects a
 * reference-only marker with the resolved repository identity. The plugin
 * never fetches issue bodies; the agent chooses if and how to inspect a
 * reference with its available tools. Only `source.kind === 'user'` text is
 * scanned, so external text cannot forge the gesture.
 */
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { GitHubRepoRef } from './contract.ts'

/** One recognized mention: the number token and its kind. */
export interface HashMention {
  readonly number: number
}

/** The source tag the injected reference carries (transcript consumers use it). */
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'github-picker-mention': { kind: 'github-picker-mention'; number: number }
  }
}

/** The user-message source kind this boundary scans (external text cannot forge it). */
const USER_SOURCE_KIND = 'user'

/** A `#number` token at a word boundary (GitHub's mention grammar). */
const NUMBER_PATTERN = /(^|[\s(（\[{<"'])#(\d+)(?=$|[\s)）\]}>"'.,;:!?，。；：！？、])/gu

/** A GitHub issue/PR URL: https://github.com/owner/repo/issues|pull/NUMBER. */
const URL_PATTERN = /https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(?:issues|pull)\/(\d+)/gu

/** The `@owner/repo#number` reference form. */
const REF_PATTERN = /(^|[\s(（\[{<"'])@([\w.-]+)\/([\w.-]+)#(\d+)(?=$|[\s)）\]}>"'.,;:!?，。；：！？、])/gu

/** One recognized mention with its repository and number. */
export interface Mention {
  readonly owner: string
  readonly name: string
  readonly number: number
}

/**
 * Scan one text block for GitHub references in first-seen order: URLs,
 * `@owner/repo#number` forms, and plain `#number` tokens (the latter resolve
 * against the passed workspace repo).
 * @param text - the message text block.
 * @param repo - the workspace repository (for bare `#number` tokens).
 * @returns unique mentions.
 */
export function scanMentions(text: string, repo: GitHubRepoRef): readonly Mention[] {
  const seen = new Set<string>()
  const out: Mention[] = []
  const push = (owner: string, name: string, number: number): void => {
    const key = `${owner}/${name}#${number}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ owner, name, number })
  }
  for (const match of text.matchAll(URL_PATTERN)) {
    push(match[1] as string, match[2] as string, Number(match[3]))
  }
  for (const match of text.matchAll(REF_PATTERN)) {
    push(match[2] as string, match[3] as string, Number(match[4]))
  }
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    /* v8 ignore start -- \d+ always parses to a valid positive integer; the guard is defensive. */
    const number = Number(match[2])
    if (!Number.isInteger(number) || number <= 0) continue
    /* v8 ignore stop */
    push(repo.owner, repo.name, number)
  }
  return out
}

/** Escape one XML-like attribute without modifying the referenced value. */
function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** One validated reference-only marker for the model. */
function referenceForm(owner: string, name: string, number: number): string {
  return `<github-reference repo="${escapeAttribute(`${owner}/${name}`)}" number="${number}" />`
}

/** An already-present `<github-reference>` marker inside the step messages. */
const REFERENCE_MARKER_PATTERN = /<github-reference\s+repo="([^"]+)"\s+number="(\d+)"\s*\/>/gu

/**
 * Collect the `escapedRepo#number` keys of the reference markers already
 * present in the step messages. When a sibling plugin has marked the same
 * references (identical marker text), this prevents duplicate injections.
 * @param messages - the assembled step messages.
 * @returns the present marker keys.
 */
export function referenceKeysOf(messages: readonly UserMessage[]): ReadonlySet<string> {
  const keys = new Set<string>()
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type !== 'text') continue
      for (const match of block.text.matchAll(REFERENCE_MARKER_PATTERN)) {
        keys.add(`${match[1]}#${match[2]}`)
      }
    }
  }
  return keys
}

/**
 * Expand every GitHub reference into a marker, in first-seen order. A bare
 * `#number` token resolves against the workspace repo; URL and
 * `@owner/repo#number` forms carry their own repository. The plugin has no
 * enable switch — references are always marked.
 * @param messages - the assembled step messages.
 * @param repo - the workspace repository identity (undefined = no bare-# resolution).
 * @param existing - marker keys already present in the pipeline (deduplicated).
 * @returns the injected user messages (empty when nothing matched).
 */
export function expandMentions(
  messages: readonly UserMessage[],
  repo: GitHubRepoRef | undefined,
  existing?: ReadonlySet<string>,
): UserMessage[] {
  const mentions: Mention[] = []
  for (const message of messages) {
    if (message.source.kind !== USER_SOURCE_KIND) continue
    for (const block of message.content) {
      if (block.type !== 'text') continue
      if (repo !== undefined) mentions.push(...scanMentions(block.text, repo))
    }
  }
  const injections: UserMessage[] = []
  for (const mention of mentions) {
    const text = referenceForm(mention.owner, mention.name, mention.number)
    // A sibling plugin's identical marker is already in the pipeline — skip.
    if (existing?.has(`${escapeAttribute(`${mention.owner}/${mention.name}`)}#${mention.number}`)) continue
    injections.push(createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: 'github-picker-mention', number: mention.number },
    }))
  }
  return injections
}

/** The minimal agent face the pre-step handler reads. */
export interface MentionAgent {
  session: { header: { cwd?: string } }
}

/** The repository resolver seam the boundary uses (the runtime's resolver). */
export interface MentionRepoResolver {
  resolve(cwd: string, override: string, signal: AbortSignal): Promise<GitHubRepoRef | undefined>
}

/**
 * The `agent/pre-step` listener body: expand mentions in the claimed user
 * messages and append the injections to the downstream decision. The repo is
 * resolved once per step (cached host-side by the resolver).
 * @param agent - the addressed agent (its session header owns the cwd).
 * @param resolver - the repository resolver seam.
 * @param messages - the claimed messages (the user's own words).
 * @param signal - caller lifetime.
 * @param next - the downstream waterfall.
 * @returns the decision with injections appended, or the downstream decision.
 */
export async function mentionPreStep(
  agent: MentionAgent,
  resolver: MentionRepoResolver,
  messages: readonly UserMessage[],
  signal: AbortSignal,
  next: () => Promise<PreStepDecision>,
): Promise<PreStepDecision> {
  const decision = await next()
  if (decision.kind === 'reject') return decision
  const cwd = agent.session.header.cwd
  if (cwd === undefined) return decision
  const repo = await resolver.resolve(cwd, '', signal)
  // Skip references a sibling plugin already marked in the downstream step.
  const existing = referenceKeysOf(decision.messages)
  const injections = expandMentions(messages, repo, existing)
  if (injections.length === 0) return decision
  return { kind: 'enter', messages: [...decision.messages, ...injections] }
}
