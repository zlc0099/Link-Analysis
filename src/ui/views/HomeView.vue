<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  error: { code: string; message: string } | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit', value: string): void
  (e: 'pick', value: string): void
}>()

const examples = ['expressjs/express', 'pallets/flask', 'tiangolo/fastapi']

function onSubmit(e: Event) {
  e.preventDefault()
  emit('submit', props.modelValue)
}
</script>

<template>
  <div class="home container">
    <section class="intro">
      <h1>Git 仓库接入体检</h1>
      <p class="lede">
        粘贴公开 GitHub 仓库地址，在浏览器内检查文档、依赖、启动脚本、跨平台兼容与敏感信息，
        输出可解释的接入就绪度报告。全程只读，不上传任何内容。
      </p>
    </section>

    <form class="search" @submit="onSubmit">
      <div class="search-row">
        <label class="field">
          <span class="sr-only">GitHub 仓库地址</span>
          <input
            :value="modelValue"
            type="text"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="https://github.com/owner/repo"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <button class="btn btn-primary" type="submit">开始体检</button>
      </div>
      <p class="note muted small">目前支持公开 GitHub 仓库，同时识别 git@ 形式与 owner/repo 简写。</p>
      <p v-if="error" class="alert" role="alert">
        <strong>{{ error.code === 'not-github' || error.code === 'invalid' || error.code === 'empty' ? '链接需要调整' : '体检未完成' }}</strong>
        <span>{{ error.message }}</span>
      </p>
    </form>

    <p class="examples">
      <span class="muted">示例仓库：</span>
      <button
        v-for="repo in examples"
        :key="repo"
        class="example-link mono"
        type="button"
        @click="emit('pick', repo)"
      >
        {{ repo }}
      </button>
    </p>
  </div>
</template>

<style scoped>
.home {
  padding-top: 56px;
  max-width: 660px;
}

.intro h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.01em;
  font-weight: 600;
}

.lede {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.search {
  margin-top: 28px;
}

.search-row {
  display: flex;
  gap: 10px;
}

.field {
  flex: 1;
}

input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-family: var(--mono);
  font-size: 13px;
}

input:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: inset 0 -2px 0 0 var(--accent);
}

.search-row .btn {
  height: 44px;
  padding: 0 18px;
  font-size: 14px;
}

.note {
  margin: 8px 2px 0;
}

.alert {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 12px 0 0;
  padding: 8px 12px;
  border-left: 3px solid var(--p0);
  background: var(--p0-soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 13px;
}

.alert strong {
  color: var(--p0);
}

.examples {
  margin: 20px 2px 0;
  font-size: 13px;
}

.example-link {
  border: none;
  background: none;
  padding: 0 2px;
  color: var(--accent);
  font-size: 13px;
}

.example-link:hover {
  text-decoration: underline;
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
  .home {
    padding-top: 36px;
  }
  .search-row {
    flex-direction: column;
  }
  .search-row .btn {
    width: 100%;
  }
}
</style>
