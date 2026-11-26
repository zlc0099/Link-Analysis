import type { TreeEntry } from '../../src/core/github/types'
import type { RuleContext, FileContent } from '../../src/core/rules/types'
import { selectFiles } from '../../src/core/select/selectFiles'
import { classifyPath } from '../../src/core/select/classify'

export function blob(path: string, size = 100): TreeEntry {
  return { path, type: 'blob', size, sha: `sha-${path}` }
}

export function makeCtx(
  files: Record<string, string>,
  extraEntries: TreeEntry[] = [],
  permalinkBase = 'https://github.com/o/r/blob/sha',
): RuleContext {
  const entries: TreeEntry[] = [
    ...Object.entries(files).map(([path, content]) => blob(path, content.length)),
    ...extraEntries,
  ]
  const selection = selectFiles(entries)
  const contents: FileContent[] = Object.entries(files).map(([path, content]) => ({
    path,
    content,
    class: classifyPath(path),
  }))
  return {
    tree: entries,
    selected: selection.selected,
    files: contents,
    lockfiles: selection.lockfiles,
    windowsScripts: selection.windowsScripts,
    permalinkBase,
  }
}

export const README_FULL = `# Demo Project

A small demo used for readiness checks.

## Install

\`\`\`bash
npm install
\`\`\`

## Configuration

Copy \`.env.example\` to \`.env\` and set the environment variables.

## Usage

\`\`\`bash
npm run dev
\`\`\`

## License

MIT. This README is intentionally long enough to satisfy the structure quality rule.
It contains several headings and a reasonable amount of body text so that the readiness
report does not flag it as a placeholder README. The content is repeated here only to
cross the four hundred character threshold used by the static rule engine.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent
libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum
imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper
porta. Mauris massa. Vestibulum lacinia arcu eget nulla.
`
