import type { Report } from '../report/schema'
import { maskSecret } from '../report/mask'

/**
 * 构建 AI 接入建议的 Prompt。
 * 评分与事实全部来自规则引擎报告；evidence 进 Prompt 前做最后一道模式脱敏。
 * INFO 信息项不参与；P0/P1 全量，P2/P3 各截断前 5 条，控制 token 成本。
 */

const EVIDENCE_MAX = 120
const P2_P3_LIMIT = 5

const SEV_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, INFO: 4 }

/** 模式级脱敏兜底：常见密钥前缀与超长高熵串一律掩码中段 */
function scrub(text: string): string {
  return text
    .replace(/\b(?:sk|ghp|gho|ghu|github_pat|xoxb|xoxp|AKID|AIza|Bearer)[A-Za-z0-9_-]{8,}/g, (m) =>
      maskSecret(m),
    )
    .replace(/\b[A-Za-z0-9+/_-]{32,}\b/g, (m) => maskSecret(m))
}

function cut(text: string, max = EVIDENCE_MAX): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function buildAIPrompt(report: Report): { system: string; user: string } {
  const fs = [...report.findings]
    .filter((f) => f.severity !== 'INFO')
    .sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9))

  const picked = [
    ...fs.filter((f) => f.severity === 'P0' || f.severity === 'P1'),
    ...fs.filter((f) => f.severity === 'P2').slice(0, P2_P3_LIMIT),
    ...fs.filter((f) => f.severity === 'P3').slice(0, P2_P3_LIMIT),
  ]

  const payload = {
    repo: {
      name: report.repo.fullName,
      language: report.repo.language,
      stars: report.repo.stars,
      license: report.repo.license,
      archived: report.repo.archived,
    },
    score: {
      official: report.score.official,
      raw: report.score.raw,
      capped: report.score.capped,
      grade: report.score.grade,
      verdict: report.score.verdict,
    },
    dimensions: report.dimensions.map((d) => ({
      label: d.label,
      score: `${d.score}/${d.max}`,
      failed: d.items
        .filter((i) => i.applicable && !i.passed)
        .map((i) => `${i.ruleId} ${i.label}`),
    })),
    findings: picked.map((f) => ({
      severity: f.severity,
      ruleId: f.ruleId,
      title: f.title,
      location: f.file ? `${f.file}:${f.line ?? ''}` : '仓库级',
      evidence: cut(scrub(f.evidence ?? '')),
    })),
    limitations: report.limitations,
  }

  const system = [
    '你是接入评审助手。评分已由确定性规则引擎计算，禁止重新打分，禁止修改评分。',
    '基于输入 JSON 输出严格 JSON（禁止 markdown 代码块、禁止额外解释文字），结构如下：',
    '{',
    '  "overall": "两句话整体评价",',
    '  "objections": [{"ruleId": "规则ID", "reason": "认为该规则结论不适用的理由"}],',
    '  "fixPlan": [{"priority": 1, "title": "问题标题", "steps": ["可执行的单一动作"]}],',
    '  "checklist": ["接入前检查项"]',
    '}',
    '要求：',
    '- 只使用给定信息，不编造文件内容；',
    '- objections 允许对规则结论提出异议（如某规则在该语言生态不适用），无则给空数组；',
    '- fixPlan 按优先级排序（1 最高），优先覆盖 P0/P1；',
    '- 全部使用中文；steps 每条是可执行的单一动作。',
  ].join('\n')

  return { system, user: JSON.stringify(payload) }
}

/** 供「复制 Prompt」降级路径使用：拼成可直接粘贴到 AI 对话框的完整文本 */
export function buildAIPromptText(report: Report): string {
  const { system, user } = buildAIPrompt(report)
  return `${system}\n\n${user}`
}
