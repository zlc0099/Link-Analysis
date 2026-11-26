export type ParseErrorCode = 'empty' | 'not-github' | 'invalid'

export interface ParseOk {
  ok: true
  owner: string
  repo: string
  /** true 表示输入带 /tree/、/blob/ 等多余路径，已归一到仓库根 */
  normalized: boolean
}

export interface ParseFail {
  ok: false
  code: ParseErrorCode
  message: string
}

export type ParseResult = ParseOk | ParseFail

const NAME_RE = /^[A-Za-z0-9._-]+$/

function fail(code: ParseErrorCode, message: string): ParseFail {
  return { ok: false, code, message }
}

function build(owner: string, repo: string, normalized: boolean): ParseResult {
  const cleanRepo = repo.replace(/\.git$/i, '')
  if (!owner || !cleanRepo) {
    return fail('invalid', '链接里缺少仓库名，请使用 github.com/owner/repo 形式')
  }
  if (cleanRepo === '.' || cleanRepo === '..') {
    return fail('invalid', '仓库名不合法')
  }
  if (!NAME_RE.test(owner) || !NAME_RE.test(cleanRepo)) {
    return fail('invalid', '仓库名含有不支持的字符，仅支持字母、数字、点、下划线、连字符')
  }
  return { ok: true, owner, repo: cleanRepo, normalized }
}

export function parseRepoUrl(input: string): ParseResult {
  const raw = (input ?? '').trim()
  if (!raw) return fail('empty', '请输入 GitHub 仓库链接')

  // owner/repo 简写（不含协议、不含域名）
  if (!raw.includes('://') && !raw.startsWith('git@')) {
    const shorthand = raw.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/)
    if (shorthand) {
      return build(shorthand[1], shorthand[2], false)
    }
  }

  // git@github.com:owner/repo.git
  const ssh = raw.match(/^git@([^:]+):(.+)$/i)
  if (ssh) {
    if (!/^(www\.)?github\.com$/i.test(ssh[1])) {
      return fail('not-github', '当前仅支持 GitHub 公开仓库')
    }
    const parts = ssh[2].split('/').filter(Boolean)
    if (parts.length < 2) return fail('invalid', '链接里缺少仓库名')
    return build(parts[0], parts[1], parts.length > 2)
  }

  let url: URL
  try {
    const withScheme = raw.startsWith('github.com/') ? `https://${raw}` : raw
    url = new URL(withScheme)
  } catch {
    return fail('invalid', '链接格式不正确，请粘贴完整的 GitHub 仓库链接')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return fail('invalid', '仅支持 https 链接')
  }
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
    return fail('not-github', '当前仅支持 GitHub 公开仓库')
  }

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length < 2) {
    return fail('invalid', '链接里缺少仓库名，请使用 github.com/owner/repo 形式')
  }
  return build(parts[0], parts[1], parts.length > 2)
}
