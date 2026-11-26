import type { CommitInfo, RepoMeta } from '../github/types'
import type { Finding, RuleOutcome, Severity } from '../rules/types'
import type { Coverage, Report } from './schema'
import { computeScore } from '../score/score'
import { RULE_VERSION } from '../score/items'

const SEVERITY_ORDER: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3, INFO: 4 }

export interface BuildReportInput {
  meta: RepoMeta
  commit: CommitInfo
  analyzedAt: string
  coverage: Coverage
  outcomes: RuleOutcome[]
  extraFindings?: Finding[]
  limitations?: string[]
  appVersion?: string
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (s !== 0) return s
    const fa = a.file ?? ''
    const fb = b.file ?? ''
    if (fa !== fb) return fa < fb ? -1 : 1
    return (a.line ?? 0) - (b.line ?? 0)
  })
}

export function buildReport(input: BuildReportInput): Report {
  const { meta, commit, analyzedAt, coverage, outcomes } = input
  const extra = input.extraFindings ?? []
  const findings = sortFindings([...outcomes.flatMap((o) => o.findings), ...extra])
  const { dimensions, score } = computeScore(outcomes, extra)

  const limitations: string[] = [
    '静态扫描，不执行代码、不安装依赖；「能否运行」仅依据线索与文档判断。',
    '仅分析默认分支的当前快照，不检查 Git 历史。',
    '密钥检测基于模式与启发式，存在误报 / 漏报，不替代安全审计。',
    '分析上限 400 个文件、单文件 512KB；超大仓库覆盖率会下降。',
    ...(input.limitations ?? []),
  ]
  if (coverage.treeTruncated) {
    limitations.push('仓库文件树被截断，仅分析返回的部分文件。')
  }
  if (coverage.failedFiles.length) {
    limitations.push(`${coverage.failedFiles.length} 个文件读取失败，报告基于已分析文件。`)
  }

  return {
    schemaVersion: 1,
    ruleVersion: RULE_VERSION,
    appVersion: input.appVersion ?? '0.1.0',
    repo: {
      owner: meta.owner,
      name: meta.name,
      fullName: meta.fullName,
      htmlUrl: meta.htmlUrl,
      description: meta.description,
      language: meta.language,
      stars: meta.stars,
      license: meta.license,
      archived: meta.archived,
      defaultBranch: meta.defaultBranch,
    },
    commit,
    analyzedAt,
    coverage,
    findings,
    dimensions,
    score,
    limitations,
    outcomes,
  }
}
