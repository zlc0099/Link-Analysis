<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
  raw: number
  grade: string
  capped: boolean
}>()

const tone = computed(() => {
  if (props.grade === 'A') return 'var(--ok)'
  if (props.grade === 'B') return 'var(--accent)'
  if (props.grade === 'C') return 'var(--p1)'
  return 'var(--p0)'
})

const barTone = computed(() => {
  if (props.grade === 'A') return 'var(--ok-bright)'
  if (props.grade === 'B') return 'var(--accent)'
  if (props.grade === 'C') return 'var(--p1-bright)'
  return 'var(--p0-bright)'
})

const gradeLabel = computed(() => {
  const map: Record<string, string> = { A: '就绪', B: '基本就绪', C: '需整改', D: '不建议接入' }
  return map[props.grade] ?? props.grade
})
</script>

<template>
  <div class="summary">
    <div class="num-row">
      <span class="num mono" :style="{ color: tone }">{{ score }}</span>
      <span class="max mono">/ 100</span>
      <span class="grade" :style="{ color: tone, borderColor: tone }">{{ grade }} · {{ gradeLabel }}</span>
    </div>
    <div class="track">
      <span :style="{ width: Math.min(score, 100) + '%', background: barTone }"></span>
    </div>
    <span v-if="capped" class="capped">原始分 {{ raw }} · 触发 P0 红线封顶</span>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.num-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.num {
  font-size: 40px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.max {
  font-size: 13px;
  color: var(--muted);
}

.grade {
  margin-left: auto;
  padding: 1px 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.track {
  height: 6px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.track span {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.capped {
  font-size: 12px;
  color: var(--p0);
}
</style>
