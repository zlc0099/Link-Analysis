# 真实仓库验证记录

生成命令：

```bash
npm run verify:repos
```

脚本 `scripts/verify-real.ts` 调用与前端完全相同的 `analyzeRepo` 流水线（Node 侧 fetch），对以下仓库生成 JSON 摘要与 Markdown 报告：

| 仓库 | commit | 覆盖 | 得分 | 生成时间（UTC） |
| --- | --- | --- | --- | --- |
| expressjs/express | `43fca52d28a422c8be48fd489cbd4f2d6152bab6` | 211 / 211 | 73 / B | 2026-11-26T06:22:42Z |
| pallets/flask | `49943b5a94413a530761350f04e896f76e8d620e` | 224 / 224 | 76 / B | 2026-11-26T06:22:56Z |
| cmderdev/cmder | `5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2` | 40 / 40 | 85 / A | 2026-11-26T06:23:09Z |

说明：

- 记录只在 `analyzed === selected` 且无失败文件时写入正式文件；网络或限流导致的不完整结果写到 `.partial.*`，不会覆盖完整记录。
- 浏览器侧对 `expressjs/express` 另做过一次真实 E2E（211/211、73/B），截图见 `docs/screenshots/real-express.png`。
- 规则版本 `rules-v1`；分析时间为 UTC，页面会转成本地时间展示。
