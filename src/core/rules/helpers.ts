import type { FileContent, RuleContext } from './types'
import { classifyPath, type FileClass } from '../select/classify'

export function findFile(ctx: RuleContext, path: string): FileContent | undefined {
  return ctx.files.find((f) => f.path === path)
}

export function filesByClass(ctx: RuleContext, cls: FileClass): FileContent[] {
  return ctx.files.filter((f) => f.class === cls)
}

export function treeByClass(ctx: RuleContext, cls: FileClass): string[] {
  return ctx.tree
    .filter((e) => e.type === 'blob' && classifyPath(e.path) === cls)
    .map((e) => e.path)
}

export function findReadmePath(ctx: RuleContext): string | undefined {
  const paths = ctx.tree
    .filter((e) => e.type === 'blob' && classifyPath(e.path) === 'readme')
    .map((e) => e.path)
    .sort((a, b) => {
      const da = a.split('/').length
      const db = b.split('/').length
      if (da !== db) return da - db
      return a < b ? -1 : 1
    })
  return paths[0]
}

export function findReadme(ctx: RuleContext): FileContent | undefined {
  const candidates = ctx.files.filter((f) => f.class === 'readme')
  if (!candidates.length) return undefined
  return candidates.sort((a, b) => {
    const da = a.path.split('/').length
    const db = b.path.split('/').length
    if (da !== db) return da - db
    return a.path < b.path ? -1 : 1
  })[0]
}

export function makePermalink(ctx: RuleContext, path: string, line?: number): string {
  const base = ctx.permalinkBase.replace(/\/$/, '')
  return `${base}/${path}${line ? `#L${line}` : ''}`
}

/** 返回 1-based 行号；未找到返回 undefined */
export function lineOf(content: string, index: number): number | undefined {
  if (index < 0) return undefined
  return content.slice(0, index).split('\n').length
}

/** 找到第一个命中正则的位置与行号 */
export function findMatch(
  content: string,
  re: RegExp,
): { text: string; line: number; index: number } | null {
  const m = re.exec(content)
  if (!m) return null
  return { text: m[0], line: lineOf(content, m.index) ?? 1, index: m.index }
}

export function nonWhitespaceLength(text: string): number {
  return text.replace(/\s/g, '').length
}

export function headingCount(text: string): number {
  return (text.match(/^#{1,6}\s+\S/gm) ?? []).length
}

export function truncate(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text
}
