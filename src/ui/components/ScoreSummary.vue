<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
  raw: number
  grade: string
  capped: boolean
}>()

const R = 52
const C = 2 * Math.PI * R

const offset = computed(() => C * (1 - Math.min(props.score, 100) / 100))

const tone = computed(() => {
  if (props.grade === 'A') return 'var(--ok)'
  if (props.grade === 'B') return 'var(--accent)'
  if (props.grade === 'C') return 'var(--p1)'
  return 'var(--p0)'
})

const gradeLabel = computed(() => {
  const map: Record<string, string> = {
    A: '已可接入',
    B: '基本就绪',
    C: '需改进后接入',
    D: '不建议接入',
  }
  return map[props.grade] ?? props.grade
})
</script>

<template>
  <div class="summary">
    <div class="ring">
      <svg viewBox="0 0 128 128" role="img" :aria-label="`接入就绪度 ${score} 分，等级 ${grade}`">
        <circle cx="64" cy="64" :r="R" class="track" />
        <circle
          cx="64"
          cy="64"
          :r="R"
          class="value"
          :style="{ stroke: tone, strokeDasharray: C, strokeDashoffset: offset }"
        />
      </svg>
      <div class="center">
        <strong class="mono" :style="{ color: tone }">{{ score }}</strong>
        <span class="of mono">/ 100</span>
      </div>
    </div>
    <div class="text">
      <span class="grade" :style="{ color: tone, borderColor: tone }">{{ grade }} · {{ gradeLabel }}</span>
      <span class="title">接入就绪度</span>
      <span v-if="capped" class="capped">原始分 {{ raw }} · 触发 P0 红线封顶</span>
    </div>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  align-items: center;
  gap: 20px;
}

.ring {
  position: relative;
  width: 128px;
  height: 128px;
  flex: none;
}

svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

circle {
  fill: none;
  stroke-width: 9;
}

.track {
  stroke: var(--line);
}

.value {
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
}

.center strong {
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.of {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.grade {
  padding: 1px 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.capped {
  font-size: 12px;
  color: var(--p0);
}
</style>
