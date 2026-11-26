<script setup lang="ts">
import { computed } from 'vue'
import type { Report } from '../../core/report/schema'
import ScoreRing from '../components/ScoreRing.vue'
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

const analyzedAt = computed(() => {
  const d = new Date(report.value.analyzedAt)
  if (Number.isNaN(d.getTime())) return report.value.analyzedAt
  return d.toLocaleString('zh-CN', { hour12: false })
})

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

    <header class="repo card">
      <div class="repo-main">
        <h1>
          <a :href="report.repo.htmlUrl" target="_blank" rel="noopener noreferrer">{{ report.repo.fullName }}</a>
        </h1>
        <p v-if="report.repo.description" class="desc">{{ report.repo.description }}</p>
        <p class="meta mono">
          {{ report.repo.defaultBranch }} @ {{ report.commit.shortSha }} · 分析于 {{ analyzedAt }}
        </p>
        <p class="meta muted">
          {{ meta }} · commit {{ report.commit.message || '（无提交信息）' }}
        </p>
      </div>
      <span v-if="report.repo.archived" class="chip chip-p3 archived">已归档</span>
    </header>

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

    <section class="score card">
      <ScoreRing
        :score="report.score.official"
        :raw="report.score.raw"
        :grade="report.score.grade"
        :capped="report.score.capped"
      />
      <div class="score-right">
        <DimensionBars :dimensions="report.dimensions" />
        <p class="verdict">{{ report.score.verdict }}</p>
        <p class="coverage mono small">
          覆盖：{{ report.coverage.analyzedFiles }} / {{ report.coverage.selectedFiles }}（候选
          {{ report.coverage.eligibleFiles }}） · 跳过二进制 {{ report.coverage.skippedBinary }} ·
          超限 {{ report.coverage.skippedLarge }}
        </p>
      </div>
    </section>

    <section class="block card">
      <div class="block-head">
        <h2>主要风险</h2>
        <span class="muted small">P0 红线 / P1 高</span>
      </div>
      <FindingList :findings="major" empty="未发现 P0 / P1 风险。" />
    </section>

    <section v-if="minor.length" class="block card">
      <div class="block-head">
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

    <section class="block card">
      <div class="block-head">
        <h2>评分明细</h2>
        <span class="muted small">每条失分可回溯到规则 ID</span>
      </div>
      <ScoreBreakdown :dimensions="report.dimensions" />
    </section>

    <section class="block card">
      <div class="block-head">
        <h2>Windows 专用脚本</h2>
        <span class="chip chip-info">信息项，不计分</span>
      </div>
      <FindingList :findings="windows" empty="未发现 .bat / .cmd / .ps1 / .vbs 脚本。" />
    </section>

    <section class="block card">
      <div class="block-head">
        <h2>硬编码路径</h2>
        <span class="muted small">源码 / 配置计分，文档与脚本仅提示</span>
      </div>
      <FindingList :findings="pathFindings" empty="未发现盘符、用户目录、file:// 或 UNC 路径。" />
    </section>

    <section class="block card">
      <div class="block-head">
        <h2>密钥与敏感信息</h2>
        <span class="muted small">全部脱敏，不提供完整值</span>
      </div>
      <FindingList :findings="secretFindings" empty="未发现私钥、.env、密钥或凭证文件。" />
    </section>

    <section class="block card">
      <div class="block-head">
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
  padding-top: 24px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.repo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
}

.repo-main h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.01em;
  font-family: var(--mono);
}

.desc {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.meta {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ink-soft);
}

.archived {
  flex: none;
}

.notice {
  margin: 14px 0 0;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 13px;
}

.banner {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 14px;
  padding: 12px 16px;
  border: 1px solid #f0d9b5;
  border-left: 4px solid var(--p1);
  background: var(--p1-soft);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--ink-soft);
}

.banner strong {
  color: var(--p1);
}

.score {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 24px;
  align-items: center;
  margin-top: 16px;
  padding: 24px;
}

.score-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verdict {
  margin: 4px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 14px;
  color: var(--ink-soft);
}

.coverage {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.block {
  margin-top: 16px;
  padding: 22px;
}

.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.block-head h2 {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.fold summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--accent);
  padding: 4px 0;
}

.fold-body {
  margin-top: 12px;
}

.limits {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 13px;
}

.limits li + li {
  margin-top: 6px;
}

.bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 26px 0 10px;
}

@media (max-width: 860px) {
  .score {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .score-right {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .toolbar,
  .repo {
    flex-direction: column;
    align-items: stretch;
  }
  .toolbar-actions {
    justify-content: flex-end;
  }
  .toolbar-actions .btn,
  .bottom-actions .btn {
    flex: 1;
  }
}
</style>
