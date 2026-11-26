import { mkdir, writeFile } from 'node:fs/promises'
import { analyzeRepo } from '../src/core/analyze'
import { buildMarkdown } from '../src/core/report/markdown'
import type { Report } from '../src/core/report/schema'

const REPOS = ['expressjs/express', 'pallets/flask', 'cmderdev/cmder']
const OUT_DIR = 'docs/verification'

function summarize(report: Report, durationMs: number) {
  const counts: Record<string, number> = {}
  for (const f of report.findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1
  return {
    repo: report.repo.fullName,
    htmlUrl: report.repo.htmlUrl,
    branch: report.repo.defaultBranch,
    commit: report.commit,
    analyzedAt: report.analyzedAt,
    durationMs,
    ruleVersion: report.ruleVersion,
    score: report.score,
    dimensions: report.dimensions.map((d) => ({ dimension: d.dimension, label: d.label, score: d.score, max: d.max })),
    coverage: report.coverage,
    severityCounts: counts,
    topFindings: report.findings
      .filter((f) => f.severity === 'P0' || f.severity === 'P1')
      .slice(0, 10)
      .map((f) => ({ ruleId: f.ruleId, title: f.title, file: f.file, line: f.line })),
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const full of REPOS) {
    const [owner, repo] = full.split('/')
    const started = Date.now()
    process.stdout.write(`\n=== ${full} ===\n`)
    try {
      const report = await analyzeRepo(owner, repo, {
        onStage: (p) => {
          if (p.stage === 'fetching-files' && p.total && (p.fetched ?? 0) % 50 === 0) {
            process.stdout.write(`  fetching ${p.fetched}/${p.total}\n`)
          }
        },
      })
      const durationMs = Date.now() - started
      const complete =
        report.coverage.failedFiles.length === 0 &&
        report.coverage.analyzedFiles === report.coverage.selectedFiles
      // 不完整的结果不覆盖已提交的完整记录，避免网络/限流导致记录退化
      const base = complete ? `${OUT_DIR}/${owner}-${repo}` : `${OUT_DIR}/${owner}-${repo}.partial`
      await writeFile(`${base}.json`, JSON.stringify(summarize(report, durationMs), null, 2), 'utf8')
      await writeFile(`${base}.md`, buildMarkdown(report), 'utf8')
      console.log(
        `  ${report.repo.fullName} @ ${report.commit.shortSha} -> ${report.score.official}/${report.score.grade}` +
          ` (raw ${report.score.raw}${report.score.capped ? ', capped' : ''})` +
          ` files ${report.coverage.analyzedFiles}/${report.coverage.selectedFiles}` +
          ` findings ${report.findings.length} in ${(durationMs / 1000).toFixed(1)}s` +
          `${complete ? '' : ' [PARTIAL, not overwriting records]'}`,
      )
    } catch (err) {
      console.error(`  FAILED: ${(err as Error).message}`)
      await writeFile(
        `${OUT_DIR}/${owner}-${repo}.error.json`,
        JSON.stringify({ repo: full, error: (err as Error).message, at: new Date().toISOString() }, null, 2),
        'utf8',
      )
    }
  }
}

void main()
