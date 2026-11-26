import type { Report } from './schema'
import type { Finding, Severity } from '../rules/types'

const SEVERITY_ORDER: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3, INFO: 4 }

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (s !== 0) return s
    const fa = a.file ?? ''
    const fb = b.file ?? ''
    if (fa !== fb) return fa < fb ? -1 : 1
    return (a.line ?? 0) - (b.line ?? 0)
  })
}

function oneLine(text: string): string {
  return text.replace(/\r?\n/g, ' ')
}

function findingBlock(f: Finding): string {
  const lines: string[] = []
  const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '（仓库级）'
  lines.push(`### [${f.severity}] ${f.title}`)
  lines.push(`- 规则：${f.ruleId}`)
  lines.push(`- 位置：${loc}`)
  if (f.evidence) lines.push(`- 证据：${oneLine(f.evidence)}`)
  if (f.impact) lines.push(`- 影响：${oneLine(f.impact)}`)
  if (f.suggestion) lines.push(`- 建议：${oneLine(f.suggestion)}`)
  if (f.permalink) lines.push(`- 链接：${f.permalink}`)
  lines.push('')
  return lines.join('\n')
}

export function buildMarkdown(report: Report): string {
  const { repo, commit, coverage, score } = report
  const findings = sortFindings(report.findings)
  const major = findings.filter((f) => f.severity === 'P0' || f.severity === 'P1')
  const minor = findings.filter((f) => f.severity === 'P2' || f.severity === 'P3')
  const info = findings.filter((f) => f.severity === 'INFO')
  const incomplete = coverage.treeTruncated || coverage.failedFiles.length > 0

  const lines: string[] = []
  lines.push('# Link-Analysis 接入体检报告', '')
  lines.push(`- 仓库：${repo.fullName} @ ${repo.defaultBranch} @ ${commit.shortSha}`)
  lines.push(`- 提交：${commit.sha}`)
  lines.push(`- 分析时间：${report.analyzedAt}`)
  lines.push(`- 规则版本：${report.ruleVersion} · 应用版本：${report.appVersion}`)
  lines.push(
    `- 覆盖率：已分析 ${coverage.analyzedFiles} / ${coverage.selectedFiles}（候选 ${coverage.eligibleFiles}）`,
  )
  lines.push(`- 数据完整性：${incomplete ? '数据不完整' : '完整'}`)
  if (incomplete) {
    if (coverage.treeTruncated) lines.push('- 说明：仓库文件树被截断，仅分析返回的部分文件。')
    if (coverage.failedFiles.length) {
      lines.push(`- 读取失败文件：${coverage.failedFiles.slice(0, 20).join(', ')}`)
    }
  }
  lines.push('')

  lines.push('## 结论', '')
  const scoreLine = score.capped
    ? `**${score.official} / ${score.grade}**（原始分 ${score.raw}，触发红线封顶 39）— ${score.verdict}`
    : `**${score.official} / ${score.grade}** — ${score.verdict}`
  lines.push(scoreLine, '')

  lines.push('| 维度 | 得分 |', '| --- | --- |')
  for (const d of report.dimensions) {
    lines.push(`| ${d.label} | ${d.score} / ${d.max} |`)
  }
  lines.push('')

  lines.push('## 主要风险（P0 / P1）', '')
  if (major.length) {
    for (const f of major) lines.push(findingBlock(f))
  } else {
    lines.push('未发现 P0 / P1 风险。', '')
  }

  if (minor.length) {
    lines.push('## 次要问题（P2 / P3）', '')
    for (const f of minor) lines.push(findingBlock(f))
  }

  if (info.length) {
    lines.push('## 信息项', '')
    for (const f of info) lines.push(findingBlock(f))
  }

  lines.push('## 评分明细', '')
  lines.push('| 维度 | 规则 | 状态 | 得分 |', '| --- | --- | --- | --- |')
  for (const d of report.dimensions) {
    for (const item of d.items) {
      const status = !item.applicable ? '不适用' : item.passed ? '通过' : '失败'
      lines.push(`| ${d.label} | ${item.ruleId} ${item.label} | ${status} | ${item.earned} / ${item.points} |`)
    }
  }
  lines.push('')

  if (report.limitations.length) {
    lines.push('## 已知限制', '')
    for (const l of report.limitations) lines.push(`- ${l}`)
    lines.push('')
  }

  lines.push('---', '', '由 Link-Analysis 生成。静态扫描，不执行代码；结果仅供参考，不替代安全审计。')
  return lines.join('\n')
}

export function exportFileName(report: Report): string {
  return `link-analysis-${report.repo.owner}-${report.repo.name}-${report.commit.shortSha}.md`
}
