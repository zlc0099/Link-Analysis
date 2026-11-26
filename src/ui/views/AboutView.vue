<script setup lang="ts">
const REPO_URL = 'https://github.com/zlc0099/Link-Analysis'
const DEMO_URL = 'https://zlc0099.github.io/Link-Analysis/'

const points = [
  { title: '只读静态扫描', desc: '只拉取公开仓库的文件内容做本地分析，不执行代码、不安装依赖、不修改任何文件。' },
  { title: '五维评分体系', desc: '文档完备、依赖可复现、启动清晰、跨平台友好、安全合规五个维度各 20 分，总分 100。' },
  { title: '可解释报告', desc: '每条失分都能回溯到规则 ID 与文件位置，敏感证据全程脱敏，支持导出 Markdown。' },
  { title: '隐私优先', desc: '分析全程在浏览器内完成，不上传仓库内容；GitHub Token 与配置仅保存在本机。' },
]

const stack = [
  'Vue 3 + TypeScript + Vite',
  '纯前端 SPA，无后端服务',
  'GitHub REST API + raw CDN',
  '规则引擎 rules-v1（19 条纯函数规则）',
]
</script>

<template>
  <div class="about">
    <section class="head">
      <h1>关于项目</h1>
      <p class="muted">
        RepoCheck 是一款开源的 Git 仓库接入体检工具：输入公开 GitHub 仓库地址，
        在浏览器内完成结构、依赖、启动、跨平台与安全五类静态检查，输出可解释的接入就绪度报告。
      </p>
    </section>

    <section class="grid">
      <article v-for="p in points" :key="p.title" class="card point">
        <h2>{{ p.title }}</h2>
        <p class="muted">{{ p.desc }}</p>
      </article>
    </section>

    <section class="meta card">
      <div class="col">
        <h3>版本信息</h3>
        <ul>
          <li>产品版本 <span class="mono">v1.0.0</span></li>
          <li>规则版本 <span class="mono">rules-v1</span></li>
          <li>许可证 <span class="mono">MIT</span></li>
        </ul>
      </div>
      <div class="col">
        <h3>技术栈</h3>
        <ul>
          <li v-for="item in stack" :key="item">{{ item }}</li>
        </ul>
      </div>
      <div class="col">
        <h3>项目主页</h3>
        <ul>
          <li>
            <a :href="DEMO_URL" target="_blank" rel="noopener noreferrer">zlc0099.github.io/Link-Analysis ↗（在线演示）</a>
          </li>
          <li>
            <a :href="REPO_URL" target="_blank" rel="noopener noreferrer">github.com/zlc0099/Link-Analysis ↗</a>
          </li>
          <li>
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">创建 GitHub Token ↗</a>
          </li>
        </ul>
      </div>
    </section>

    <p class="disclaimer muted small">
      体检结果仅代表静态分析发现，不替代完整的安全审计与合规审查。
    </p>
  </div>
</template>

<style scoped>
.head h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.head p {
  margin: 10px 0 0;
  max-width: 720px;
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 28px;
}

.point {
  padding: 20px;
}

.point h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.point p {
  margin: 8px 0 0;
  font-size: 14px;
}

.meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 16px;
  padding: 20px;
}

.col h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}

.col ul {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.disclaimer {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .grid,
  .meta {
    grid-template-columns: 1fr;
  }
}
</style>
