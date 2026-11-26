<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

defineProps<{
  page: string
  hasToken: boolean
  dark: boolean
}>()

defineEmits<{ (e: 'toggle-token'): void; (e: 'toggle-theme'): void }>()

const helpOpen = ref(false)
const helpWrap = ref<HTMLElement | null>(null)

function toggleHelp() {
  helpOpen.value = !helpOpen.value
  if (helpOpen.value) {
    document.addEventListener('click', onOutsideClick, true)
    document.addEventListener('keydown', onEsc, true)
  } else {
    stopHelpListeners()
  }
}

function onOutsideClick(e: MouseEvent) {
  if (helpWrap.value && !helpWrap.value.contains(e.target as Node)) closeHelp()
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') closeHelp()
}

function closeHelp() {
  helpOpen.value = false
  stopHelpListeners()
}

function stopHelpListeners() {
  document.removeEventListener('click', onOutsideClick, true)
  document.removeEventListener('keydown', onEsc, true)
}

onBeforeUnmount(stopHelpListeners)
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <h1>{{ page }}</h1>
      <div class="actions">
        <a
          class="icon-btn"
          href="https://github.com/zlc0099/Link-Analysis"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 来源"
          title="GitHub 来源"
        >
          <svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
        <button
          class="btn btn-ghost token-btn"
          :class="{ on: hasToken }"
          type="button"
          :title="hasToken ? 'Token 已配置' : '配置 GitHub Token'"
          @click="$emit('toggle-token')"
        >
          <i aria-hidden="true"></i>GitHub Token
        </button>
        <div ref="helpWrap" class="help-wrap">
          <button
            class="icon-btn"
            type="button"
            :class="{ open: helpOpen }"
            aria-haspopup="true"
            :aria-expanded="helpOpen"
            aria-label="帮助"
            title="帮助"
            @click="toggleHelp"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm-2.4-11a2.4 2.4 0 1 1 3.3 2.22c-.55.23-.9.7-.9 1.28v.4m0 3.1v.2" />
            </svg>
          </button>
          <div v-if="helpOpen" class="flyout" role="note" aria-label="使用帮助">
            <h3>使用帮助</h3>
            <div class="item">
              <span class="item-label">基本用法</span>
              <p>粘贴公开 GitHub 仓库链接后点击「开始体检」，支持 owner/repo 简写与 git@ 形式。</p>
            </div>
            <div class="item">
              <span class="item-label">结果解读</span>
              <p>总分 0–100；命中 P0 红线时分数封顶 39。每条失分均可回溯到规则 ID。</p>
            </div>
            <div class="item">
              <span class="item-label">API 额度</span>
              <p>匿名每小时 60 次；配置 Token 后提升至 5000 次。</p>
            </div>
            <div class="item">
              <span class="item-label">配置 Token</span>
              <p>
                建议使用 fine-grained token，仅授予公开仓库只读权限。
                <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">前往 GitHub 创建 Token ↗</a>
              </p>
            </div>
            <div class="item">
              <span class="item-label">隐私</span>
              <p>分析全程在浏览器内完成，只读公开仓库，不上传任何内容。</p>
            </div>
          </div>
        </div>
        <button
          class="icon-btn"
          type="button"
          :aria-label="dark ? '切换到浅色模式' : '切换到深色模式'"
          :title="dark ? '切换到浅色模式' : '切换到深色模式'"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="dark" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 13.2A8.2 8.2 0 0 1 10.8 4 7 7 0 1 0 20 13.2Z" />
          </svg>
        </button>
        <span class="divider" aria-hidden="true"></span>
        <span class="avatar" aria-label="用户头像占位">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
          </svg>
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.topbar-inner {
  height: 72px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1216px;
  margin: 0 auto;
}

h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  transition: color var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.icon-btn:hover,
.icon-btn.open {
  color: var(--ink);
  border-color: var(--line-strong);
}

.icon-btn.open {
  color: var(--accent);
}

.token-btn {
  height: 34px;
  padding: 0 12px;
  color: var(--muted);
}

.token-btn i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-strong);
}

.token-btn.on {
  color: var(--ink);
}

.token-btn.on i {
  background: var(--ok);
}

.help-wrap {
  position: relative;
  display: inline-flex;
}

.flyout {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 30;
  width: min(320px, calc(100vw - 48px));
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  text-align: left;
}

:root[data-theme='light'] .flyout {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
}

.flyout h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.item + .item {
  margin-top: 12px;
}

.item-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--cyan);
}

.item p {
  margin: 2px 0 0;
  font-size: 14px;
  color: var(--ink-soft);
}

.divider {
  width: 1px;
  height: 22px;
  background: var(--line);
}

.avatar {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--muted);
}

@media (max-width: 640px) {
  .topbar-inner {
    padding: 0 20px;
  }
  .token-btn {
    display: none;
  }
}
</style>
