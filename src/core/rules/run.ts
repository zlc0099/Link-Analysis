import type { RuleContext, RuleOutcome } from './types'
import { makeFinding, outcome } from './types'
import { basename } from '../select/classify'
import { findReadme, makePermalink } from './helpers'

const RUN_COMMAND_RE =
  /npm run (dev|start|serve|preview)|yarn (dev|start|serve)|pnpm (dev|start|serve)|mvn spring-boot:run|\.\/mvnw|gradle bootRun|python\s+[^\s]+\.py|flask run|uvicorn|gunicorn|go run|cargo run|dotnet run|docker[ -]compose up|make run|java -jar/i

const WINDOWS_CMD_RE = /(^|\s)([\w.-]+\.(bat|cmd|ps1|vbs))(\s|$)/i

const VERSION_FILES = new Set([
  '.nvmrc', '.node-version', '.tool-versions', '.python-version',
  'rust-toolchain', 'rust-toolchain.toml', 'global.json',
])

interface Clues {
  any: boolean
  nonWindows: boolean
  windowsOnly: boolean
  sources: string[]
}

function findClues(ctx: RuleContext): Clues {
  const sources: string[] = []
  let nonWindows = false

  const pkgEntry = ctx.tree.find((e) => e.type === 'blob' && basename(e.path) === 'package.json')
  if (pkgEntry) {
    const file = ctx.files.find((f) => f.path === pkgEntry.path)
    if (file) {
      try {
        const pkg = JSON.parse(file.content) as { scripts?: Record<string, string> }
        const keys = Object.keys(pkg.scripts ?? {})
        if (keys.some((k) => ['dev', 'start', 'serve', 'preview'].includes(k))) {
          sources.push(pkgEntry.path)
          nonWindows = true
        }
      } catch {
        /* 解析失败已在 DEP-03 报告 */
      }
    }
  }

  const makefile = ctx.files.find((f) => basename(f.path) === 'Makefile')
  if (makefile && /^(run|start|dev)\s*:/m.test(makefile.content)) {
    sources.push(makefile.path)
    nonWindows = true
  }

  for (const name of ['docker-compose.yml', 'docker-compose.yaml', 'compose.yaml', 'Dockerfile', 'Procfile']) {
    const entry = ctx.tree.find((e) => e.type === 'blob' && basename(e.path) === name)
    if (entry) {
      sources.push(entry.path)
      nonWindows = true
      break
    }
  }

  let windowsOnlyFound = false
  for (const entry of ctx.tree) {
    if (entry.type !== 'blob') continue
    const base = basename(entry.path)
    if (!/(^|[._-])(run|start|dev)/i.test(base.split('.')[0])) continue
    const ext = base.split('.').pop()?.toLowerCase() ?? ''
    if (['sh', 'bash', 'zsh', 'fish'].includes(ext)) {
      sources.push(entry.path)
      nonWindows = true
    } else if (['bat', 'cmd', 'ps1', 'vbs'].includes(ext)) {
      sources.push(entry.path)
      windowsOnlyFound = true
    }
  }

  return {
    any: sources.length > 0,
    nonWindows,
    windowsOnly: windowsOnlyFound && !nonWindows,
    sources: [...new Set(sources)],
  }
}

function hasVersionDecl(ctx: RuleContext): boolean {
  for (const entry of ctx.tree) {
    if (entry.type !== 'blob') continue
    if (VERSION_FILES.has(basename(entry.path))) return true
  }
  const pkg = ctx.files.find((f) => basename(f.path) === 'package.json')
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content) as { engines?: Record<string, string> }
      if (parsed.engines && Object.keys(parsed.engines).length) return true
    } catch {
      /* ignore */
    }
  }
  const pyproject = ctx.files.find((f) => basename(f.path) === 'pyproject.toml')
  if (pyproject && /requires-python\s*=/i.test(pyproject.content)) return true
  const pom = ctx.files.find((f) => basename(f.path) === 'pom.xml')
  if (pom && /(maven\.compiler\.(source|target)|<source>)/i.test(pom.content)) return true
  const goMod = ctx.files.find((f) => basename(f.path) === 'go.mod')
  if (goMod && /^go\s+\d/m.test(goMod.content)) return true
  return false
}

export function evaluateRun(ctx: RuleContext): RuleOutcome[] {
  const readme = findReadme(ctx)
  const readmeText = readme?.content ?? ''
  const clues = findClues(ctx)
  const readmeHasRun = RUN_COMMAND_RE.test(readmeText)
  const readmeWindowsOnly = WINDOWS_CMD_RE.test(readmeText) && !readmeHasRun
  const hasVersion = hasVersionDecl(ctx)

  const run04Pass = clues.any
    ? clues.nonWindows || (readmeHasRun && !readmeWindowsOnly)
    : false
  const run04Findings = run04Pass
    ? []
    : clues.any
      ? [
          makeFinding('RUN-04', 'run', 'P2', '启动方式仅支持 Windows', {
            file: clues.sources[0],
            confidence: 'high',
            impact: '在 macOS / Linux 或 CI 上无法直接启动，跨平台协作受阻。',
            suggestion: '补充跨平台启动方式（package.json scripts / shell 脚本 / Docker），并在 README 写明。',
          }),
        ]
      : [
          makeFinding('RUN-04', 'run', 'P2', '未证明可跨平台启动', {
            confidence: 'medium',
            impact: '没有任何启动线索，无法证明项目可在 macOS / Linux 或 CI 上启动。',
            suggestion: '补充跨平台启动方式，并在 README 写明启动命令。',
          }),
        ]

  return [
    outcome(
      'RUN-01',
      'run',
      clues.any,
      clues.any
        ? []
        : [
            makeFinding('RUN-01', 'run', 'P1', '未发现启动线索', {
              confidence: 'high',
              impact: '接手者无法判断项目怎么启动，接入前需要额外沟通。',
              suggestion: '提供启动方式：package.json scripts、Makefile、Dockerfile / compose，或 run/start 脚本。',
            }),
          ],
    ),
    outcome(
      'RUN-02',
      'run',
      readmeHasRun,
      readmeHasRun
        ? []
        : [
            makeFinding('RUN-02', 'run', 'P2', 'README 未给出启动命令', {
              file: readme?.path,
              permalink: readme ? makePermalink(ctx, readme.path) : undefined,
              confidence: 'high',
              impact: '文档与代码脱节，接手者需要自己摸索启动命令。',
              suggestion: '在 README 中给出可直接复制的启动命令（如 npm run dev / docker compose up）。',
            }),
          ],
    ),
    outcome(
      'RUN-03',
      'run',
      hasVersion,
      hasVersion
        ? []
        : [
            makeFinding('RUN-03', 'run', 'P3', '未声明运行时版本', {
              confidence: 'medium',
              impact: '不同机器 Node/Python/JDK 版本不一致时可能出现「我这儿能跑」。',
              suggestion: '添加 .nvmrc / .python-version / engines / go 指令等版本声明。',
            }),
          ],
    ),
    outcome('RUN-04', 'run', run04Pass, run04Findings),
  ]
}
