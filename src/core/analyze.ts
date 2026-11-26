import { fetchRepoMeta, fetchHeadCommit, fetchTree, fetchFileContent, GithubError } from './github/client'
import { selectFiles } from './select/selectFiles'
import { classifyPath } from './select/classify'
import { evaluateDocs } from './rules/docs'
import { evaluateDeps } from './rules/deps'
import { evaluateRun } from './rules/run'
import { evaluatePaths } from './rules/paths'
import { evaluateSecrets } from './rules/secrets'
import { evaluateWindowsScripts } from './rules/windows'
import { buildReport } from './report/build'
import type { FileContent, RuleContext } from './rules/types'
import type { Coverage, Report } from './report/schema'

export type AnalyzeStageName =
  | 'resolving-repo'
  | 'resolving-commit'
  | 'loading-tree'
  | 'fetching-files'
  | 'analyzing'
  | 'scoring'

export interface AnalyzeProgress {
  stage: AnalyzeStageName
  fetched?: number
  total?: number
  message?: string
}

export interface AnalyzeOptions {
  token?: string | null
  signal?: AbortSignal
  fetchFn?: typeof fetch
  onStage?: (progress: AnalyzeProgress) => void
  now?: () => string
  maxFiles?: number
}

const CONCURRENCY = 6

export async function analyzeRepo(owner: string, repo: string, options: AnalyzeOptions = {}): Promise<Report> {
  const emit = options.onStage ?? (() => {})
  let activeToken = options.token ?? null
  let tokenFallback = false
  const clientOptions = () => ({ token: activeToken, signal: options.signal, fetchFn: options.fetchFn })
  const now = options.now ?? (() => new Date().toISOString())

  /** 401 时回退匿名一次（文档 §6），不自动清除用户 Token */
  async function withTokenFallback<T>(
    call: (opts: ReturnType<typeof clientOptions>) => Promise<T>,
  ): Promise<T> {
    try {
      return await call(clientOptions())
    } catch (err) {
      if (err instanceof GithubError && err.code === 'unauthorized' && activeToken) {
        activeToken = null
        tokenFallback = true
        return call(clientOptions())
      }
      throw err
    }
  }

  emit({ stage: 'resolving-repo' })
  const meta = await withTokenFallback((opts) => fetchRepoMeta(owner, repo, opts))

  emit({ stage: 'resolving-commit', message: meta.defaultBranch })
  const commit = await withTokenFallback((opts) => fetchHeadCommit(owner, repo, meta.defaultBranch, opts))

  emit({ stage: 'loading-tree' })
  const tree = await withTokenFallback((opts) => fetchTree(owner, repo, commit.sha, opts))

  const selection = selectFiles(tree.entries, { maxFiles: options.maxFiles })

  const files: FileContent[] = []
  const failedFiles: string[] = []
  let bytesScanned = 0
  let fetched = 0
  const total = selection.selected.length
  emit({ stage: 'fetching-files', fetched: 0, total })

  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < selection.selected.length) {
      if (options.signal?.aborted) throw new GithubError('cancelled', '已取消')
      const entry = selection.selected[cursor++]
      try {
        const content = await fetchFileContent(owner, repo, commit.sha, entry.path, clientOptions())
        files.push({ path: entry.path, content, class: classifyPath(entry.path) })
        bytesScanned += content.length
      } catch (err) {
        if (err instanceof GithubError && err.code === 'cancelled') throw err
        failedFiles.push(entry.path)
      }
      fetched++
      emit({ stage: 'fetching-files', fetched, total })
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(total, 1)) }, () => worker()))

  emit({ stage: 'analyzing' })
  const ctx: RuleContext = {
    tree: tree.entries,
    selected: selection.selected,
    files,
    lockfiles: selection.lockfiles,
    windowsScripts: selection.windowsScripts,
    permalinkBase: `https://github.com/${meta.fullName}/blob/${commit.sha}`,
  }

  const outcomes = [
    ...evaluateDocs(ctx),
    ...evaluateDeps(ctx),
    ...evaluateRun(ctx),
    ...evaluatePaths(ctx),
    ...evaluateSecrets(ctx),
  ]
  const extraFindings = evaluateWindowsScripts(ctx)

  const coverage: Coverage = {
    treeTruncated: tree.truncated,
    eligibleFiles: selection.eligibleCount,
    selectedFiles: selection.selectedCount,
    analyzedFiles: files.length,
    failedFiles,
    skippedBinary: selection.skippedBinary,
    skippedLarge: selection.skippedLarge,
    bytesScanned,
  }

  const limitations: string[] = []
  if (meta.archived) limitations.push('仓库已归档（archived），结论仅代表当前快照。')
  if (tokenFallback) limitations.push('配置的 Token 无效，已回退匿名请求（额度受限）。')
  if (tree.entries.some((e) => e.type === 'commit')) {
    limitations.push('仓库包含子模块，子模块内容未分析。')
  }
  if (selection.selected.length === 0) {
    limitations.push('仓库没有可分析文件，报告为空结果。')
  }

  emit({ stage: 'scoring' })
  const report = buildReport({
    meta,
    commit,
    analyzedAt: now(),
    coverage,
    outcomes,
    extraFindings,
    limitations,
  })
  return report
}
