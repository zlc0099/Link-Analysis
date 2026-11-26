<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ token: string }>()
const emit = defineEmits<{
  (e: 'save', value: string): void
  (e: 'clear'): void
  (e: 'close'): void
}>()

const draft = ref(props.token)
watch(
  () => props.token,
  (v) => {
    draft.value = v
  },
)

function save() {
  emit('save', draft.value)
}
</script>

<template>
  <section class="panel-wrap" aria-label="GitHub Token 设置">
    <div class="container">
      <div class="panel card">
        <div class="panel-head">
          <h2>GitHub Token（可选）</h2>
          <button class="btn btn-ghost close" type="button" @click="$emit('close')">关闭</button>
        </div>
        <p class="muted small">
          匿名访问每小时 60 次 API 请求；配置 Token 后提升到 5000 次。Token
          只保存在本机浏览器，仅发送到 api.github.com，不会写入报告、URL 或日志。
        </p>
        <div class="row">
          <label class="field">
            <span class="sr-only">GitHub Token</span>
            <input
              v-model="draft"
              type="password"
              autocomplete="off"
              spellcheck="false"
              placeholder="ghp_... 或 github_pat_..."
              @keydown.enter="save"
            />
          </label>
          <button class="btn btn-primary" type="button" @click="save">保存</button>
          <button class="btn" type="button" :disabled="!token" @click="$emit('clear')">清除</button>
        </div>
        <p class="muted small hint">
          建议使用 fine-grained token，仅授予公开仓库只读权限。
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
          >前往 GitHub 创建 Token ↗</a>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-wrap {
  padding-top: 16px;
}

.panel {
  padding: 18px 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: 15px;
}

.close {
  min-height: 30px;
  padding: 0 10px;
}

.row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.field {
  flex: 1;
}

input {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  font-family: var(--mono);
  font-size: 13px;
}

input:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: inset 0 -2px 0 0 var(--accent);
}

.hint {
  margin: 10px 0 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .row {
    flex-wrap: wrap;
  }
  .field {
    flex-basis: 100%;
  }
}
</style>
