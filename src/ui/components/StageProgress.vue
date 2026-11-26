<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyzeProgress, AnalyzeStageName } from '../../core/analyze'

const props = defineProps<{ progress: AnalyzeProgress; repo: string }>()
defineEmits<{ (e: 'cancel'): void }>()

const STAGES: Array<{ key: AnalyzeStageName; label: string }> = [
  { key: 'resolving-repo', label: '读取仓库信息' },
  { key: 'resolving-commit', label: '获取最新提交' },
  { key: 'loading-tree', label: '获取文件树' },
  { key: 'fetching-files', label: '拉取文件内容' },
  { key: 'analyzing', label: '运行检查规则' },
  { key: 'scoring', label: '生成报告' },
]

const currentIndex = computed(() => STAGES.findIndex((s) => s.key === props.progress.stage))

const percent = computed(() => {
  const base: Record<AnalyzeStageName, number> = {
    'resolving-repo': 6,
    'resolving-commit': 16,
    'loading-tree': 28,
    'fetching-files': 38,
    analyzing: 90,
    scoring: 96,
  }
  if (props.progress.stage === 'fetching-files') {
    const total = props.progress.total ?? 0
    const fetched = props.progress.fetched ?? 0
    return total === 0 ? 44 : Math.round(38 + (fetched / total) * 50)
  }
  return base[props.progress.stage]
})

const label = computed(() => {
  const stage = STAGES[currentIndex.value]
  if (props.progress.stage === 'fetching-files' && props.progress.total !== undefined) {
    return `拉取文件内容 ${props.progress.fetched ?? 0} / ${props.progress.total}`
  }
  return stage?.label ?? '分析中'
})

function stateOf(index: number): 'done' | 'current' | 'pending' {
  if (index < currentIndex.value) return 'done'
  if (index === currentIndex.value) return 'current'
  return 'pending'
}
</script>

<template>
  <section class="stage container" aria-live="polite">
    <div class="card panel">
      <p class="repo mono">{{ repo }}</p>
      <h1>{{ label }}</h1>
      <div class="bar" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: percent + '%' }"></span>
      </div>
      <ol class="steps">
        <li v-for="(stage, i) in STAGES" :key="stage.key" :class="stateOf(i)">
          <i aria-hidden="true"></i>
          <span>{{ stage.label }}</span>
        </li>
      </ol>
      <div class="foot">
        <span class="muted small">只读拉取，分析在浏览器内完成。</span>
        <button class="btn" type="button" @click="$emit('cancel')">取消</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage {
  padding-top: 48px;
  max-width: 680px;
}

.panel {
  padding: 22px 24px;
}

.repo {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

h1 {
  margin: 8px 0 18px;
  font-size: 22px;
  letter-spacing: -0.01em;
}

.bar {
  height: 6px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px 18px;
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  font-size: 13px;
  color: var(--muted);
}

.steps li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.steps i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line-strong);
  display: inline-block;
}

.steps .done {
  color: var(--ink-soft);
}

.steps .done i {
  background: var(--accent);
}

.steps .current {
  color: var(--ink);
  font-weight: 600;
}

.steps .current i {
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

@media (max-width: 640px) {
  .stage {
    padding-top: 28px;
  }
  .steps {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
