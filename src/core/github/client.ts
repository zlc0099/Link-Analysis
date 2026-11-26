import type { CommitInfo, RepoMeta, RepoTree, TreeEntry } from './types'

export type GithubErrorCode =
  | 'not-found'
  | 'rate-limit'
  | 'unauthorized'
  | 'empty'
  | 'network'
  | 'server'
  | 'cancelled'
  | 'invalid'

export class GithubError extends Error {
  code: GithubErrorCode
  status?: number
  resetAt?: number

  constructor(code: GithubErrorCode, message: string, status?: number, resetAt?: number) {
    super(message)
    this.name = 'GithubError'
    this.code = code
    this.status = status
    this.resetAt = resetAt
  }
}

export interface ClientOptions {
  token?: string | null
  fetchFn?: typeof fetch
  signal?: AbortSignal
}

const API = 'https://api.github.com'
const RAW = 'https://raw.githubusercontent.com'

function apiHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapHttpError(status: number, res: Response): GithubError {
  const remaining = res.headers.get('x-ratelimit-remaining')
  const reset = res.headers.get('x-ratelimit-reset')
  const retryAfter = res.headers.get('retry-after')
  if (status === 404) {
    return new GithubError('not-found', '仓库不存在、已改名，或为非公开仓库', status)
  }
  if (status === 401) {
    return new GithubError('unauthorized', 'Token 无效或权限不足', status)
  }
  if (status === 409) {
    return new GithubError('empty', '仓库为空，暂无可分析内容', status)
  }
  if (status === 403 && remaining === '0') {
    return new GithubError(
      'rate-limit',
      'GitHub API 额度已耗尽，请稍后重试或配置 Token',
      status,
      reset ? Number(reset) * 1000 : undefined,
    )
  }
  if (status === 429) {
    return new GithubError(
      'rate-limit',
      '请求过于频繁，请稍后重试',
      status,
      retryAfter ? Date.now() + Number(retryAfter) * 1000 : undefined,
    )
  }
  if (status >= 500) {
    return new GithubError('server', 'GitHub 服务异常，请稍后重试', status)
  }
  return new GithubError('server', `GitHub 请求失败（HTTP ${status}）`, status)
}

async function requestJson<T>(
  url: string,
  options: ClientOptions,
  init: RequestInit = {},
  retryOnNetwork = true,
): Promise<T> {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis)
  if (options.signal?.aborted) throw new GithubError('cancelled', '已取消')

  let attempt = 0
  while (true) {
    attempt++
    try {
      const res = await fetchFn(url, {
        ...init,
        headers: { ...apiHeaders(options.token), ...(init.headers as Record<string, string>) },
        signal: options.signal,
      })
      if (!res.ok) {
        if (res.status >= 500 && attempt === 1) {
          await sleep(500)
          continue
        }
        throw mapHttpError(res.status, res)
      }
      return (await res.json()) as T
    } catch (err) {
      if (err instanceof GithubError) throw err
      if (options.signal?.aborted) throw new GithubError('cancelled', '已取消')
      if (retryOnNetwork && attempt === 1) {
        await sleep(500)
        continue
      }
      throw new GithubError('network', '网络请求失败，请检查网络后重试')
    }
  }
}

interface RawRepo {
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  license: { spdx_id: string | null } | null
  archived: boolean
  default_branch: string
  owner: { login: string }
}

interface RawCommit {
  sha: string
  commit: { message: string; author: { date?: string } | null; committer?: { date?: string } | null }
}

interface RawTree {
  tree: Array<{ path: string; type: 'blob' | 'tree' | 'commit'; size?: number; sha: string }>
  truncated: boolean
}

export async function fetchRepoMeta(owner: string, repo: string, options: ClientOptions = {}): Promise<RepoMeta> {
  const raw = await requestJson<RawRepo>(`${API}/repos/${owner}/${repo}`, options)
  return {
    owner: raw.owner?.login ?? owner,
    name: raw.name,
    fullName: raw.full_name,
    htmlUrl: raw.html_url,
    description: raw.description ?? null,
    language: raw.language ?? null,
    stars: raw.stargazers_count ?? 0,
    license: raw.license?.spdx_id ?? null,
    archived: Boolean(raw.archived),
    defaultBranch: raw.default_branch,
  }
}

export async function fetchHeadCommit(
  owner: string,
  repo: string,
  branch: string,
  options: ClientOptions = {},
): Promise<CommitInfo> {
  const raw = await requestJson<RawCommit>(
    `${API}/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
    options,
  )
  return {
    sha: raw.sha,
    shortSha: raw.sha.slice(0, 7),
    date: raw.commit.author?.date ?? raw.commit.committer?.date ?? '',
    message: (raw.commit.message ?? '').split('\n')[0],
  }
}

export async function fetchTree(
  owner: string,
  repo: string,
  sha: string,
  options: ClientOptions = {},
): Promise<RepoTree> {
  const raw = await requestJson<RawTree>(
    `${API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    options,
  )
  const entries: TreeEntry[] = (raw.tree ?? []).map((e) => ({
    path: e.path,
    type: e.type,
    size: e.size,
    sha: e.sha,
  }))
  return { entries, truncated: Boolean(raw.truncated) }
}

function encodedPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  sha: string,
  path: string,
  options: ClientOptions = {},
): Promise<string> {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis)
  if (options.signal?.aborted) throw new GithubError('cancelled', '已取消')

  const rawUrl = `${RAW}/${owner}/${repo}/${sha}/${encodedPath(path)}`
  try {
    const res = await fetchFn(rawUrl, { signal: options.signal })
    if (res.ok) return await res.text()
  } catch {
    if (options.signal?.aborted) throw new GithubError('cancelled', '已取消')
  }

  // 兜底：contents API（占用 1 次额度）
  const contents = await requestJson<{ content?: string; encoding?: string }>(
    `${API}/repos/${owner}/${repo}/contents/${encodedPath(path)}?ref=${sha}`,
    options,
    {},
    false,
  )
  if (!contents.content) {
    throw new GithubError('invalid', `无法读取文件：${path}`)
  }
  const base64 = contents.content.replace(/\s/g, '')
  try {
    return globalThis.atob(base64)
  } catch {
    throw new GithubError('invalid', `文件编码异常：${path}`)
  }
}
