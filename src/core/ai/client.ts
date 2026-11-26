import type { AiAdvice, AiConfig } from './types'
import { AiError } from './types'

const TIMEOUT_MS = 30_000

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>
}

/** 剥掉模型可能附带的 markdown 代码栅栏 */
function stripFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

/** 严格解析 + 字段兜底：任何缺失都给空值，不抛业务外异常 */
export function parseAdvice(raw: string): AiAdvice {
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(stripFence(raw)) as Record<string, unknown>
  } catch {
    throw new AiError('parse', 'AI 返回格式异常，请重试')
  }
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')

  return {
    overall: str(obj.overall),
    objections: arr(obj.objections)
      .slice(0, 5)
      .map((o) => {
        const item = o as Record<string, unknown>
        return { ruleId: str(item.ruleId), reason: str(item.reason) }
      })
      .filter((o) => o.ruleId || o.reason),
    fixPlan: arr(obj.fixPlan)
      .slice(0, 6)
      .map((p, i) => {
        const item = p as Record<string, unknown>
        return {
          priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : i + 1,
          title: str(item.title),
          steps: arr(item.steps).map(String).slice(0, 6),
        }
      })
      .filter((p) => p.title || p.steps.length),
    checklist: arr(obj.checklist).map(String).filter(Boolean).slice(0, 8),
  }
}

export async function requestAiAdvice(
  config: AiConfig,
  prompt: { system: string; user: string },
  options: { fetchFn?: typeof fetch; signal?: AbortSignal } = {},
): Promise<AiAdvice> {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const onOuterAbort = () => ctrl.abort()
  options.signal?.addEventListener('abort', onOuterAbort, { once: true })

  try {
    if (!config.apiKey) throw new AiError('auth', '未配置 AI Key')
    const res = await fetchFn(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new AiError('auth', 'AI Key 无效或已过期')
      }
      throw new AiError('network', `AI 服务返回 ${res.status}`)
    }
    const data = (await res.json()) as ChatResponse
    const content = data.choices?.[0]?.message?.content ?? ''
    return parseAdvice(content)
  } catch (err) {
    if (err instanceof AiError) throw err
    if (options.signal?.aborted || ctrl.signal.aborted) {
      throw new AiError('cancelled', '已取消')
    }
    throw new AiError('network', 'AI 请求失败，请检查网络或 Key')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onOuterAbort)
  }
}
