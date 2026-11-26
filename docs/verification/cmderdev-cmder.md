# Link-Analysis 接入体检报告

- 仓库：cmderdev/cmder @ master @ 5655c5e
- 提交：5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2
- 分析时间：2026-11-26T06:23:09.885Z
- 规则版本：rules-v1 · 应用版本：0.1.0
- 覆盖率：已分析 40 / 40（候选 40）
- 数据完整性：完整

## 结论

**85 / A** — 可直接接入：文档、依赖、启动与安全基线齐全

| 维度 | 得分 |
| --- | --- |
| 文档完备 | 20 / 20 |
| 依赖可复现 | 14 / 20 |
| 启动清晰 | 11 / 20 |
| 跨平台友好 | 20 / 20 |
| 安全合规 | 20 / 20 |

## 主要风险（P0 / P1）

未发现 P0 / P1 风险。

## 次要问题（P2 / P3）

### [P2] README 未给出启动命令
- 规则：RUN-02
- 位置：README.md
- 影响：文档与代码脱节，接手者需要自己摸索启动命令。
- 建议：在 README 中给出可直接复制的启动命令（如 npm run dev / docker compose up）。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/README.md

### [P3] 未声明运行时版本
- 规则：RUN-03
- 位置：（仓库级）
- 影响：不同机器 Node/Python/JDK 版本不一致时可能出现「我这儿能跑」。
- 建议：添加 .nvmrc / .python-version / engines / go 指令等版本声明。

## 信息项

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：Cmder.bat
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/Cmder.bat

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-01
- 位置：README.md:19
- 证据：C:\Program
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/README.md#L19

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-01
- 位置：README.md:35
- 证据：c:\users\[username]\cmder_config
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/README.md#L35

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-01
- 位置：README.md:315
- 证据：C:\Users\user\cmderdev\vendor\bin\cexec.cmd
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/README.md#L315

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-01
- 位置：README.md:323
- 证据：C:\Users\user\cmderdev\vendor\bin\cexec.cmd
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/README.md#L323

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/build.ps1
- 证据：推测作用：build
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/build.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/check-trailing-whitespace.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/check-trailing-whitespace.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/pack.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/pack.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/test-build-helpers.ps1
- 证据：推测作用：build
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-build-helpers.ps1

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-01
- 位置：scripts/test-build-helpers.ps1:66
- 证据：C:\outside
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-build-helpers.ps1#L66

### [INFO] 文档/脚本中的绝对路径（仅提示，不计分）
- 规则：PATH-04
- 位置：scripts/test-build-helpers.ps1:66
- 证据：\\server\share
- 影响：示例中的绝对路径可能误导使用者，但不影响接入评分。
- 建议：如为示例，可改为通用占位路径。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-build-helpers.ps1#L66

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/test-git-layout.ps1
- 证据：推测作用：test
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-git-layout.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/test-shell-detection.ps1
- 证据：推测作用：test
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-shell-detection.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/test-update.ps1
- 证据：推测作用：test
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-update.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/test-vendor-badges.ps1
- 证据：推测作用：test
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/test-vendor-badges.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/update.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/update.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：scripts/utils.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/scripts/utils.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/alias.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/alias.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/cexec.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/cexec.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/cmder_diag.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/cmder_diag.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/cmder_diag.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/cmder_diag.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/cmder_shell.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/cmder_shell.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/create-cmdercfg.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/create-cmdercfg.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/create-cmdercfg.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/create-cmdercfg.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/excd.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/excd.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/timer.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/timer.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/bin/vscode_init.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/bin/vscode_init.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/init.bat
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/init.bat

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/init.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/init.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/lib/lib_base.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/lib/lib_base.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/lib/lib_console.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/lib/lib_console.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/lib/lib_git.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/lib/lib_git.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/lib/lib_path.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/lib/lib_path.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/lib/lib_profile.cmd
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/lib/lib_profile.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/profile.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/profile.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/psmodules/Cmder.ps1
- 证据：推测作用：unknown
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/psmodules/Cmder.ps1

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/start_git_bash.cmd
- 证据：推测作用：start/run
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/start_git_bash.cmd

### [INFO] Windows 专用脚本（信息项）
- 规则：WIN-01
- 位置：vendor/start_git_mintty.cmd
- 证据：推测作用：start/run
- 影响：仅在 Windows 上可用；是否构成问题取决于项目是否声明跨平台支持。
- 建议：如项目需要跨平台，补充 .sh / npm scripts / Docker 等价启动方式。
- 链接：https://github.com/cmderdev/cmder/blob/5655c5eb90a075b8bcdd8617bd331bd3dd96c5c2/vendor/start_git_mintty.cmd

## 评分明细

| 维度 | 规则 | 状态 | 得分 |
| --- | --- | --- | --- |
| 文档完备 | DOC-01 README 存在 | 通过 | 8 / 8 |
| 文档完备 | DOC-02 安装 / 构建说明 | 通过 | 6 / 6 |
| 文档完备 | DOC-03 配置 / 环境变量说明 | 通过 | 4 / 4 |
| 文档完备 | DOC-04 结构质量 | 通过 | 2 / 2 |
| 依赖可复现 | DEP-01 依赖清单存在 | 通过 | 10 / 10 |
| 依赖可复现 | DEP-02 锁文件 / 固定版本 | 不适用 | 0 / 6 |
| 依赖可复现 | DEP-03 清单可解析 | 通过 | 4 / 4 |
| 启动清晰 | RUN-01 启动线索 | 通过 | 8 / 8 |
| 启动清晰 | RUN-02 README 启动命令 | 失败 | 0 / 6 |
| 启动清晰 | RUN-03 运行时版本声明 | 失败 | 0 / 3 |
| 启动清晰 | RUN-04 跨平台启动 | 通过 | 3 / 3 |
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