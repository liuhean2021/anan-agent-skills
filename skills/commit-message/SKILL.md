---
name: commit-message
description: 根据 git diff 生成符合规范的 commit message；生成后提示用户确认是否发起 commit（不 push），确认后再执行 git commit。当用户说「提交」「commit」或要求生成提交信息时使用。输出格式为：提交类型 + 分支名 + 摘要，缩进列表说明改动，结尾带 Authored-by 署名，无多余内容、无空白行。
---
# 根据 git diff 生成 commit message
## 触发条件
用户提问包含「提交」或「commit」时应用本技能。
## 执行步骤
1. **获取变更与 Git 信息**
   - 暂存区变更：`git diff --cached`（有则优先基于此生成）
   - 若无暂存区变更：`git diff`
   - 当前分支：`git rev-parse --abbrev-ref HEAD`
   - 提交者：`git config user.name`、`git config user.email`
2. **选择提交类型（首行关键词）**
   - `fix`：修复 bug
   - `feat`：新功能
   - `refactor`：重构（无新功能、非修 bug）
   - `chore`：构建/工具/依赖等杂项
   - `docs`：文档
   - `style`：格式（不影响逻辑）
   - `test`：测试
   - `perf`：性能
3. **生成内容**
   - 仅输出最终 commit message 正文，不要解释、不要「建议如下」等旁白。
   - 格式必须严格按下方模板，无空白行、无多余说明。
4. **提示确认**
   - 在提交信息下方单独一行提示：「是否发起 commit（不 push）？确认后执行 git commit。」
   - 不自动执行 `git commit`，等待用户确认。
5. **用户确认后执行**
   - 仅当用户明确确认（如回复「确认」「是」「执行」「可以」等）后，才执行 `git commit`，将生成的 message 作为提交说明（多行时用 `git commit -F -` 或写入临时文件后 `git commit -F <文件>`）。
   - 提交时仅使用生成的 message，不要追加任何其他信息。**说明**：这条说明只针对Cursor软件生效，若用户已确认关闭 Cursor Settings > Attribution 下的 Commit Attribution 与 PR Attribution，则无需每次再提示，否则需要提示确认；提交由终端执行时可避免被自动追加 Co-authored-by。
   - 不执行 `git push`。
## 输出格式（严格遵循）
```
<type>: <分支名> <一句话摘要>
  - <第一条说明>
  - <第二条说明>
  - <更多说明，可选>
Authored-by: <git user.name> <git user.email>
```
- 第一行：`<type>: <分支名> <摘要>`，例如 `chore: feature-xyz 统一编辑器配置并更新 gitignore`
- 中间：原因说明使用列表格式，每条原因前加 `  - `（两个空格 + 短横线 + 空格），每条一行
- 原因列表与署名之间：不空行，直接写 `Authored-by`
- 最后一行：`Authored-by: ` + `git config user.name` 结果 + 空格 + `git config user.email` 结果
- 全文无空白行，不要输出「你可以这样提交」、不要输出命令示例、不要输出除上述内容以外的任何文字
## 示例
**输入**：用户说「提交」或「commit」，且 git diff 显示新增 `.editorconfig`、修改 `.gitignore` 忽略构建目录。
**输出**（仅此一段，无前后废话）：
```
chore: feature-xyz 统一编辑器配置并更新 gitignore
  - 新增 .editorconfig 统一缩进与换行符
  - .gitignore 增加 dist、.cache 等构建产物目录
Authored-by: example-user dev@example.com
```
其中示例中的 `example-user` 与 `dev@example.com` 仅为占位；实际输出时须使用当前仓库 `git config user.name` 与 `git config user.email` 的真实值。
## 约束
- 开头必须是上述提交类型之一（fix/feat/refactor/chore/docs/style/test/perf）。
- 第一行下方直接为缩进列表（`  - ...`），不写「原因」或「原因：」，每条原因前加 `  - `（两个空格 + 短横线 + 空格）。
- 列表与署名之间不空行，直接写 `Authored-by: <用户名> <邮箱>`（首字母大写），由本地 git 配置读取，不要编造。
- 提交信息全文无空白行。
- 不输出解释、命令、提示语或多余信息，只输出可直接粘贴到编辑器作为 commit message 的正文。
- 提交信息输出后必须提示「是否发起 commit（不 push）？确认后执行 git commit。」仅在用户确认后才执行 `git commit`，不执行 `git push`。
- 执行 `git commit` 时仅使用生成的提交信息，不要追加任何其他信息。
