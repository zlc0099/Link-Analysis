import type { Dimension, Finding, RuleOutcome } from '../rules/types'

export interface DimensionScore {
  dimension: Dimension
  label: string
  score: number
  max: 20
  items: Array<{
    ruleId: string
    label: string
    passed: boolean
    applicable: boolean
    points: number
    earned: number
    evidenceFindingIds: string[]
  }>
}

export interface Coverage {
  treeTruncated: boolean
  eligibleFiles: number
  selectedFiles: number
  analyzedFiles: number
  failedFiles: string[]
  skippedBinary: number
  skippedLarge: number
  bytesScanned: number
}

export interface ReportScore {
  raw: number
  official: number
  capped: boolean
  grade: 'A' | 'B' | 'C' | 'D'
  verdict: string
}

export interface Report {
  schemaVersion: 1
  ruleVersion: string
  appVersion: string
  repo: {
    owner: string
    name: string
    fullName: string
    htmlUrl: string
    description: string | null
    language: string | null
    stars: number
    license: string | null
    archived: boolean
    defaultBranch: string
  }
  commit: { sha: string; shortSha: string; date: string; message: string }
  analyzedAt: string
  coverage: Coverage
  findings: Finding[]
  dimensions: DimensionScore[]
  score: ReportScore
  limitations: string[]
  outcomes?: RuleOutcome[]
}
