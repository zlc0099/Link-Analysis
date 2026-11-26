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

const examples = [
  {
    repo: 'expressjs/express',
    lang: 'Node.js',
    tag: '后端框架',
    desc: '老牌 Web 框架，文档、清单与锁文件齐全。',
  },
  {
    repo: 'pallets/flask',
    lang: 'Python',
    tag: '后端框架',
    desc: 'Python 生态常见项目，适合对照依赖与启动检查。',
  },
  {
    repo: 'tiangolo/fastapi',
    lang: 'Python',
    tag: 'API 框架',
    desc: '文档规范、CI 完整，可观察满分附近的报告形态。',
  },
]

function onSubmit(e: Event) {
  e.preventDefault()
  emit('submit', props.modelValue)
}
</script>

<template>
  <div class="home container">
    <section class="hero">
      <h1>给一个仓库，做一次接入体检</h1>
      <p class="lede">
        粘贴公开 GitHub 仓库链接，检查文档、依赖、启动、跨平台与安全五类线索，
        输出可解释的接入就绪度报告。
      </p>

      <form class="search card" @submit="onSubmit">
        <div class="search-row">
          <label class="field">
            <span class="sr-only">GitHub 仓库链接</span>
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
        <p class="search-note muted small">支持完整链接、git@ 形式与 owner/repo 简写，仅限 GitHub 公开仓库。</p>
        <p v-if="error" class="alert" role="alert">
          <strong>{{ error.code === 'not-github' || error.code === 'invalid' || error.code === 'empty' ? '链接需要调整' : '体检未完成' }}</strong>
          <span>{{ error.message }}</span>
        </p>
      </form>

      <div class="dims" aria-label="评分维度">
        <span><b>文档</b> 20</span>
        <span><b>依赖</b> 20</span>
        <span><b>启动</b> 20</span>
        <span><b>跨平台</b> 20</span>
        <span><b>安全</b> 20</span>
      </div>
    </section>

    <section class="examples" aria-labelledby="examples-title">
      <div class="section-head">
        <h2 id="examples-title">试试这些仓库</h2>
        <span class="muted small">点击即开始分析</span>
      </div>
      <div class="example-grid">
        <button
          v-for="item in examples"
          :key="item.repo"
          class="example card"
          type="button"
          @click="emit('pick', item.repo)"
        >
          <span class="tag">{{ item.tag }}</span>
          <span class="repo mono">{{ item.repo }}</span>
          <span class="desc">{{ item.desc }}</span>
          <span class="meta muted small">{{ item.lang }} · 公开仓库</span>
        </button>
      </div>
    </section>

    <section class="privacy card">
      <div class="privacy-head">
        <span class="lock" aria-hidden="true">只读</span>
        <h2>数据不离开浏览器</h2>
      </div>
      <ul>
        <li>只读取公开仓库的文件内容，不执行代码、不安装依赖。</li>
        <li>密钥证据全程脱敏，只展示前 4 位与后 2 位。</li>
        <li>报告标注 commit 与分析时间，证据链接固定在 commit 上。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home {
  padding-top: 56px;
}

.hero {
  max-width: 780px;
  margin: 0 auto;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: clamp(30px, 4.4vw, 46px);
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-weight: 650;
}

.lede {
  margin: 16px auto 0;
  max-width: 620px;
  color: var(--muted);
  font-size: 16px;
}

.search {
  margin-top: 30px;
  padding: 14px;
  text-align: left;
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
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  font-family: var(--mono);
  font-size: 14px;
}

input:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-row .btn {
  min-height: 52px;
  padding: 0 26px;
  font-size: 15px;
}

.search-note {
  margin: 10px 2px 0;
}

.alert {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 12px 2px 2px;
  padding: 10px 12px;
  border-left: 3px solid var(--p1);
  background: var(--p1-soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 13px;
}

.alert strong {
  color: var(--p1);
}

.dims {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin-top: 22px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}

.dims b {
  color: var(--ink-soft);
  font-weight: 600;
}

.examples {
  margin-top: 64px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.01em;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.example {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 18px;
  text-align: left;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.example:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent-dark);
  font-size: 11px;
  font-weight: 600;
}

.repo {
  font-size: 14px;
  font-weight: 600;
}

.desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.55;
}

.meta {
  margin-top: auto;
}

.privacy {
  margin-top: 40px;
  padding: 20px 22px;
}

.privacy-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.privacy-head h2 {
  font-size: 15px;
}

.lock {
  display: inline-flex;
  padding: 1px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 11px;
  color: var(--muted);
}

.privacy ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 13px;
}

.privacy li + li {
  margin-top: 4px;
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

@media (max-width: 900px) {
  .example-grid {
    grid-template-columns: 1fr 1fr;
  }
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
  .example-grid {
    grid-template-columns: 1fr;
  }
}
</style>
