import { describe, it, expect } from 'vitest'
import { evaluateDeps } from '../../src/core/rules/deps'
import { makeCtx, blob } from '../fixtures/context'

function status(outcomes: ReturnType<typeof evaluateDeps>, ruleId: string) {
  return outcomes.find((o) => o.ruleId === ruleId)?.status
}

describe('DEP rules', () => {
  it('fails DEP-01 and marks others inapplicable without a manifest', () => {
    const out = evaluateDeps(makeCtx({ 'src/index.ts': 'x' }))
    expect(status(out, 'DEP-01')).toBe('fail')
    expect(status(out, 'DEP-02')).toBe('na')
    expect(status(out, 'DEP-03')).toBe('na')
    expect(out.find((o) => o.ruleId === 'DEP-01')!.findings[0].severity).toBe('P1')
  })

  it('fails DEP-02 when package.json has no lockfile', () => {
    const out = evaluateDeps(makeCtx({ 'package.json': '{"name":"x","dependencies":{"a":"1.0.0"}}' }))
    expect(status(out, 'DEP-01')).toBe('pass')
    expect(status(out, 'DEP-02')).toBe('fail')
    expect(status(out, 'DEP-03')).toBe('pass')
  })

  it('passes DEP-02 when package-lock.json exists', () => {
    const out = evaluateDeps(
      makeCtx(
        { 'package.json': '{"name":"x"}' },
        [blob('package-lock.json')],
      ),
    )
    expect(status(out, 'DEP-02')).toBe('pass')
  })

  it('passes DEP-02 when yarn.lock exists', () => {
    const out = evaluateDeps(makeCtx({ 'package.json': '{"name":"x"}' }, [blob('yarn.lock')]))
    expect(status(out, 'DEP-02')).toBe('pass')
  })

  it('passes DEP-02 for pinned requirements.txt', () => {
    const req = 'flask==2.0.1\nrequests==2.25.0\n# comment\n'
    const out = evaluateDeps(makeCtx({ 'requirements.txt': req }))
    expect(status(out, 'DEP-02')).toBe('pass')
  })

  it('fails DEP-02 for unpinned requirements.txt', () => {
    const req = 'flask>=2.0.1\nrequests\nnumpy~=1.21\n'
    const out = evaluateDeps(makeCtx({ 'requirements.txt': req }))
    expect(status(out, 'DEP-02')).toBe('fail')
  })

  it('marks DEP-02 inapplicable for Rust libraries', () => {
    const out = evaluateDeps(makeCtx({ 'Cargo.toml': '[package]\nname="x"\n' }))
    expect(status(out, 'DEP-01')).toBe('pass')
    expect(status(out, 'DEP-02')).toBe('na')
  })

  it('fails DEP-03 when package.json is invalid JSON', () => {
    const out = evaluateDeps(makeCtx({ 'package.json': '{ not json' }))
    expect(status(out, 'DEP-03')).toBe('fail')
    expect(out.find((o) => o.ruleId === 'DEP-03')!.findings[0].severity).toBe('P1')
  })

  it('passes DEP-02 for go.mod with go.sum', () => {
    const out = evaluateDeps(makeCtx({ 'go.mod': 'module x\n\ngo 1.22\n' }, [blob('go.sum')]))
    expect(status(out, 'DEP-02')).toBe('pass')
  })

  it('ignores manifests deeper than one subdirectory level', () => {
    const out = evaluateDeps(
      makeCtx({ 'packages/deep/nested/package.json': '{"name":"x"}' }),
    )
    expect(status(out, 'DEP-01')).toBe('fail')
  })
})
