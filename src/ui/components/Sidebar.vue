<script setup lang="ts">
defineProps<{
  active: 'checkup' | 'rules' | 'about'
  busy: boolean
}>()

defineEmits<{ (e: 'navigate', view: 'checkup' | 'rules' | 'about'): void }>()

const NAV: Array<{ key: 'checkup' | 'rules' | 'about'; label: string; icon: string }> = [
  {
    key: 'checkup',
    label: '仓库体检',
    icon: 'M9 3 4 5.5v5.6c0 4.3 2.6 7.3 5 8.9 2.4-1.6 5-4.6 5-8.9V5.5L9 3Zm-1.6 7.4 1.3 1.3 2.6-2.6',
  },
  { key: 'rules', label: '检测规则', icon: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5' },
  { key: 'about', label: '关于项目', icon: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm0-13.2v.2m0 3v6' },
]
</script>

<template>
  <aside class="sidebar">
    <a class="brand" href="./">
      <span class="brand-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3 5 6v5.5c0 4.8 3 8.3 7 10.5 4-2.2 7-5.7 7-10.5V6l-7-3Z" />
          <path d="m9.2 12 2 2 3.6-3.8" />
        </svg>
      </span>
      <span class="brand-text">
        <strong>RepoCheck</strong>
        <span class="brand-sub">REPOSITORY INTELLIGENCE</span>
      </span>
    </a>

    <nav class="nav" aria-label="主导航">
      <button
        v-for="item in NAV"
        :key="item.key"
        class="nav-item"
        :class="{ active: active === item.key }"
        type="button"
        :disabled="busy && active !== item.key"
        @click="$emit('navigate', item.key)"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="item.icon" />
        </svg>
        {{ item.label }}
      </button>
    </nav>

    <div class="side-foot">
      <div class="tips card">
        <strong>安全，从接入开始</strong>
        <p>只读扫描，不修改仓库内容</p>
      </div>
      <div class="meta">
        <span class="mono">v1.0.0</span>
        <a href="https://github.com/zlc0099/Link-Analysis" target="_blank" rel="noopener noreferrer" class="gh" aria-label="GitHub 项目主页">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 224px;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  padding: 4px 8px;
}

.brand:hover {
  text-decoration: none;
}

.brand-icon {
  width: 34px;
  height: 34px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-text strong {
  font-size: 15px;
  font-weight: 600;
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 24px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;
}

.nav-item:hover:not(:disabled) {
  color: var(--ink);
  background: var(--accent-soft);
}

.nav-item.active {
  color: #93b4fd;
  background: var(--accent-soft);
}

:root[data-theme='light'] .nav-item.active {
  color: var(--accent);
}

.nav-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tips {
  padding: 12px 14px;
}

.tips strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
}

.tips p {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  font-size: 11px;
  color: var(--muted);
}

.gh {
  color: var(--muted);
  display: inline-flex;
}

.gh:hover {
  color: var(--ink);
}

@media (max-width: 1024px) {
  .sidebar {
    position: static;
    width: auto;
    flex-direction: row;
    align-items: center;
    padding: 10px 16px;
    border-right: none;
    border-bottom: 1px solid var(--line);
  }
  .nav {
    flex-direction: row;
    margin: 0 0 0 16px;
  }
  .side-foot {
    margin: 0 0 0 auto;
    flex-direction: row;
    align-items: center;
  }
  .tips {
    display: none;
  }
}
</style>
