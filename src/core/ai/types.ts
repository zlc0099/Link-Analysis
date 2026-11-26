/** AI 接入建议相关类型与错误。评分始终由规则引擎负责，AI 只做解释与建议。 */

export interface AiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const AI_DEFAULT_CONFIG: AiConfig = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
}

export interface AiObjection {
  ruleId: string
  reason: string
}

export interface AiFixItem {
  priority: number
  title: string
  steps: string[]
}

export interface AiAdvice {
  overall: string
  objections: AiObjection[]
  fixPlan: AiFixItem[]
  checklist: string[]
}

export type AiErrorCode = 'network' | 'auth' | 'parse' | 'cancelled'

export class AiError extends Error {
  code: AiErrorCode

  constructor(code: AiErrorCode, message: string) {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}
