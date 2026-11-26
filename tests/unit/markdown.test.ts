import { describe, it, expect } from 'vitest'
import { buildMarkdown, exportFileName } from '../../src/core/report/markdown'
import type { Report } from '../../src/core/report/schema'
import { computeScore } from '../../src/core/score/score'
import { RULE_POINTS } from '../../src/core/score/items'

function makeReport(overrides: Partial<Report> = {}): Report {
  const outcomes = Object.entries(RULE_POINTS).map(([ruleId, def]) => ({
    ruleId,
    dimension: def.dimension,
    status: 'pass' as const,
    findings: [],
  }))
  const { dimensions, score } = computeScore(outcomes)
  return {
    schemaVersion: 1,
    ruleVersion: 'rules-v1',
    appVersion: '0.1.0',
    repo: {
      owner: 'o',
      name: 'r',
      fullName: 'o/r',
      htmlUrl: 'https://github.com/o/r',
      description: null,
      language: 'TypeScript',
      stars: 1,
      license: 'MIT',
      archived: false,
      defaultBranch: 'main',
    },
    commit: { sha: 'abcdef1234567890', shortSha: 'abcdef1', date: '2026-11-01T00:00:00Z', message: 'init' },
    analyzedAt: '2026-11-26T10:00:00.000Z',
    coverage: {
      treeTruncated: false,
      eligibleFiles: 10,
      selectedFiles: 10,
      analyzedFiles: 10,
      failedFiles: [],
      skippedBinary: 0,
      skippedLarge: 0,
      bytesScanned: 1024,
    },
    findings: [],
    dimensions,
    score,
    limitations: ['静态扫描，不执行代码'],
    ...overrides,
  }
}

describe('Markdown export', () => {
  it('includes repo, branch, commit and analysis time', () => {
    const md = buildMarkdown(makeReport())
    expect(md).toContain('o/r @ main @ abcdef1')
    expect(md).toContain('2026-11-26T10:00:00.000Z')
    expect(md).toContain('rules-v1')
  })

  it('includes coverage numbers', () => {
    const md = buildMarkdown(makeReport())
    expect(md).toContain('10 / 10')
  })

  it('includes score, grade and verdict', () => {
    const md = buildMarkdown(makeReport())
    expect(md).toContain('100')
    expect(md).toContain('A')
    expect(md).toContain('可直接接入')
  })

  it('lists findings with rule id, location and masked evidence', () => {
    const report = makeReport()
    report.findings = [
      {
        id: 'RUN-02:README.md:12',
        ruleId: 'RUN-02',
        dimension: 'run',
        severity: 'P2',
        confidence: 'high',
        title: 'README 未给出启动命令',
        file: 'README.md',
        line: 12,
        evidence: 'sk-A****l2',
        impact: '难以启动',
        suggestion: '补充启动命令',
        permalink: 'https://github.com/o/r/blob/sha/README.md#L12',
      },
    ]
    const md = buildMarkdown(report)
    expect(md).toContain('RUN-02')
    expect(md).toContain('README.md:12')
    expect(md).toContain('sk-A****l2')
  })

  it('marks incomplete coverage and failed files', () => {
    const report = makeReport()
    report.coverage = { ...report.coverage, analyzedFiles: 8, failedFiles: ['a.ts', 'b.ts'], treeTruncated: true }
    const md = buildMarkdown(report)
    expect(md).toContain('数据不完整')
    expect(md).toContain('a.ts')
  })

  it('shows raw score and cap when red line triggered', () => {
    const report = makeReport()
    report.score = { raw: 56, official: 39, capped: true, grade: 'D', verdict: '触发安全红线：总分封顶 39' }
    const md = buildMarkdown(report)
    expect(md).toContain('原始分 56')
    expect(md).toContain('39')
  })

  it('builds a stable file name', () => {
    expect(exportFileName(makeReport())).toBe('link-analysis-o-r-abcdef1.md')
  })
})
