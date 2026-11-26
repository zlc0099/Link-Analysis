<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AnalyzeProgress, AnalyzeStageName } from '../../core/analyze'

interface ScanLogLine {
  time: string
  level: 'INFO' | 'PASS' | 'WARN' | 'SCAN'
  message: string
}

const props = defineProps<{
  progress: AnalyzeProgress
  repo: string
  logs: ScanLogLine[]
}>()

defineEmits<{ (e: 'cancel'): void }>()

const STAGES: Array<{ key: AnalyzeStageName; label: string; note: string }> = [
  { key: 'resolving-repo', label: '拉取仓库', note: '仓库信息与可见性' },
  { key: 'resolving-commit', label: '识别项目结构', note: '默认分支与最新提交' },
  { key: 'loading-tree', label: '检查依赖与启动脚本', note: '获取完整文件树' },
  { key: 'fetching-files', label: '分析系统与路径兼容性', note: '拉取候选文件内容' },
  { key: 'analyzing', label: '扫描敏感信息', note: '执行全部检测规则' },
  { key: 'scoring', label: '生成体检报告', note: '汇总评分与修复建议' },
]

const STAGE_TITLE: Record<AnalyzeStageName, string> = {
  'resolving-repo': '正在拉取仓库信息',
  'resolving-commit': '正在识别项目结构',
  'loading-tree': '正在获取文件树',
  'fetching-files': '正在拉取文件内容',
  analyzing: '正在检测安全风险',
  scoring: '正在生成体检报告',
}

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
    return total === 0 ? 44 : Math.min(88, Math.round(38 + (fetched / total) * 50))
  }
  return base[props.progress.stage]
})

const fileNote = computed(() => {
  const { stage, fetched, total } = props.progress
  if (stage === 'fetching-files' && total) return `已扫描 ${fetched ?? 0} / ${total.toLocaleString()} 个文件`
  if (stage === 'loading-tree') return '正在获取完整文件树…'
  if (stage === 'analyzing') return '正在执行检测规则…'
  return '正在准备…'
})

function stateOf(index: number): 'done' | 'current' | 'pending' {
  if (index < currentIndex.value) return 'done'
  if (index === currentIndex.value) return 'current'
  return 'pending'
}

const elapsed = ref('00:00')
let timer: number | undefined

function tick() {
  const s = Math.floor((Date.now() - start) / 1000)
  elapsed.value = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

let start = Date.now()

onMounted(() => {
  start = Date.now()
  tick()
  timer = window.setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="scan">
    <section class="head">
      <div>
        <p class="crumb muted small">仓库体检 / 扫描进行中</p>
        <h1>正在了解你的仓库</h1>
        <p class="lede muted">自动检查每一处接入细节，分析期间无需保持操作。</p>
      </div>
      <button class="btn" type="button" @click="$emit('cancel')">取消扫描</button>
    </section>

    <section class="repo card">
      <span class="repo-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
        </svg>
      </span>
      <div class="repo-info">
        <strong class="mono">{{ repo }}</strong>
        <span class="muted small">公开仓库 · 只读访问</span>
      </div>
      <span class="chip chip-info">
        <i class="spin-dot" aria-hidden="true"></i>扫描中
      </span>
    </section>

    <section class="progress card">
      <div class="progress-head">
        <div>
          <strong>{{ STAGE_TITLE[progress.stage] }}</strong>
          <span class="muted small">{{ fileNote }}</span>
        </div>
        <span class="big mono">{{ percent }}<em>%</em></span>
      </div>
      <div class="bar" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: percent + '%' }"></span>
      </div>
      <div class="progress-foot muted small">
        <span>第 {{ currentIndex + 1 }} / 6 个阶段</span>
        <span>已用时 {{ elapsed }}</span>
      </div>
    </section>

    <div class="detail">
      <section class="steps card">
        <h2>检测流程</h2>
        <ol>
          <li v-for="(stage, i) in STAGES" :key="stage.key" :class="stateOf(i)">
            <span class="mark" aria-hidden="true">
              <svg v-if="stateOf(i) === 'done'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m5 12.5 4.5 4.5L19 8" />
              </svg>
              <i v-else-if="stateOf(i) === 'current'" class="spinner" aria-hidden="true"></i>
              <b v-else>{{ i + 1 }}</b>
            </span>
            <span class="step-text">
              <span class="step-label">{{ stage.label }}</span>
              <span class="step-note muted small">{{ stateOf(i) === 'current' ? '进行中…' : stage.note }}</span>
            </span>
          </li>
        </ol>
      </section>

      <section class="log card">
        <div class="log-head">
          <h2>扫描日志</h2>
          <span class="live"><i aria-hidden="true"></i>LIVE</span>
        </div>
        <div class="log-body mono small" aria-live="polite">
          <p v-for="(line, i) in logs" :key="i">
            <span class="t">{{ line.time }}</span>
            <span class="lv" :class="line.level.toLowerCase()">{{ line.level }}</span>
            <span class="msg">{{ line.message }}</span>
          </p>
          <span class="cursor" aria-hidden="true"></span>
        </div>
      </section>
    </div>

    <p class="safe muted small">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3 5 6v5.5c0 4.8 3 8.3 7 10.5 4-2.2 7-5.7 7-10.5V6l-7-3Z" />
      </svg>
      扫描仅访问公开仓库内容，不会执行项目脚本，也不会修改任何文件。
    </p>
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

h1 {
  margin: 6px 0 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.lede {
  margin: 8px 0 0;
  font-size: 14px;
}

.repo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 24px;
  padding: 18px 20px;
}

.repo-icon {
  width: 40px;
  height: 40px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--surface-deep);
  border: 1px solid var(--line);
  color: var(--accent);
}

.repo-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.repo-info strong {
  font-size: 15px;
  font-weight: 600;
}

.repo .chip {
  flex: none;
}

.spin-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.progress {
  margin-top: 16px;
  padding: 20px;
}

.progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.progress-head strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
}

.big {
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
  color: var(--accent);
}

.big em {
  font-style: normal;
  font-size: 15px;
  margin-left: 2px;
  color: var(--muted);
}

.bar {
  height: 6px;
  margin-top: 16px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.3s ease;
}

.progress-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.detail {
  display: grid;
  grid-template-columns: 354px 1fr;
  gap: 20px;
  margin-top: 20px;
  align-items: start;
}

.steps {
  padding: 20px;
}

.steps h2,
.log-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.steps ol {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.steps li {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}

.steps li + li {
  border-top: 1px solid var(--line);
}

.mark {
  width: 22px;
  height: 22px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 11px;
}

.pending .mark {
  border: 1px solid var(--line-strong);
  color: var(--muted);
}

.pending .mark b {
  font-weight: 500;
}

.done .mark {
  background: var(--ok-soft);
  color: var(--ok);
}

.current .mark {
  background: var(--accent-soft);
  color: var(--accent);
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
}

.pending .step-label {
  color: var(--muted);
}

.current .step-label {
  color: var(--accent);
}

.log {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 1px 10px;
  border-radius: 999px;
  background: var(--ok-soft);
  color: var(--ok);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.live i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  animation: pulse 1.2s ease-in-out infinite;
}

.log-body {
  margin-top: 14px;
  padding: 14px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--line);
  min-height: 300px;
  max-height: 380px;
  overflow-y: auto;
  line-height: 1.9;
}

.log-body p {
  margin: 0;
  display: flex;
  gap: 12px;
  overflow-wrap: anywhere;
}

.t {
  color: var(--muted);
  flex: none;
}

.lv {
  flex: none;
  font-weight: 600;
}

.lv.info { color: var(--muted); }
.lv.pass { color: var(--ok); }
.lv.warn { color: var(--warn); }
.lv.scan { color: var(--cyan); }

.cursor {
  display: inline-block;
  width: 7px;
  height: 14px;
  margin-top: 4px;
  background: var(--cyan);
  animation: pulse 1s steps(2) infinite;
}

.safe {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 0;
}

.safe svg {
  flex: none;
  color: var(--ok);
}

@media (max-width: 900px) {
  .detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .head {
    flex-direction: column;
  }
  .repo {
    flex-wrap: wrap;
  }
}
</style>
