<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

defineProps<{ hasToken: boolean; dark: boolean }>()
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
    <div class="container topbar-inner">
      <a class="brand" href="./">
        <strong>Link-Analysis</strong>
        <span class="brand-sub">Git 仓库接入体检</span>
      </a>
      <div class="actions">
        <span class="state" :class="{ on: hasToken }">
          <i aria-hidden="true"></i>{{ hasToken ? 'Token 已配置' : '匿名访问' }}
        </span>
        <button class="btn btn-ghost token-btn" type="button" @click="$emit('toggle-token')">
          GitHub Token
        </button>
        <div ref="helpWrap" class="help-wrap">
          <button
            class="btn btn-ghost theme-btn help-btn"
            type="button"
            :class="{ open: helpOpen }"
            aria-haspopup="true"
            :aria-expanded="helpOpen"
            aria-label="帮助"
            title="帮助"
            @click="toggleHelp"
          >
            ?
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
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                >前往 GitHub 创建 Token ↗</a>
              </p>
            </div>
            <div class="item">
              <span class="item-label">隐私</span>
              <p>分析全程在浏览器内完成，只读公开仓库，不上传任何内容。</p>
            </div>
          </div>
        </div>
        <button
          class="btn btn-ghost theme-btn"
          type="button"
          :aria-label="dark ? '切换到浅色模式' : '切换到深色模式'"
          :title="dark ? '切换到浅色模式' : '切换到深色模式'"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="dark" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M20 13.2A8.2 8.2 0 0 1 10.8 4 7 7 0 1 0 20 13.2Z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--topbar-bg);
  -webkit-backdrop-filter: blur(var(--blur));
  backdrop-filter: blur(var(--blur));
  border-bottom: 1px solid var(--line);
}

.topbar-inner {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  color: var(--ink);
  font-size: 14px;
}

.brand:hover {
  text-decoration: none;
}

.brand strong {
  font-weight: 600;
}

.brand-sub {
  font-size: 12px;
  color: var(--muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
  font-size: 12px;
  color: var(--muted);
}

.state i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-strong);
  display: inline-block;
}

.state.on i {
  background: var(--ok);
}

.theme-btn {
  min-height: 32px;
  min-width: 32px;
  padding: 0 6px;
}

.help-wrap {
  position: relative;
  display: inline-flex;
}

.help-btn {
  font-weight: 600;
}

.help-btn.open {
  color: var(--accent);
}

/* Fluent 浮层：85% 填充 + 30px 模糊 + 双层阴影 */
.flyout {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  width: min(320px, calc(100vw - 48px));
  padding: 16px;
  background: var(--flyout-bg);
  -webkit-backdrop-filter: blur(30px);
  backdrop-filter: blur(30px);
  border: 1px solid var(--flyout-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-flyout);
  text-align: left;
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
  letter-spacing: 0.02em;
  color: var(--accent);
}

.item p {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink-soft);
}

@media (max-width: 560px) {
  .brand-sub,
  .state {
    display: none;
  }
}
</style>
