import { describe, it, expect } from 'vitest'
import { evaluateSecrets } from '../../src/core/rules/secrets'
import { makeCtx, blob } from '../fixtures/context'

function status(outcomes: ReturnType<typeof evaluateSecrets>, ruleId: string) {
  return outcomes.find((o) => o.ruleId === ruleId)?.status
}

function findings(outcomes: ReturnType<typeof evaluateSecrets>, ruleId: string) {
  return outcomes.find((o) => o.ruleId === ruleId)!.findings
}

const FAKE_SK = 'sk-' + 'A1b2C3d4E5f6G7h8I9j0K1l2'
const RSA_HEADER = '-----BEGIN ' + 'RSA PRIVATE KEY-----'

describe('SEC rules', () => {
  it('flags private keys in source as P0', () => {
    const out = evaluateSecrets(makeCtx({ 'src/key.ts': `${RSA_HEADER}\nMIIE...\n` }))
    expect(status(out, 'SEC-01')).toBe('fail')
    const f = findings(out, 'SEC-01')[0]
    expect(f.severity).toBe('P0')
    expect(f.evidence).toContain('RSA PRIVATE KEY')
    expect(f.evidence).not.toContain('MIIE')
  })

  it('downgrades private keys in test fixtures to P1', () => {
    const out = evaluateSecrets(makeCtx({ 'tests/fixture/key.ts': `${RSA_HEADER}\n` }))
    expect(findings(out, 'SEC-01')[0].severity).toBe('P1')
  })

  it('flags a committed .env with real values as P0', () => {
    const out = evaluateSecrets(makeCtx({ '.env': 'DB_PASSWORD=supersecretvalue\nAPI_URL=http://x\n' }))
    expect(status(out, 'SEC-02')).toBe('fail')
    const f = findings(out, 'SEC-02')[0]
    expect(f.severity).toBe('P0')
    expect(f.evidence).toContain('DB_PASSWORD')
    expect(f.evidence).not.toContain('supersecretvalue')
  })

  it('does not treat .env.example as committed secrets', () => {
    const out = evaluateSecrets(makeCtx({ '.env.example': 'DB_PASSWORD=changeme\n' }))
    expect(status(out, 'SEC-02')).toBe('pass')
  })

  it('treats .env inside test fixtures as a notice instead of a scored failure', () => {
    const out = evaluateSecrets(makeCtx({ 'tests/test_apps/.env': 'FOO=bar\nSPAM=eggs\n' }))
    expect(status(out, 'SEC-02')).toBe('pass')
    const notices = findings(out, 'SEC-02')
    expect(notices).toHaveLength(1)
    expect(notices[0].severity).toBe('INFO')
    expect(notices[0].title).toContain('测试')
  })

  it('downgrades a real-looking value in a test .env without capping', () => {
    const out = evaluateSecrets(makeCtx({ 'tests/fixture/.env': 'DB_PASSWORD=verysensitivevalue\n' }))
    expect(status(out, 'SEC-02')).toBe('pass')
    expect(findings(out, 'SEC-02')[0].severity).toBe('P1')
  })

  it('flags placeholder-only .env as P2 without capping', () => {
    const out = evaluateSecrets(makeCtx({ '.env': 'DB_PASSWORD=changeme\nEMPTY=\n' }))
    expect(status(out, 'SEC-02')).toBe('fail')
    expect(findings(out, 'SEC-02')[0].severity).toBe('P2')
  })

  it('flags high-confidence API keys in source as P0 and masks them', () => {
    const out = evaluateSecrets(makeCtx({ 'src/config.ts': `const key = "${FAKE_SK}"\n` }))
    expect(status(out, 'SEC-03')).toBe('fail')
    const f = findings(out, 'SEC-03')[0]
    expect(f.severity).toBe('P0')
    expect(f.evidence).not.toContain(FAKE_SK)
    expect(f.evidence).toContain('****')
    expect(f.evidence!.startsWith('sk-A')).toBe(true)
  })

  it('still detects keys in files that merely mention the word test', () => {
    const out = evaluateSecrets(
      makeCtx({ 'src/app.ts': `// test helper for the key below\nconst key = "${FAKE_SK}"\n` }),
    )
    expect(status(out, 'SEC-03')).toBe('fail')
    expect(findings(out, 'SEC-03')[0].severity).toBe('P0')
  })

  it('flags keys in README as P1 without capping', () => {
    const out = evaluateSecrets(makeCtx({ 'README.md': `Use \`${FAKE_SK}\`\n` }))
    expect(findings(out, 'SEC-03')[0].severity).toBe('P1')
  })

  it('ignores placeholder keys', () => {
    const out = evaluateSecrets(makeCtx({ 'src/a.ts': 'const key = "sk-your-key-here"\n' }))
    expect(status(out, 'SEC-03')).toBe('pass')
  })

  it('flags bearer tokens in source as P1', () => {
    const token = 'Bearer ' + 'a1b2c3d4e5f6g7h8i9j0k1l2'
    const out = evaluateSecrets(makeCtx({ 'src/api.ts': `headers["Authorization"] = "${token}"\n` }))
    expect(status(out, 'SEC-04')).toBe('fail')
    expect(findings(out, 'SEC-04')[0].severity).toBe('P1')
  })

  it('flags credential files as P1', () => {
    const out = evaluateSecrets(makeCtx({}, [blob('credentials.json'), blob('deploy/id_rsa')]))
    expect(status(out, 'SEC-04')).toBe('fail')
  })

  it('reports generic password assignments as P2 notices without failing SEC-04', () => {
    const out = evaluateSecrets(makeCtx({ 'src/db.ts': 'const password = "hunter2secret"\n' }))
    expect(status(out, 'SEC-04')).toBe('pass')
    const notices = findings(out, 'SEC-04').filter((f) => f.severity === 'P2')
    expect(notices).toHaveLength(1)
  })

  it('does not flag type annotations or identifier assignments as secrets', () => {
    const src = [
      'self._cv_token: contextvars.Token[AppContext] | None = None',
      'self._cv_token = _cv_app.set(self)',
      'const tokenizer = tokenize(input)',
    ].join('\n')
    const out = evaluateSecrets(makeCtx({ 'src/ctx.py': src }))
    expect(findings(out, 'SEC-04').filter((f) => f.severity === 'P2')).toHaveLength(0)
  })

  it('passes all SEC rules for a clean repository', () => {
    const out = evaluateSecrets(makeCtx({ 'src/a.ts': 'export const x = 1\n', 'README.md': '# X\n' }))
    expect(out.map((o) => o.status)).toEqual(['pass', 'pass', 'pass', 'pass'])
  })
})
