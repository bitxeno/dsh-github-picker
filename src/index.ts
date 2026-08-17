/**
 * dsh-github-picker host plugin: mounts the `ghIssue` Typert Remote service
 * (GitHub issue/PR search for the browser's composer picker), registers its
 * strict Typert manifest, and registers the settings namespace (insert
 * format; there is no enable switch — the picker is always on). All data
 * flows through the gh CLI — there is no device flow and nothing is stored.
 * The plugin never reads issue bodies; the Host marks validated `#number`
 * references at each agent's pre-step boundary. The client half ships in the
 * same package (`./client`); the web server serves it under
 * /plugins/dsh-github-picker/client.js.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: brings the `ctx.typert` Context merge into this program.
import type {} from '@deepseek-ai/dsh-typert-registry'
// Type-only: brings the `ctx.settings` and `ctx.agents` Context merges in.
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-agent'
import { GhIssueRuntime } from './runtime.ts'
import { TYPERT_MANIFEST } from './typert.ts'
import { registerGhIssueSettings } from './settings.ts'
import { GhProvider, ghCommand } from './providers/gh.ts'
import { mentionPreStep, type MentionRepoResolver } from './mention.ts'
import type { GhIssueSettings, GhIssueSettingsUpdate } from './contract.ts'
import { resolveConfig, type ConfigInput, type ResolvedConfig } from './types.ts'

/** Cordis plugin name (the Loader entry and client bundle id). */
export const name = 'dsh-github-picker'

/** Services required before load: the Typert registry, settings provider, and agent registry. */
export const inject = ['typert', 'settings', 'agents']

/** Host plugin configuration, validated at load by the Loader (partial input; schema defaults applied). */
export interface Config extends ConfigInput {}

/**
 * Configuration schema: deployment-varying bounds stay tunable from
 * the profile patch. The inferred schema type keeps the callable form accepting
 * partial input, so `Config({})` yields the defaults (what the Loader does
 * for Loader compositions).
 */
export const Config = z.object({
  defaultLimit: z.natural().min(1).default(20),
  searchTimeoutMs: z.natural().min(100).default(15_000),
  repoCacheTtl: z.natural().min(100).default(30_000),
})

/**
 * Mount the ghIssue service and its settings namespace.
 * @param ctx - host cordis context.
 * @param config - validated plugin configuration (schema defaults applied).
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved: ResolvedConfig = resolveConfig(config)
  // The durable settings: the runtime reads its live value per call, so
  // changing the insert format in the Web settings takes effect immediately.
  const scope = registerGhIssueSettings(ctx)
  const readSettings = () => scope.get()
  const writeSettings = async (update: GhIssueSettingsUpdate): Promise<GhIssueSettings> => {
    switch (update.field) {
      case 'insertFormat':
        await scope.update({ insertFormat: update.value })
        break
    }
    return scope.get()
  }
  const gh = new GhProvider({ limit: resolved.defaultLimit, timeoutMs: resolved.searchTimeoutMs })
  const runtime = new GhIssueRuntime(
    ctx,
    resolved,
    readSettings,
    writeSettings,
    gh,
    ghCommand,
    resolved.searchTimeoutMs,
  )
  // Strict endpoint registration: the gateway resolves ghIssue/search from
  // this manifest, independent of decorator marker state.
  ctx.effect(() => {
    const dispose = ctx.typert.register(TYPERT_MANIFEST)
    return () => { void dispose() }
  }, 'dsh-github-picker: typert manifest')

  // Mark #number references for every agent, at its pre-step boundary. The
  // listener lives on the agent's scope (the event is agent-scoped), so it
  // registers per created agent and withdraws with it. The boundary logic is
  // `mentionPreStep` (unit-tested); this is the scoped lifecycle glue.
  /* v8 ignore start -- agent-scoped registration glue; the boundary behavior is mentionPreStep and the event plumbing is harness-owned. */
  /* v8 ignore next -- callback executes only for live Harness Agent creation. */
  ctx.on('agent/created', ({ agent }) => {
    agent.ctx.effect(() => {
      const stop = agent.ctx.on('agent/pre-step', async ({ messages, signal }, next) => {
        const resolver: MentionRepoResolver = {
          resolve: (cwd, override, lifetime) => runtime.resolveRepo(cwd, override, lifetime),
        }
        return mentionPreStep(
          agent,
          // The repository always resolves from the workspace git remote.
          resolver,
          messages,
          signal,
          next,
        )
      })
      return () => { stop() }
    }, 'dsh-github-picker: pre-step # references')
  })
  /* v8 ignore stop */
}