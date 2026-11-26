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
  if (props.grade === 'C') return 'var(--p2)'
  return 'var(--p0)'
})
</script>

<template>
  <div class="score-ring">
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
        <strong class="mono">{{ score }}</strong>
        <span class="of">/ 100</span>
      </div>
    </div>
    <div class="caption">
      <span class="grade" :style="{ background: tone }">{{ grade }}</span>
      <span class="label">接入就绪度</span>
      <span v-if="capped" class="capped">原始分 {{ raw }} · 触发红线封顶</span>
    </div>
  </div>
</template>

<style scoped>
.score-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.ring {
  position: relative;
  width: 150px;
  height: 150px;
}

svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

circle {
  fill: none;
  stroke-width: 10;
}

.track {
  stroke: var(--line);
}

.value {
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.center strong {
  font-size: 44px;
  letter-spacing: -0.03em;
  font-weight: 650;
}

.of {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  font-family: var(--mono);
}

.caption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.grade {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: #fff;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 14px;
}

.label {
  font-size: 13px;
  color: var(--muted);
}

.capped {
  font-size: 12px;
  color: var(--p0);
}
</style>
