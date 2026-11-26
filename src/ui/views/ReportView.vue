<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Report, DimensionScore } from '../../core/report/schema'
import type { Finding } from '../../core/rules/types'
import ScoreSummary from '../components/ScoreSummary.vue'
import FindingList from '../components/FindingList.vue'
import AiAdvice from '../components/AiAdvice.vue'

const props = defineProps<{
  report: Report
  notice?: string | null
  durationMs?: number
}>()

const emit = defineEmits<{
  (e: 'export'): void
  (e: 'back'): void
  (e: 'rerun'): void
}>()

type Tab = 'all' | 'security' | 'compat' | 'path' | 'structure'
const activeTab = ref<Tab>('all')

const findings = computed(() => props.report.findings)

function byTab(tab: Tab): Finding[] {
  const fs = findings.value
  if (tab === 'security') return fs.filter((f) => f.dimension === 'security')
  if (tab === 'path') return fs.filter((f) => f.ruleId.startsWith('PATH-'))
  if (tab === 'compat') return fs.filter((f) => f.dimension === 'portability' && !f.ruleId.startsWith('PATH-'))
  if (tab === 'structure') return fs.filter((f) => ['docs', 'deps', 'run'].includes(f.dimension))
  return fs.filter((f) => f.severity !== 'INFO')
}

const SEV_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, INFO: 4 }

const shownFindings = computed(() =>
  byTab(activeTab.value).slice().sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)),
)

const tabCounts = computed(() => ({
  all: byTab('all').length,
  security: byTab('security').length,
  compat: byTab('compat').length,
  path: byTab('path').length,
  structure: byTab('structure').length,
}))

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: '全部问题' },
  { key: 'security', label: '安全风险' },
  { key: 'compat', label: '系统兼容性' },
  { key: 'path', label: '路径依赖' },
  { key: 'structure', label: '项目结构' },
]

const metrics = computed(() => {
  const fs = findings.value
  const count = (...sevs: string[]) => fs.filter((f) => sevs.includes(f.severity)).length
  const passed = props.report.dimensions.reduce(
    (sum, d) => sum + d.items.filter((i) => i.applicable && i.passed).length,
    0,
  )
  return [
    { label: '高风险', value: count('P0', 'P1'), cls: 'danger' },
    { label: '中风险', value: count('P2'), cls: 'warn' },
    { label: '低风险', value: count('P3'), cls: 'cyan' },
    { label: '已通过', value: passed, cls: 'ok' },
  ]
})

const ruleCount = computed(() =>
  props.report.dimensions.reduce((sum, d) => sum + d.items.length, 0),
)

const analyzedAt = computed(() => {
  const d = new Date(props.report.analyzedAt)
  if (Number.isNaN(d.getTime())) return props.report.analyzedAt
  const date = d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
})

const duration = computed(() => {
  const ms = props.durationMs ?? 0
  return ms > 0 ? `${Math.max(1, Math.round(ms / 1000))} 秒` : null
})

const reportId = computed(() => {
  const d = new Date(props.report.analyzedAt)
  const date = Number.isNaN(d.getTime())
    ? 'unknown'
    : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `RC-${date}-${props.report.commit.shortSha}`
})

const incomplete = computed(
  () => props.report.coverage.treeTruncated || props.report.coverage.failedFiles.length > 0,
)

function scoreTone(d: DimensionScore): string {
  const ratio = d.max ? d.score / d.max : 0
  if (ratio >= 0.9) return 'var(--ok)'
  if (ratio >= 0.75) return 'var(--accent)'
  if (ratio >= 0.6) return 'var(--warn)'
  return 'var(--p0)'
}

function dimSummary(d: DimensionScore): string {
  const passed = d.items.filter((i) => i.applicable && i.passed).length
  const failed = d.items.filter((i) => i.applicable && !i.passed).length
  if (failed === 0) return `${passed} 项通过`
  return `${passed} 项通过 · ${failed} 项待改进`
}
</script>

<template>
  <div class="report">
    <section class="head">
      <div class="head-main">
        <p class="crumb muted small">
          <button class="crumb-link" type="button" @click="emit('back')">仓库体检</button>
          / 体检报告
        </p>
        <h1 class="mono">{{ report.repo.fullName }}</h1>
        <a class="repo-link" :href="report.repo.htmlUrl" target="_blank" rel="noopener noreferrer">
          github.com/{{ report.repo.fullName }} ↗
        </a>
        <p class="meta mono small">
          {{ report.repo.defaultBranch }} · {{ report.commit.shortSha }}
          <span class="sep">·</span>
          扫描于 {{ analyzedAt }}
          <template v-if="duration"><span class="sep">·</span> 耗时 {{ duration }}</template>
          <span class="sep">·</span> 规则版本 {{ report.ruleVersion }}
          <span v-if="report.repo.archived" class="chip chip-p3">已归档</span>
        </p>
        <p v-if="report.repo.description" class="desc muted small">{{ report.repo.description }}</p>
      </div>
      <div class="head-actions">
        <button class="btn" type="button" @click="emit('back')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 19l-7-7 7-7M3 12h18" />
          </svg>
          返回首页
        </button>
        <button class="btn" type="button" @click="emit('export')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 4v10m0 0 4-4m-4 4-4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
          </svg>
          导出报告
        </button>
        <button class="btn btn-primary" type="button" @click="emit('rerun')">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
          </svg>
          重新体检
        </button>
      </div>
    </section>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <section v-if="incomplete" class="banner" role="status">
      <strong>数据不完整</strong>
      <span>
        已分析 {{ report.coverage.analyzedFiles }} / {{ report.coverage.selectedFiles }} 个文件。
        <template v-if="report.coverage.treeTruncated">文件树被截断，仅分析返回的部分文件。</template>
        <template v-if="report.coverage.failedFiles.length">
          {{ report.coverage.failedFiles.length }} 个文件读取失败：{{ report.coverage.failedFiles.slice(0, 5).join('、') }}
        </template>
        报告基于已分析文件，未补分。
      </span>
    </section>

    <section class="overview">
      <div class="card score-card">
        <ScoreSummary
          :score="report.score.official"
          :raw="report.score.raw"
          :grade="report.score.grade"
          :capped="report.score.capped"
        />
      </div>
      <div class="card result-card">
        <h2>已完成体检，发现 {{ metrics[0].value + metrics[1].value + metrics[2].value }} 项待处理问题</h2>
        <p class="muted">{{ report.score.verdict }}</p>
        <div class="metrics">
          <span v-for="m in metrics" :key="m.label" class="metric">
            <b :class="m.cls" class="mono">{{ m.value }}</b>
            <span class="muted small">{{ m.label }}</span>
          </span>
        </div>
        <p class="foot muted small">
          检查 {{ report.coverage.analyzedFiles.toLocaleString() }} 个文件 · 命中 {{ ruleCount }} 条检测规则 · 未执行任何仓库代码
        </p>
      </div>
    </section>

    <section class="dims">
      <article v-for="d in report.dimensions" :key="d.dimension" class="card dim">
        <div class="dim-head">
          <h3>{{ d.label }}</h3>
          <span class="dim-score mono" :style="{ color: scoreTone(d) }">{{ d.score }}</span>
        </div>
        <div class="dim-bar">
          <span :style="{ width: Math.round((d.score / d.max) * 100) + '%', background: scoreTone(d) }"></span>
        </div>
        <p class="muted small">{{ dimSummary(d) }}</p>
      </article>
    </section>

    <section class="risks">
      <div class="risks-left">
        <h2>风险详情</h2>
        <div class="tabs" role="tablist">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            class="tab"
            :class="{ active: activeTab === tab.key }"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.key"
            @click="activeTab = tab.key"
          >
            {{ tab.label }} <b class="mono">{{ tabCounts[tab.key] }}</b>
          </button>
        </div>
        <FindingList :findings="shownFindings" open-first empty="该分类下未发现问题。" />
      </div>
      <div class="risks-right">
        <div class="card env">
          <h3>项目运行环境</h3>
          <dl>
            <div><dt>主要语言</dt><dd>{{ report.repo.language || '未识别' }}</dd></div>
            <div><dt>默认分支</dt><dd class="mono">{{ report.repo.defaultBranch }}</dd></div>
            <div><dt>Star 数</dt><dd class="mono">{{ report.repo.stars.toLocaleString() }}</dd></div>
            <div><dt>License</dt><dd>{{ report.repo.license || '未声明' }}</dd></div>
            <div><dt>已分析文件</dt><dd class="mono">{{ report.coverage.analyzedFiles }} / {{ report.coverage.selectedFiles }}</dd></div>
            <div><dt>检测规则</dt><dd class="mono">{{ report.ruleVersion }}</dd></div>
          </dl>
        </div>
        <div class="card limits">
          <h3>已知限制</h3>
          <ul>
            <li v-for="(item, i) in report.limitations" :key="i">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <AiAdvice :report="report" />

    <footer class="report-foot muted small">
      <span>体检结果仅代表静态分析发现，不替代完整的安全审计。</span>
      <span class="mono">报告 ID {{ reportId }}</span>
    </footer>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.crumb {
  margin: 0;
}

.crumb-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--muted);
  font-size: 12px;
}

.crumb-link:hover {
  color: var(--accent);
}

.head-main h1 {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.repo-link {
  display: inline-block;
  margin-top: 6px;
  font-size: 14px;
  color: var(--accent);
}

.meta {
  margin: 8px 0 0;
  color: var(--muted);
}

.meta .sep {
  margin: 0 6px;
  opacity: 0.5;
}

.meta .chip {
  margin-left: 8px;
}

.desc {
  margin: 6px 0 0;
}

.head-actions {
  display: flex;
  gap: 10px;
  flex: none;
}

.notice {
  margin: 16px 0 0;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 14px;
}

.banner {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--banner-line);
  border-left: 4px solid var(--warn);
  background: var(--p1-soft);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.banner strong {
  color: var(--warn);
}

.overview {
  display: grid;
  grid-template-columns: 354px 1fr;
  gap: 20px;
  margin-top: 24px;
  align-items: stretch;
}

.score-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding: 24px;
}

.result-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.result-card h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.result-card > p {
  margin: 8px 0 0;
  font-size: 14px;
}

.metrics {
  display: flex;
  margin-top: 20px;
  padding: 14px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.metric + .metric {
  border-left: 1px solid var(--line);
}

.metric b {
  font-size: 20px;
  font-weight: 600;
}

.metric .danger { color: var(--danger); }
.metric .warn { color: var(--warn); }
.metric .cyan { color: var(--cyan); }
.metric .ok { color: var(--ok); }

.result-card .foot {
  margin: auto 0 0;
  padding-top: 12px;
}

.dims {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.dim {
  padding: 18px;
}

.dim-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.dim-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.dim-score {
  font-size: 22px;
  font-weight: 600;
}

.dim-bar {
  height: 5px;
  margin-top: 10px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.dim-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.dim p {
  margin: 8px 0 0;
}

.risks {
  display: grid;
  grid-template-columns: 1fr 364px;
  gap: 20px;
  margin-top: 32px;
  align-items: start;
}

.risks-left h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 4px;
  margin: 14px 0 16px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  font-size: 14px;
  white-space: nowrap;
}

.tab b {
  font-weight: 500;
  font-size: 11px;
  color: var(--muted);
}

.tab:hover {
  color: var(--ink);
}

.tab.active {
  color: #93b4fd;
  border-bottom-color: var(--accent);
}

:root[data-theme='light'] .tab.active {
  color: var(--accent);
}

.tab.active b {
  color: var(--accent);
}

.risks-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.env,
.limits {
  padding: 20px;
}

.env h3,
.limits h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.env dl {
  margin: 14px 0 0;
  display: flex;
  flex-direction: column;
}

.env dl > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
}

.env dl > div + div {
  border-top: 1px solid var(--line);
}

.env dt {
  color: var(--muted);
  font-size: 12.5px;
}

.env dd {
  margin: 0;
  font-size: 14px;
}

.limits ul {
  margin: 12px 0 0;
  padding-left: 16px;
  color: var(--muted);
  font-size: 12.5px;
}

.limits li + li {
  margin-top: 5px;
}

.report-foot {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

@media (max-width: 1024px) {
  .overview,
  .risks {
    grid-template-columns: 1fr;
  }
  .dims {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .head,
  .head-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .dims {
    grid-template-columns: 1fr;
  }
  .metrics {
    flex-wrap: wrap;
  }
  .metric {
    flex: 1 0 40%;
  }
}
</style>
