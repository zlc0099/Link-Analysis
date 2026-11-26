# Link-Analysis（Claude Code 项目说明）

纯前端 SPA：输入公开 GitHub 仓库链接，在浏览器内做静态「接入体检」，输出五维评分与可解释风险报告。无后端、无账号、无统计脚本。

## 常用命令

```bash
npm install
npm run dev          # Vite dev server，默认 5173
npm test             # Vitest（tests/unit）
npm run build        # vue-tsc --noEmit && vite build → dist/
npm run verify:repos # 真实仓库验证（消耗 GitHub API 额度，结果写 docs/verification/）
```

Node 20+；本机开发使用 Node 24。npm registry 使用本地镜像。

## 架构要点

- `src/core/github/parseUrl.ts`：链接归一化（https / git@ / owner/repo / tree/blob）。
- `src/core/github/client.ts`：api.github.com + raw CDN；限流识别、5xx 重试一次、401 由 `analyze.ts` 回退匿名。
- `src/core/select/`：文件分类与筛选（排除目录、二进制、min.js、锁文件内容、512KB、400 上限、优先级排序）。
- `src/core/rules/`：纯函数规则，返回 `RuleOutcome[]`；`WIN-01` 为信息项（INFO），不参与评分。
- `src/core/score/`：`RULE_POINTS` 是规则→分值的唯一来源；总分 100，P0 命中封顶 39。
- `src/core/report/`：报告模型、脱敏（`mask.ts`）、Markdown 导出。
- `src/core/analyze.ts`：完整流水线，`fetchFn` / `signal` / `now` / `onStage` 均可注入。
- `src/ui/`：无路由；`?repo=owner/name` 触发分析。

## 约定

- 规则版本常量 `rules-v1`（`src/core/score/items.ts`）。改变检测语义必须升版本，并在 README/技术设计中同步。
- 先写失败测试再实现（TDD）。每个规则 ID 至少 1 正例 + 1 反例；评分边界 100 / 76 / 红线 39 必须覆盖。
- 任何进入报告/DOM/导出的密钥证据都必须先 `maskSecret`；测试密钥字面量运行时拼接。
- 改功能时同步更新 `docs/05-progress.md`（勾选任务 + 追加日志），必要时回写 `docs/01`–`04` 与 README。
- 中文优先、极简文案；页面风格为简易电商风（白底卡片、单一青绿强调色），不引入 UI/图表库。
- 未实现能力必须标注「设计」或「未实现」，不得写成已上线。

## 已知未实现

报告缓存 / 最近体检、HEAD SHA 对比提示、blob SHA 增量重扫、ETag、差异视图、AI 建议（接口占位）、GitHub Pages 正式地址（工作流已就绪，待仓库确认）。
