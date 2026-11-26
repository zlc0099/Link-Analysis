import { describe, it, expect } from 'vitest'
import {
  GithubError,
  fetchRepoMeta,
  fetchHeadCommit,
  fetchTree,
  fetchFileContent,
} from '../../src/core/github/client'

interface Call {
  url: string
  init?: RequestInit
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

function makeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    return handler(url, init)
  }
  return { fn: fn as unknown as typeof fetch, calls }
}

const META = {
  name: 'express',
  full_name: 'expressjs/express',
  html_url: 'https://github.com/expressjs/express',
  description: 'Fast web framework',
  language: 'JavaScript',
  stargazers_count: 60000,
  license: { spdx_id: 'MIT' },
  archived: false,
  default_branch: 'master',
  owner: { login: 'expressjs' },
}

describe('GitHub client', () => {
  it('maps repository metadata', async () => {
    const { fn, calls } = makeFetch(() => jsonResponse(META))
    const meta = await fetchRepoMeta('expressjs', 'express', { fetchFn: fn })
    expect(meta).toMatchObject({
      owner: 'expressjs',
      name: 'express',
      fullName: 'expressjs/express',
      language: 'JavaScript',
      stars: 60000,
      license: 'MIT',
      defaultBranch: 'master',
    })
    expect(calls[0].url).toBe('https://api.github.com/repos/expressjs/express')
    expect(calls[0].init?.headers).toMatchObject({ Accept: expect.stringContaining('github') })
  })

  it('sends the token only to api.github.com', async () => {
    const { fn, calls } = makeFetch((url) =>
      url.startsWith('https://api.github.com') ? jsonResponse(META) : new Response('ok'),
    )
    await fetchRepoMeta('expressjs', 'express', { fetchFn: fn, token: 'tok123' })
    const apiCall = calls.find((c) => c.url.includes('api.github.com'))!
    expect((apiCall.init?.headers as Record<string, string>).Authorization).toBe('Bearer tok123')
  })

  it('maps 404 to not-found', async () => {
    const { fn } = makeFetch(() => jsonResponse({ message: 'Not Found' }, { status: 404 }))
    await expect(fetchRepoMeta('a', 'b', { fetchFn: fn })).rejects.toMatchObject({
      code: 'not-found',
    })
  })

  it('maps rate limiting with reset time', async () => {
    const reset = Math.floor(Date.now() / 1000) + 600
    const { fn } = makeFetch(() =>
      new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(reset),
        },
      }),
    )
    const err = (await fetchRepoMeta('a', 'b', { fetchFn: fn }).catch((e) => e)) as GithubError
    expect(err.code).toBe('rate-limit')
    expect(err.resetAt).toBe(reset * 1000)
    expect(err.message).toContain('额度')
  })

  it('maps 401 to unauthorized', async () => {
    const { fn } = makeFetch(() => jsonResponse({ message: 'Bad credentials' }, { status: 401 }))
    await expect(fetchRepoMeta('a', 'b', { fetchFn: fn })).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('maps 409 empty repository', async () => {
    const { fn } = makeFetch(() => jsonResponse({ message: 'Git Repository is empty.' }, { status: 409 }))
    await expect(fetchHeadCommit('a', 'b', 'main', { fetchFn: fn })).rejects.toMatchObject({ code: 'empty' })
  })

  it('maps the head commit', async () => {
    const { fn } = makeFetch(() =>
      jsonResponse({
        sha: 'abcdef1234567890',
        commit: { message: 'feat: init\n\nbody', author: { date: '2026-11-01T00:00:00Z' } },
      }),
    )
    const commit = await fetchHeadCommit('a', 'b', 'main', { fetchFn: fn })
    expect(commit).toMatchObject({ sha: 'abcdef1234567890', shortSha: 'abcdef1', message: 'feat: init' })
  })

  it('maps the recursive tree and truncation flag', async () => {
    const { fn, calls } = makeFetch(() =>
      jsonResponse({
        sha: 'root',
        truncated: true,
        tree: [
          { path: 'README.md', type: 'blob', size: 10, sha: 'x' },
          { path: 'src', type: 'tree', sha: 'y' },
        ],
      }),
    )
    const tree = await fetchTree('a', 'b', 'rootsha', { fetchFn: fn })
    expect(tree.truncated).toBe(true)
    expect(tree.entries).toHaveLength(2)
    expect(calls[0].url).toContain('/git/trees/rootsha?recursive=1')
  })

  it('retries a 5xx once', async () => {
    let n = 0
    const { fn, calls } = makeFetch(() => {
      n++
      return n === 1
        ? jsonResponse({ message: 'boom' }, { status: 500 })
        : jsonResponse(META)
    })
    const meta = await fetchRepoMeta('a', 'b', { fetchFn: fn })
    expect(meta.fullName).toBe('expressjs/express')
    expect(calls).toHaveLength(2)
  })

  it('fetches raw content with the commit sha', async () => {
    const { fn, calls } = makeFetch(() => new Response('# Hello', { status: 200 }))
    const text = await fetchFileContent('a', 'b', 'sha123', 'README.md', {
      fetchFn: fn,
      token: 'tok123',
    })
    expect(text).toBe('# Hello')
    expect(calls[0].url).toBe('https://raw.githubusercontent.com/a/b/sha123/README.md')
    expect(JSON.stringify(calls[0].init ?? {})).not.toContain('tok123')
  })

  it('falls back to the contents API when raw fails', async () => {
    const { fn, calls } = makeFetch((url) => {
      if (url.startsWith('https://raw.githubusercontent.com')) return new Response('nope', { status: 404 })
      return jsonResponse({
        encoding: 'base64',
        content: btoa('fallback content'),
      })
    })
    const text = await fetchFileContent('a', 'b', 'sha123', 'src/a.ts', { fetchFn: fn })
    expect(text).toBe('fallback content')
    expect(calls).toHaveLength(2)
    expect(calls[1].url).toContain('/contents/src/a.ts?ref=sha123')
  })

  it('maps network failures', async () => {
    const { fn } = makeFetch(() => {
      throw new TypeError('fetch failed')
    })
    await expect(fetchRepoMeta('a', 'b', { fetchFn: fn })).rejects.toMatchObject({ code: 'network' })
  })

  it('maps aborts to cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const { fn } = makeFetch(() => new Response('', { status: 200 }))
    await expect(
      fetchRepoMeta('a', 'b', { fetchFn: fn, signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'cancelled' })
  })
})
