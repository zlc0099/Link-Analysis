<script setup lang="ts">
import type { DimensionScore } from '../../core/report/schema'

defineProps<{ dimensions: DimensionScore[] }>()

function width(score: number, max: number): string {
  return `${Math.round((score / max) * 100)}%`
}
</script>

<template>
  <div class="bars">
    <div v-for="d in dimensions" :key="d.dimension" class="row">
      <div class="row-head">
        <span class="name">{{ d.label }}</span>
        <span class="value mono">{{ d.score }}<span class="max"> / {{ d.max }}</span></span>
      </div>
      <div class="track">
        <span :style="{ width: width(d.score, d.max) }"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 13px;
}

.name {
  color: var(--ink-soft);
}

.value {
  font-weight: 600;
}

.max {
  color: var(--muted);
  font-weight: 400;
}

.track {
  height: 7px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.track span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.5s ease;
}
</style>
