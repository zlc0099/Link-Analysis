import type { Report } from '../report/schema'
import type { AiAdvice } from './types'

/** 建议缓存键：commit + 规则版本不变即复用，避免重复请求 */
function cacheKey(report: Report): string {
  return `link-analysis.ai.cache.${report.commit.shortSha}.${report.ruleVersion}`
}

export function readCachedAdvice(report: Report): AiAdvice | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(report))
    return raw ? (JSON.parse(raw) as AiAdvice) : null
  } catch {
    return null
  }
}

export function writeCachedAdvice(report: Report, advice: AiAdvice): void {
  try {
    sessionStorage.setItem(cacheKey(report), JSON.stringify(advice))
  } catch {
    /* 隐私模式下跳过缓存 */
  }
}
