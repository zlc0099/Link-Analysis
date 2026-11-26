# 技术设计

> 版本：v0.1（设计草案）｜日期：2026-11-26｜状态：待评审
> 关联：[需求与范围](./01-requirements.md) · [检查规则与评分](./02-rules-and-scoring.md) · [开发计划](./04-development-plan.md)

## 1. 架构总览

```text
┌────────────────────────── 浏览器（GitHub Pages 静态站）──────────────────────────┐
│  Vue 3 SPA（无后端）                                                              │
│                                                                                   │
│  输入 / 状态机 ──► GitHub 拉取层 ──► api.github.com（仓库 / commit / 文件树）      │
│                        │           raw.githubusercontent.com（文件内容，免 API 额度）│
│                        ▼                                                          │
│              文件筛选（优先级 / 上限）                                             │
│                        ▼                                                          │
│              规则引擎（文档 / 依赖 / 启动 / 跨平台 / 安全）                         │
│                        ▼                                                          │
│              评分聚合（五维等权 + P0 封顶）                                        │
│                        ▼                                                          │
│              报告数据模型 ──► 报告 UI / Markdown 导出                              │
│                        │                                                          │
│                        └──► IndexedDB（报告快照 / findings 缓存，P1）              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

约束与取舍：

- 无服务端：部署零运维、评审即开即用；代价是匿名 API 限流与浏览器内存上限
- 无路由：`?repo=owner/name` 触发分析，刷新可恢复；不做多页路由
- 无图表库：分数环、维度条用 SVG/CSS 手写，减少体积与「模板感」
- 规则与评分全部在本地执行，报告不上传服务器

## 2. 技术栈

| 类别 | 选型 | 说明 |
|---|---|---|
| 框架 | Vue 3（Composition API）+ Vite | 单页应用，构建快 |
| 语言 | TypeScript | 规则/评分/报告模型强类型 |
| 样式 | 手写 CSS + CSS 变量 | 不引入 UI 框架；浅色冷调 |
| 图表 | 手写 SVG / CSS | 分数环、维度条，无图表库 |
| 测试 | Vitest | 规则、评分、解析、导出 |
| 页面验证 | Playwright（开发期工具） | 不纳入构建依赖 |
| 部署 | GitHub Actions + Pages | 推送自动发布 |

运行时依赖仅 `vue`；构建/测试依赖：`vite`、`@vitejs/plugin-vue`、`typescript`、`vue-tsc`、`vitest`。

## 3. 目录结构

```text
Link-Analysis/
├─ docs/                          # 设计文档（本目录）
├─ src/
│  ├─ core/
│  │  ├─ github/
│  │  │  ├─ parseUrl.ts           # URL 解析与归一化
│  │  │  ├─ client.ts             # API / raw 请求、限流、重试、取消
│  │  │  └─ types.ts
│  │  ├─ select/
│  │  │  ├─ classify.ts           # 文件分类
│  │  │  └─ selectFiles.ts        # 排除、优先级、上限
│  │  ├─ rules/
│  │  │  ├─ types.ts              # Finding / RuleContext
│  │  │  ├─ helpers.ts            # 关键词、代码块、行号、掩码
│  │  │  ├─ docs.ts
│  │  │  ├─ deps.ts
│  │  │  ├─ run.ts
│  │  │  ├─ paths.ts
│  │  │  ├─ secrets.ts
│  │  │  └─ windows.ts
│  │  ├─ score/
│  │  │  ├─ items.ts              # 分项定义（规则 → 分值）
│  │  │  └─ score.ts              # 聚合、封顶、等级
│  │  ├─ report/
│  │  │  ├─ schema.ts             # Report / Finding 类型
│  │  │  ├─ mask.ts               # 脱敏
│  │  │  └─ markdown.ts           # 导出
│  │  ├─ cache/
│  │  │  ├─ reportCache.ts        # 报告快照（P1）
│  │  │  └─ blobCache.ts          # blob findings（P1）
│  │  └─ ai.ts                    # AiAdvisor 接口占位
│  ├─ ui/
│  │  ├─ App.vue
│  │  ├─ views/HomeView.vue
│  │  ├─ views/ReportView.vue
│  │  ├─ components/…             # 见 §11
│  │  └─ styles/tokens.css
│  └─ main.ts
├─ tests/
│  ├─ unit/                       # 规则、评分、解析、导出
│  └─ fixtures/                   # 内存文件树 / 假数据（运行时拼接密钥）
├─ public/
├─ .github/workflows/deploy.yml
├─ README.md
├─ AI_USAGE.md
├─ package.json
└─ vite.config.ts
```

## 4. 模块职责

| 模块 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `github/parseUrl` | 用户输入 | `{owner, repo}` 或错误 | 支持 https/git@/简写；归一化 |
| `github/client` | owner/repo/branch | RepoMeta、Commit、Tree、FileContent | 限流、Token、并发、重试、取消 |
| `select/classify` | 文件路径 + 扩展名 | 文件分类 | 决定严重级与降级 |
| `select/selectFiles` | Tree | 选中文件列表 + 覆盖率统计 | 排除、优先级、400 上限 |
| `rules/*` | 文件内容 / Tree 事实 | `Finding[]` | 纯函数，便于单测 |
| `score/items` | — | 分项定义 | 规则 → 分值映射 |
| `score/score` | Findings + Tree 事实 | 维度分、总分、封顶、等级 | 纯函数 |
| `report/mask` | 原始证据 | 脱敏证据 | 进入数据模型前执行 |
| `report/markdown` | Report | Markdown 字符串 | 含 commit / 覆盖率 / 时间 |
| `cache/*` | Report / Findings | 读写 IndexedDB | 只存脱敏结果，不存原文 |
| `ui/*` | Report / 状态 | 页面 | 无路由，查询参数触发 |

## 5. GitHub 接入

### 5.1 URL 形式

| 形式 | 处理 |
|---|---|
| `https://github.com/o/r` | 标准 |
| `https://github.com/o/r.git` | 去掉 `.git` |
| `https://github.com/o/r/` | 去尾部斜杠 |
| `git@github.com:o/r.git` | 转为 HTTPS 解析 |
| `o/r` | 简写，补全为 GitHub |
| `https://github.com/o/r/tree/...`、`/blob/...` | 归一到仓库根，按默认分支分析并提示 |
| 非 github.com 域名 | 直接拒绝并说明 |

owner/repo 允许字母、数字、`.`、`_`、`-`；解析后以 API 返回的 `full_name` 为准。

### 5.2 端点与额度

| 用途 | 请求 | 额度 |
|---|---|---|
| 元信息 | `GET /repos/{o}/{r}` | 1 |
| HEAD commit | `GET /repos/{o}/{r}/commits/{branch}` | 1 |
| 文件树 | `GET /repos/{o}/{r}/git/trees/{sha}?recursive=1` | 1 |
| 文件内容 | `raw.githubusercontent.com/{o}/{r}/{sha}/{path}` | 0（CDN） |
| 内容兜底 | `GET /repos/{o}/{r}/contents/{path}?ref={sha}` | 1/文件 |

全新体检：3 次 API + N 次 raw；复检：1 次 API（比较 commit）。

### 5.3 Token

- 存储键：`link-analysis.token`（localStorage），输入框默认掩码显示
- 仅附加到 `api.github.com` 请求头；不发送到 raw、不写入 URL、日志、报告
- 建议使用 fine-grained token，仅授予公开仓库只读权限
- 支持清除；401 时回退匿名一次并提示，不自动清空（可能是权限配置问题）

### 5.4 并发、重试与取消

- raw 请求并发 6；单请求超时 15s
- 5xx / 网络错误退避 500ms 重试 1 次；4xx 不重试（除 401 回退）
- 每次体检持有 `AbortController`；取消/重新提交时终止在途请求
- 每完成一个文件更新进度计数，按批让出事件循环，保持 UI 响应

### 5.5 限流识别与提示

- 读取响应头：`x-ratelimit-remaining`、`x-ratelimit-reset`、`retry-after`
- `403` 且 remaining 为 0 → 匿名额度耗尽；显示重置本地时间 + Token 入口
- `429` → 二级限流；按 `retry-after` 倒计时禁用提交
- 有缓存报告时展示旧报告 + 「可能过期」横幅，绝不改写旧报告的时间戳

### 5.6 内容读取兜底

1. 先请求 raw（带 commit SHA，内容稳定、可缓存）
2. raw 失败（404/5xx）→ `contents` API 一次（base64 解码）
3. 仍失败 → 记录失败文件数与路径，全局「数据不完整」提示，不中断整份报告

## 6. 数据模型

```ts
type Dimension = 'docs' | 'deps' | 'run' | 'portability' | 'security';
type Severity = 'P0' | 'P1' | 'P2' | 'P3' | 'INFO';
type Confidence = 'high' | 'medium' | 'low';
type Grade = 'A' | 'B' | 'C' | 'D';

interface Finding {
  id: string;              // 稳定排序用
  ruleId: string;          // DOC-01 / SEC-03 …
  dimension: Dimension;
  severity: Severity;
  confidence: Confidence;
  title: string;
  file?: string;
  line?: number;
  evidence?: string;       // 已脱敏、≤160 字符
  impact: string;
  suggestion: string;
  permalink?: string;      // /blob/{sha}/{path}#L{line}
}

interface Coverage {
  treeTruncated: boolean;
  eligibleFiles: number;
  selectedFiles: number;
  analyzedFiles: number;
  failedFiles: string[];
  skippedBinary: number;
  skippedLarge: number;
  bytesScanned: number;
}

interface DimensionScore {
  dimension: Dimension;
  score: number;
  max: 20;
  items: Array<{
    ruleId: string;
    passed: boolean;
    applicable: boolean;
    points: number;
    evidenceFindingIds: string[];
  }>;
}

interface Report {
  schemaVersion: 1;
  ruleVersion: string;     // rules-v1
  appVersion: string;
  repo: {
    owner: string; name: string; fullName: string; htmlUrl: string;
    description: string | null; language: string | null;
    stars: number; license: string | null;
    archived: boolean; defaultBranch: string;
  };
  commit: { sha: string; shortSha: string; date: string; message: string };
  analyzedAt: string;      // ISO
  coverage: Coverage;
  findings: Finding[];
  dimensions: DimensionScore[];
  score: {
    raw: number;
    official: number;
    capped: boolean;
    grade: Grade;
    verdict: string;
  };
  limitations: string[];
}
```

## 7. 分析流水线与状态机

```text
idle
 └─ validating ──► error(URL)
      └─ resolvingRepo ──► error(404/私有/网络)
           └─ resolvingCommit ──► error(空仓库)
                └─ loadingTree ──► error
                     └─ selecting
                          └─ fetchingFiles(progress, x/y)
                               └─ analyzing
                                    └─ scoring
                                         └─ done | partial
任意阶段 ──► cancelled（用户取消）
任意阶段 ──► error（可重试 / 不可重试）
```

- 无后台任务、无定时器；所有状态由当前会话驱动
- `partial`：Tree 截断或存在失败文件；报告可用但带醒目标识
- 重新提交会重置状态机并中止旧请求

## 8. 规则执行与评分

- 规则为纯函数：输入 `RuleContext`（文件树事实 + 选中文件 + 内容），输出 `Finding[]`
- 证据在写入 `Finding` 之前调用 `mask()`，确保原始密钥不进入数据模型
- 评分由 `score()` 纯函数完成：分项状态 → 维度分 → 总分 → 红线封顶 → 等级
- `ruleVersion` 与 `appVersion` 写入报告；同一快照的评分必须确定性可复现
- 规则 ID 与分项映射集中在 `score/items.ts`，避免规则与展示口径漂移

## 9. 更新跟踪设计（README 四问）

> 题目要求：设计说明即可，不强制实现。本节为完整设计，§9.5 标注 v1 实际实现边界。

### 9.1 怎么发现更新

- 每份报告缓存 `owner/repo + branch + commitSha + analyzedAt`
- 用户点击「复检」时：
  1. `GET /repos/{o}/{r}` 获取当前默认分支
  2. `GET /repos/{o}/{r}/commits/{branch}` 获取最新 HEAD SHA
  3. 与缓存 SHA 比较：相同 → 复用报告并提示「commit 未变化」；不同 → 增量分析并展示新旧 SHA
- 优化（P1）：对上述请求使用 `ETag` / `If-None-Match`，304 时不消耗内容传输
- 静态站不接收 Webhook；如未来需要自动监控，可由外部定时任务（GitHub Actions / 服务端）调用复检逻辑

### 9.2 怎么避免全量重算

Git 是内容寻址的：文件树中每个文件都有 blob SHA（内容哈希）。

1. 首次体检：按 `blobSha + ruleVersion` 缓存每个文件的 findings 到 IndexedDB
2. 复检：重新拉取文件树（1 次 API），对比旧树的 `path → blobSha`
   - blobSha 未变 → 直接复用缓存 findings，不下载内容
   - 新增/变更 → 只下载并扫描这些文件
   - 删除 → 丢弃对应 findings
3. 文件级事实（README / 清单 / 锁文件 / 版本文件是否存在）由新树重新判定，成本极低
4. 用「缓存 findings + 新增 findings」重新聚合维度分与总分（纯函数，毫秒级）
5. 相同内容跨仓库也可复用（blob SHA 与仓库无关），进一步提升命中率
6. `ruleVersion` 变化时整批失效并重扫，保证结果与新规则一致

### 9.3 报告如何标注所基于的 commit

- 报告头部固定展示：`owner/repo @ branch @ abc1234 · 分析时间 · rules-v1 · 覆盖率`
- 所有证据链接固定到 commit：`https://github.com/{o}/{r}/blob/{sha}/{path}#L{line}`，后续分支变动不影响证据
- Markdown 导出包含相同字段；缓存报告再次打开时显示「基于 commit abc1234，分析于 …」
- P1：差异视图展示「较上次新增 / 消除的风险」；未实现前不展示伪造的对比

### 9.4 失败或限流时怎么兜底

| 情况 | 处理 |
|---|---|
| 403 匿名额度耗尽 | 显示 `x-ratelimit-reset` 对应本地时间 + Token 入口；若有缓存报告，展示旧报告并标「可能过期」 |
| 429 二级限流 | 按 `retry-after` 倒计时，禁用提交按钮 |
| Token 失效（401） | 回退匿名请求一次并提示；不自动删除 Token |
| 文件树截断 | 报告标「数据不完整」+ 覆盖率；不补分、不伪造 |
| 部分文件失败 | 记录失败文件数；报告整体仍可用，明确「基于已分析文件」 |
| raw 内容失败 | 用 contents API 兜底一次；仍失败则跳过并计数 |
| 网络中断 | 退避重试 1 次；仍失败提供「重试」；已有缓存则只读展示 |
| 旧报告展示 | 永不改写旧报告时间；必须显示「基于旧 commit / 可能过期」 |
| 离线 | 只允许打开缓存报告（只读），分析按钮提示需联网 |

### 9.5 v1 实现边界（诚实标注）

| 能力 | 设计 | v1 实现 |
|---|---|---|
| commit 标注（报告头 / 导出 / 证据链接） | 必须 | 必须（P0） |
| 报告快照缓存、最近体检 | IndexedDB | P1（时间允许） |
| 复检并比较 HEAD SHA | 见 §9.1 | P1（简单实现） |
| blob SHA 增量重扫 | 见 §9.2 | 设计完成，不实现 |
| ETag / 条件请求 | 见 §9.1 | 设计完成，不实现 |
| 差异视图（新增 / 消除风险） | P1 | 设计完成，不实现 |

README 将同时写明「设计」与「当前已实现」，不把设计能力表述为已上线。

## 10. 缓存设计

- IndexedDB 数据库：`link-analysis`（version 1）
- 对象仓库：
  - `reports`：键 `${owner}/${repo}@${branch}@${sha}`，值 `Report` + `lastAccessAt`
  - `recent`：键 `${owner}/${repo}`，值 `{ lastReportKey, lastCheckedAt, etag? }`
  - `blobFindings`（P1）：键 `${blobSha}:${ruleVersion}`，值 `Finding[]`（已脱敏）
- 只缓存报告与脱敏 findings，**不缓存原始文件内容或原始密钥**
- 容量：≤50MB 或 30 天，LRU 淘汰；提供「清除本地缓存」入口
- 隐私模式 / localStorage 不可用：降级为无缓存模式，仅本次会话可用

## 11. UI 设计

### 11.1 视图与组件

| 视图 / 组件 | 职责 |
|---|---|
| `HomeView` | 品牌、URL 输入、示例、Token 面板、隐私说明 |
| `ReportView` | 报告布局与操作 |
| `StageProgress` | 阶段进度、已拉取文件数、取消 |
| `RepoHeader` | 仓库元信息、`branch @ sha`、分析时间 |
| `ScoreRing` | SVG 分数环 + 等级 + 结论 |
| `DimensionBars` | 五维得分条（可展开明细） |
| `RiskList` / `RiskItem` | P0/P1 主要风险、P2/P3 折叠、脱敏证据 |
| `ScoreBreakdown` | 分项状态与证据 |
| `WindowsSection` | Windows 脚本清单（信息项） |
| `PathsSection` / `SecretsSection` | 分类明细 |
| `CoverageBanner` / `ErrorState` | 覆盖率、限流、错误提示 |

### 11.2 设计令牌

```css
:root {
  --bg: #f5f8f7;
  --surface: #ffffff;
  --ink: #14201f;
  --muted: #5b6b69;
  --line: #dde5e3;
  --accent: #0e7a6f;
  --p0: #b42318;
  --p1: #b54708;
  --p2: #8a6d1d;
  --p3: #667085;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

- 中文优先、极简文案；等宽数字呈现分数/commit
- 不使用大面积模糊、渐变背景动画；动效仅用于进度与状态切换
- 桌面两栏（分数 + 风险），移动端单栏；表格在窄屏横向滚动
- 无障碍：表单 label、键盘回车提交、可见焦点、颜色不作为唯一信息载体

### 11.3 交互细节

- URL 输入即时校验；提交后禁用重复点击
- 示例仓库点击即分析；演示仓库标注「含假值问题」
- Token 面板默认折叠，保存后仅显示掩码
- 导出按钮在报告完成后可用；文件名 `link-analysis-{owner}-{repo}-{sha7}.md`
- 错误态提供「重试」「换个仓库」；限流态提供重置时间与 Token 入口

## 12. 安全与隐私

- 无后端、无数据库、无统计脚本；数据只在浏览器与 GitHub 之间流动
- Token：仅 localStorage + `api.github.com` 请求头；不写入报告、URL、控制台
- 密钥证据在数据模型层脱敏；DOM 中不存在完整值
- 缓存只存脱敏 findings；「清除缓存」立即删除 IndexedDB 记录
- 截图与 README 示例只使用演示仓库 / 本地 fixture；不公开真实仓库密钥
- 真实仓库若检出疑似泄漏，报告只提示「疑似」并脱敏，不提供复制入口
- 测试中的密钥字面量运行时拼接，避免被 GitHub 推送保护拦截或误判为真实泄漏
- 演示仓库只放假值 `.env`（如 `DB_PASSWORD=demo-not-real`），不使用任何真实格式的 Key

## 13. 部署

- GitHub Actions：`push` 到 `main` 自动构建并发布 Pages；支持手动触发
- Vite `base: './'`（相对路径），不绑定仓库名；无路由，无 404 回退需求
- 工作流权限：`contents: read`、`pages: write`、`id-token: write`；并发组 `pages`
- 构建命令：`npm ci && npm run build`；产物目录 `dist`

```yaml
name: deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 14. 测试策略

| 层级 | 内容 | 工具 |
|---|---|---|
| 单元 | URL 解析（≥8 形式）、文件分类/筛选、每个规则 ID 正反例、占位符/脱敏、评分边界、Markdown 导出、错误映射 | Vitest |
| 集成（浏览器） | 真实仓库拉取、报告渲染、导出、取消 | 开发期 Playwright |
| 错误模拟 | 限流 / 截断 / 404 / 空仓库（拦截网络响应或 mock） | Playwright route / 单元 |
| 真实仓库验证 | 3 个公开仓库（2 个主流生态 + 1 个含 Windows/路径特征），记录 commit 与结果摘要，人工抽查证据 | 手动 + 记录表 |
| 自检 | 用 Link-Analysis 分析自身仓库，结果与预期一致 | 手动 |
| 部署冒烟 | Pages 线上打开、示例仓库可分析、控制台无报错 | 手动 |

验收口径以 [01-requirements.md §6](./01-requirements.md) 为准；测试结果与真实仓库记录写入 README。

## 15. 性能目标

| 指标 | 目标 |
|---|---|
| 首屏（本地/线上） | <2s |
| 构建产物 | JS+CSS gzip <250KB |
| 中等仓库（<300 文件） | <60s 出报告，进度可见、可取消 |
| 评分/渲染 | 分析完成后 <500ms 呈现 |
| 依赖 | 运行时仅 Vue；无图表/UI/路由库 |

实现手段：并发 6、分批让出事件循环、缓存 findings、避免重复请求、二进制/超大提前跳过。

## 16. AI 接口预留

```ts
export interface AiReportSummary {
  repo: string;
  score: number;
  grade: string;
  dimensions: Record<string, number>;
  topFindings: Array<{ ruleId: string; title: string; severity: string }>;
}

export interface AiSuggestion {
  summary: string;
  actions: string[];
  model: string;
  generatedAt: string;
}

export interface AiAdvisor {
  suggest(input: AiReportSummary): Promise<AiSuggestion>;
}
```

- v1 不提供实现，`aiAdvisor = null`，UI 不出现入口，评分完全由规则引擎决定
- 后续可接：自带 Key（BYOK，仅存本机）或 Serverless 代理（如 Cloudflare Worker）隐藏 Key
- 无论哪种接入，仓库不提交任何 Key；AI 输出明确标注「AI 生成，仅供参考」，不参与评分

## 17. 已知限制与演进方向

- 仅 GitHub 公开仓库；后续抽象 `RepoProvider` 支持 GitLab/Gitee
- 私有仓库需 OAuth；当前不涉及
- 超大仓库只分析前 400 个候选文件；后续可服务端浅克隆
- 不查 Git 历史；历史泄漏需专门扫描
- 增量重扫、ETag、差异视图为设计能力，v1 不实现
- AI 建议后续接入，不改变规则评分口径
- 规则基于启发式，存在误报/漏报；README 明确「辅助提醒，不替代安全审计」