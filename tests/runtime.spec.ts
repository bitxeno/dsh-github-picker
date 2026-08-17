/**
 * Host composition behavior: the plugin module boots over a real cordis
 * Context, registers the ghIssue service with the Gateway-visible binding,
 * and its settings @Remotes answer over the plugin-owned settings scope.
 * Search runs through the real provider path with a stubbed gh subprocess;
 * the gh account-connection status reads through the same command seam.
 */
import { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import TypertRegistry from '@deepseek-ai/dsh-typert-registry'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as plugin from '../src/index.ts'
import type { GhIssueRuntime } from '../src/runtime.ts'
import type { GhIssueSettings } from '../src/contract.ts'

// The gh provider and repo resolver run real child processes; tests stub the
// subprocess seam through the module mock so both share one implementation.
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

import { execFile } from 'node:child_process'
const execMock = vi.mocked(execFile)

/** One structural Agent stub: only the session header the service reads. */
function agentWith(cwd: string | undefined): Agent {
  return { session: { header: { cwd } }, ctx: new Context() } as unknown as Agent
}

/** A settings provider stub whose value is switchable per test. */
function settingsProvider(read: () => GhIssueSettings) {
  let patch: Partial<GhIssueSettings> = {}
  return {
    register: () => ({
      get: () => ({ ...read(), ...patch }),
      watch: () => () => {},
      update: async (next: Partial<GhIssueSettings>) => { patch = { ...patch, ...next } },
      replace: async () => {},
    }),
  }
}

/** Default settings the tests start from. */
function defaultSettings(): GhIssueSettings {
  return { insertFormat: 'ref' }
}

/** Mount the function-plugin module on a fresh context (harness test pattern). */
async function mount(
  ctx: Context,
  config?: plugin.Config,
  readSettings: () => GhIssueSettings = defaultSettings,
) {
  const registryFiber = ctx.plugin(TypertRegistry)
  await registryFiber
  ctx.provide('settings', settingsProvider(readSettings))
  ctx.provide('agents', { roots: () => [] })
  const fiber = ctx.plugin({ inject: plugin.inject, apply: plugin.apply }, config)
  await fiber
  const service = ctx.get('ghIssue') as unknown as GhIssueRuntime | undefined
  return { fiber, service }
}

/** One raw gh search-API line the mocked subprocess returns. */
function ghItem(number: number, title: string, pr = false): string {
  return JSON.stringify({
    number,
    title,
    state: 'open',
    html_url: `https://github.com/o/r/${pr ? 'pull' : 'issues'}/${number}`,
    pull_request: pr ? { draft: true } : null,
    draft: pr,
  })
}

/** The `gh auth status --json hosts` payload the mocked subprocess returns. */
function authStatusPayload(): string {
  return JSON.stringify({
    hosts: {
      'github.com': [
        { host: 'github.com', login: 'bitxeno', active: true, state: 'success', scopes: 'repo, workflow' },
        { host: 'github.com', login: 'cxfksword', active: false, state: 'success', scopes: '' },
      ],
    },
  })
}

afterEach(() => {
  execMock.mockReset()
})

describe('dsh-github-picker host composition', () => {
  it('mounts the ghIssue service under the remote namespace', async () => {
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    expect(service).toBeDefined()
    await fiber.dispose()
  })

  it('exposes the gh-only wire methods as @Remote members', async () => {
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const methods = remoteMethods(original) as readonly { method: string }[]
    for (const expected of ['search', 'getSettings', 'updateSettings', 'getGhAuthStatus']) {
      expect(methods.some(marker => marker.method === expected), `missing @Remote ${expected}`).toBe(true)
    }
    // No device-flow methods remain.
    for (const gone of ['getAuthState', 'beginDeviceFlow', 'pollDeviceFlow', 'signOut']) {
      expect(methods.some(marker => marker.method === gone), `stale @Remote ${gone}`).toBe(false)
    }
    await fiber.dispose()
  })

  it('serves settings reads and field writes through the wire', async () => {
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    expect(original.getSettings()).toEqual(defaultSettings())
    await original.updateSettings({ field: 'insertFormat', value: 'url' })
    expect(original.getSettings().insertFormat).toBe('url')
    await fiber.dispose()
  })

  it('persists the insert format through the wire', async () => {
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    await original.updateSettings({ field: 'insertFormat', value: 'url' })
    expect(original.getSettings().insertFormat).toBe('url')
    await fiber.dispose()
  })

  it('reports a missing workspace directory', async () => {
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const signal = new AbortController().signal
    await expect(original.search('bug', agentWith(undefined), signal)).rejects.toThrow(/no workspace directory/)
    await fiber.dispose()
  })

  it('reports a missing repository when no remote resolves', async () => {
    // git remote get-url fails (no origin) before the gh provider runs.
    execMock.mockImplementation((file, _args, _options, callback) => {
      if (file === 'git') {
        callback(new Error('No such remote origin'), '')
        return
      }
      callback(new Error('unexpected gh call'), '')
    })
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const signal = new AbortController().signal
    await expect(original.search('bug', agentWith('/tmp'), signal)).rejects.toThrow(/no GitHub repository detected/)
    execMock.mockReset()
    await fiber.dispose()
  })

  it('searches through the gh provider, resolving the repo from git', async () => {
    // The repo always comes from `git remote get-url origin`; return it
    // before the gh search subprocess runs.
    execMock.mockImplementation((file, _args, _options, callback) => {
      if (file === 'git') {
        callback(null, 'https://github.com/o/r.git\n')
        return
      }
      callback(null, [ghItem(42, 'Fix the bug'), ghItem(7, 'Draft PR', true)].join('\n'))
    })
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const signal = new AbortController().signal
    const result = await original.search('fix', agentWith('/tmp'), signal)
    expect(result.repo).toEqual({ owner: 'o', name: 'r' })
    expect(result.source).toBe('gh')
    expect(result.entries).toEqual([
      { number: 42, title: 'Fix the bug', kind: 'issue', state: 'open', url: 'https://github.com/o/r/issues/42' },
      { number: 7, title: 'Draft PR', kind: 'pr', state: 'open', url: 'https://github.com/o/r/pull/7', draft: true },
    ])
    expect(execMock).toHaveBeenCalled()
    execMock.mockReset()
    await fiber.dispose()
  })

  it('classifies a gh failure as a picker-facing error', async () => {
    execMock.mockImplementation((file, _args, _options, callback) => {
      if (file === 'git') {
        callback(null, 'https://github.com/o/r.git\n')
        return
      }
      callback(new Error('gh: not logged in to github.com'), '')
    })
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const signal = new AbortController().signal
    const error = await original.search('fix', agentWith('/tmp'), signal).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect((error as { kind?: string }).kind).toBe('not-authenticated')
    execMock.mockReset()
    await fiber.dispose()
  })

  it('reads the gh account-connection status', async () => {
    execMock.mockImplementation((file, _args, _options, callback) => {
      if (file === 'gh') {
        callback(null, authStatusPayload())
        return
      }
      callback(new Error('unexpected command'), '')
    })
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const status = await original.getGhAuthStatus()
    expect(status.accounts).toEqual([
      { host: 'github.com', login: 'bitxeno', active: true, scopes: 'repo, workflow' },
      { host: 'github.com', login: 'cxfksword', active: false, scopes: '' },
    ])
    expect(status.error).toBeUndefined()
    execMock.mockReset()
    await fiber.dispose()
  })

  it('reports gh-missing when the auth status probe finds no gh', async () => {
    execMock.mockImplementation((_file, _args, _options, callback) => {
      callback(Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' }), '')
    })
    const ctx = new Context()
    const { fiber, service } = await mount(ctx)
    const original = service as unknown as GhIssueRuntime
    const status = await original.getGhAuthStatus()
    expect(status).toEqual({ accounts: [], error: 'gh-missing' })
    execMock.mockReset()
    await fiber.dispose()
  })

  it('applies the resolved configuration defaults', async () => {
    const ctx = new Context()
    const { fiber, service } = await mount(ctx, {})
    expect(service).toBeDefined()
    await fiber.dispose()
  })

  it('disposes cleanly with the context', async () => {
    const ctx = new Context()
    const { fiber } = await mount(ctx)
    const dispose = vi.fn(() => fiber.dispose())
    await dispose()
    expect(dispose).toHaveBeenCalled()
    await fiber.dispose()
  })
})