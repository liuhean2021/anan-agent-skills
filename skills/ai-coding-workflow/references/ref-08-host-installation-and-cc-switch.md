# §13 Claude Code / Codex / Gemini 安装与 CC Switch 切换

> 来源：官方产品文档、官方仓库 README、`cc-switch` Releases / Repository（核对日期：2026-04-11）
> 适用：需要为 AI Coding Workflow 补齐宿主 CLI 安装、首次登录、以及通过 CC Switch 管理 provider / model 切换的场景
> 关联文档：`ref-02-tool-stack.md`

---

## 13.1 目标与边界

本文档只回答 4 件事：

1. 如何安装 `Claude Code`
2. 如何安装 `Codex CLI`
3. 如何安装 `Gemini CLI`
4. 如何安装并使用 `CC Switch` 统一切换 provider / model

**边界说明**：

- `CC Switch` 是第三方桌面工具，不是 Anthropic / OpenAI / Google 官方产品
- `CC Switch` 负责写入和切换配置，不负责给你开通模型权限
- 能否成功切换，取决于上游 provider 是否真的支持目标模型与协议
- 切换 provider / model 后，除 `Claude Code` 外，通常 SHOULD 重启终端或重新启动 CLI 再验证

---

## 13.2 前置条件

建议先准备以下环境：

| 项目 | 建议 |
|------|------|
| Node.js | `Claude Code` / `Codex CLI` 至少 Node.js 18+；`Gemini CLI` 至少 Node.js 20+ |
| 包管理器 | `npm` 必需；macOS / Linux 上 `brew` 可选但推荐 |
| 账号 | Claude 账号、ChatGPT 或 OpenAI API 账号、Google 账号或 Gemini API 访问方式 |
| 系统 | macOS / Linux / Windows；若在 Windows 上使用 `Codex CLI`，优先 WSL |

**最稳妥的安装顺序**：

```text
Node.js / Homebrew
→ Claude Code / Codex CLI / Gemini CLI
→ 各自完成首次登录
→ 安装 CC Switch
→ 在 CC Switch 中统一管理 provider / model
```

---

## 13.3 Claude Code 安装

### 推荐安装方式

```bash
npm install -g @anthropic-ai/claude-code
```

### 官方备选安装方式

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

### 首次登录与验证

```bash
claude
```

首次启动后按提示登录；若需要重新登录，可在会话中执行：

```text
/login
```

**验证标准**：

- 能正常启动 `claude`
- 能进入交互界面
- 能完成一次最小提问，例如“总结当前目录项目结构”

---

## 13.4 OpenAI Codex CLI 安装

### 推荐安装方式

```bash
npm install -g @openai/codex
```

### 官方备选安装方式

```bash
# Homebrew
brew install --cask codex
```

### 启动与登录

```bash
codex
```

或直接执行登录命令：

```bash
codex --login
```

首次运行时按提示选择：

- `Sign in with ChatGPT`
- 或使用 OpenAI API key

**验证标准**：

- `codex` 命令可启动
- 能完成登录
- 能在当前项目目录发起一次最小任务

**补充说明**：

- 官方文档当前仍以 `npm` 安装为主
- 官方说明中，Windows 支持仍偏实验性质；生产使用优先 WSL

---

## 13.5 Google Gemini CLI 安装

### 推荐安装方式

```bash
npm install -g @google/gemini-cli
```

### 官方备选安装方式

```bash
# Homebrew（macOS / Linux）
brew install gemini-cli
```

### 文档中常见但不建议作为主方案的方式

```bash
npx https://github.com/google-gemini/gemini-cli
```

该方式适合一次性试跑；长期使用仍以全局安装为主。

### 受限环境备选

```bash
conda create -y -n gemini_env -c conda-forge nodejs
conda activate gemini_env
npm install -g @google/gemini-cli
```

### 首次启动与验证

```bash
gemini
```

首次运行后按提示完成 Google 账号或 API 访问配置。

**验证标准**：

- `gemini` 命令可启动
- 能完成首次认证
- 能在当前目录执行一次最小问答

**版本通道说明**：

```bash
# Stable
npm install -g @google/gemini-cli@latest

# Preview
npm install -g @google/gemini-cli@preview

# Nightly
npm install -g @google/gemini-cli@nightly
```

除非你明确要验证新特性，否则工作流默认 SHOULD 使用 stable。

---

## 13.6 CC Switch 安装

`CC Switch` 当前用于统一管理 `Claude Code`、`Codex`、`Gemini CLI` 等多种 CLI 的 provider、model、MCP 与 skills 配置。

### 安装前提

- 先完成至少一个目标 CLI 的安装与首次启动
- 优先从 Releases 页面下载最新稳定版，而不是随意使用旧教程里的固定版本号

Releases：

- https://github.com/farion1231/cc-switch/releases

### macOS

```bash
brew tap farion1231/ccswitch
brew install --cask cc-switch
```

升级：

```bash
brew upgrade --cask cc-switch
```

### Windows

从 Releases 页面下载以下其一：

- `CC-Switch-v{version}-Windows.msi`
- `CC-Switch-v{version}-Windows-Portable.zip`

### Linux

从 Releases 页面按发行版选择：

- Debian / Ubuntu：`CC-Switch-v{version}-Linux.deb`
- Fedora / RHEL / openSUSE：`CC-Switch-v{version}-Linux.rpm`
- 通用：`CC-Switch-v{version}-Linux.AppImage`

常用安装命令：

```bash
# Debian / Ubuntu
sudo apt install ./CC-Switch-*.deb

# Fedora / RHEL
sudo dnf install ./CC-Switch-*.rpm

# AppImage
chmod +x CC-Switch-*.AppImage
./CC-Switch-*.AppImage
```

---

## 13.7 用 CC Switch 管理 provider / model

### 推荐操作顺序

1. 启动 `CC Switch`
2. 确认它已识别本机安装的 `Claude Code`、`Codex`、`Gemini CLI`
3. 为每个 app 添加或导入 provider
4. 在对应 app 上选择目标 provider
5. 填写或选择目标 model
6. 执行切换
7. 重启终端或重开对应 CLI 后验证

### 典型切换流程

#### Claude Code

- 选择 `Claude Code`
- 绑定目标 provider
- 切换到目标 Claude 模型
- 回到终端执行 `claude`

#### Codex CLI

- 选择 `Codex`
- 配置 OpenAI 官方或兼容 OpenAI 协议的 provider
- 填写 provider 实际支持的模型名
- 回到终端执行 `codex`

#### Gemini CLI

- 选择 `Gemini CLI`
- 配置 Google 官方或兼容 Gemini / OpenAI 网关能力的 provider
- 填写 provider 实际支持的模型名
- 回到终端执行 `gemini`

### 切换后的验证方式

每次切换后，至少做以下验证：

1. CLI 能正常启动，没有配置文件报错
2. 能完成一次最小请求
3. 返回结果没有鉴权失败、模型不存在、协议不兼容等错误

若切换后失败，优先检查：

- API base URL 是否匹配该 CLI 的协议预期
- model id 是否为 provider 真实支持的名称
- API key 是否属于当前 provider
- CLI 是否仍在使用旧终端进程缓存的配置

---

## 13.8 在 AI Coding Workflow 中的建议用法

推荐职责分工如下：

| 工具 | 建议角色 |
|------|---------|
| Claude Code | 主力执行 agent |
| Codex CLI | 辅助实现 / 交叉审查 / 局部验证 |
| Gemini CLI | 辅助审查 / 文档整理 / 可读性与交互反馈 |
| CC Switch | 多 CLI 的统一 provider / model 管理层 |

**建议原则**：

- 日常主链路仍以 `Claude Code` 或当前主宿主为准
- `CC Switch` 适合管理多宿主配置，不适合替代工作流本身
- 同一任务切多模型前，先确认“换模型”是为了解决具体问题，而不是泛化尝试

---

## 13.9 常见坑

### 1. CLI 装好了，但切换后仍像没生效

优先重启终端或重开 CLI 进程。`CC Switch` 已写入配置，不代表当前 shell 会话一定立即读取新配置。

### 2. 切到新模型后报“不存在”或“无权限”

通常不是 `CC Switch` 本身坏了，而是：

- provider 不支持该模型
- 当前 key 没有该模型权限
- 该 CLI 预期的协议与 provider 实际返回格式不兼容

### 3. 同一个 provider 在三个 CLI 上不能完全复用

这是正常情况。即使都叫“兼容网关”，它们对字段名、认证方式、模型名、MCP / skills 同步能力也可能不同。

### 4. 安装命令能跑，但全局命令找不到

先检查：

```bash
node -v
npm -v
which claude
which codex
which gemini
```

若 `npm install -g` 成功但命令不存在，通常是全局 npm bin 未加入 `PATH`。

---

## 13.10 外部参考

- Claude Code Quickstart: https://docs.anthropic.com/en/docs/claude-code/quickstart
- Claude Code Setup: https://docs.anthropic.com/en/docs/claude-code/setup
- Codex CLI Docs: https://developers.openai.com/codex/cli
- Codex CLI Repository: https://github.com/openai/codex
- Codex CLI Sign in with ChatGPT: https://help.openai.com/en/articles/11381614-codex-cli-and-sign-in-with-chatgpt
- Gemini CLI Repository: https://github.com/google-gemini/gemini-cli
- CC Switch Repository: https://github.com/farion1231/cc-switch
- CC Switch Releases: https://github.com/farion1231/cc-switch/releases
