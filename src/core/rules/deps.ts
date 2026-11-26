import type { RuleContext, RuleOutcome } from './types'
import { makeFinding, outcome } from './types'
import { basename, classifyPath } from '../select/classify'

type Ecosystem = 'node' | 'python' | 'php' | 'ruby' | 'go' | 'rust' | 'java' | 'dotnet' | 'dart' | 'other'

const NODE_LOCKS = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']
const LOCK_BY_ECOSYSTEM: Partial<Record<Ecosystem, string[]>> = {
  node: NODE_LOCKS,
  php: ['composer.lock'],
  ruby: ['Gemfile.lock'],
  go: ['go.sum'],
}
const NO_LOCK_CONVENTION = new Set<Ecosystem>(['rust', 'java', 'dotnet', 'dart', 'other'])

function ecosystemOf(path: string): Ecosystem {
  const base = basename(path)
  if (base === 'package.json') return 'node'
  if (/^requirements.*\.txt$/i.test(base) || ['pyproject.toml', 'Pipfile', 'setup.py', 'environment.yml'].includes(base)) {
    return 'python'
  }
  if (base === 'composer.json') return 'php'
  if (base === 'Gemfile') return 'ruby'
  if (base === 'go.mod') return 'go'
  if (base === 'Cargo.toml') return 'rust'
  if (['pom.xml', 'build.gradle', 'build.gradle.kts'].includes(base)) return 'java'
  if (/\.(csproj|sln)$/i.test(base)) return 'dotnet'
  if (base === 'pubspec.yaml') return 'dart'
  return 'other'
}

function manifestsOf(ctx: RuleContext): string[] {
  return ctx.tree
    .filter(
      (e) =>
        e.type === 'blob' &&
        e.path.split('/').length <= 2 &&
        classifyPath(e.path) === 'manifest',
    )
    .map((e) => e.path)
    .sort()
}

function pinnedRatio(ctx: RuleContext): number {
  const files = ctx.files.filter((f) => /^requirements.*\.txt$/i.test(basename(f.path)))
  let total = 0
  let pinned = 0
  for (const f of files) {
    for (const raw of f.content.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      total++
      if (/^[A-Za-z0-9_.\-\[\]]+\s*===?/.test(line)) pinned++
    }
  }
  return total === 0 ? 0 : pinned / total
}

function lockStatus(ctx: RuleContext, ecosystems: Ecosystem[]): 'pass' | 'fail' | 'na' {
  const lockNames = new Set(ctx.lockfiles.map((l) => basename(l.path)))
  let sawApplicable = false
  for (const eco of ecosystems) {
    if (NO_LOCK_CONVENTION.has(eco)) continue
    sawApplicable = true
    if (eco === 'python') {
      const hasLock = ['poetry.lock', 'Pipfile.lock', 'uv.lock'].some((l) => lockNames.has(l))
      if (!hasLock && pinnedRatio(ctx) < 0.8) return 'fail'
      continue
    }
    const accepted = LOCK_BY_ECOSYSTEM[eco] ?? []
    if (!accepted.some((l) => lockNames.has(l))) return 'fail'
  }
  return sawApplicable ? 'pass' : 'na'
}

export function evaluateDeps(ctx: RuleContext): RuleOutcome[] {
  const manifests = manifestsOf(ctx)
  if (!manifests.length) {
    return [
      outcome('DEP-01', 'deps', false, [
        makeFinding('DEP-01', 'deps', 'P1', '未发现依赖清单', {
          confidence: 'high',
          impact: '无法确定项目依赖与版本，环境搭建只能靠猜。',
          suggestion: '提交标准依赖清单（package.json / requirements.txt / pom.xml / go.mod 等）。',
        }),
      ]),
      outcome('DEP-02', 'deps', 'na'),
      outcome('DEP-03', 'deps', 'na'),
    ]
  }

  const ecosystems = [...new Set(manifests.map(ecosystemOf))]
  const lock = lockStatus(ctx, ecosystems)

  const jsonManifests = manifests.filter((p) => p.endsWith('.json') && p.split('/').length <= 2)
  const broken: string[] = []
  for (const p of jsonManifests) {
    const file = ctx.files.find((f) => f.path === p)
    if (!file) {
      broken.push(p)
      continue
    }
    try {
      JSON.parse(file.content)
    } catch {
      broken.push(p)
    }
  }

  const dep02Findings = lock === 'fail'
    ? [
        makeFinding('DEP-02', 'deps', 'P2', '缺少锁文件或固定版本', {
          file: manifests[0],
          permalink: ctx.permalinkBase ? `${ctx.permalinkBase.replace(/\/$/, '')}/${manifests[0]}` : undefined,
          confidence: 'high',
          evidence: `清单：${manifests.slice(0, 3).join(', ')}；未发现对应锁文件`,
          impact: '依赖版本漂移，构建不可复现，不同机器安装结果可能不同。',
          suggestion: '提交 lockfile（package-lock.json / poetry.lock / go.sum 等）并固定版本。',
        }),
      ]
    : []

  const dep03Findings = broken.length
    ? [
        makeFinding('DEP-03', 'deps', 'P1', '依赖清单无法解析', {
          file: broken[0],
          permalink: `${ctx.permalinkBase.replace(/\/$/, '')}/${broken[0]}`,
          confidence: 'high',
          evidence: `${broken[0]} 不是合法 JSON`,
          impact: '安装与构建会直接失败，接手者需要先修清单。',
          suggestion: '修复清单语法，或用对应包管理器重新生成。',
        }),
      ]
    : []

  return [
    outcome('DEP-01', 'deps', true),
    outcome('DEP-02', 'deps', lock === 'na' ? 'na' : lock === 'pass', dep02Findings),
    outcome('DEP-03', 'deps', broken.length === 0, dep03Findings),
  ]
}
