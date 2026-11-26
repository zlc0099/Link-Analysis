import { describe, it, expect } from 'vitest'
import { evaluateRun } from '../../src/core/rules/run'
import { makeCtx, blob } from '../fixtures/context'

function status(outcomes: ReturnType<typeof evaluateRun>, ruleId: string) {
  return outcomes.find((o) => o.ruleId === ruleId)?.status
}

describe('RUN rules', () => {
  it('passes RUN-01 when package.json has a dev script', () => {
    const pkg = JSON.stringify({ name: 'x', scripts: { dev: 'vite', build: 'vite build' } })
    const out = evaluateRun(makeCtx({ 'package.json': pkg }))
    expect(status(out, 'RUN-01')).toBe('pass')
  })

  it('passes RUN-02 when README has a start command', () => {
    const out = evaluateRun(makeCtx({ 'README.md': '# X\n\n```bash\nnpm run dev\n```\n' }))
    expect(status(out, 'RUN-02')).toBe('pass')
  })

  it('passes RUN-02 for docker compose command', () => {
    const out = evaluateRun(makeCtx({ 'README.md': '# X\n\nRun: docker compose up -d\n' }))
    expect(status(out, 'RUN-02')).toBe('pass')
  })

  it('fails RUN-02 when README has no start command', () => {
    const out = evaluateRun(makeCtx({ 'README.md': '# X\n\nSome text.\n' }))
    expect(status(out, 'RUN-02')).toBe('fail')
  })

  it('passes RUN-03 with .nvmrc', () => {
    const out = evaluateRun(makeCtx({ '.nvmrc': '20\n' }))
    expect(status(out, 'RUN-03')).toBe('pass')
  })

  it('passes RUN-03 with package.json engines', () => {
    const pkg = JSON.stringify({ name: 'x', engines: { node: '>=20' } })
    expect(status(evaluateRun(makeCtx({ 'package.json': pkg })), 'RUN-03')).toBe('pass')
  })

  it('passes RUN-03 with go.mod go directive', () => {
    expect(status(evaluateRun(makeCtx({ 'go.mod': 'module x\n\ngo 1.22\n' })), 'RUN-03')).toBe('pass')
  })

  it('passes RUN-01 with a Dockerfile', () => {
    const out = evaluateRun(makeCtx({}, [blob('Dockerfile')]))
    expect(status(out, 'RUN-01')).toBe('pass')
  })

  it('fails RUN-04 when the only start clue is a .bat script', () => {
    const out = evaluateRun(makeCtx({ 'start.bat': '@echo off\r\nnpm start\r\n' }))
    expect(status(out, 'RUN-01')).toBe('pass')
    expect(status(out, 'RUN-04')).toBe('fail')
  })

  it('passes RUN-04 when a non-Windows clue exists', () => {
    const out = evaluateRun(makeCtx({ 'start.sh': '#!/bin/sh\nnpm start\n' }))
    expect(status(out, 'RUN-04')).toBe('pass')
  })

  it('fails RUN-01 and RUN-04 when no start clue exists', () => {
    const out = evaluateRun(makeCtx({ 'README.md': '# X\n\nhello\n' }))
    expect(status(out, 'RUN-01')).toBe('fail')
    expect(status(out, 'RUN-04')).toBe('fail')
    const f = out.find((o) => o.ruleId === 'RUN-04')!.findings[0]
    expect(f.title).not.toContain('仅支持 Windows')
    expect(f.title).toContain('未证明')
  })

  it('treats Makefile run target as a start clue', () => {
    const out = evaluateRun(makeCtx({ Makefile: 'run:\n\tdocker compose up\n' }))
    expect(status(out, 'RUN-01')).toBe('pass')
  })
})
