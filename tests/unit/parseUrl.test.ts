import { describe, it, expect } from 'vitest'
import { parseRepoUrl } from '../../src/core/github/parseUrl'

describe('parseRepoUrl', () => {
  it('parses standard https URL', () => {
    const r = parseRepoUrl('https://github.com/expressjs/express')
    expect(r).toMatchObject({ ok: true, owner: 'expressjs', repo: 'express' })
  })

  it('strips .git suffix', () => {
    const r = parseRepoUrl('https://github.com/pallets/flask.git')
    expect(r).toMatchObject({ ok: true, owner: 'pallets', repo: 'flask' })
  })

  it('strips trailing slash', () => {
    const r = parseRepoUrl('https://github.com/vuejs/core/')
    expect(r).toMatchObject({ ok: true, owner: 'vuejs', repo: 'core' })
  })

  it('parses git@ SSH form', () => {
    const r = parseRepoUrl('git@github.com:expressjs/express.git')
    expect(r).toMatchObject({ ok: true, owner: 'expressjs', repo: 'express' })
  })

  it('parses owner/repo shorthand', () => {
    const r = parseRepoUrl('expressjs/express')
    expect(r).toMatchObject({ ok: true, owner: 'expressjs', repo: 'express' })
  })

  it('normalizes /tree/ links to repo root and flags it', () => {
    const r = parseRepoUrl('https://github.com/expressjs/express/tree/master/examples')
    expect(r).toMatchObject({ ok: true, owner: 'expressjs', repo: 'express', normalized: true })
  })

  it('normalizes /blob/ links to repo root', () => {
    const r = parseRepoUrl('https://github.com/expressjs/express/blob/master/README.md')
    expect(r).toMatchObject({ ok: true, owner: 'expressjs', repo: 'express', normalized: true })
  })

  it('ignores query string and hash', () => {
    const r = parseRepoUrl('https://github.com/expressjs/express?tab=readme#top')
    expect(r).toMatchObject({ ok: true, owner: 'expressjs', repo: 'express' })
  })

  it('rejects non-GitHub hosts', () => {
    const r = parseRepoUrl('https://gitlab.com/foo/bar')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('not-github')
  })

  it('rejects empty input', () => {
    const r = parseRepoUrl('   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('empty')
  })

  it('rejects URL without repo segment', () => {
    const r = parseRepoUrl('https://github.com/expressjs')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('invalid')
  })

  it('rejects illegal characters', () => {
    const r = parseRepoUrl('https://github.com/foo/bar$baz')
    expect(r.ok).toBe(false)
  })

  it('accepts dots, underscores and hyphens', () => {
    const r = parseRepoUrl('my-org_1/my.repo-2')
    expect(r).toMatchObject({ ok: true, owner: 'my-org_1', repo: 'my.repo-2' })
  })
})
