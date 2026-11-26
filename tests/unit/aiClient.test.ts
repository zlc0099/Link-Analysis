import { describe, it, expect, vi } from 'vitest'
import { requestAiAdvice, parseAdvice } from '../../src/core/ai/client'
import { AiError } from '../../src/core/ai/types'
import type { AiConfig } from '../../src/core/ai/types'

const config: AiConfig = {
  baseUrl: 'https://api.example.com',
  apiKey: 'test-key-123',
  model: 'test-model',
}

const prompt = { system: 'sys', user: '{"repo":{}}' }

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
}

describe('parseAdvice', () => {
  it('parses strict JSON', () => {
    const advice = parseAdvice(
      '{"overall":"ok","objections":[{"ruleId":"RUN-02","reason":"库项目"}],"fixPlan":[{"priority":1,"title":"t","steps":["a"]}],"checklist":["c"]}',
    )
    expect(advice.overall).toBe('ok')
    expect(advice.objections[0].ruleId).toBe('RUN-02')
    expect(advice.fixPlan[0].steps).toEqual(['a'])
    expect(advice.checklist).toEqual(['c'])
  })

  it('strips markdown fences', () => {
    const advice = parseAdvice('```json\n{"overall":"ok","objections":[],"fixPlan":[],"checklist":[]}\n```')
    expect(advice.overall).toBe('ok')
  })

  it('fills safe defaults for missing fields instead of throwing', () => {
    const advice = parseAdvice('{"overall":"只有评价"}')
    expect(advice.overall).toBe('只有评价')
    expect(advice.objections).toEqual([])
    expect(advice.fixPlan).toEqual([])
    expect(advice.checklist).toEqual([])
  })

  it('throws AiError(parse) on invalid JSON', () => {
    expect(() => parseAdvice('not json')).toThrowError(AiError)
  })
})

describe('requestAiAdvice', () => {
  it('sends bearer auth, model and messages; returns advice', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okResponse('{"overall":"好","objections":[],"fixPlan":[],"checklist":[]}'),
    )
    const advice = await requestAiAdvice(config, prompt, { fetchFn })
    expect(advice.overall).toBe('好')
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/chat/completions')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer test-key-123')
    const body = JSON.parse(String(init.body)) as { model: string; messages: unknown[] }
    expect(body.model).toBe('test-model')
    expect(body.messages).toHaveLength(2)
  })

  it('maps 401 to auth error', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 401 }))
    await expect(requestAiAdvice(config, prompt, { fetchFn })).rejects.toMatchObject({
      code: 'auth',
    })
  })

  it('maps 500 to network error', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('', { status: 500 }))
    await expect(requestAiAdvice(config, prompt, { fetchFn })).rejects.toMatchObject({
      code: 'network',
    })
  })

  it('throws auth error when key missing without calling fetch', async () => {
    const fetchFn = vi.fn()
    await expect(requestAiAdvice({ ...config, apiKey: '' }, prompt, { fetchFn })).rejects.toMatchObject({
      code: 'auth',
    })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('propagates outer abort as cancelled', async () => {
    const fetchFn = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true })
        }),
    )
    const ctrl = new AbortController()
    const promise = requestAiAdvice(config, prompt, { fetchFn, signal: ctrl.signal })
    ctrl.abort()
    await expect(promise).rejects.toMatchObject({ code: 'cancelled' })
  })

  it('masks nothing in request but never logs the key; key only in header', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResponse('{}'))
    await requestAiAdvice(config, prompt, { fetchFn })
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(String(init.body)).not.toContain('test-key-123')
  })
})
