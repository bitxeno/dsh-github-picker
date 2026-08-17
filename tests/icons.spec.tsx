/** GitHub octicon state icons for the @ menu candidates. */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AlertIcon, GitHubMarkIcon, ghIcon } from '../src/client/icons.tsx'

describe('ghIcon', () => {
  it('renders an open issue as the green issue-opened octicon', () => {
    const markup = renderToStaticMarkup(ghIcon({ kind: 'issue', state: 'open' }))
    expect(markup).toContain('svg')
    expect(markup).toContain('#1f883d')
    expect(markup).toContain('M8 0a8 8 0 1 1 0 16')
  })

  it('renders a closed issue as the purple issue-closed checkmark octicon', () => {
    const markup = renderToStaticMarkup(ghIcon({ kind: 'issue', state: 'closed' }))
    expect(markup).toContain('#8250df')
    expect(markup).toContain('M11.28 6.78')
  })

  it('renders an open PR as the green git-pull-request octicon', () => {
    const markup = renderToStaticMarkup(ghIcon({ kind: 'pr', state: 'open' }))
    expect(markup).toContain('#1f883d')
    expect(markup).toContain('M1.5 3.25')
  })

  it('renders a draft PR as the gray git-pull-request-draft octicon', () => {
    const markup = renderToStaticMarkup(ghIcon({ kind: 'pr', state: 'open', draft: true }))
    expect(markup).toContain('#8b949e')
  })

  it('renders a merged PR as the purple git-merge octicon', () => {
    const markup = renderToStaticMarkup(ghIcon({ kind: 'pr', state: 'closed', merged: true }))
    expect(markup).toContain('#8250df')
    expect(markup).toContain('M5.45 5.154')
  })

  it('renders an unmerged closed PR as the red git-pull-request-closed octicon', () => {
    const markup = renderToStaticMarkup(ghIcon({ kind: 'pr', state: 'closed' }))
    expect(markup).toContain('#cf222e')
  })
})

describe('AlertIcon', () => {
  it('renders the muted alert triangle for the failure hint row', () => {
    const markup = renderToStaticMarkup(AlertIcon())
    expect(markup).toContain('svg')
    expect(markup).toContain('#8b949e')
    expect(markup).toContain('M6.457 1.047')
  })
})

describe('GitHubMarkIcon', () => {
  it('renders the GitHub Octocat mark for the connection card', () => {
    const markup = renderToStaticMarkup(GitHubMarkIcon())
    expect(markup).toContain('svg')
    expect(markup).toContain('M8 0c4.42 0 8 3.58')
  })
})