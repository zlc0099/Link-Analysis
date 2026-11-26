import { describe, it, expect } from 'vitest'
import { classifyPath } from '../../src/core/select/classify'

describe('classifyPath', () => {
  it('recognizes root README', () => {
    expect(classifyPath('README.md')).toBe('readme')
    expect(classifyPath('readme.rst')).toBe('readme')
  })

  it('recognizes docs/ README', () => {
    expect(classifyPath('docs/README.mdx')).toBe('readme')
  })

  it('does not treat nested README as project readme', () => {
    expect(classifyPath('src/pkg/README.md')).toBe('doc')
  })

  it('recognizes manifests', () => {
    expect(classifyPath('package.json')).toBe('manifest')
    expect(classifyPath('requirements-dev.txt')).toBe('manifest')
    expect(classifyPath('pyproject.toml')).toBe('manifest')
    expect(classifyPath('pom.xml')).toBe('manifest')
    expect(classifyPath('go.mod')).toBe('manifest')
    expect(classifyPath('Cargo.toml')).toBe('manifest')
  })

  it('recognizes lockfiles', () => {
    expect(classifyPath('package-lock.json')).toBe('lockfile')
    expect(classifyPath('pnpm-lock.yaml')).toBe('lockfile')
    expect(classifyPath('poetry.lock')).toBe('lockfile')
    expect(classifyPath('go.sum')).toBe('lockfile')
    expect(classifyPath('Cargo.lock')).toBe('lockfile')
    expect(classifyPath('composer.lock')).toBe('lockfile')
  })

  it('recognizes scripts including Windows-only', () => {
    expect(classifyPath('scripts/start.sh')).toBe('script')
    expect(classifyPath('start.bat')).toBe('script')
    expect(classifyPath('setup.ps1')).toBe('script')
  })

  it('classifies .env and yaml config', () => {
    expect(classifyPath('.env')).toBe('config')
    expect(classifyPath('.env.production')).toBe('config')
    expect(classifyPath('docker-compose.yml')).toBe('config')
    expect(classifyPath('src/config/app.yaml')).toBe('config')
  })

  it('classifies CI workflows before config', () => {
    expect(classifyPath('.github/workflows/ci.yml')).toBe('ci')
    expect(classifyPath('Jenkinsfile')).toBe('ci')
  })

  it('classifies test paths', () => {
    expect(classifyPath('tests/foo.test.ts')).toBe('test')
    expect(classifyPath('src/__tests__/a.js')).toBe('test')
    expect(classifyPath('examples/demo.py')).toBe('test')
  })

  it('classifies source code', () => {
    expect(classifyPath('src/index.ts')).toBe('source')
    expect(classifyPath('main.go')).toBe('source')
  })

  it('classifies other docs', () => {
    expect(classifyPath('CHANGELOG.md')).toBe('doc')
  })

  it('classifies assets as binary', () => {
    expect(classifyPath('public/logo.png')).toBe('binary')
    expect(classifyPath('app.min.js')).toBe('binary')
  })

  it('classifies plain text as doc', () => {
    expect(classifyPath('data.txt')).toBe('doc')
  })
})
