import type { TreeEntry } from '../github/types'
import type { FileClass } from '../select/classify'

export type Dimension = 'docs' | 'deps' | 'run' | 'portability' | 'security'
export type Severity = 'P0' | 'P1' | 'P2' | 'P3' | 'INFO'
export type Confidence = 'high' | 'medium' | 'low'

export interface Finding {
  id: string
  ruleId: string
  dimension: Dimension
  severity: Severity
  confidence: Confidence
  title: string
  file?: string
  line?: number
  evidence?: string
  impact: string
  suggestion: string
  permalink?: string
}

export interface FileContent {
  path: string
  content: string
  class: FileClass
}

export interface RuleContext {
  tree: TreeEntry[]
  selected: TreeEntry[]
  files: FileContent[]
  lockfiles: TreeEntry[]
  windowsScripts: TreeEntry[]
  permalinkBase: string
}

export interface RuleOutcome {
  ruleId: string
  dimension: Dimension
  status: 'pass' | 'fail' | 'na'
  findings: Finding[]
}

export function makeFinding(
  ruleId: string,
  dimension: Dimension,
  severity: Severity,
  title: string,
  opts: Partial<Omit<Finding, 'id' | 'ruleId' | 'dimension' | 'severity' | 'title'>> & {
    file?: string
    line?: number
  } = {},
): Finding {
  return {
    id: `${ruleId}:${opts.file ?? ''}:${opts.line ?? 0}`,
    ruleId,
    dimension,
    severity,
    confidence: opts.confidence ?? 'high',
    title,
    file: opts.file,
    line: opts.line,
    evidence: opts.evidence,
    impact: opts.impact ?? '',
    suggestion: opts.suggestion ?? '',
    permalink: opts.permalink,
  }
}

export function outcome(
  ruleId: string,
  dimension: Dimension,
  passed: boolean | 'na',
  findings: Finding[] = [],
): RuleOutcome {
  return {
    ruleId,
    dimension,
    status: passed === 'na' ? 'na' : passed ? 'pass' : 'fail',
    findings,
  }
}
