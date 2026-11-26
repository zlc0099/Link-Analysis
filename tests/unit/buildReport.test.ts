import { describe, it, expect } from 'vitest'
import { buildReport } from '../../src/core/report/build'
import { RULE_POINTS } from '../../src/core/score/items'
import type { RuleOutcome } from '../../src/core/rules/types'

const meta = {
  owner: 'o',
  name: 'r',
  fullName: 'o/r',
  htmlUrl: 'https://github.com/o/r',
  description: null,
  language: null,
  stars: 0,
  license: null,
  archived: false,
  defaultBranch: 'main',
}
const commit = { sha: 'abcdef1234567890', shortSha: 'abcdef1', date: '2026-11-01T00:00:00Z', message: 'init' }

function outcomesAllPass(): RuleOutcome[] {
  return Object.entries(RULE_POINTS).map(([ruleId, def]) => ({
    ruleId,
    dimension: def.dimension,
    status: 'pass' as const,
    findings: [],
  }))
}

const coverage = {
  treeTruncated: false,
  eligibleFiles: 5,
  selectedFiles: 5,
  analyzedFiles: 5,
  failedFiles: [] as string[],
  skippedBinary: 0,
  skippedLarge: 0,
  bytesScanned: 100,
}

describe('buildReport', () => {
  it('builds a complete report with score and version metadata', () => {
    const report = buildReport({
      meta,
      commit,
      analyzedAt: '2026-11-26T00:00:00.000Z',
      coverage,
      outcomes: outcomesAllPass(),
    })
    expect(report.schemaVersion).toBe(1)
    expect(report.ruleVersion).toBe('rules-v1')
    expect(report.repo.fullName).toBe('o/r')
    expect(report.commit.shortSha).toBe('abcdef1')
    expect(report.score.raw).toBe(100)
    expect(report.dimensions).toHaveLength(5)
  })

  it('merges and sorts findings from outcomes and extras', () => {
    const outcomes = outcomesAllPass()
    outcomes[0] = {
      ...outcomes[0],
      status: 'fail',
      findings: [
        {
          id: 'p2',
          ruleId: 'DOC-01',
          dimension: 'docs',
          severity: 'P2',
          confidence: 'high',
          title: 'p2',
          impact: '',
          suggestion: '',
        },
      ],
    }
    const report = buildReport({
      meta,
      commit,
      analyzedAt: '2026-11-26T00:00:00.000Z',
      coverage,
      outcomes,
      extraFindings: [
        {
          id: 'p0',
          ruleId: 'SEC-01',
          dimension: 'security',
          severity: 'P0',
          confidence: 'high',
          title: 'p0',
          impact: '',
          suggestion: '',
        },
      ],
    })
    expect(report.findings.map((f) => f.severity)).toEqual(['P0', 'P2'])
    expect(report.score.capped).toBe(true)
  })

  it('notes incomplete coverage in limitations', () => {
    const report = buildReport({
      meta,
      commit,
      analyzedAt: '2026-11-26T00:00:00.000Z',
      coverage: { ...coverage, treeTruncated: true, failedFiles: ['a.ts'] },
      outcomes: outcomesAllPass(),
    })
    expect(report.limitations.join('\n')).toContain('截断')
    expect(report.limitations.join('\n')).toContain('1 个文件读取失败')
  })
})
