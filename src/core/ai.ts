/**
 * AI 建议接口占位（v1 未实现，UI 不出现入口）。
 * 评分与结论完全由规则引擎决定；接入 AI 后也不得影响 official 分数。
 */
export interface AiReportSummary {
  repo: string
  score: number
  grade: string
  dimensions: Record<string, number>
  topFindings: Array<{ ruleId: string; title: string; severity: string }>
}

export interface AiSuggestion {
  summary: string
  actions: string[]
  model: string
  generatedAt: string
}

export interface AiAdvisor {
  suggest(input: AiReportSummary): Promise<AiSuggestion>
}

export const aiAdvisor: AiAdvisor | null = null
