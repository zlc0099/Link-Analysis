<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Finding } from '../../core/rules/types'

const props = defineProps<{
  findings: Finding[]
  empty?: string
  openFirst?: boolean
}>()

const SEV_LABEL: Record<string, string> = { P0: '高风险', P1: '高风险', P2: '中风险', P3: '低风险', INFO: '信息' }
const SEV_CLASS: Record<string, string> = { P0: 'p0', P1: 'p0', P2: 'p1', P3: 'p3', INFO: 'info' }
const CONF_LABEL: Record<string, string> = { high: '高', medium: '中', low: '待确认' }

const openSet = ref<Set<string>>(new Set())

watch(
  () => props.findings,
  (list) => {
    openSet.value = new Set(props.openFirst && list.length ? [list[0].id] : [])
  },
  { immediate: true },
)

function toggle(f: Finding) {
  const next = new Set(openSet.value)
  if (next.has(f.id)) next.delete(f.id)
  else next.add(f.id)
  openSet.value = next
}
</script>

<template>
  <div v-if="findings.length" class="list">
    <article v-for="(f, i) in findings" :key="f.id" class="finding" :class="'sev-' + (SEV_CLASS[f.severity] ?? 'info')">
      <button class="head" type="button" :aria-expanded="openSet.has(f.id)" @click="toggle(f)">
        <span class="chip" :class="'chip-' + (SEV_CLASS[f.severity] ?? 'info')">{{ SEV_LABEL[f.severity] ?? f.severity }}</span>
        <span class="title">{{ f.title }}</span>
        <svg
          class="arrow"
          :class="{ up: openSet.has(f.id) }"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div v-if="openSet.has(f.id)" class="body">
        <p class="loc small">
          <template v-if="f.file">
            <a v-if="f.permalink" :href="f.permalink" target="_blank" rel="noopener noreferrer" class="mono file-link">
              {{ f.file }}{{ f.line ? ':' + f.line : '' }}
            </a>
            <span v-else class="mono">{{ f.file }}{{ f.line ? ':' + f.line : '' }}</span>
          </template>
          <span v-else class="muted">仓库级</span>
          <span class="conf">规则 {{ f.ruleId }} · 置信度：{{ CONF_LABEL[f.confidence] ?? '低' }} · 敏感值已脱敏</span>
        </p>
        <div v-if="f.evidence" class="code">
          <div class="code-head mono small">
            <span>{{ f.file || 'evidence' }}</span>
          </div>
          <div class="code-line mono">
            <span class="ln">{{ f.line || '·' }}</span>
            <span class="code-text">{{ f.evidence }}</span>
          </div>
        </div>
        <p v-if="f.impact" class="note"><b>影响</b>{{ f.impact }}</p>
        <p v-if="f.suggestion" class="note"><b>修复建议</b>{{ f.suggestion }}</p>
        <a v-if="f.permalink" class="guide" :href="f.permalink" target="_blank" rel="noopener noreferrer">在 GitHub 查看源文件 ↗</a>
      </div>
    </article>
  </div>
  <p v-else class="empty muted small">{{ empty ?? '没有需要展示的条目。' }}</p>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.finding {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  overflow: hidden;
}

.finding.sev-p0 {
  border-left: 3px solid var(--danger);
}

.finding.sev-p1 {
  border-left: 3px solid var(--warn);
}

.finding.sev-info {
  border-left: 3px solid var(--cyan);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  text-align: left;
}

.title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
}

.arrow {
  flex: none;
  color: var(--muted);
  transition: transform var(--duration-fast) ease;
}

.arrow.up {
  transform: rotate(180deg);
}

.body {
  padding: 0 16px 14px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin-top: 0;
}

.loc {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  flex-wrap: wrap;
}

.file-link {
  color: var(--accent);
}

.conf {
  color: var(--muted);
  font-size: 11px;
}

.code {
  margin-top: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}

.code-head {
  display: flex;
  justify-content: space-between;
  padding: 7px 12px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-deep);
  color: var(--muted);
}

.code-line {
  display: flex;
  gap: 12px;
  padding: 9px 12px;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
}

.code-line .ln {
  flex: none;
  width: 24px;
  text-align: right;
  color: var(--muted);
  user-select: none;
}

.sev-p0 .code-line {
  background: rgba(239, 68, 68, 0.07);
}

.code-text {
  white-space: pre;
  color: var(--ink-soft);
}

.note {
  margin: 10px 0 0;
  font-size: 14px;
  color: var(--ink-soft);
}

.note b {
  margin-right: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 0 5px;
}

.guide {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  color: var(--accent);
}

.empty {
  margin: 0;
  padding: 16px;
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
}
</style>
