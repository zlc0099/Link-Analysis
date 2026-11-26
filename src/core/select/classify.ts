export type FileClass =
  | 'readme'
  | 'manifest'
  | 'lockfile'
  | 'script'
  | 'config'
  | 'source'
  | 'doc'
  | 'test'
  | 'ci'
  | 'binary'
  | 'other'

const LOCKFILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'poetry.lock',
  'Pipfile.lock',
  'uv.lock',
  'composer.lock',
  'Gemfile.lock',
  'go.sum',
  'Cargo.lock',
])

const MANIFESTS = new Set([
  'package.json',
  'pyproject.toml',
  'Pipfile',
  'setup.py',
  'environment.yml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'Cargo.toml',
  'composer.json',
  'Gemfile',
  'pubspec.yaml',
  'CMakeLists.txt',
  'Makefile',
  'mix.exs',
  'Package.swift',
])

const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'mp4', 'wav', 'ogg', 'webm', 'mov', 'avi',
  'zip', 'gz', 'tgz', 'rar', '7z', 'jar', 'war',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'o', 'a', 'lib',
  'lock',
])

const TEXT_EXT = new Set([
  'md', 'mdx', 'rst', 'txt',
  'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'vue', 'svelte',
  'py', 'java', 'kt', 'gradle', 'go', 'rs', 'php', 'rb', 'cs', 'c', 'h', 'cpp', 'hpp',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1', 'vbs',
  'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'properties', 'env', 'xml',
  'html', 'css', 'scss', 'less', 'sql',
])

const SCRIPT_EXT = new Set(['sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1', 'vbs'])
const CONFIG_EXT = new Set(['yml', 'yaml', 'toml', 'ini', 'conf', 'properties', 'env', 'xml'])
const SOURCE_EXT = new Set([
  'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'vue', 'svelte',
  'py', 'java', 'kt', 'gradle', 'go', 'rs', 'php', 'rb', 'cs', 'c', 'h', 'cpp', 'hpp',
  'html', 'css', 'scss', 'less', 'sql',
])
const DOC_EXT = new Set(['md', 'mdx', 'rst', 'txt'])

const TEST_SEGMENTS = new Set([
  'test', 'tests', 'spec', 'specs', 'fixture', 'fixtures',
  'example', 'examples', 'demo', 'demos', 'samples', 'mocks', '__tests__',
])

export function extname(path: string): string {
  const base = path.split('/').pop() ?? ''
  const idx = base.lastIndexOf('.')
  if (idx <= 0) return ''
  return base.slice(idx + 1).toLowerCase()
}

export function basename(path: string): string {
  return path.split('/').pop() ?? path
}

export function isLockfile(path: string): boolean {
  return LOCKFILES.has(basename(path))
}

export function isManifest(path: string): boolean {
  const base = basename(path)
  if (MANIFESTS.has(base)) return true
  if (/^requirements.*\.txt$/i.test(base)) return true
  if (/\.(csproj|sln)$/i.test(base)) return true
  return false
}

export function isWindowsScript(path: string): boolean {
  return ['bat', 'cmd', 'ps1', 'vbs'].includes(extname(path))
}

export function isTestPath(path: string): boolean {
  return path
    .toLowerCase()
    .split('/')
    .some((seg) => TEST_SEGMENTS.has(seg))
}

export function classifyPath(path: string): FileClass {
  const parts = path.split('/').filter(Boolean)
  const base = parts[parts.length - 1] ?? path
  const lower = base.toLowerCase()
  const ext = extname(path)

  if (/^readme\.(md|mdx|rst|txt)$/i.test(base) && (parts.length === 1 || parts[0].toLowerCase() === 'docs')) {
    return 'readme'
  }
  if (LOCKFILES.has(base)) return 'lockfile'
  if (isManifest(path)) return 'manifest'
  if (parts[0] === '.github' && parts[1] === 'workflows') return 'ci'
  if (['.gitlab-ci.yml', 'Jenkinsfile', 'azure-pipelines.yml'].includes(base)) return 'ci'
  if (isTestPath(path)) return 'test'
  if (lower.endsWith('.min.js') || lower.endsWith('.js.map') || lower.endsWith('.css.map')) return 'binary'
  if (BINARY_EXT.has(ext)) return 'binary'
  if (SCRIPT_EXT.has(ext)) return 'script'
  if (lower === '.env' || lower.startsWith('.env.')) return 'config'
  if (CONFIG_EXT.has(ext)) return 'config'
  if (SOURCE_EXT.has(ext)) return 'source'
  if (DOC_EXT.has(ext)) return 'doc'
  if (TEXT_EXT.has(ext)) return 'source'
  return 'other'
}
