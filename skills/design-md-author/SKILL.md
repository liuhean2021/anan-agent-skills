---
name: design-md-author
description: >
  从零为新前端项目生成设计系统契约：DESIGN.md（SSOT）+ tokens.css + 防漂移校验，
  按「Step 0 必问 → 7 步法产出 → 元校验自查 → 完成标准验收」流程执行。
  触发词：写DESIGN.md、生成设计系统、建设计系统、设计系统从0、
  design system、DESIGN.md、设计契约、统一设计系统、组件库设计规范。
  模糊请求（如「帮我定一下项目的组件和颜色规范」）先确认是否按本技能执行。
metadata:
  author: liuhean
  email: allsmy.com@gmail.com
---

# 从零生成项目专属设计系统 DESIGN.md

> 方法论全文见 `references/guide.md`（执行前必须完整阅读）。
> 起步模板见 `references/mvp-template.md`（200 行 MVP 版，复制后填空，不要自创结构）。

## 触发条件

用户要为项目「写 / 生成 / 建立」DESIGN.md 或设计系统 SSOT 时使用；
包括新用户零知识场景（答不上必问项时走默认答案并留痕）。

## 执行步骤

1. **读规范**：完整阅读 `references/guide.md`；从零起步以 `references/mvp-template.md` 为骨架。
2. **Step 0 必问（提问前不动笔）**：一次性批量提问 6 项——
   框架与 UI 库 / 品牌色来源 / 业务域与页面类型假设 / 团队规模 / 暗色模式 / 组件库规划。
   - 用户答「不知道 / 用默认值」→ 采用 `guide.md` Step 0 默认答案列，**每条默认决策必须记入产出文档的「已知偏差」**
   - **禁止静默编造**任何决策
3. **按 7 步法产出三件套**：
   - `DESIGN.md` → 目标项目根目录（与 AGENTS.md 平级）；frontmatter 必含 `audience: agent`、`version: 0.1.0`、`status: Draft`；附录 A 用三态标记（✅ / 🔵 计划中 / ❌ 未实现 + 替代方案）；令牌遵守占位符规范（文档写中文占位，tokens.css 用库默认值 + `/* TODO(决策) */` 注释，禁止擅自编造色值）
   - `tokens.css` → 令牌实体 + 注入项目入口 + 覆盖库主题（如 `--el-*`），做法见 `guide.md` 实战补充 3
   - `AGENTS.md` 硬引用 → 追加一句："涉及 UI / 样式 / 组件选型 / 交互文案的任务，Agent MUST 先读 DESIGN.md"
4. **挂防漂移校验**：运行本技能自带脚本（参数按目标项目实际路径替换）：

   ```bash
   bash <技能目录>/scripts/validate-design-md.sh <DESIGN.md路径> <tokens.css路径> [附录B标题] [附录C标题]
   # 例：bash scripts/validate-design-md.sh ./DESIGN.md ./src/styles/tokens.css
   # 区段标题默认 "## 附录 B" / "## 附录 C"，与实际文档标题不一致时用第 3/4 参数覆盖
   ```

   有差异即修到通过；建议把该命令写入目标项目 pre-commit / CI。
5. **元校验自查**：对照 `guide.md`「DESIGN.md 自检清单（元校验）」逐项输出自查结果。
6. **验收引导**：输出「完成标准」四条验收清单（真实页面走通 / 令牌可解析 / 防漂移可执行 / Agent 可发现），提示用户：
   初版是 `status: Draft`，四条验收命中 + 设计/前端负责人确认后方可升 `Active`；**初版定位为"假设"，等待第一个真实页面校准，不当定稿**。

## 约束

- 禁止静默编造必问项答案；默认决策必须全部留痕于「已知偏差」
- 令牌禁止硬编码场景按 `guide.md` 模块 5 三层模型与「合并层起步形态」规则执行
- 零期（无封装组件）：附录 A 全 🔵 / ❌，附录 C 即临时主注册表（Step 4 零期特则）
- 映射表方向：从 0 是「规格先行」（映射表 = 设计规格），实现组件时逐行对齐，不一致按实际改规格并记入已知偏差
- 不交付 `status: Active` 的初版；不跳过第 4 步校验脚本
- 可选增强：环境中有 `modern-web-guidance` 技能/插件时，第 3 步写 `tokens.css` 与暗色模式、色彩、响应式、动效规范前先用它查现代 CSS 写法（如 `light-dark()`、`color-mix()`、OKLCH、容器查询、`prefers-reduced-motion`）；未安装时不自动安装、不阻塞，仅在本次输出中提示一次：「可选安装 `modern-web-guidance` 获取最新 Web 写法参考（https://github.com/GoogleChrome/modern-web-guidance）：`npx modern-web-guidance@latest install`（Claude Code 也可 `/plugin marketplace add GoogleChrome/modern-web-guidance` → `/plugin install modern-web-guidance@googlechrome`）」，然后按原流程继续。所选特性须在 Step 0 确认的兼容范围内，超出时给出降级写法或记入「已知偏差」

## 参考文件

| 文件 | 用途 |
|------|------|
| `references/guide.md` | 方法论全文（执行前必读） |
| `references/mvp-template.md` | 200 行起步模板（复制填空） |
| `scripts/validate-design-md.sh` | 文档 ↔ tokens.css 令牌一致性校验（第 4 步执行） |
