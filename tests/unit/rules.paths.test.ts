import { describe, it, expect } from 'vitest'
import { evaluatePaths } from '../../src/core/rules/paths'
import { makeCtx } from '../fixtures/context'

function status(outcomes: ReturnType<typeof evaluatePaths>, ruleId: string) {
  return outcomes.find((o) => o.ruleId === ruleId)?.status
}

describe('PATH rules', () => {
  it('fails PATH-01 for a Windows drive path in source', () => {
    const out = evaluatePaths(makeCtx({ 'src/app.ts': 'const p = "C:\\\\Users\\\\li\\\\app"\n' }))
    expect(status(out, 'PATH-01')).toBe('fail')
    const f = out.find((o) => o.ruleId === 'PATH-01')!.findings[0]
    expect(f.severity).toBe('P1')
    expect(f.file).toBe('src/app.ts')
    expect(f.line).toBe(1)
    expect(f.evidence).toContain('C:')
    expect(f.evidence!.length).toBeLessThanOrEqual(163)
  })

  it('fails PATH-01 for forward-slash drive path in config', () => {
    const out = evaluatePaths(makeCtx({ 'config/app.yml': 'path: D:/work/app\n' }))
    expect(status(out, 'PATH-01')).toBe('fail')
  })

  it('does not flag https URLs as drive paths', () => {
    const out = evaluatePaths(makeCtx({ 'src/app.ts': 'const u = "https://github.com/foo/bar"\n' }))
    expect(status(out, 'PATH-01')).toBe('pass')
  })

  it('fails PATH-02 for a personal macOS path', () => {
    const out = evaluatePaths(makeCtx({ 'src/a.py': 'BASE = "/Users/alice/project"\n' }))
    expect(status(out, 'PATH-02')).toBe('fail')
    const f = out.find((o) => o.ruleId === 'PATH-02')!.findings[0]
    expect(f.severity).toBe('P1')
    expect(f.evidence).toContain('/Users/alice/project')
  })

  it('ignores generic macOS accounts', () => {
    const out = evaluatePaths(
      makeCtx({ 'src/a.sh': 'echo /Users/Shared/data\necho /Users/runner/work\n' }),
    )
    expect(status(out, 'PATH-02')).toBe('pass')
  })

  it('fails PATH-03 for a personal Linux home path', () => {
    const out = evaluatePaths(makeCtx({ 'src/a.py': 'BASE = "/home/alice/data"\n' }))
    expect(status(out, 'PATH-03')).toBe('fail')
    expect(out.find((o) => o.ruleId === 'PATH-03')!.findings[0].evidence).toContain('/home/alice/data')
  })

  it('ignores CI accounts under /home/', () => {
    const out = evaluatePaths(makeCtx({ 'src/a.py': 'BASE = "/home/ubuntu/app"\n' }))
    expect(status(out, 'PATH-03')).toBe('pass')
  })

  it('fails PATH-04 for file:// and UNC paths', () => {
    const out = evaluatePaths(
      makeCtx({ 'src/a.ts': String.raw`const a = "file:///C:/data"
const b = "\\server\share\x"` }),
    )
    expect(status(out, 'PATH-04')).toBe('fail')
  })

  it('does not score path hits in README, but reports them as info', () => {
    const out = evaluatePaths(makeCtx({ 'README.md': 'See C:\\\\Users\\\\li\\\\app\n' }))
    expect(status(out, 'PATH-01')).toBe('pass')
    const infos = out.flatMap((o) => o.findings).filter((f) => f.severity === 'INFO')
    expect(infos.length).toBe(1)
    expect(infos[0].file).toBe('README.md')
  })

  it('does not score path hits in test files', () => {
    const out = evaluatePaths(makeCtx({ 'tests/a.test.ts': 'const p = "C:\\\\Users\\\\li\\\\x"\n' }))
    expect(status(out, 'PATH-01')).toBe('pass')
  })

  it('skips extremely long lines', () => {
    const long = `const x = "${'a'.repeat(2100)}C:\\\\Users\\\\li\\\\app"\n`
    const out = evaluatePaths(makeCtx({ 'src/bundle.ts': long }))
    expect(status(out, 'PATH-01')).toBe('pass')
  })

  it('caps evidence findings at five per rule and reports total count', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `const p${i} = "C:\\\\Users\\\\li\\\\${i}"`).join('\n')
    const out = evaluatePaths(makeCtx({ 'src/a.ts': lines }))
    const findings = out.find((o) => o.ruleId === 'PATH-01')!.findings.filter((f) => f.severity !== 'INFO')
    expect(findings).toHaveLength(5)
    expect(findings[0].title).toContain('8')
  })
})
