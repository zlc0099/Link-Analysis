import type { RuleContext, Finding } from './types'
import { makeFinding } from './types'
import { isWindowsScript } from '../select/classify'
import { makePermalink } from './helpers'

const ROLE_WORDS: Array<[RegExp, string]> = [
  [/install|setup/, 'install/setup'],
  [/build|compile|package/, 'build'],
  [/test|spec/, 'test'],
  [/deploy|release|publish/, 'deploy'],
  [/start|run|serve|dev/, 'start/run'],
]

function guessRole(path: string): string {
  const lower = path.toLowerCase()
  for (const [re, role] of ROLE_WORDS) {
    if (re.test(lower)) return role
  }
  return 'unknown'
}

/** WIN-01 信息项：清单展示，不参与评分 */
export function evaluateWindowsScripts(ctx: RuleContext): Finding[] {
  return ctx.tree
    .filter((e) => e.type === 'blob' && isWindowsScript(e.path))
    .map((e) => {
      const role = guessRole(e.path)
      return makeFinding('WIN-01', 'portability', 'INFO', 'Windows 专用脚本（信息项）', {
        file: e.path,
        evidence: `推测作用：${role}`,
        confidence: 'low',
        impact: '仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。',
        suggestion: '如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。',
        permalink: makePermalink(ctx, e.path),
      })
    })
}
