import type { RuleContext, RuleOutcome, Finding } from './types'
import { makeFinding, outcome } from './types'
import { basename, isTestPath } from '../select/classify'
import { makePermalink, truncate } from './helpers'
import { maskSecret } from '../report/mask'

const PLACEHOLDER_TOKENS = [
  'xxx', '***', 'your', 'example', 'sample', 'demo', 'dummy', 'test',
  'changeme', 'placeholder', 'process.env', 'os.getenv', 'system.getenv',
  'env(', '${', '{{', '<',
]

const KEY_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /sk_live_[A-Za-z0-9]{24,}/g,
  /AKID[A-Za-z0-9]{13,}/g,
  /AKIA[A-Z0-9]{16}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /ghp_[A-Za-z0-9]{36}/g,
  /github_pat_[A-Za-z0-9_]{22,}/g,
  /glpat-[A-Za-z0-9_-]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
]

const CREDENTIAL_FILES = new Set([
  'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', 'credentials.json',
])

const GENERIC_ASSIGN =
  /(password|passwd|pwd|secret|token|api_key|apikey)\s*[:=]\s*["']([^"']{8,})["']/gi

const BEARER = /Bearer\s+([A-Za-z0-9._-]{20,})/g

export function isPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (!v) return true
  if (/^(.)\1+$/.test(v)) return true
  return PLACEHOLDER_TOKENS.some((t) => v.includes(t))
}

interface Located {
  file: string
  line: number
  text: string
}

function scanFile(file: { path: string; content: string }, re: RegExp, groupIndex = 0): Located[] {
  const out: Located[] = []
  const lines = file.content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 2000) continue
    const r = new RegExp(re.source, re.flags)
    let m: RegExpExecArray | null
    while ((m = r.exec(lines[i])) !== null) {
      out.push({ file: file.path, line: i + 1, text: m[groupIndex] ?? m[0] })
    }
  }
  return out
}

function privateKeyFindings(ctx: RuleContext): Finding[] {
  const findings: Finding[] = []
  for (const file of ctx.files) {
    const m = /-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----/.exec(file.content)
    if (!m) continue
    const downgraded = file.class === 'test' || isTestPath(file.path)
    findings.push(
      makeFinding('SEC-01', 'security', downgraded ? 'P1' : 'P0', '仓库中检出了私钥', {
        file: file.path,
        line: file.content.slice(0, m.index).split('\n').length,
        evidence: `私钥类型：${m[1]}`,
        confidence: 'high',
        impact: '私钥随仓库扩散后可能被直接用于访问服务器或云资源。',
        suggestion: '立即撤销该密钥、从 Git 历史移除，并更换新凭证。',
        permalink: makePermalink(ctx, file.path),
      }),
    )
  }
  return findings
}

function envFindings(ctx: RuleContext): { scored: Finding[]; notices: Finding[] } {
  const scored: Finding[] = []
  const notices: Finding[] = []
  const envEntries = ctx.tree.filter((e) => {
    if (e.type !== 'blob') return false
    const b = basename(e.path)
    if (!(b === '.env' || b.startsWith('.env.'))) return false
    return !/\.(example|sample|template|dist)$/i.test(b)
  })

  for (const entry of envEntries) {
    const file = ctx.files.find((f) => f.path === entry.path)
    const names: string[] = []
    let real = false
    if (file) {
      for (const raw of file.content.split('\n')) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
        if (!m) continue
        names.push(m[1])
        const value = m[2].replace(/^["']|["']$/g, '')
        if (value.length >= 6 && !isPlaceholder(value)) real = true
      }
    }

    const inTest = isTestPath(entry.path)
    const severity = inTest ? (real ? 'P1' : 'INFO') : real ? 'P0' : 'P2'
    const title = inTest
      ? '测试目录中的 .env（仅提示，不计分）'
      : real
        ? '仓库中提交了含真实值的 .env'
        : '仓库中提交了 .env（仅占位值）'

    const finding = makeFinding('SEC-02', 'security', severity, title, {
      file: entry.path,
      evidence: `变量：${names.slice(0, 6).join(', ') || '（未读取到内容）'}`,
      confidence: real ? 'high' : 'medium',
      impact: inTest
        ? '测试夹具中的 .env 不影响接入评分，但不要在测试里放真实凭证。'
        : real
          ? '环境变量中的凭证随仓库公开，存在被直接滥用的风险。'
          : '提交 .env 会诱导更多真实值入库，也容易覆盖本地配置。',
      suggestion: inTest
        ? '保持占位值即可；如含真实凭证请立即轮换并移出测试目录。'
        : '移除文件、轮换其中全部密钥，加入 .gitignore 并提供 .env.example。',
      permalink: makePermalink(ctx, entry.path),
    })

    if (inTest) notices.push(finding)
    else scored.push(finding)
  }
  return { scored, notices }
}

function keyFindings(ctx: RuleContext): Finding[] {
  const findings: Finding[] = []
  for (const file of ctx.files) {
    for (const re of KEY_PATTERNS) {
      for (const hit of scanFile(file, re)) {
        if (isPlaceholder(hit.text)) continue
        const sensitive = (file.class === 'source' || file.class === 'config') && !isTestPath(hit.file)
        findings.push(
          makeFinding(
            'SEC-03',
            'security',
            sensitive ? 'P0' : 'P1',
            sensitive ? '源码/配置中检出高置信凭证' : '文档或脚本中检出疑似凭证',
            {
              file: hit.file,
              line: hit.line,
              evidence: maskSecret(hit.text),
              confidence: sensitive ? 'high' : 'medium',
              impact: sensitive
                ? '凭证可能被直接用于调用外部服务，且已进入公开仓库。'
                : '可能是示例，但若为真实值同样存在泄漏风险。',
              suggestion: '确认并轮换该凭证，改为环境变量或密钥管理服务注入。',
              permalink: makePermalink(ctx, hit.file, hit.line),
            },
          ),
        )
      }
    }
  }
  return findings
}

function otherSecretFindings(ctx: RuleContext): { failing: Finding[]; notices: Finding[] } {
  const failing: Finding[] = []
  const notices: Finding[] = []

  for (const entry of ctx.tree) {
    if (entry.type !== 'blob') continue
    const b = basename(entry.path)
    if (CREDENTIAL_FILES.has(b) || /\.(pem|pfx|p12|jks)$/i.test(b)) {
      failing.push(
        makeFinding('SEC-04', 'security', 'P1', '仓库中存在凭证类文件', {
          file: entry.path,
          evidence: truncate(entry.path, 160),
          confidence: 'high',
          impact: '凭证文件入库可能泄露证书或访问凭据。',
          suggestion: '移除该文件并轮换凭据，改为运行时注入或密钥管理服务。',
          permalink: makePermalink(ctx, entry.path),
        }),
      )
    }
  }

  for (const file of ctx.files) {
    if (!(file.class === 'source' || file.class === 'config') || isTestPath(file.path)) continue
    for (const hit of scanFile(file, BEARER, 1)) {
      if (isPlaceholder(hit.text)) continue
      failing.push(
        makeFinding('SEC-04', 'security', 'P1', '源码中存在 Bearer 令牌', {
          file: hit.file,
          line: hit.line,
          evidence: maskSecret(hit.text),
          confidence: 'high',
          impact: '令牌可能被直接用于访问 API。',
          suggestion: '改为从环境变量读取，并轮换已暴露的令牌。',
          permalink: makePermalink(ctx, hit.file, hit.line),
        }),
      )
    }
    for (const hit of scanFile(file, GENERIC_ASSIGN, 2)) {
      const value = hit.text
      if (isPlaceholder(value)) continue
      notices.push(
        makeFinding('SEC-04', 'security', 'P2', '疑似硬编码密码/密钥（待确认）', {
          file: hit.file,
          line: hit.line,
          evidence: maskSecret(value),
          confidence: 'low',
          impact: '若为真实值，存在泄漏风险；也可能只是测试或变量名。',
          suggestion: '确认来源；真实值请改为环境变量注入。',
          permalink: makePermalink(ctx, hit.file, hit.line),
        }),
      )
    }
  }

  return { failing: failing.slice(0, 5), notices: notices.slice(0, 5) }
}

export function evaluateSecrets(ctx: RuleContext): RuleOutcome[] {
  const sec01 = privateKeyFindings(ctx)
  const sec02 = envFindings(ctx)
  const sec02Findings = [...sec02.scored, ...sec02.notices]
  const sec03 = keyFindings(ctx)
  const sec04 = otherSecretFindings(ctx)

  return [
    outcome('SEC-01', 'security', sec01.length === 0, sec01.slice(0, 5)),
    outcome('SEC-02', 'security', sec02.scored.length === 0, sec02Findings.slice(0, 5)),
    outcome('SEC-03', 'security', sec03.length === 0, sec03.slice(0, 5)),
    outcome('SEC-04', 'security', sec04.failing.length === 0, [...sec04.failing, ...sec04.notices]),
  ]
}
