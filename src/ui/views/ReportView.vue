<script setup lang="ts">
import { computed } from 'vue'
import type { Report } from '../../core/report/schema'
import ScoreSummary from '../components/ScoreSummary.vue'
import DimensionBars from '../components/DimensionBars.vue'
import FindingList from '../components/FindingList.vue'
import ScoreBreakdown from '../components/ScoreBreakdown.vue'

const props = defineProps<{ report: Report; notice?: string | null }>()
const emit = defineEmits<{
  (e: 'export'): void
  (e: 'back'): void
  (e: 'rerun'): void
}>()

const report = computed(() => props.report)

const major = computed(() => report.value.findings.filter((f) => f.severity === 'P0' || f.severity === 'P1'))
const minor = computed(() => report.value.findings.filter((f) => f.severity === 'P2' || f.severity === 'P3'))
const windows = computed(() => report.value.findings.filter((f) => f.ruleId === 'WIN-01'))
const pathFindings = computed(() =>
  report.value.findings.filter((f) => f.dimension === 'portability' && f.ruleId.startsWith('PATH-')),
)
const secretFindings = computed(() => report.value.findings.filter((f) => f.dimension === 'security'))
const incomplete = computed(
  () => report.value.coverage.treeTruncated || report.value.coverage.failedFiles.length > 0,
)

function fmtTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('zh-CN', { hour12: false })
}

const analyzedAt = computed(() => fmtTime(report.value.analyzedAt))
const commitDate = computed(() => fmtTime(report.value.commit.date))

const meta = computed(() => {
  const r = report.value.repo
  const parts = [r.language, r.stars ? `${r.stars} Star` : null, r.license]
  return parts.filter(Boolean).join(' · ') || '公开仓库'
})
</script>

<template>
  <div class="report container">
    <div class="toolbar">
      <button class="btn btn-ghost" type="button" @click="emit('back')">返回首页</button>
      <div class="toolbar-actions">
        <button class="btn" type="button" @click="emit('rerun')">重新体检</button>
        <button class="btn btn-primary" type="button" @click="emit('export')">导出 Markdown</button>
      </div>
    </div>

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

    <section class="repo">
      <div class="repo-title">
        <h1>
          <a :href="report.repo.htmlUrl" target="_blank" rel="noopener noreferrer">{{ report.repo.fullName }}</a>
        </h1>
        <span v-if="report.repo.archived" class="chip chip-p3">已归档</span>
      </div>
      <p v-if="report.repo.description" class="desc">{{ report.repo.description }}</p>
      <dl class="repo-meta">
        <div><dt>默认分支</dt><dd class="mono">{{ report.repo.defaultBranch }} @ {{ report.commit.shortSha }}</dd></div>
        <div><dt>最近提交</dt><dd class="mono">{{ commitDate }}</dd></div>
        <div><dt>分析时间</dt><dd>{{ analyzedAt }}</dd></div>
        <div><dt>仓库信息</dt><dd>{{ meta }}</dd></div>
      </dl>
      <p class="commit muted small mono">commit {{ report.commit.message || '（无提交信息）' }}</p>
    </section>

    <section class="score card">
      <div class="score-left">
        <ScoreSummary
          :score="report.score.official"
          :raw="report.score.raw"
          :grade="report.score.grade"
          :capped="report.score.capped"
        />
        <p class="verdict">{{ report.score.verdict }}</p>
      </div>
      <div class="score-right">
        <DimensionBars :dimensions="report.dimensions" />
        <p class="coverage mono small">
          覆盖：{{ report.coverage.analyzedFiles }} / {{ report.coverage.selectedFiles }}（候选
          {{ report.coverage.eligibleFiles }}） · 跳过二进制 {{ report.coverage.skippedBinary }} ·
          超限 {{ report.coverage.skippedLarge }}
        </p>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>主要风险</h2>
        <span class="muted small">P0 红线 / P1 高</span>
      </div>
      <FindingList :findings="major" empty="未发现 P0 / P1 风险。" />
    </section>

    <section v-if="minor.length" class="section">
      <div class="section-head">
        <h2>次要问题</h2>
        <span class="muted small">P2 中 / P3 低</span>
      </div>
      <details class="fold">
        <summary>展开 {{ minor.length }} 条次要问题</summary>
        <div class="fold-body">
          <FindingList :findings="minor" />
        </div>
      </details>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>系统兼容性</h2>
        <span class="muted small">脚本仅提示，路径计分</span>
      </div>
      <h3 class="sub">Windows 专用脚本 <span class="chip chip-info">信息项，不计分</span></h3>
      <FindingList :findings="windows" empty="未发现 .bat / .cmd / .ps1 / .vbs 脚本。" />
      <h3 class="sub">硬编码路径</h3>
      <FindingList :findings="pathFindings" empty="未发现盘符、用户目录、file:// 或 UNC 路径。" />
    </section>

    <section class="section">
      <div class="section-head">
        <h2>安全风险</h2>
        <span class="muted small">全部脱敏，不提供完整值</span>
      </div>
      <FindingList :findings="secretFindings" empty="未发现私钥、.env、密钥或凭证文件。" />
    </section>

    <section class="section">
      <div class="section-head">
        <h2>检查明细</h2>
        <span class="muted small">每条失分可回溯到规则 ID</span>
      </div>
      <ScoreBreakdown :dimensions="report.dimensions" />
    </section>

    <section class="section">
      <div class="section-head">
        <h2>已知限制</h2>
      </div>
      <ul class="limits">
        <li v-for="(item, i) in report.limitations" :key="i">{{ item }}</li>
      </ul>
    </section>

    <div class="bottom-actions">
      <button class="btn" type="button" @click="emit('rerun')">重新体检</button>
      <button class="btn btn-primary" type="button" @click="emit('export')">导出 Markdown</button>
    </div>
  </div>
</template>

<style scoped>
.report {
  padding-top: 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.notice {
  margin: 0 0 14px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 13px;
}

.banner {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid var(--banner-line);
  border-left: 4px solid var(--p1);
  background: var(--p1-soft);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.banner strong {
  color: var(--p1);
}

.repo {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.repo-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.repo-title h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  font-family: var(--mono);
  font-weight: 600;
}

.desc {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.repo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 32px;
  margin: 12px 0 0;
}

.repo-meta dt {
  font-size: 12px;
  color: var(--muted);
}

.repo-meta dd {
  margin: 0;
  font-size: 13px;
}

.commit {
  margin: 10px 0 0;
}

.score {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
  margin-top: 24px;
  padding: 24px;
}

.score-left {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.verdict {
  margin: 0;
  font-size: 13px;
  color: var(--ink-soft);
}

.score-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.coverage {
  margin: 0;
  color: var(--muted);
}

.section {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.sub .chip {
  font-weight: 500;
}

.fold summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--accent);
  padding: 2px 0;
}

.fold-body {
  margin-top: 10px;
}

.limits {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 13px;
}

.limits li + li {
  margin-top: 4px;
}

.bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 28px 0 10px;
}

@media (max-width: 860px) {
  .score {
    grid-template-columns: 1fr;
  }
  .score-right {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .toolbar,
  .toolbar-actions,
  .bottom-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .bottom-actions {
    justify-content: stretch;
  }
}
</style>
