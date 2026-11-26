import type { RuleContext, RuleOutcome } from './types'
import { makeFinding, outcome } from './types'
import { findReadmePath, headingCount, makePermalink, nonWhitespaceLength } from './helpers'

const INSTALL_WORDS = [
  'install', 'setup', 'build', 'requirements', '安装', '构建', '环境准备',
  'npm install', 'yarn install', 'pnpm install', 'pip install', 'mvn', 'gradle',
  'go mod download', 'cargo build', 'composer install', 'bundle install',
  'docker build', 'make build',
]

const CONFIG_WORDS = [
  'config', 'configuration', 'environment', 'env', '环境变量', '配置', '.env',
]

const PLACEHOLDER = /your project|项目名称|项目简介|TODO:/i

export function evaluateDocs(ctx: RuleContext): RuleOutcome[] {
  const readmePath = findReadmePath(ctx)

  if (!readmePath) {
    return [
      outcome('DOC-01', 'docs', false, [
        makeFinding('DOC-01', 'docs', 'P1', '缺少 README', {
          confidence: 'high',
          impact: '接手者无法快速了解项目定位、安装与运行方式，接入成本显著上升。',
          suggestion: '在根目录补充 README.md，写明项目简介、安装、配置与启动步骤。',
        }),
      ]),
      outcome('DOC-02', 'docs', 'na'),
      outcome('DOC-03', 'docs', 'na'),
      outcome('DOC-04', 'docs', 'na'),
    ]
  }

  const readme = ctx.files.find((f) => f.path === readmePath)
  if (!readme) {
    // 文件存在但内容拉取失败：DOC-01 依据文件树判定，其余无法判断
    return [
      outcome('DOC-01', 'docs', true),
      outcome('DOC-02', 'docs', 'na'),
      outcome('DOC-03', 'docs', 'na'),
      outcome('DOC-04', 'docs', 'na'),
    ]
  }

  const content = readme.content.toLowerCase()
  const permalink = makePermalink(ctx, readme.path)
  const hasInstall = INSTALL_WORDS.some((w) => content.includes(w))
  const hasConfig = CONFIG_WORDS.some((w) => content.includes(w))
  const longEnough = nonWhitespaceLength(readme.content) >= 400
  const enoughHeadings = headingCount(readme.content) >= 3
  const placeholder = PLACEHOLDER.test(readme.content.slice(0, 300))
  const structured = longEnough && enoughHeadings && !placeholder

  return [
    outcome('DOC-01', 'docs', true),
    outcome(
      'DOC-02',
      'docs',
      hasInstall,
      hasInstall
        ? []
        : [
            makeFinding('DOC-02', 'docs', 'P2', 'README 未说明安装或构建方式', {
              file: readme.path,
              permalink,
              confidence: 'high',
              impact: '接手者需要自行猜测依赖安装与构建步骤，容易踩坑。',
              suggestion: '在 README 中补充安装/构建章节与可复制的命令。',
            }),
          ],
    ),
    outcome(
      'DOC-03',
      'docs',
      hasConfig,
      hasConfig
        ? []
        : [
            makeFinding('DOC-03', 'docs', 'P2', 'README 未说明配置或环境变量', {
              file: readme.path,
              permalink,
              confidence: 'high',
              impact: '运行时配置来源不清晰，容易出现「本地能跑、部署就挂」。',
              suggestion: '在 README 中说明需要的配置项、环境变量与示例文件（如 .env.example）。',
            }),
          ],
    ),
    outcome(
      'DOC-04',
      'docs',
      structured,
      structured
        ? []
        : [
            makeFinding('DOC-04', 'docs', 'P3', 'README 内容过短或仍是模板占位', {
              file: readme.path,
              permalink,
              confidence: placeholder ? 'high' : 'medium',
              impact: '文档信息量不足，无法支撑新人独立接入。',
              suggestion: '补全 README 正文，至少包含项目简介、安装、配置、运行与目录结构。',
            }),
          ],
    ),
  ]
}
