# 检查规则与评分模型

> 版本：v0.1（设计草案）｜日期：2026-11-26｜状态：待评审
> 关联：[需求与范围](./01-requirements.md) · [技术设计](./03-technical-design.md) · [开发计划](./04-development-plan.md)

## 1. 设计原则

1. **静态只读**：只读取文件内容与文件名，不执行代码、不安装依赖、不访问仓库内链接。
2. **可解释**：每条失分/风险都有规则 ID、严重级、证据（文件:行）与修复建议。
3. **宁缺勿滥**：低置信线索标「待确认」，示例/占位符过滤优先于「多报」。
4. **安全展示**：密钥只展示脱敏片段，绝不展示完整值，也不提供复制入口。
5. **诚实**：静态扫描不保证穷尽；覆盖率不足时明确提示，不伪造分数。

## 2. 数据采集与覆盖

### 2.1 数据来源

| 数据 | 端点 | API 额度 |
|---|---|---|
| 仓库元信息 | `GET /repos/{owner}/{repo}` | 1 次 |
| HEAD commit | `GET /repos/{owner}/{repo}/commits/{branch}` | 1 次 |
| 文件树（递归） | `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` | 1 次 |
| 文件内容 | `https://raw.githubusercontent.com/{owner}/{repo}/{sha}/{path}` | 不占 API 额度 |
| 内容兜底 | `GET /repos/{owner}/{repo}/contents/{path}?ref={sha}` | 1 次 / 文件 |

一次全新体检约 3 次 API 调用 + N 次 raw 请求；匿名额度 60 次/小时/IP，Token 为 5000 次/小时。

### 2.2 文件筛选

**排除目录**（任意层级）：

```text
node_modules  dist  build  out  target  vendor  third_party
.next  .nuxt  coverage  .venv  venv  __pycache__
**/bin/Debug/**  **/bin/Release/**  **/obj/**
```

**排除文件**：图片/字体/音视频/压缩包/PDF/可执行文件等二进制；`*.min.js`、`*.map`；锁文件内容（只检测存在性，不扫描内容）。

**可分析扩展名**（白名单）：

```text
md mdx rst txt
js ts jsx tsx mjs cjs vue svelte
py java kt gradle go rs php rb cs c h cpp hpp
sh bash zsh fish bat cmd ps1 vbs
json yaml yml toml ini conf properties env xml
html css scss less sql
```

**优先级**（用于 400 文件上限）：

1. README、依赖清单、`.env*`、版本文件
2. 启动脚本、Dockerfile、compose、Makefile、CI 配置
3. 源码
4. 其他文档

同一优先级内按路径深度与字母序稳定排序，保证结果可复现。

**上限**：≤400 个内容文件、单文件 ≤512KB、总扫描字节 ≤20MB、并发 6。

**覆盖率定义**：

- `eligible`：通过目录排除与扩展名白名单、且 ≤512KB 的可分析文件总数
- `selected`：按优先级截断到 400 的文件
- `analyzed`：成功拉取并完成规则分析的文件数
- 报告展示：`已分析 analyzed / selected（eligible 总量）`；Tree 截断或读取失败时标记「数据不完整」

覆盖率**不改变**评分口径，只在报告与导出中显式提示，避免「少扫 = 高分」的误导。

### 2.3 文件分类（用于严重级与降级）

| 分类 | 判定 |
|---|---|
| readme | 根目录或 `docs/` 下 `README.md/mdx/rst/txt`（不区分大小写） |
| manifest | §3.2 清单列表 |
| lockfile | §3.2 锁文件列表 |
| script | `.sh/.bash/.zsh/.fish/.bat/.cmd/.ps1/.vbs` |
| config | yml/yaml/toml/ini/conf/properties/env/xml，且非 manifest |
| source | 其余代码扩展名 |
| doc | 非 README 的 md/mdx/rst/txt |
| test | 路径命中 `test/tests/spec/specs/fixture/fixtures/example/examples/demo/samples/mocks` |
| ci | `.github/workflows/**`、`.gitlab-ci.yml`、`Jenkinsfile`、`azure-pipelines.yml` |

路径类与密钥类规则按分类决定严重级：`source/config` 参与计分；`doc/test` 只提示或降级，避免误伤示例。

## 3. 规则目录

规则 ID 稳定不变；每条规则对应一个评分分项（WIN-01 除外，属信息项）。严重级 P0–P3 见 §5。

### 3.1 文档（20 分）

| 规则 | 检查项 | 通过条件 | 分值 | 严重级（失败时） |
|---|---|---|---|---|
| DOC-01 | README 存在 | 根目录或 `docs/` 下存在 README（md/mdx/rst/txt） | 8 | P1 |
| DOC-02 | 安装 / 构建说明 | README 含安装或构建关键词，或含安装/构建命令代码块 | 6 | P2 |
| DOC-03 | 配置 / 环境变量说明 | README 含 config/env/environment/.env/配置/环境变量 等关键词 | 4 | P2 |
| DOC-04 | 结构质量 | ≥3 个标题且去空白正文 ≥400 字符 | 2 | P3 |

判定细节：

- DOC-02 关键词：install、setup、build、requirements、安装、构建、环境准备；同时识别 `npm install`、`pip install`、`mvn`、`gradle`、`go mod download`、`cargo build`、`composer install`、`bundle install` 等代码块命令
- DOC-03 关键词：config、configuration、environment、env、`.env`、环境变量、配置
- DOC-04 只看长度与标题数量；前 300 字符出现 `your project`、`项目名称`、`TODO` 等模板占位时判失败
- README 不存在时，DOC-02/03/04 记为「不适用」并计 0 分（避免重复惩罚）

### 3.2 依赖（20 分）

识别清单（根目录 + 一层子目录）：

| 生态 | 依赖清单 |
|---|---|
| Node | `package.json` |
| Python | `requirements*.txt`、`pyproject.toml`、`Pipfile`、`setup.py`、`environment.yml` |
| Java | `pom.xml`、`build.gradle`、`build.gradle.kts` |
| Go | `go.mod` |
| Rust | `Cargo.toml` |
| PHP | `composer.json` |
| Ruby | `Gemfile` |
| .NET | `*.csproj`、`*.sln` |
| Dart | `pubspec.yaml` |
| C/C++ | `CMakeLists.txt`、`Makefile` |
| Elixir | `mix.exs` |
| Swift | `Package.swift` |

| 规则 | 检查项 | 通过条件 | 分值 | 严重级 |
|---|---|---|---|---|
| DEP-01 | 依赖清单存在 | 命中上表任一清单 | 10 | P1 |
| DEP-02 | 锁文件 / 固定版本 | 按生态惯例存在锁文件或固定版本声明 | 6 | P2 |
| DEP-03 | 清单可解析 | JSON 类清单可正常解析；其他类型仅检查存在与可读 | 4 | P1 |

锁文件惯例（缺失处理）：

| 生态 | 认可文件 | 缺失 |
|---|---|---|
| Node | `package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`、`bun.lockb` | 失分 |
| Python | `poetry.lock`、`Pipfile.lock`、`uv.lock`；或 `requirements*.txt` 中 ≥80% 非注释行使用 `==`/`===` 固定 | 失分 |
| PHP | `composer.lock` | 失分 |
| Ruby | `Gemfile.lock` | 失分 |
| Go | `go.sum` | 失分 |
| Rust | `Cargo.lock`（库项目可省略） | 不适用，仅提示 |
| Java / .NET / Dart | 无统一锁惯例 | 不适用，仅提示 |

说明：

- 无清单时，DEP-02/03 不适用，依赖维度为 0 分
- Monorepo 出现多个清单时全部列出（信息项），不额外扣分
- 锁文件内容不参与密钥扫描，只检测存在性

### 3.3 启动（20 分）

| 规则 | 检查项 | 通过条件 | 分值 | 严重级 |
|---|---|---|---|---|
| RUN-01 | 启动线索 | 存在任一启动方式（见下） | 8 | P1 |
| RUN-02 | README 启动命令 | README 代码块或正文含启动命令（见下） | 6 | P2 |
| RUN-03 | 运行时版本声明 | 存在版本声明文件或字段 | 3 | P3 |
| RUN-04 | 跨平台启动 | 存在非 Windows 启动方式，且 README 不只给 Windows 命令 | 3 | P2 |

启动线索：

- `package.json` scripts 含 `dev` / `start` / `serve` / `preview`
- `Makefile` 含 `run` / `start` / `dev` 目标
- `docker-compose.yml` / `docker-compose.yaml` / `compose.yaml`
- `Dockerfile`
- 文件名含 run/start/dev 的 `.sh/.bat/.cmd/.ps1`
- `Procfile`

README 启动命令（示例）：`npm run dev`、`yarn dev`、`pnpm dev`、`mvn spring-boot:run`、`./mvnw`、`gradle bootRun`、`python main.py`、`flask run`、`uvicorn`、`gunicorn`、`go run`、`cargo run`、`dotnet run`、`docker compose up`、`make run`、`java -jar`。

版本声明：`.nvmrc`、`.node-version`、`.tool-versions`、`.python-version`、`rust-toolchain(.toml)`、`global.json`、`package.json` 的 `engines`、`pyproject.toml` 的 `requires-python`、`pom.xml` 的编译器版本、`go.mod` 的 `go` 指令。

RUN-04 判定：

- 通过：存在任一非 Windows 启动线索，或 README 给出跨平台命令
- 失败：启动线索只有 `.bat/.cmd/.ps1`，且 README 只给 Windows 命令
- 无任何启动线索时，RUN-01 与 RUN-04 均为 0（「未证明可启动」）

### 3.4 跨平台（20 分）

计分范围：`source/config` 且非 test/fixture 路径；`doc/test` 命中只记「提示」，不扣分。

| 规则 | 检查项 | 判定示例 | 分值 | 严重级 |
|---|---|---|---|---|
| PATH-01 | Windows 盘符路径 | `C:\Users\li\...`、`D:/work/app` | 8 | P1（源码/配置） |
| PATH-02 | macOS 用户路径 | `/Users/li/project/...` | 5 | P1 |
| PATH-03 | Linux 用户目录 | `/home/li/project/...` | 4 | P2 |
| PATH-04 | file:// 或 UNC | `file:///C:/...`、`\\server\share\...` | 3 | P2 |

判定细节：

- 盘符路径需位于行首、空白、引号、括号、等号之后，避免把 `https://` 误判为盘符
- `/Users/`、`/home/` 排除通用账号：`Shared`、`user`、`username`、`runner`、`ubuntu`、`node`、`example`、`${...}`、`<...>`
- 每条规则最多展示 5 条证据，并显示总命中数；计分按「是否命中」一次性扣分，不按次数累计
- 超长行（>2000 字符，多为压缩产物）跳过
- 路径证据不做脱敏（公开仓库内容），但截断到 160 字符

**Windows 专用脚本（WIN-01，信息项，不扣分）**

- 检出扩展名：`.bat`、`.cmd`、`.ps1`、`.vbs`
- 展示：文件路径（commit 固定链接）、作用猜测（install/setup/start/run/build/test/deploy）、是否唯一启动方式
- 若为唯一启动方式，触发 RUN-04 失分（跨平台启动 3 分）

### 3.5 安全（20 分）

| 规则 | 检查项 | 通过条件 | 分值 | 严重级 |
|---|---|---|---|---|
| SEC-01 | 私钥 | 未检出私钥头 / 私钥文件内容 | 8 | P0 |
| SEC-02 | `.env` 入库 | 未检出非模板 `.env` 文件 | 6 | P0（真实值）/ P2（占位值） |
| SEC-03 | 高置信 Key | 未检出高置信凭证模式 | 4 | P0（源码/配置）/ P1（文档、测试） |
| SEC-04 | 其他敏感 | 未检出 Bearer 令牌或凭证文件 | 2 | P1 |

**SEC-01 私钥**：内容含 `-----BEGIN ... PRIVATE KEY-----`；命中即 P0（测试/示例目录降为 P1，不封顶）。

**SEC-02 `.env` 入库**：文件名为 `.env` 或 `.env.*`，排除 `.env.example / .sample / .template / .dist`。

- 含非占位赋值（值长度 ≥6）→ P0，总分封顶
- 仅空值 / 占位值 → P2（仍判 SEC-02 失败，扣 6 分，但不封顶）

**SEC-03 高置信 Key 模式**：

| 类型 | 模式（示意） |
|---|---|
| OpenAI / DashScope / DeepSeek | `sk-` + 20 位以上字母数字/下划线/连字符 |
| 腾讯云 | `AKID` + 13 位以上字母数字 |
| AWS | `AKIA` + 16 位大写字母/数字 |
| Google | `AIza` + 35 位 |
| GitHub | `ghp_` + 36 位；`github_pat_` + 22 位以上 |
| GitLab | `glpat-` + 20 位以上 |
| Stripe | `sk_live_` + 24 位以上 |
| Slack | `xoxb-` / `xoxp-` 等 + 10 位以上 |

- 命中于 `source/config` 且非 test/fixture → P0，总分封顶
- 命中于 README/docs/test/fixture → P1「待确认」，不封顶（示例代码常见）

**SEC-04 其他敏感**：

- 源码/配置中的长 `Bearer` 令牌（≥20 位）→ P1
- 凭证类文件：`id_rsa`、`id_dsa`、`*.pem`、`*.pfx`、`*.p12`、`*.jks`、`credentials.json` → P1
- 通用赋值：`password|passwd|pwd|secret|token|api_key` 后跟 ≥8 位字符串 → P2「待确认」（仅提示，不影响分数）

**占位符白名单**（命中则不判风险）：

```text
xxx  xxxx  ***  your  your_  example  sample  demo  dummy  test
changeme  placeholder  <...>  ${...}  {{...}}
process.env  os.getenv  System.getenv  env(
```

另加：纯重复字符（如 `00000000`）、明显低熵值不判为真实密钥。

**脱敏规则**：

- 一般密钥：仅展示前 4 位 + `****` + 后 2 位（短值只展示前 2 位 + `****`）
- 私钥：只展示类型（如 `RSA PRIVATE KEY`）与文件路径，不展示内容
- `.env`：只展示变量名列表，不展示值
- 不提供「查看完整值」「复制」入口；页面与导出均用脱敏结果

## 4. 评分模型

### 4.1 分项与权重

| 维度 | 满分 | 分项（规则 → 分值） |
|---|---|---|
| 文档完备 | 20 | DOC-01→8，DOC-02→6，DOC-03→4，DOC-04→2 |
| 依赖可复现 | 20 | DEP-01→10，DEP-02→6，DEP-03→4 |
| 启动清晰 | 20 | RUN-01→8，RUN-02→6，RUN-03→3，RUN-04→3 |
| 跨平台友好 | 20 | PATH-01→8，PATH-02→5，PATH-03→4，PATH-04→3 |
| 安全合规 | 20 | SEC-01→8，SEC-02→6，SEC-03→4，SEC-04→2 |

### 4.2 计算与红线

- 分项通过 = 得满分；失败 = 0；不适用 = 0（文档缺 README、依赖缺清单等）
- 维度分 = 分项得分之和；总分 = 五维之和（0–100）
- **P0 红线**：SEC-01（非测试路径私钥）、SEC-02（真实值 `.env`）、SEC-03（非文档/测试路径高置信 Key）任一命中 → `official = min(raw, 39)`
- 报告展示 `raw` 与 `official`：如「原始分 56 → 触发红线，封顶 39」
- 评分不因覆盖率调整；覆盖率通过横幅与导出字段单独披露

### 4.3 等级与结论

| 分数 | 等级 | 结论文案 |
|---|---|---|
| ≥85 | A | 可直接接入：文档、依赖、启动与安全基线齐全 |
| 70–84 | B | 小修后接入：按清单补齐 P1 项即可 |
| 50–69 | C | 需专人梳理：存在多项接入缺口，建议安排环境梳理 |
| <50 | D | 不建议直接接入：存在红线风险或关键缺口，先修复再评估 |

P0 命中时，结论追加「触发安全红线：总分封顶 39」。

### 4.4 评分示例

**示例 A：干净仓库（100 / A）**

```text
文档 8+6+4+2 = 20
依赖 10+6+4 = 20
启动 8+6+3+3 = 20
跨平台 8+5+4+3 = 20
安全 8+6+4+2 = 20
合计 100
```

**示例 B：典型小仓库（76 / B）**

```text
文档 8+6+0+2 = 16        # README 有安装说明，无配置说明
依赖 10+0+4 = 14         # 有 package.json，无锁文件
启动 8+0+0+3 = 11        # 有 scripts，README 无启动命令，无版本声明
跨平台 8+0+4+3 = 15      # 一处 /Users/ 路径
安全 8+6+4+2 = 20
合计 76
```

**示例 C：红线仓库（原始 56 → 封顶 39 / D）**

```text
文档 8+0+0+0 = 8         # README 过短，无安装/配置说明
依赖 10+0+4 = 14
启动 8+0+0+0 = 8         # 仅有 .bat 启动，README 无启动命令，无版本声明
跨平台 0+5+4+3 = 12      # 检出 C:\ 盘符路径
安全 8+0+4+2 = 14        # .env 入库（真实值）
合计 56 → P0 封顶 → 39
```

### 4.5 评分明细呈现

报告页提供「评分明细」：每个分项显示状态（通过 / 失败 / 不适用）、得分、规则 ID、命中证据（若有）。导出 Markdown 包含同样内容，任何分数都能追溯到具体判定。

## 5. 风险清单

### 5.1 严重级

| 级别 | 定义 | 例子 |
|---|---|---|
| P0 红线 | 必须处理后才建议接入 | 私钥、真实 `.env`、高置信 Key |
| P1 高 | 直接阻碍或显著影响接入 | 无 README/清单/启动方式、源码个人绝对路径、清单解析失败 |
| P2 中 | 影响可复现性或跨平台 | 无锁文件、无配置说明、仅 Windows 启动、`/home/` 路径、占位 `.env` |
| P3 低 | 完善项 | README 过短、无版本声明 |
| INFO | 信息项，不计分 | Windows 脚本清单、CI 存在性、多清单提示 |

### 5.2 风险条目字段

`规则 ID`、`严重级`、`置信度`（高 / 中 / 待确认）、`标题`、`文件:行`、`脱敏证据`、`影响`、`修复建议`、`commit 固定链接`。

### 5.3 展示与排序

- 「主要风险清单」= P0 + P1，按严重级、维度顺序、文件路径排序
- P2/P3 折叠展示；INFO 在各自分区展示（如 Windows 脚本）
- 每条风险的建议保持一句话可执行，例如：
  - 私钥：「立即撤销该密钥、从 Git 历史移除，并更换新凭证」
  - `.env`：「移除文件、轮换其中全部密钥，加入 `.gitignore` 并提供 `.env.example`」
  - 盘符路径：「改为相对路径或环境变量，避免绑定个人机器」
  - 无锁文件：「提交 lockfile 并固定版本，保证构建可复现」

## 6. 异常矩阵

| 场景 | 检测 | 用户提示 / 兜底 |
|---|---|---|
| 非 GitHub 域名 | URL 解析 | 「当前仅支持 GitHub 公开仓库」 |
| URL 格式错误 | 正则 / 解析 | 就地提示，不发起请求 |
| 仓库不存在 / 私有 / 改名 | 404 | 「不存在、已改名，或为非公开仓库」 |
| 空仓库 | 409 / 无 commit | 特殊空报告，不输出分数 |
| 匿名限流 | 403 + `x-ratelimit-remaining: 0` | 显示重置时间 + Token 入口；有缓存则展示旧报告并标「可能过期」 |
| 二级限流 | 429 / `retry-after` | 提示稍后重试，禁用按钮倒计时 |
| Token 失效 | 401 | 回退匿名请求一次并提示；不自动清除 Token |
| 文件树截断 | `truncated: true` | 「仓库过大，仅分析返回的部分文件」横幅 |
| 文件树为空 | 无文件 | 「仓库无可分析文件」空报告 |
| 单文件拉取失败 | raw 404/5xx | 用 contents API 兜底一次；仍失败则跳过并计数 |
| 二进制 / 超大文件 | 扩展名 / 大小 | 跳过并计数，不计入失败 |
| 指定 `/tree/`、`/blob/` 链接 | URL 解析 | 归一到仓库根，按默认分支分析并提示 |
| 子模块 | tree 中 `type: commit` | 不展开，提示「子模块内容未分析」 |
| 归档仓库 | `archived: true` | 顶部提示，不影响评分 |
| 网络失败 / 超时 | fetch 异常 | 退避重试 1 次；仍失败给「重试」按钮 |
| 用户取消 | AbortController | 终止未完成请求，回到首页并保留输入 |
| localStorage 不可用 | 隐私模式 | 禁用缓存与 Token 保存，仅本次会话可用 |
| API 返回结构异常 | 字段校验 | 通用错误 + 可展开详情，不渲染半成品报告 |

## 7. 脱敏与隐私

- 页面不渲染、导出不包含完整密钥；所有证据在进入报告数据模型前完成脱敏
- Token 仅存 `localStorage`，不进 URL、日志、报告或导出文件；仅发送至 `api.github.com`
- 不接入任何统计 / 追踪脚本；仅请求 GitHub API 与 raw 文件
- 截图与 README 示例只使用演示仓库 / 本地 fixture；不展示真实仓库的密钥证据
- 发现真实仓库密钥时，报告只提示「疑似泄漏」，不提供可复制的原始值

## 8. 规则版本与可测试性

- 规则版本常量 `rules-v1` 写入报告与缓存键；检测语义变化必须升版本，使缓存失效
- 每个规则 ID 至少 1 个正例 + 1 个反例；评分边界（100 / 76 / 红线封顶）必须单测
- fixture 使用内存文件树，密钥类字面量在测试运行时拼接（避免把真实格式的 Key 提交进仓库）
- 同一 commit + 同一规则版本 + 同一扫描范围 → 评分与排序必须完全一致（确定性）

## 9. 已知限制

- 启发式检测存在误报/漏报；不是安全审计工具，不替代专业密钥扫描
- 不执行代码，无法判断项目「实际能否运行」；只判断线索与文档是否齐全
- 仅分析默认分支的当前快照，不查 Git 历史（历史泄漏检测不在本期）
- 超大仓库会触达 400 文件上限，覆盖率与结论可能偏差
- Monorepo 只扫描根目录与一层子目录，深层模块可能未覆盖
- 私有仓库、子模块、LFS 指针文件不在本期范围