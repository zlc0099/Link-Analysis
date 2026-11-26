import { describe, it, expect } from 'vitest'
import { computeScore, gradeOf } from '../../src/core/score/score'
import type { RuleOutcome, Dimension, RuleOutcome as RO } from '../../src/core/rules/types'
import { RULE_POINTS } from '../../src/core/score/items'

function pass(ruleId: string, dimension: Dimension): RO {
  return { ruleId, dimension, status: 'pass', findings: [] }
}
function fail(ruleId: string, dimension: Dimension, severity = 'P2'): RO {
  return {
    ruleId,
    dimension,
    status: 'fail',
    findings: [
      {
        id: ruleId,
        ruleId,
        dimension,
        severity: severity as any,
        confidence: 'high',
        title: 't',
        impact: '',
        suggestion: '',
      },
    ],
  }
}
function na(ruleId: string, dimension: Dimension): RO {
  return { ruleId, dimension, status: 'na', findings: [] }
}

function allPass(): RuleOutcome[] {
  return Object.entries(RULE_POINTS).map(([ruleId, def]) => pass(ruleId, def.dimension))
}

describe('score', () => {
  it('gives 100 / A when everything passes', () => {
    const r = computeScore(allPass())
    expect(r.score.raw).toBe(100)
    expect(r.score.official).toBe(100)
    expect(r.score.grade).toBe('A')
    expect(r.score.capped).toBe(false)
  })

  it('reproduces the documented 76 / B example', () => {
    const outcomes = allPass().map((o) => {
      if (o.ruleId === 'DOC-03') return fail('DOC-03', 'docs')
      if (o.ruleId === 'DEP-02') return fail('DEP-02', 'deps')
      if (o.ruleId === 'RUN-02') return fail('RUN-02', 'run')
      if (o.ruleId === 'RUN-03') return fail('RUN-03', 'run')
      if (o.ruleId === 'PATH-02') return fail('PATH-02', 'portability')
      return o
    })
    const r = computeScore(outcomes)
    expect(r.score.raw).toBe(76)
    expect(r.score.official).toBe(76)
    expect(r.score.grade).toBe('B')
  })

  it('caps a red-line repository at 39 with raw score preserved', () => {
    const outcomes = allPass().map((o) => {
      if (o.ruleId.startsWith('DOC') && o.ruleId !== 'DOC-01') return fail(o.ruleId, 'docs')
      if (o.ruleId === 'DEP-02') return fail('DEP-02', 'deps')
      if (o.ruleId.startsWith('RUN') && o.ruleId !== 'RUN-01') return fail(o.ruleId, 'run')
      if (o.ruleId === 'PATH-01') return fail('PATH-01', 'portability', 'P1')
      if (o.ruleId === 'SEC-02') return fail('SEC-02', 'security', 'P0')
      return o
    })
    const r = computeScore(outcomes)
    expect(r.score.raw).toBe(56)
    expect(r.score.official).toBe(39)
    expect(r.score.grade).toBe('D')
    expect(r.score.capped).toBe(true)
    expect(r.score.verdict).toContain('封顶')
  })

  it('counts inapplicable items as zero without shrinking the max', () => {
    const outcomes = Object.entries(RULE_POINTS).map(([ruleId, def]) =>
      ruleId.startsWith('SEC') ? na(ruleId, 'security') : pass(ruleId, def.dimension),
    )
    const r = computeScore(outcomes)
    expect(r.score.raw).toBe(80)
    expect(r.dimensions.find((d) => d.dimension === 'security')!.max).toBe(20)
    expect(r.dimensions.find((d) => d.dimension === 'security')!.score).toBe(0)
  })

  it('computes dimension details with rule status', () => {
    const outcomes = allPass().map((o) => (o.ruleId === 'DOC-01' ? fail('DOC-01', 'docs', 'P1') : o))
    const r = computeScore(outcomes)
    const docs = r.dimensions.find((d) => d.dimension === 'docs')!
    expect(docs.score).toBe(12)
    expect(docs.items.find((i) => i.ruleId === 'DOC-01')!.passed).toBe(false)
  })

  it.each([
    [100, 'A'],
    [85, 'A'],
    [84, 'B'],
    [70, 'B'],
    [69, 'C'],
    [50, 'C'],
    [49, 'D'],
    [0, 'D'],
  ])('maps %i to grade %s', (score, grade) => {
    expect(gradeOf(score)).toBe(grade)
  })
})
