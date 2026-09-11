---
name: excel-to-pdf
description: 在 macOS 上用本机 Microsoft Excel 把 .xlsx/.xlsm 转成排版正确的 PDF（自动横向铺满一页宽、且不会把分页切在合并单元格中间）。当用户要求"把 xlsx/Excel 转成 PDF""导出报价单/清单/表格为 PDF""生成一份可以直接发给客户的 PDF 版本"时必须使用本技能，即使对话里没出现"Excel"或"PDF"这两个字、只是说"把这份表格转个格式发我"也适用。不要用 LibreOffice/soffice --headless（本机通常没装），也不要直接调用 Excel 默认的"另存为 PDF"或直接用 AppleScript 设置 page setup object 的 orientation/fit 属性——这两种做法在实测中都会失败或产出几十页的错误结果，必须用本技能里 scripts/excel_to_pdf.py 封装好的"先改写 XML 打印设置、再对齐分页点"流程。
metadata:
  author: liuhean
  email: allsmy.com@gmail.com
  compatibility: 仅 macOS；需已安装 Microsoft Excel（桌面版自动化接口）与 Python 包 openpyxl；转换后预览渲染额外依赖 Xcode 命令行工具自带的 swift（缺失时自动跳过预览，不影响 PDF 本身）
---

# Excel 转 PDF

## 这个技能解决什么问题

直接用 Excel「文件 → 另存为 → PDF」或最省事的 AppleScript 调用，几乎总会撞上两个坑：

1. **页数爆炸**：Excel 默认打印设置不会自动缩放，宽表格（列多、有长文本自动换行）会被
   纵向切成几十页。必须强制"横向 + 缩放到一页宽（fit to width = 1 page，height 不限）"。
   AppleScript 里直接 `set orientation of page setup object of sh to landscape` 这类调用
   在实测中大概率报参数错误——**必须**改成直接改写 xlsx 内部 XML（`sheetPr`/`pageSetup`
   元素），这是唯一稳定生效的办法。
2. **断点切错地方**：即使缩放对了，Excel 自动算出来的分页位置常常正好落在一个纵向合并
   单元格（比如"阶段"列跨了 5 行、或"序号"列跨了一组子模块）的中间，导致 PDF 里这一组
   内容被从中间切开、看起来像是"断了"。必须读出该 sheet 里所有跨行合并单元格的范围，
   和 Excel 实际算出的分页行号做比对，把切在范围内部的分页点强制挪到该范围的第一行，
   反复对齐到没有分页点切在行组中间为止。

`scripts/excel_to_pdf.py` 已经把这两步封装好，直接调用即可，不要自己重新用 AppleScript
拼一遍——这条路已经在真实文件上踩过坑、验证过很多轮了。

## 用法

```bash
python3 <本技能目录>/scripts/excel_to_pdf.py "输入文件.xlsx"
```

`<本技能目录>` 就是这份 `SKILL.md` 所在的目录（例如安装到 Claude Code 后通常是
`~/.claude/skills/excel-to-pdf`）——用相对于 `SKILL.md` 的路径去找 `scripts/excel_to_pdf.py`
即可，不要假设固定的绝对路径，不同 Agent 的安装位置不一样。

默认输出到同目录同名的 `.pdf`，横向、A3、缩放到一页宽。常用参数：

- `-o 输出.pdf`：指定输出路径
- `--paper a4|a3|a2|letter|legal`：纸张大小。列很多、内容密的表格用 a3 甚至 a2；
  列不多（比如只有 3~5 窄列）可以用 a4，观感更紧凑
- `--orientation landscape|portrait`：默认横向；窄表格（列少）可以改纵向
- `--extra-break "工作表名:行号"`：自动对齐只解决"切错地方"，不解决"某一页内容太少、
  排版不均衡"。渲染预览图后如果发现某页只有两三行、大片空白，可以在这一页开头对应的
  行号（通常是下一个业务小节的标题行）手动加一个分页点，让内容分布更均衡。可重复传多次
- `--no-render`：跳过转换后的 PNG 预览渲染（默认会渲染，方便核对）

## 完整流程（转换后必须核对）

1. **运行脚本**。它会在系统临时目录里：
   - 复制一份输入文件并改写其打印设置（**绝不修改原文件**）
   - 用该临时副本驱动 Excel（只操作这个临时工作簿，不会碰用户 Excel 里已经打开的其他文件）
   - 自动对齐分页点
   - 导出 PDF 到目标路径
   - 关闭这个临时工作簿（不影响用户其他打开的工作簿，也不会退出 Excel）
   - 把每一页渲染成 PNG，放进一个临时目录

2. **用 Read 工具抽查预览图**，至少看首页、含表格主体的中间几页、末页。重点检查：
   - 有没有一整行内容被从中间切开
   - 末页是不是只剩两三行、大片空白（如果是，考虑用 `--extra-break` 重跑，把断点挪到
     更靠前的小节标题行）
   - 字体/配色/logo 之类原始格式有没有跑掉

3. **只有核对无误后再告诉用户完成**，并把最终 PDF 的绝对路径发给用户。如果发现问题，
   调整参数重跑，而不是把有瑕疵的结果直接扔给用户。

## 已知限制

- 只支持 `.xlsx` / `.xlsm`（zip 结构，能直接改写内部 XML）。遇到旧版 `.xls`，先在 Excel
  里"另存为"成 `.xlsx` 再跑本技能。
- 依赖本机已安装 Microsoft Excel 和 `openpyxl`（`pip3 install openpyxl`）。预览渲染额外
  依赖 Xcode 命令行工具自带的 `swift`；没装的话脚本会自动跳过渲染这一步，不影响 PDF 本身。
- 只在 macOS 上工作。
