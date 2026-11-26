import { describe, it, expect } from 'vitest'
import { evaluateWindowsScripts } from '../../src/core/rules/windows'
import { makeCtx, blob } from '../fixtures/context'

describe('WIN-01 Windows scripts (info only)', () => {
  it('lists Windows-only scripts with a guessed role', () => {
    const ctx = makeCtx({}, [blob('scripts/install.bat'), blob('start.ps1'), blob('build.cmd')])
    const findings = evaluateWindowsScripts(ctx)
    expect(findings).toHaveLength(3)
    expect(findings.every((f) => f.severity === 'INFO')).toBe(true)
    expect(findings.map((f) => f.file)).toEqual(['scripts/install.bat', 'start.ps1', 'build.cmd'])
    expect(findings[0].evidence).toContain('install')
    expect(findings[1].evidence).toContain('start')
  })

  it('returns nothing when there are no Windows scripts', () => {
    const ctx = makeCtx({ 'start.sh': '#!/bin/sh\n' })
    expect(evaluateWindowsScripts(ctx)).toHaveLength(0)
  })

  it('does not include shell scripts', () => {
    const ctx = makeCtx({}, [blob('run.sh'), blob('task.bat')])
    expect(evaluateWindowsScripts(ctx).map((f) => f.file)).toEqual(['task.bat'])
  })
})
