/** The gh auth-status probe: parsing, classification, and the account list. */
import { describe, expect, it } from 'vitest'
import { classifyAuthError, readGhAuthStatus } from '../src/gh-auth.ts'

/** A command seam returning a fixed stdout. */
function commandReturning(stdout: string) {
  return {
    run: async (): Promise<string> => stdout,
  }
}

const signal = new AbortController().signal

describe('classifyAuthError', () => {
  it('classifies gh missing and leaves everything else unknown', () => {
    expect(classifyAuthError(Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' }))).toBe('gh-missing')
    // An Error with a code that is not ENOENT, a plain Error, and a non-Error.
    expect(classifyAuthError(Object.assign(new Error('EACCES'), { code: 'EACCES' }))).toBe('unknown')
    expect(classifyAuthError(new Error('boom'))).toBe('unknown')
    expect(classifyAuthError('a plain string')).toBe('unknown')
  })
})

describe('readGhAuthStatus', () => {
  it('reads every logged-in account with its connection facts', async () => {
    const payload = JSON.stringify({
      hosts: {
        'github.com': [
          { host: 'github.com', login: 'bitxeno', active: true, state: 'success', scopes: 'repo, workflow' },
          { host: 'github.com', login: 'cxfksword', active: false, state: 'success', scopes: '' },
        ],
      },
    })
    const status = await readGhAuthStatus(commandReturning(payload), 1000, signal)
    expect(status).toEqual({
      accounts: [
        { host: 'github.com', login: 'bitxeno', active: true, scopes: 'repo, workflow' },
        { host: 'github.com', login: 'cxfksword', active: false, scopes: '' },
      ],
    })
  })

  it('returns an empty list for no hosts, empty hosts, or a null host list', async () => {
    expect(await readGhAuthStatus(commandReturning('{}'), 1000, signal)).toEqual({ accounts: [] })
    expect(await readGhAuthStatus(commandReturning('{"hosts":{}}'), 1000, signal)).toEqual({ accounts: [] })
    expect(await readGhAuthStatus(commandReturning('{"hosts":{"github.com":null}}'), 1000, signal)).toEqual({ accounts: [] })
  })

  it('skips malformed accounts and falls back to the host key for an empty host', async () => {
    const payload = JSON.stringify({
      hosts: {
        'github.com': [
          { host: '', login: '', active: true, state: 'success', scopes: '' },
          { host: '', login: 'corp', active: false, state: 'success', scopes: null },
        ],
      },
    })
    const status = await readGhAuthStatus(commandReturning(payload), 1000, signal)
    expect(status.accounts).toEqual([{ host: 'github.com', login: 'corp', active: false, scopes: '' }])
  })

  it('classifies a gh-missing probe into the status error', async () => {
    const failing = {
      run: async (): Promise<string> => {
        throw Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' })
      },
    }
    const status = await readGhAuthStatus(failing, 1000, signal)
    expect(status).toEqual({ accounts: [], error: 'gh-missing' })
  })

  it('propagates abort reasons', async () => {
    const failing = {
      run: async (): Promise<string> => {
        throw new DOMException('Aborted', 'AbortError')
      },
    }
    const controller = new AbortController()
    controller.abort()
    await expect(readGhAuthStatus(failing, 1000, controller.signal)).rejects.toThrow()
  })
})