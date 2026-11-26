import { describe, it, expect } from 'vitest'
import { selectFiles } from '../../src/core/select/selectFiles'
import type { TreeEntry } from '../../src/core/github/types'

function blob(path: string, size = 100): TreeEntry {
  return { path, type: 'blob', size, sha: `sha-${path}` }
}

describe('selectFiles', () => {
  it('excludes dependency and build directories', () => {
    const sel = selectFiles([
      blob('node_modules/x/index.js'),
      blob('dist/app.js'),
      blob('build/out.js'),
      blob('src/main.ts'),
    ])
    const paths = sel.selected.map((f) => f.path)
    expect(paths).toEqual(['src/main.ts'])
  })

  it('excludes lockfile content but reports lockfiles separately', () => {
    const sel = selectFiles([blob('package.json'), blob('package-lock.json')])
    expect(sel.selected.map((f) => f.path)).toEqual(['package.json'])
    expect(sel.lockfiles.map((f) => f.path)).toEqual(['package-lock.json'])
  })

  it('excludes binary assets and minified files', () => {
    const sel = selectFiles([
      blob('logo.png'),
      blob('bundle.min.js'),
      blob('app.js.map'),
      blob('src/app.js'),
    ])
    expect(sel.selected.map((f) => f.path)).toEqual(['src/app.js'])
    expect(sel.skippedBinary).toBe(3)
  })

  it('counts oversized analyzable files as skipped', () => {
    const sel = selectFiles([blob('big.ts', 600 * 1024), blob('small.ts', 10)])
    expect(sel.selected.map((f) => f.path)).toEqual(['small.ts'])
    expect(sel.skippedLarge).toBe(1)
  })

  it('prioritizes README and manifests over ordinary source', () => {
    const sel = selectFiles([
      blob('src/z.ts'),
      blob('src/a.ts'),
      blob('README.md'),
      blob('package.json'),
    ])
    expect(sel.selected.map((f) => f.path)).toEqual([
      'README.md',
      'package.json',
      'src/a.ts',
      'src/z.ts',
    ])
  })

  it('caps selected files at the configured limit', () => {
    const files = Array.from({ length: 30 }, (_, i) => blob(`src/f${i}.ts`))
    const sel = selectFiles(files, { maxFiles: 10 })
    expect(sel.selected).toHaveLength(10)
    expect(sel.eligibleCount).toBe(30)
  })

  it('collects Windows scripts without scoring them', () => {
    const sel = selectFiles([blob('run.bat'), blob('setup.ps1'), blob('start.sh')])
    expect(sel.windowsScripts.map((f) => f.path)).toEqual(['run.bat', 'setup.ps1'])
  })

  it('ignores submodule commit entries', () => {
    const sel = selectFiles([
      { path: 'vendor/lib', type: 'commit', sha: 'abc' },
      blob('README.md'),
    ])
    expect(sel.selected.map((f) => f.path)).toEqual(['README.md'])
  })
})
