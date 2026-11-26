<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'
import TokenPanel from './components/TokenPanel.vue'
import HomeView from './views/HomeView.vue'
import StageProgress from './components/StageProgress.vue'
import ReportView from './views/ReportView.vue'
import RulesView from './views/RulesView.vue'
import AboutView from './views/AboutView.vue'
import { parseRepoUrl } from '../core/github/parseUrl'
import { analyzeRepo, type AnalyzeProgress, type AnalyzeStageName } from '../core/analyze'
import { GithubError } from '../core/github/client'
import type { Report } from '../core/report/schema'
import { buildMarkdown, exportFileName } from '../core/report/markdown'
import { readCachedAdvice } from '../core/ai/cache'

type Phase = 'idle' | 'loading' | 'done'
type View = 'checkup' | 'rules' | 'about'

interface UiError {
  code: string
  message: string
  resetAt?: number
}

interface ScanLogLine {
  time: string
  level: 'INFO' | 'PASS' | 'WARN' | 'SCAN'
  message: string
}

const TOKEN_KEY = 'link-analysis.token'
const THEME_KEY = 'link-analysis.theme'

const phase = ref<Phase>('idle')
const input = ref('')
const error = ref<UiError | null>(null)
const progress = ref<AnalyzeProgress>({ stage: 'resolving-repo' })
const report = ref<Report | null>(null)
const token = ref('')
const tokenOpen = ref(false)
const activeRepo = ref('')
const linkNotice = ref<string | null>(null)
const activeView = ref<View>('checkup')
const logs = ref<ScanLogLine[]>([])
const durationMs = ref(0)

let controller: AbortController | null = null
let startedAt = 0
let lastStage: AnalyzeStageName | null = null

const hasToken = computed(() => token.value.length > 0)
const dark = ref(true)
const busy = computed(() => phase.value === 'loading')

const pageName = computed(() => {
  if (activeView.value === 'rules') return '检测规则'
  if (activeView.value === 'about') return '关于项目'
  if (phase.value === 'loading') return '仓库扫描'
  if (phase.value === 'done') return '体检报告'
  return '仓库体检'
})

function applyTheme(isDark: boolean) {
  dark.value = isDark
  if (isDark) delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = 'light'
  try {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  } catch {
    /* 隐私模式下仅本次会话可用 */
  }
}

function toggleTheme() {
  applyTheme(!dark.value)
}

function switchView(view: View) {
  if (phase.value === 'loading' && view !== 'checkup') return
  activeView.value = view
}

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveToken(value: string) {
  token.value = value.trim()
  try {
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* 隐私模式下仅本次会话可用 */
  }
}

function elapsedLabel(): string {
  const s = Math.max(0, Math.round((performance.now() - startedAt) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function log(level: ScanLogLine['level'], message: string) {
  logs.value.push({ time: elapsedLabel(), level, message })
}

const STAGE_LOG: Record<AnalyzeStageName, { start: string; done: string }> = {
  'resolving-repo': { start: 'INFO 拉取仓库信息', done: 'PASS 仓库信息获取成功' },
  'resolving-commit': { start: 'INFO 获取默认分支最新提交', done: 'PASS 最新提交获取成功' },
  'loading-tree': { start: 'INFO 获取仓库文件树', done: 'PASS 文件树获取成功' },
  'fetching-files': { start: 'SCAN 开始拉取文件内容', done: 'PASS 文件内容拉取完成' },
  analyzing: { start: 'SCAN 运行检测规则', done: 'PASS 检测规则执行完成' },
  scoring: { start: 'INFO 生成体检报告', done: 'PASS 体检报告生成完成' },
}

function handleStage(p: AnalyzeProgress) {
  const prev = lastStage
  if (prev && prev !== p.stage) {
    log('PASS', STAGE_LOG[prev].done.replace(/^PASS /, ''))
  }
  if (p.stage !== lastStage) {
    const meta = STAGE_LOG[p.stage]
    const level = meta.start.startsWith('SCAN') ? 'SCAN' : 'INFO'
    const msg = meta.start.replace(/^(INFO|SCAN) /, '')
    if (p.stage === 'fetching-files' && p.total) {
      log(level, `拉取文件内容 0 / ${p.total}`)
    } else if (p.stage === 'resolving-commit' && activeRepo.value) {
      log(level, `获取 ${activeRepo.value} 最新提交`)
    } else {
      log(level, msg)
    }
    lastStage = p.stage
  }
  if (p.stage === 'fetching-files' && p.total && (p.fetched ?? 0) > 0 && (p.fetched ?? 0) % 50 === 0) {
    log('SCAN', `已拉取 ${p.fetched} / ${p.total} 个文件`)
  }
  progress.value = p
}

function rateLimitHint(resetAt?: number): string {
  if (!resetAt) return '请稍后重试，或在右上角配置 GitHub Token 提升额度。'
  const time = new Date(resetAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return `额度将在 ${time} 左右重置，也可以配置 GitHub Token 继续。`
}

function messageOf(err: unknown): UiError {
  if (err instanceof GithubError) {
    const extra =
      err.code === 'rate-limit'
        ? rateLimitHint(err.resetAt)
        : err.code === 'not-found'
          ? '请确认仓库拼写，或该仓库是否为公开仓库。'
          : err.code === 'unauthorized'
            ? '请检查 Token 是否过期或权限不足。'
            : err.code === 'network'
              ? '请检查网络连接后重试。'
              : ''
    return {
      code: err.code === 'empty' ? 'repo-empty' : err.code,
      message: extra ? `${err.message}。${extra}` : err.message,
      resetAt: err.resetAt,
    }
  }
  return { code: 'unknown', message: '分析失败，请稍后重试。' }
}

async function run(raw: string) {
  const parsed = parseRepoUrl(raw)
  if (!parsed.ok) {
    error.value = { code: parsed.code, message: parsed.message }
    phase.value = 'idle'
    activeView.value = 'checkup'
    return
  }
  input.value = raw
  linkNotice.value = parsed.normalized
    ? '输入包含文件或目录路径，已按仓库根与默认分支分析。'
    : null
  controller?.abort()
  controller = new AbortController()
  phase.value = 'loading'
  error.value = null
  report.value = null
  activeRepo.value = `${parsed.owner}/${parsed.repo}`
  progress.value = { stage: 'resolving-repo' }
  activeView.value = 'checkup'
  logs.value = []
  durationMs.value = 0
  startedAt = performance.now()
  lastStage = null
  log('INFO', `开始扫描 github.com/${parsed.owner}/${parsed.repo}`)

  try {
    const result = await analyzeRepo(parsed.owner, parsed.repo, {
      token: token.value || null,
      signal: controller.signal,
      onStage: handleStage,
    })
    durationMs.value = Math.round(performance.now() - startedAt)
    log('PASS', `体检报告生成完成 · 总分 ${result.score.official}`)
    report.value = result
    phase.value = 'done'
    try {
      history.replaceState(null, '', `?repo=${parsed.owner}/${parsed.repo}`)
    } catch {
      /* ignore */
    }
  } catch (err) {
    if (err instanceof GithubError && err.code === 'cancelled') {
      phase.value = 'idle'
      return
    }
    if (err instanceof GithubError) {
      log('WARN', `${err.message}（${err.code}）`)
    }
    error.value = messageOf(err)
    phase.value = 'idle'
  }
}

function cancel() {
  controller?.abort()
  phase.value = 'idle'
}

function backHome() {
  phase.value = 'idle'
  report.value = null
  error.value = null
  linkNotice.value = null
  progress.value = { stage: 'resolving-repo' }
  activeView.value = 'checkup'
  try {
    history.replaceState(null, '', location.pathname)
  } catch {
    /* ignore */
  }
}

function downloadMarkdown() {
  if (!report.value) return
  const md = buildMarkdown(report.value, readCachedAdvice(report.value))
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName(report.value)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

onMounted(() => {
  token.value = readToken()
  dark.value = document.documentElement.dataset.theme !== 'light'
  const repo = new URLSearchParams(location.search).get('repo')
  if (repo) {
    input.value = repo
    void run(repo)
  }
})
</script>

<template>
  <div class="shell">
    <Sidebar :active="activeView" :busy="busy" @navigate="switchView" />
    <div class="shell-main">
      <TopBar
        :page="pageName"
        :has-token="hasToken"
        :dark="dark"
        @toggle-token="tokenOpen = !tokenOpen"
        @toggle-theme="toggleTheme"
      />
      <TokenPanel
        v-if="tokenOpen"
        :token="token"
        @save="saveToken"
        @clear="saveToken('')"
        @close="tokenOpen = false"
      />

      <main class="main">
        <template v-if="activeView === 'checkup'">
          <StageProgress
            v-if="phase === 'loading'"
            :progress="progress"
            :repo="activeRepo"
            :logs="logs"
            @cancel="cancel"
          />
          <ReportView
            v-else-if="phase === 'done' && report"
            :report="report"
            :notice="linkNotice"
            :duration-ms="durationMs"
            @export="downloadMarkdown"
            @back="backHome"
            @rerun="run(activeRepo)"
          />
          <HomeView
            v-else
            v-model="input"
            :error="error"
            @submit="run"
            @pick="run"
          />
        </template>
        <RulesView v-else-if="activeView === 'rules'" />
        <AboutView v-else />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.shell-main {
  margin-left: 224px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  width: min(1136px, calc(100% - 80px));
  margin: 0 auto;
  padding: 32px 0 64px;
}

@media (max-width: 1024px) {
  .shell-main {
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .main {
    width: calc(100% - 40px);
  }
}
</style>
