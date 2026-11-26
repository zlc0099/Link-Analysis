<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  error: { code: string; message: string } | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit', value: string): void
  (e: 'pick', value: string): void
  (e: 'rules'): void
}>()

const examples = ['expressjs/express', 'pallets/flask', 'tiangolo/fastapi']

const capabilities = [
  {
    title: '项目结构检测',
    color: 'var(--accent)',
    icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
    items: ['README 完整性', '依赖清单完整度', '启动脚本识别 · 项目结构规范'],
  },
  {
    title: '系统兼容性检测',
    color: 'var(--cyan)',
    icon: 'M4 5h16v14H4zM7.5 9.5 10 12l-2.5 2.5M12.5 15H17',
    items: ['Windows 专用脚本识别', 'BAT / CMD / PS1 / VBS 检测', '跨平台运行风险'],
  },
  {
    title: '路径依赖检测',
    color: 'var(--warn)',
    icon: 'M10.5 13.5 13.5 10.5M8 12l-3.2 3.2a2.6 2.6 0 0 0 3.7 3.7L11.8 15.6M16 12l3.2-3.2a2.6 2.6 0 0 0-3.7-3.7L12.2 8.4',
    items: ['C:\\ 绝对路径 · /Users/ 用户路径', 'Linux / Unix 绝对路径', '硬编码路径检测'],
  },
  {
    title: '安全风险检测',
    color: 'var(--danger)',
    icon: 'M12 3 5 6v5.5c0 4.8 3 8.3 7 10.5 4-2.2 7-5.7 7-10.5V6l-7-3Zm-3.5 8.9 2.4 2.4 4.1-4.3',
    items: ['API Key · AKID · sk- 密钥', 'Bearer Token · 私钥', '.env 文件入库'],
  },
] as const

function onSubmit(e: Event) {
  e.preventDefault()
  emit('submit', props.modelValue)
}
</script>

<template>
  <div class="home">
    <section class="welcome">
      <span class="tag">为开发者构建 · 开源仓库接入分析</span>
      <h1>让每一个 Git 仓库，都做好接入准备</h1>
      <p class="lede">
        自动分析项目结构、依赖完整度、系统兼容性与安全风险，快速评估仓库接入就绪度。
      </p>
    </section>

    <section class="input-card card">
      <h2>从一个仓库地址开始</h2>
      <form class="search" @submit="onSubmit">
        <span class="gh" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </span>
        <label class="sr-only" for="repo-input">GitHub 仓库地址</label>
        <input
          id="repo-input"
          :value="modelValue"
          type="text"
          inputmode="url"
          autocomplete="off"
          spellcheck="false"
          placeholder="https://github.com/username/repository"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
        <button class="btn btn-primary go" type="submit">
          开始体检
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
      <p v-if="error" class="alert" role="alert">
        <strong>{{ error.code === 'not-github' || error.code === 'invalid' || error.code === 'empty' ? '链接需要调整' : '体检未完成' }}</strong>
        <span>{{ error.message }}</span>
      </p>
      <ul class="facts">
        <li>支持 GitHub</li>
        <li>仅支持公开仓库</li>
        <li>无需安装客户端</li>
        <li>自动识别项目语言和技术栈</li>
      </ul>
    </section>

    <section class="caps">
      <div class="caps-head">
        <h2>一次扫描，覆盖四大接入风险</h2>
        <button class="caps-link" type="button" @click="emit('rules')">查看全部检测规则 ↗</button>
      </div>
      <div class="caps-grid">
        <article v-for="cap in capabilities" :key="cap.title" class="cap card">
          <span class="cap-icon" :style="{ color: cap.color }" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path :d="cap.icon" />
            </svg>
          </span>
          <h3>{{ cap.title }}</h3>
          <ul>
            <li v-for="item in cap.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
      <p class="try muted small">
        没有目标？试试示例仓库：
        <button v-for="repo in examples" :key="repo" class="example mono" type="button" @click="emit('pick', repo)">
          {{ repo }}
        </button>
      </p>
    </section>
  </div>
</template>

<style scoped>
.welcome {
  padding-top: 16px;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--cyan-soft);
  color: var(--cyan);
  font-size: 12px;
  font-weight: 500;
}

h1 {
  margin: 14px 0 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.lede {
  margin: 10px 0 0;
  max-width: 640px;
  color: var(--muted);
  font-size: 14px;
}

.input-card {
  margin-top: 32px;
  padding: 24px;
}

.input-card h2,
.caps-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--surface-deep);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.search:focus-within {
  border-color: var(--accent);
}

.gh {
  flex: none;
  display: grid;
  place-items: center;
  color: var(--muted);
}

input {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: none;
  background: transparent;
  font-family: var(--mono);
  font-size: 14px;
}

input:focus {
  outline: none;
}

input::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.go {
  flex: none;
  height: 40px;
  border-radius: 6px;
}

.go svg {
  margin-left: 2px;
}

.alert {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-left: 3px solid var(--danger);
  background: var(--p0-soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 14px;
}

.alert strong {
  display: block;
  color: var(--p0);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  font-size: 12px;
  color: var(--muted);
}

.facts li::before {
  content: '✓';
  margin-right: 6px;
  color: var(--ok);
  font-weight: 600;
}

.caps {
  margin-top: 40px;
}

.caps-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.caps-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--accent);
  font-size: 14px;
  white-space: nowrap;
}

.caps-link:hover {
  text-decoration: underline;
}

.caps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.cap {
  padding: 20px;
}

.cap-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--surface-deep);
  border: 1px solid var(--line);
}

.cap h3 {
  margin: 14px 0 0;
  font-size: 15px;
  font-weight: 600;
}

.cap ul {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12.5px;
  color: var(--muted);
}

.cap li {
  padding-left: 14px;
  position: relative;
}

.cap li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--line-strong);
}

.try {
  margin: 20px 0 0;
}

.example {
  border: none;
  background: none;
  padding: 0 2px;
  color: var(--accent);
  font-size: 12px;
}

.example:hover {
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

@media (max-width: 1024px) {
  .caps-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  h1 {
    font-size: 24px;
  }
  .search {
    flex-wrap: wrap;
  }
  input {
    flex-basis: 100%;
  }
  .go {
    flex: 1;
  }
  .caps-grid {
    grid-template-columns: 1fr;
  }
  .caps-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
