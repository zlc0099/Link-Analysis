<script setup lang="ts">
import type { Finding } from '../../core/rules/types'

defineProps<{ findings: Finding[]; empty?: string }>()

const SEV_LABEL: Record<string, string> = { P0: 'P0 红线', P1: 'P1 高', P2: 'P2 中', P3: 'P3 低', INFO: '信息' }
const CONF_LABEL: Record<string, string> = { high: '置信度高', medium: '置信度中', low: '待确认' }

function chipClass(sev: string): string {
  if (sev === 'P0') return 'chip chip-p0'
  if (sev === 'P1') return 'chip chip-p1'
  if (sev === 'P2') return 'chip chip-p2'
  if (sev === 'P3') return 'chip chip-p3'
  return 'chip chip-info'
}
</script>

<template>
  <div v-if="findings.length" class="list">
    <article v-for="f in findings" :key="f.id" class="finding">
      <header class="head">
        <span :class="chipClass(f.severity)">{{ SEV_LABEL[f.severity] ?? f.severity }}</span>
        <h3>{{ f.title }}</h3>
        <span class="rule mono">{{ f.ruleId }}</span>
      </header>
      <p class="loc small">
        <template v-if="f.file">
          <a v-if="f.permalink" :href="f.permalink" target="_blank" rel="noopener noreferrer" class="mono">
            {{ f.file }}{{ f.line ? ':' + f.line : '' }}
          </a>
          <span v-else class="mono">{{ f.file }}{{ f.line ? ':' + f.line : '' }}</span>
        </template>
        <span v-else class="muted">仓库级</span>
        <span class="conf">{{ CONF_LABEL[f.confidence] ?? '' }}</span>
      </p>
      <code v-if="f.evidence" class="evidence mono">{{ f.evidence }}</code>
      <div class="notes">
        <p v-if="f.impact"><b>影响</b>{{ f.impact }}</p>
        <p v-if="f.suggestion"><b>建议</b>{{ f.suggestion }}</p>
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
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
}

.rule {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
}

.loc {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 0;
  flex-wrap: wrap;
}

.loc a {
  color: var(--accent);
}

.conf {
  color: var(--muted);
  font-size: 11px;
}

.evidence {
  display: block;
  margin-top: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
}

.notes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 18px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--muted);
}

.notes p {
  margin: 0;
}

.notes b {
  margin-right: 6px;
  color: var(--ink-soft);
  font-weight: 600;
}

.empty {
  margin: 0;
}

@media (max-width: 720px) {
  .notes {
    grid-template-columns: 1fr;
  }
}
</style>
