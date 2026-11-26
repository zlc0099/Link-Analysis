import type { TreeEntry } from '../github/types'
import { classifyPath, basename, isLockfile, isWindowsScript, type FileClass } from './classify'

const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'target', 'vendor', 'third_party',
  '.next', '.nuxt', 'coverage', '.venv', 'venv', '__pycache__', 'obj',
])

export const MAX_FILES = 400
export const MAX_FILE_SIZE = 512 * 1024

export interface Selection {
  selected: TreeEntry[]
  eligibleCount: number
  selectedCount: number
  skippedBinary: number
  skippedLarge: number
  lockfiles: TreeEntry[]
  windowsScripts: TreeEntry[]
}

export interface SelectOptions {
  maxFiles?: number
  maxFileSize?: number
}

const CONTENT_CLASSES = new Set<FileClass>([
  'readme', 'manifest', 'script', 'config', 'source', 'doc', 'test', 'ci',
])

function isExcludedPath(path: string): boolean {
  const parts = path.split('/')
  return parts.some((seg) => EXCLUDED_DIRS.has(seg))
}

function priorityOf(entry: TreeEntry): number {
  const cls = classifyPath(entry.path)
  const base = basename(entry.path)
  if (cls === 'readme' || cls === 'manifest') return 1
  if (base.startsWith('.env') || /^(Dockerfile|Procfile|docker-compose\.ya?ml|compose\.ya?ml)$/.test(base)) return 1
  if (cls === 'script' || cls === 'ci') return 2
  if (cls === 'source' || cls === 'config') return 3
  return 4
}

export function selectFiles(entries: TreeEntry[], options: SelectOptions = {}): Selection {
  const maxFiles = options.maxFiles ?? MAX_FILES
  const maxFileSize = options.maxFileSize ?? MAX_FILE_SIZE

  const lockfiles: TreeEntry[] = []
  const windowsScripts: TreeEntry[] = []
  const eligible: TreeEntry[] = []
  let skippedBinary = 0
  let skippedLarge = 0

  for (const entry of entries) {
    if (entry.type !== 'blob') continue
    if (isExcludedPath(entry.path)) continue

    if (isLockfile(entry.path)) {
      lockfiles.push(entry)
      continue
    }
    if (isWindowsScript(entry.path)) {
      windowsScripts.push(entry)
    }

    const cls = classifyPath(entry.path)
    if (cls === 'binary' || cls === 'other') {
      if (cls === 'binary') skippedBinary++
      continue
    }
    if (!CONTENT_CLASSES.has(cls)) continue
    if ((entry.size ?? 0) > maxFileSize) {
      skippedLarge++
      continue
    }
    eligible.push(entry)
  }

  eligible.sort((a, b) => {
    const pa = priorityOf(a)
    const pb = priorityOf(b)
    if (pa !== pb) return pa - pb
    const da = a.path.split('/').length
    const db = b.path.split('/').length
    if (da !== db) return da - db
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0
  })

  const selected = eligible.slice(0, maxFiles)
  return {
    selected,
    eligibleCount: eligible.length,
    selectedCount: selected.length,
    skippedBinary,
    skippedLarge,
    lockfiles,
    windowsScripts,
  }
}
