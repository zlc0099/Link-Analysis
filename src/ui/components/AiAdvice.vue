<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Report } from '../../core/report/schema'
import { buildAIPrompt, buildAIPromptText } from '../../core/ai/prompt'
import { requestAiAdvice } from '../../core/ai/client'
import { readCachedAdvice, writeCachedAdvice } from '../../core/ai/cache'
import { AI_DEFAULT_CONFIG, AiError, type AiAdvice, type AiConfig } from '../../core/ai/types'

const props = defineProps<{ report: Report }>()

const emit = defineEmits<{ (e: 'advice', advice: AiAdvice | null): void }>()

const AI_KEY = 'link-analysis.ai'

type Phase = 'no-key' | 'idle' | 'loading' | 'done' | 'error'

const config = ref<AiConfig>({ ...AI_DEFAULT_CONFIG })
const showConfig = ref(false)
const phase = ref<Phase>('idle')
const advice = ref<AiAdvice | null>(null)
const errorMsg = ref('')
let controller: AbortController | null = null

const maskedKey = computed(() => {
  const k = config.value.apiKey
  return k ? `${k.slice(0, 3)}****${k.slice(-3)}` : ''
})

function readConfig() {
  try {
    const raw = localStorage.getItem(AI_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AiConfig>
      config.value = { ...AI_DEFAULT_CONFIG, ...saved }
      return true
    }
  } catch {
    /* 隐私模式下忽略 */
  }
  return false
}

function saveConfig() {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(config.value))
  } catch {
    /* 隐私模式下仅本次会话可用 */
  }
}

function init() {
  const hasKey = readConfig()
  const cached = readCachedAdvice(props.report)
  if (cached) {
    advice.value = cached
    phase.value = 'done'
    emit('advice', cached)
    return
  }
  phase.value = hasKey ? 'idle' : 'no-key'
}

function saveAndRun() {
  saveConfig()
  showConfig.value = false
  void run()
}

async function run() {
  controller?.abort()
  controller = new AbortController()
  phase.value = 'loading'
  errorMsg.value = ''
  try {
    const result = await requestAiAdvice(config.value, buildAIPrompt(props.report), {
      signal: controller.signal,
    })
    advice.value = result
    phase.value = 'done'
    writeCachedAdvice(props.report, result)
    emit('advice', result)
  } catch (err) {
    if (err instanceof AiError && err.code === 'cancelled') return
    errorMsg.value = err instanceof AiError ? err.message : 'AI 请求失败，请稍后重试'
    phase.value = 'error'
  }
}

function cancel() {
  controller?.abort()
  phase.value = config.value.apiKey ? 'idle' : 'no-key'
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(buildAIPromptText(props.report))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

const copied = ref(false)

init()
</script>

<template>
  <section class="ai card">
    <div class="ai-head">
      <h2>AI 接入建议</h2>
      <span class="muted small">AI 观点，不影响评分</span>
      <button
        v-if="phase !== 'no-key'"
        class="btn btn-ghost cfg-btn"
        type="button"
        @click="showConfig = !showConfig"
      >
        AI 设置
      </button>
    </div>

    <!-- 配置面板 -->
    <div v-if="showConfig || phase === 'no-key'" class="cfg">
      <p v-if="phase === 'no-key'" class="muted small">
        填入 AI 服务 Key 后可一键生成修复建议；不填也可以复制 Prompt 粘贴到任意 AI 对话框。
      </p>
      <div class="cfg-row">
        <label>接口地址<input v-model="config.baseUrl" type="text" spellcheck="false" /></label>
        <label>模型<input v-model="config.model" type="text" spellcheck="false" /></label>
      </div>
      <label class="key-label">Key
        <input
          v-model="config.apiKey"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="sk-…（仅保存在本机浏览器）"
        />
      </label>
      <p v-if="maskedKey" class="muted small">已保存的 Key：{{ maskedKey }}（仅存本机，不会写入报告或导出）</p>
      <div class="cfg-actions">
        <button class="btn btn-primary" type="button" @click="saveAndRun">保存并生成建议</button>
        <button class="btn" type="button" @click="copyPrompt">{{ copied ? '已复制 ✓' : '复制 Prompt' }}</button>
      </div>
    </div>

    <!-- 生成中 -->
    <div v-else-if="phase === 'loading'" class="state">
      <i class="spinner" aria-hidden="true"></i>
      <span>正在生成建议…</span>
      <button class="btn" type="button" @click="cancel">取消</button>
    </div>

    <!-- 结果 -->
    <div v-else-if="phase === 'done' && advice" class="result">
      <p class="overall">{{ advice.overall || '（AI 未给出整体评价）' }}</p>

      <div v-if="advice.objections.length" class="block">
        <h3>对规则的异议</h3>
        <ul>
          <li v-for="(o, i) in advice.objections" :key="i">
            <code class="mono">{{ o.ruleId }}</code>
            <span>{{ o.reason }}</span>
          </li>
        </ul>
      </div>

      <div v-if="advice.fixPlan.length" class="block">
        <h3>修复优先级</h3>
        <ol class="plan">
          <li v-for="item in advice.fixPlan" :key="item.title + item.priority">
            <strong>{{ item.title }}</strong>
            <ul>
              <li v-for="(s, i) in item.steps" :key="i">{{ s }}</li>
            </ul>
          </li>
        </ol>
      </div>

      <div v-if="advice.checklist.length" class="block">
        <h3>接入前检查清单</h3>
        <ul class="checklist">
          <li v-for="(c, i) in advice.checklist" :key="i">{{ c }}</li>
        </ul>
      </div>

      <div class="ai-foot">
        <button class="btn" type="button" @click="run">重新生成</button>
        <span class="muted small">AI 生成，仅供参考；评分以规则引擎为准。</span>
      </div>
    </div>

    <!-- 失败 -->
    <div v-else-if="phase === 'error'" class="state">
      <span class="err">{{ errorMsg }}</span>
      <button class="btn" type="button" @click="run">重试</button>
    </div>

    <!-- 未配置默认态 -->
    <div v-else class="state">
      <span>已配置 Key，可以生成建议。</span>
      <button class="btn btn-primary" type="button" @click="run">生成建议</button>
    </div>
  </section>
</template>

<style scoped>
.ai {
  margin-top: 32px;
  padding: 20px;
}

.ai-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.ai-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.ai-head .small {
  flex: 1;
}

.cfg-btn {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.cfg {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-deep);
}

.cfg-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cfg label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--muted);
}

.key-label {
  margin-top: 10px;
}

.cfg input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  font-size: 13px;
  font-family: var(--mono);
}

.cfg input:focus {
  border-color: var(--accent);
  outline: none;
}

.cfg-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.state {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  font-size: 14px;
}

.spinner {
  width: 14px;
  height: 14px;
  flex: none;
  border: 2px solid var(--line-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.err {
  color: var(--danger);
}

.result {
  margin-top: 14px;
}

.overall {
  margin: 0;
  font-size: 14px;
  color: var(--ink);
}

.block {
  margin-top: 16px;
}

.block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}

.block ul,
.plan {
  margin: 0;
  padding-left: 18px;
  font-size: 13.5px;
  color: var(--ink-soft);
}

.block li + li,
.plan li + li {
  margin-top: 4px;
}

.block code {
  margin-right: 8px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-deep);
  font-size: 11px;
  color: var(--cyan);
}

.plan strong {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}

.plan ul {
  margin-top: 4px;
}

.plan strong + ul {
  margin: 4px 0 10px;
}

.checklist li::marker {
  color: var(--ok);
}

.ai-foot {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

@media (max-width: 640px) {
  .cfg-row {
    grid-template-columns: 1fr;
  }
  .ai-head {
    flex-wrap: wrap;
  }
}
</style>
