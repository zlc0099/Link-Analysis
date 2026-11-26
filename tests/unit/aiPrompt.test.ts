import { describe, it, expect } from 'vitest'
import { buildAIPrompt, buildAIPromptText } from '../../src/core/ai/prompt'
import type { Report } from '../../src/core/report/schema'
import type { Finding } from '../../src/core/rules/types'

function makeReport(findings: Finding[] = []): Report {
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
    findings,
    dimensions: [
      {
        dimension: 'security',
        label: '安全合规',
        score: 16,
        max: 20,
        items: [
          { ruleId: 'SEC-01', label: '私钥', passed: false, applicable: true, points: 8, earned: 0, evidenceFindingIds: [] },
          { ruleId: 'SEC-03', label: '高置信 Key', passed: true, applicable: true, points: 4, earned: 4, evidenceFindingIds: [] },
        ],
      },
    ],
    score: { raw: 96, official: 96, capped: false, grade: 'A', verdict: '可直接接入' },
    limitations: ['静态扫描，不执行代码'],
  }
}

function finding(sev: Finding['severity'], ruleId: string, evidence = ''): Finding {
  return {
    id: `${ruleId}:1`,
    ruleId,
    dimension: ruleId.startsWith('SEC') ? 'security' : 'run',
    severity: sev,
    confidence: 'high',
    title: `${ruleId} 问题`,
    file: 'a.ts',
    line: 1,
    evidence,
    impact: '潜在风险',
    suggestion: '按建议修复',
  }
}

describe('AI prompt builder', () => {
  it('excludes INFO findings from payload', () => {
    const report = makeReport([finding('INFO', 'WIN-01'), finding('P1', 'SEC-01')])
    const { user } = buildAIPrompt(report)
    expect(user).toContain('SEC-01')
    expect(user).not.toContain('WIN-01')
  })

  it('caps P2/P3 findings at 5 each but keeps all P0/P1', () => {
    const p1s = Array.from({ length: 7 }, (_, i) => finding('P1', `SEC-${i}`))
    const p2s = Array.from({ length: 8 }, (_, i) => finding('P2', `RUN-${i}`))
    const p3s = Array.from({ length: 9 }, (_, i) => finding('P3', `RUN-B${i}`))
    const { user } = buildAIPrompt(makeReport([...p1s, ...p2s, ...p3s]))
    const parsed = JSON.parse(user) as { findings: Array<{ ruleId: string }> }
    const ids = parsed.findings.map((f) => f.ruleId)
    expect(ids.filter((id) => id.startsWith('SEC-')).length).toBe(7)
    expect(ids.filter((id) => id.startsWith('RUN-') && !id.startsWith('RUN-B')).length).toBe(5)
    expect(ids.filter((id) => id.startsWith('RUN-B')).length).toBe(5)
  })

  it('masks secret-like evidence before sending', () => {
    const report = makeReport([finding('P0', 'SEC-03', 'OPENAI_API_KEY="sk-abcdef1234567890abcdef123456"')])
    const { user } = buildAIPrompt(report)
    expect(user).not.toContain('sk-abcdef1234567890abcdef123456')
    expect(user).toContain('****')
  })

  it('truncates long evidence and includes score verdict', () => {
    const report = makeReport([finding('P0', 'SEC-01', 'x'.repeat(500))])
    const { system, user } = buildAIPrompt(report)
    expect(user).not.toContain('x'.repeat(200))
    expect(system).toContain('禁止重新打分')
    expect(user).toContain('可直接接入')
  })

  it('buildAIPromptText joins system and user', () => {
    const text = buildAIPromptText(makeReport())
    expect(text).toContain('你是接入评审助手')
    expect(text).toContain('"repo"')
  })
})
