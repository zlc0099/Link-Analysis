import { describe, it, expect } from 'vitest'
import { analyzeRepo } from '../../src/core/analyze'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function fakeFetch(routes: Record<string, () => Response>) {
  const ordered = Object.entries(routes).sort((a, b) => b[0].length - a[0].length)
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    for (const [prefix, handler] of ordered) {
      if (url.startsWith(prefix)) return handler()
    }
    return new Response('not found', { status: 404 })
  }) as unknown as typeof fetch
}

const META = {
  name: 'demo',
  full_name: 'acme/demo',
  html_url: 'https://github.com/acme/demo',
  description: null,
  language: 'TypeScript',
  stargazers_count: 3,
  license: { spdx_id: 'MIT' },
  archived: false,
  default_branch: 'main',
  owner: { login: 'acme' },
}

const TREE = {
  truncated: false,
  tree: [
    { path: 'README.md', type: 'blob', size: 100, sha: 'r1' },
    { path: 'package.json', type: 'blob', size: 80, sha: 'p1' },
    { path: 'package-lock.json', type: 'blob', size: 50, sha: 'l1' },
  ],
}

const README = `# Demo

## Install

\`\`\`bash
npm install
\`\`\`

## Config

Set the environment variables.

## Run

\`\`\`bash
npm run dev
\`\`\`

This README is long enough and has multiple headings, so the documentation
structure rule considers it complete. It also documents installation, configuration
and start commands for the demo project.
`

describe('analyzeRepo (integration)', () => {
  it('runs the whole pipeline against a fake GitHub', async () => {
    const stages: string[] = []
    const fetchFn = fakeFetch({
      'https://api.github.com/repos/acme/demo': () => json(META),
      'https://api.github.com/repos/acme/demo/commits/main': () =>
        json({ sha: 'abcdef1234567890', commit: { message: 'init', author: { date: '2026-11-01T00:00:00Z' } } }),
      'https://api.github.com/repos/acme/demo/git/trees/abcdef1234567890': () => json(TREE),
      'https://raw.githubusercontent.com/acme/demo/abcdef1234567890/README.md': () => new Response(README),
      'https://raw.githubusercontent.com/acme/demo/abcdef1234567890/package.json': () =>
        new Response(JSON.stringify({ name: 'demo', scripts: { dev: 'vite' } })),
    })

    const report = await analyzeRepo('acme', 'demo', {
      fetchFn,
      onStage: (s) => stages.push(s.stage),
      now: () => '2026-11-26T00:00:00.000Z',
    })

    expect(report.repo.fullName).toBe('acme/demo')
    expect(report.commit.shortSha).toBe('abcdef1')
    expect(report.coverage.analyzedFiles).toBe(2)
    expect(report.coverage.selectedFiles).toBe(2)
    expect(report.score.raw).toBeGreaterThan(60)
    expect(stages).toContain('loading-tree')
    expect(stages).toContain('scoring')
  })

  it('falls back to anonymous access once when the token is rejected', async () => {
    const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
      if (url === 'https://api.github.com/repos/acme/demo') {
        return auth ? json({ message: 'Bad credentials' }, 401) : json(META)
      }
      if (url === 'https://api.github.com/repos/acme/demo/commits/main') {
        return json({ sha: 'abcdef1234567890', commit: { message: 'init', author: { date: '' } } })
      }
      if (url.startsWith('https://api.github.com/repos/acme/demo/git/trees/')) return json(TREE)
      if (url.startsWith('https://raw.githubusercontent.com/')) {
        return new Response(url.endsWith('README.md') ? README : JSON.stringify({ name: 'demo' }))
      }
      return new Response('not found', { status: 404 })
    }) as unknown as typeof fetch

    const report = await analyzeRepo('acme', 'demo', {
      fetchFn,
      token: 'expired-token',
      now: () => '2026-11-26T00:00:00.000Z',
    })
    expect(report.repo.fullName).toBe('acme/demo')
    expect(report.limitations.join('\n')).toContain('回退匿名')
  })

  it('notes that submodule contents were not analyzed', async () => {
    const tree = {
      truncated: false,
      tree: [
        { path: 'README.md', type: 'blob', size: 100, sha: 'r1' },
        { path: 'assets/logo.png', type: 'blob', size: 100, sha: 'i1' },
        { path: 'vendor/lib', type: 'commit', sha: 'sub' },
      ],
    }
    const fetchFn = fakeFetch({
      'https://api.github.com/repos/acme/demo': () => json(META),
      'https://api.github.com/repos/acme/demo/commits/main': () =>
        json({ sha: 'abcdef1234567890', commit: { message: 'init', author: { date: '' } } }),
      'https://api.github.com/repos/acme/demo/git/trees/abcdef1234567890': () => json(tree),
      'https://raw.githubusercontent.com/acme/demo/abcdef1234567890/README.md': () => new Response(README),
    })
    const report = await analyzeRepo('acme', 'demo', { fetchFn, now: () => '2026-11-26T00:00:00.000Z' })
    expect(report.limitations.join('\n')).toContain('子模块')
  })

  it('counts failed file fetches without aborting the report', async () => {
    const fetchFn = fakeFetch({
      'https://api.github.com/repos/acme/demo': () => json(META),
      'https://api.github.com/repos/acme/demo/commits/main': () =>
        json({ sha: 'abcdef1234567890', commit: { message: 'init', author: { date: '' } } }),
      'https://api.github.com/repos/acme/demo/git/trees/abcdef1234567890': () => json(TREE),
      'https://raw.githubusercontent.com/acme/demo/abcdef1234567890/README.md': () => new Response(README),
      'https://api.github.com/repos/acme/demo/contents/package.json?ref=abcdef1234567890': () =>
        json({ message: 'error' }, 500),
    })
    const report = await analyzeRepo('acme', 'demo', { fetchFn, now: () => '2026-11-26T00:00:00.000Z' })
    expect(report.coverage.failedFiles).toContain('package.json')
    expect(report.limitations.join('\n')).toContain('读取失败')
  })
})
