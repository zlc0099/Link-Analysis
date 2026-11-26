import type { Finding, RuleOutcome } from '../rules/types'
import type { DimensionScore, ReportScore } from '../report/schema'
import { DIMENSION_LABELS, DIMENSION_ORDER, RULE_POINTS } from './items'

const VERDICTS: Record<ReportScore['grade'], string> = {
  A: '可直接接入：文档、依赖、启动与安全基线齐全',
  B: '小修后接入：按清单补齐 P1 项即可',
  C: '需专人梳理：存在多项接入缺口，建议安排环境梳理',
  D: '不建议直接接入：存在红线风险或关键缺口，先修复再评估',
}

export function gradeOf(score: number): ReportScore['grade'] {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export interface ScoreResult {
  dimensions: DimensionScore[]
  score: ReportScore
}

export function computeScore(outcomes: RuleOutcome[], extraFindings: Finding[] = []): ScoreResult {
  const byRule = new Map(outcomes.map((o) => [o.ruleId, o]))
  const dimensions: DimensionScore[] = []

  for (const dimension of DIMENSION_ORDER) {
    const items: DimensionScore['items'] = []
    let total = 0
    for (const [ruleId, def] of Object.entries(RULE_POINTS)) {
      if (def.dimension !== dimension) continue
      const o = byRule.get(ruleId)
      const passed = o?.status === 'pass'
      const applicable = o?.status !== 'na'
      const earned = passed ? def.points : 0
      total += earned
      items.push({
        ruleId,
        label: def.label,
        passed,
        applicable,
        points: def.points,
        earned,
        evidenceFindingIds: (o?.findings ?? []).map((f) => f.id),
      })
    }
    dimensions.push({
      dimension,
      label: DIMENSION_LABELS[dimension],
      score: total,
      max: 20,
      items,
    })
  }

  const raw = dimensions.reduce((sum, d) => sum + d.score, 0)
  const capped =
    outcomes.some((o) => o.findings.some((f) => f.severity === 'P0')) ||
    extraFindings.some((f) => f.severity === 'P0')
  const official = capped ? Math.min(raw, 39) : raw
  const grade = gradeOf(official)
  const verdict = capped ? `${VERDICTS[grade]}；触发安全红线：总分封顶 39` : VERDICTS[grade]

  return { dimensions, score: { raw, official, capped, grade, verdict } }
}
