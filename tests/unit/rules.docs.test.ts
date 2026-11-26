import { describe, it, expect } from 'vitest'
import { evaluateDocs } from '../../src/core/rules/docs'
import { makeCtx, README_FULL } from '../fixtures/context'

function status(outcomes: ReturnType<typeof evaluateDocs>, ruleId: string) {
  return outcomes.find((o) => o.ruleId === ruleId)?.status
}

describe('DOC rules', () => {
  it('fails DOC-01 and marks DOC-02..04 inapplicable when README is missing', () => {
    const outcomes = evaluateDocs(makeCtx({ 'src/index.ts': 'export const a = 1' }))
    expect(status(outcomes, 'DOC-01')).toBe('fail')
    expect(status(outcomes, 'DOC-02')).toBe('na')
    expect(status(outcomes, 'DOC-03')).toBe('na')
    expect(status(outcomes, 'DOC-04')).toBe('na')
    const f = outcomes.find((o) => o.ruleId === 'DOC-01')!.findings[0]
    expect(f.severity).toBe('P1')
    expect(f.suggestion).toBeTruthy()
  })

  it('passes DOC-02 when README contains install instructions', () => {
    const readme = '# X\n\n## Install\n\n```bash\nnpm install\n```\n'
    expect(status(evaluateDocs(makeCtx({ 'README.md': readme })), 'DOC-02')).toBe('pass')
  })

  it('passes DOC-02 with Chinese install keywords', () => {
    const readme = '# X\n\n## 安装\n\n运行 pip install -r requirements.txt\n'
    expect(status(evaluateDocs(makeCtx({ 'README.md': readme })), 'DOC-02')).toBe('pass')
  })

  it('fails DOC-02 when README lacks install/build instructions', () => {
    const readme = '# X\n\nJust some notes about the project.\n'
    const out = evaluateDocs(makeCtx({ 'README.md': readme }))
    expect(status(out, 'DOC-02')).toBe('fail')
    expect(out.find((o) => o.ruleId === 'DOC-02')!.findings[0].severity).toBe('P2')
  })

  it('passes DOC-03 when README documents configuration', () => {
    const readme = '# X\n\n## Config\n\nSet the environment variable API_URL.\n'
    expect(status(evaluateDocs(makeCtx({ 'README.md': readme })), 'DOC-03')).toBe('pass')
  })

  it('fails DOC-04 for a placeholder README', () => {
    const readme = '# Your Project\n\nTODO: describe your project here.\n'
    const out = evaluateDocs(makeCtx({ 'README.md': readme }))
    expect(status(out, 'DOC-04')).toBe('fail')
  })

  it('fails DOC-04 for a very short README', () => {
    const readme = '# A\n\n## B\n\n## C\n\nshort\n'
    expect(status(evaluateDocs(makeCtx({ 'README.md': readme })), 'DOC-04')).toBe('fail')
  })

  it('passes all DOC rules for a complete README', () => {
    const out = evaluateDocs(makeCtx({ 'README.md': README_FULL }))
    expect(out.map((o) => o.status)).toEqual(['pass', 'pass', 'pass', 'pass'])
  })

  it('finds README under docs/', () => {
    const out = evaluateDocs(makeCtx({ 'docs/README.md': README_FULL }))
    expect(status(out, 'DOC-01')).toBe('pass')
  })

  it('attaches file and line evidence to failing findings', () => {
    const readme = '# X\n\nintro\n\n## Section\n\nthis area is intentionally vague\n'
    const out = evaluateDocs(makeCtx({ 'README.md': readme }))
    const f = out.find((o) => o.ruleId === 'DOC-02')!.findings[0]
    expect(f.file).toBe('README.md')
    expect(f.permalink).toBe('https://github.com/o/r/blob/sha/README.md')
  })
})
