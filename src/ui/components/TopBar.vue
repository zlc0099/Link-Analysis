<script setup lang="ts">
defineProps<{ hasToken: boolean }>()
defineEmits<{ (e: 'toggle-token'): void }>()
</script>

<template>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="./">
        <span class="mark" aria-hidden="true">LA</span>
        <span class="brand-text">
          <strong>Link-Analysis</strong>
          <span class="brand-sub">GitHub 仓库接入体检</span>
        </span>
      </a>
      <div class="actions">
        <span class="state" :class="{ on: hasToken }">
          <i aria-hidden="true"></i>{{ hasToken ? 'Token 已配置' : '匿名访问' }}
        </span>
        <button class="btn btn-ghost token-btn" type="button" @click="$emit('toggle-token')">
          GitHub Token
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
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
}

.topbar-inner {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}

.brand:hover {
  text-decoration: none;
}

.mark {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text strong {
  font-size: 16px;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 11px;
  color: var(--muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

@media (max-width: 560px) {
  .brand-sub,
  .state {
    display: none;
  }
}
</style>
