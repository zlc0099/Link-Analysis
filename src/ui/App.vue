<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TopBar from './components/TopBar.vue'
import TokenPanel from './components/TokenPanel.vue'
import HomeView from './views/HomeView.vue'
import StageProgress from './components/StageProgress.vue'
import ReportView from './views/ReportView.vue'
import { parseRepoUrl } from '../core/github/parseUrl'
import { analyzeRepo, type AnalyzeProgress } from '../core/analyze'
import { GithubError } from '../core/github/client'
import type { Report } from '../core/report/schema'
import { buildMarkdown, exportFileName } from '../core/report/markdown'

type Phase = 'idle' | 'loading' | 'done'

interface UiError {
  code: string
  message: string
  resetAt?: number
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
const dark = ref(false)

let controller: AbortController | null = null

const hasToken = computed(() => token.value.length > 0)

function applyTheme(isDark: boolean) {
  dark.value = isDark
  if (isDark) document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  try {
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  } catch {
    /* 隐私模式下仅本次会话可用 */
  }
}

function toggleTheme() {
  applyTheme(!dark.value)
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

  try {
    const result = await analyzeRepo(parsed.owner, parsed.repo, {
      token: token.value || null,
      signal: controller.signal,
      onStage: (p) => {
        progress.value = p
      },
    })
    report.value = result
    phase.value = 'done'
    try {
      history.replaceState(null, '', `?repo=${parsed.owner}/${parsed.repo}`)
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    if (err instanceof GithubError && err.code === 'cancelled') {
      phase.value = 'idle'
      return
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
  try {
    history.replaceState(null, '', location.pathname)
  } catch {
    /* ignore */
  }
}

function downloadMarkdown() {
  if (!report.value) return
  const md = buildMarkdown(report.value)
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
  dark.value = document.documentElement.dataset.theme === 'dark'
  const repo = new URLSearchParams(location.search).get('repo')
  if (repo) {
    input.value = repo
    void run(repo)
  }
})
</script>

<template>
  <div class="app">
    <TopBar
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
      <StageProgress
        v-if="phase === 'loading'"
        :progress="progress"
        :repo="activeRepo"
        @cancel="cancel"
      />
      <ReportView
        v-else-if="phase === 'done' && report"
        :report="report"
        :notice="linkNotice"
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
    </main>

    <footer class="footer">
      <div class="container footer-inner">
        <span>Link-Analysis · 静态只读体检</span>
        <span class="muted">分析在浏览器内完成，不上传仓库内容</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding: 8px 0 56px;
}

.footer {
  border-top: 1px solid var(--line);
  background: var(--surface);
  padding: 18px 0;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--muted);
}
</style>
