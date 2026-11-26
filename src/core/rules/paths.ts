import type { RuleContext, RuleOutcome, Finding } from './types'
import { makeFinding, outcome } from './types'
import { makePermalink, truncate } from './helpers'

interface PathRule {
  ruleId: string
  pattern: RegExp
  severity: 'P1' | 'P2'
  title: string
  impact: string
  suggestion: string
  accountGroup?: number
}

const GENERIC_ACCOUNTS = new Set([
  'shared', 'user', 'username', 'runner', 'ubuntu', 'node', 'example', 'public', 'default',
])

const RULES: PathRule[] = [
  {
    ruleId: 'PATH-01',
    pattern: /(?:^|[\s"'`(=])([A-Za-z]:[\\/][^\s"'`)]*)/g,
    severity: 'P1',
    title: '源码中存在 Windows 盘符路径',
    impact: '路径绑定到个人 Windows 机器，macOS / Linux / CI 上会直接失效。',
    suggestion: '改为相对路径、项目内配置或环境变量，不绑定个人机器。',
  },
  {
    ruleId: 'PATH-02',
    pattern: /\/Users\/([A-Za-z0-9_.${}<>-]+)[^\s"'`)]*/g,
    severity: 'P1',
    title: '源码中存在 macOS 个人目录路径',
    impact: '路径绑定到个人 macOS 用户目录，其他环境无法直接使用。',
    suggestion: '改为相对路径或环境变量（如 process.env.HOME）。',
    accountGroup: 1,
  },
  {
    ruleId: 'PATH-03',
    pattern: /\/home\/([A-Za-z0-9_.${}<>-]+)[^\s"'`)]*/g,
    severity: 'P2',
    title: '源码中存在 Linux 个人目录路径',
    impact: '路径绑定到特定 Linux 用户，换机器或 CI 上容易失败。',
    suggestion: '改为相对路径或环境变量。',
    accountGroup: 1,
  },
  {
    ruleId: 'PATH-04',
    pattern: /(?:file:\/\/[^\s"'`)]*|(?:^|[\s"'`(=])(\\\\[A-Za-z0-9_.-]+[\\/][^\s"'`)]*))/g,
    severity: 'P2',
    title: '源码中存在 file:// 或 UNC 网络路径',
    impact: '依赖本机文件系统或局域网共享，换环境后不可用。',
    suggestion: '改为相对路径、对象存储 URL 或可配置的基路径。',
  },
]

interface Hit {
  file: string
  line: number
  evidence: string
  scored: boolean
}

function isGenericAccount(account: string): boolean {
  const a = account.toLowerCase()
  if (GENERIC_ACCOUNTS.has(a)) return true
  if (a.startsWith('${') || a.startsWith('<')) return true
  if (/\$\{|\{\{|<[^>]*>/.test(account)) return true
  return false
}

function scanRule(ctx: RuleContext, rule: PathRule): Hit[] {
  const hits: Hit[] = []
  for (const file of ctx.files) {
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.length > 2000) continue
      const re = new RegExp(rule.pattern.source, rule.pattern.flags)
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        if (rule.accountGroup) {
          const account = m[rule.accountGroup] ?? ''
          if (isGenericAccount(account)) continue
        }
        hits.push({
          file: file.path,
          line: i + 1,
          evidence: truncate(m[0].replace(/^[\s"'`(=]+/, ''), 160),
          scored: file.class === 'source' || file.class === 'config',
        })
      }
    }
  }
  return hits
}

export function evaluatePaths(ctx: RuleContext): RuleOutcome[] {
  return RULES.map((rule) => {
    const hits = scanRule(ctx, rule)
    const scored = hits.filter((h) => h.scored)
    const notices = hits.filter((h) => !h.scored).slice(0, 5)

    const findings: Finding[] = []
    if (scored.length) {
      for (const hit of scored.slice(0, 5)) {
        findings.push(
          makeFinding(rule.ruleId, 'portability', rule.severity, `${rule.title}（共 ${scored.length} 处）`, {
            file: hit.file,
            line: hit.line,
            evidence: hit.evidence,
            confidence: 'high',
            impact: rule.impact,
            suggestion: rule.suggestion,
            permalink: makePermalink(ctx, hit.file, hit.line),
          }),
        )
      }
    }
    for (const hit of notices) {
      findings.push(
        makeFinding(rule.ruleId, 'portability', 'INFO', '文档/脚本中的绝对路径（仅提示，不计分）', {
          file: hit.file,
          line: hit.line,
          evidence: hit.evidence,
          confidence: 'medium',
          impact: '示例中的绝对路径可能误导使用者，但不影响接入评分。',
          suggestion: '如为示例，可改为通用占位路径。',
          permalink: makePermalink(ctx, hit.file, hit.line),
        }),
      )
    }

    return outcome(rule.ruleId, 'portability', scored.length === 0, findings)
  })
}
