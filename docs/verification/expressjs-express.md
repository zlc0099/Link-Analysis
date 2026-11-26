# Link-Analysis 接入体检报告

- 仓库：expressjs/express @ master @ 43fca52
- 提交：43fca52d28a422c8be48fd489cbd4f2d6152bab6
- 分析时间：2026-11-26T06:22:42.763Z
- 规则版本：rules-v1 · 应用版本：0.1.0
- 覆盖率：已分析 211 / 211（候选 211）
- 数据完整性：完整

## 结论

**73 / B** — 小修后接入：按清单补齐 P1 项即可

| 维度 | 得分 |
| --- | --- |
| 文档完备 | 16 / 20 |
| 依赖可复现 | 14 / 20 |
| 启动清晰 | 3 / 20 |
| 跨平台友好 | 20 / 20 |
| 安全合规 | 20 / 20 |

## 主要风险（P0 / P1）

### [P1] 未发现启动线索
- 规则：RUN-01
- 位置：（仓库级）
- 影响：接手者无法判断项目怎么启动，接入前需要额外沟通。
- 建议：提供启动方式：package.json scripts、Makefile、Dockerfile / compose，或 run/start 脚本。

## 次要问题（P2 / P3）

### [P2] 未证明可跨平台启动
- 规则：RUN-04
- 位置：（仓库级）
- 影响：没有任何启动线索，无法证明项目可在 macOS / Linux 或 CI 上启动。
- 建议：补充跨平台启动方式，并在 README 写明启动命令。

### [P2] README 未说明配置或环境变量
- 规则：DOC-03
- 位置：Readme.md
- 影响：运行时配置来源不清晰，容易出现「本地能跑、部署就挂」。
- 建议：在 README 中说明需要的配置项、环境变量与示例文件（如 .env.example）。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/Readme.md

### [P2] README 未给出启动命令
- 规则：RUN-02
- 位置：Readme.md
- 影响：文档与代码脱节，接手者需要自己摸索启动命令。
- 建议：在 README 中给出可直接复制的启动命令（如 npm run dev / docker compose up）。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/Readme.md

### [P2] 缺少锁文件或固定版本
- 规则：DEP-02
- 位置：package.json
- 证据：清单：package.json；未发现对应锁文件
- 影响：依赖版本漂移，构建不可复现，不同机器安装结果可能不同。
- 建议：提交 lockfile（package-lock.json / poetry.lock / go.sum 等）并固定版本。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/package.json

## 信息项

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-04
- 位置：test/res.json.js:124
- 证据：\\u003cscript\\u003e
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/test/res.json.js#L124

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-04
- 位置：test/res.jsonp.js:327
- 证据：\\u2028\\u003cscript\\u003e\\u2029
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/test/res.jsonp.js#L327

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-04
- 位置：test/res.location.js:297
- 证据：file:///etc\\passwd
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/test/res.location.js#L297

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-04
- 位置：test/res.location.js:298
- 证据：file:///etc\\passwd
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/test/res.location.js#L298

## 评分明细

| 维度 | 规则 | 状态 | 得分 |
| --- | --- | --- | --- |
| 文档完备 | DOC-01 README 存在 | 通过 | 8 / 8 |
| 文档完备 | DOC-02 安装 / 构建说明 | 通过 | 6 / 6 |
| 文档完备 | DOC-03 配置 / 环境变量说明 | 失败 | 0 / 4 |
| 文档完备 | DOC-04 结构质量 | 通过 | 2 / 2 |
| 依赖可复现 | DEP-01 依赖清单存在 | 通过 | 10 / 10 |
| 依赖可复现 | DEP-02 锁文件 / 固定版本 | 失败 | 0 / 6 |
| 依赖可复现 | DEP-03 清单可解析 | 通过 | 4 / 4 |
| 启动清晰 | RUN-01 启动线索 | 失败 | 0 / 8 |
| 启动清晰 | RUN-02 README 启动命令 | 失败 | 0 / 6 |
| 启动清晰 | RUN-03 运行时版本声明 | 通过 | 3 / 3 |
| 启动清晰 | RUN-04 跨平台启动 | 失败 | 0 / 3 |
| 跨平台友好 | PATH-01 Windows 盘符路径 | 通过 | 8 / 8 |
| 跨平台友好 | PATH-02 macOS 用户路径 | 通过 | 5 / 5 |
| 跨平台友好 | PATH-03 Linux 用户目录 | 通过 | 4 / 4 |
| 跨平台友好 | PATH-04 file:// 或 UNC | 通过 | 3 / 3 |
| 安全合规 | SEC-01 私钥 | 通过 | 8 / 8 |
| 安全合规 | SEC-02 .env 入库 | 通过 | 6 / 6 |
| 安全合规 | SEC-03 高置信 Key | 通过 | 4 / 4 |
| 安全合规 | SEC-04 其他敏感信息 | 通过 | 2 / 2 |

## 已知限制

- 静态扫描，不执行代码、不安装依赖；「能否运行」仅依据线索与文档判断。
- 仅分析默认分支的当前快照，不检查 Git 历史。
- 密钥检测基于模式与启发式，存在误报 / 漏报，不替代安全审计。
- 分析上限 400 个文件、单文件 512KB；超大仓库覆盖率会下降。

---

由 Link-Analysis 生成。静态扫描，不执行代码；结果仅供参考，不替代安全审计。