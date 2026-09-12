---
name: ai-tech-daily-report
description: Generate a daily tech/AI industry briefing (科技AI日报) that tracks top tech companies, AI/LLM companies, tech leaders, product leads, open-source ecosystem, frontend trends, and OpenRouter rankings — with an emphasis on flagging what CHANGED since the last report (leadership changes, ownership/M&A status, model version bumps, ongoing sagas like IPOs or outages). Use when the user asks for a 科技日报/AI日报/tech industry briefing.
---

# 科技AI日报技能 (ai-tech-daily-report)

Adapted from a Coze/扣子 skill package for Claude/Cowork. Uses `WebSearch` / `WebFetch` instead of Coze's `search_web`/`skill_load`/话题追踪 — no external skill install needed here.

> **参考文件**：技能目录下的 `spec.txt`（原始工作计划，含完整关注名单和历史经验沉淀）、`templates/日报模板.md`、`templates/邮件模板.html` 是历史Coze版本留存的参考资料，本SKILL.md已吸收其中仍然有效的规则；`spec.txt`里出现的具体人物职位（如"Tim Cook是Apple CEO"、"Pat Gelsinger是Intel CEO"）已过时，仅把人名/公司名当作"关注对象清单"使用，当前职位一律以当次WebSearch结果为准。

> **核心理念（用户明确要求）**：这个技能的价值**不是每天重新写一份静态快照，而是追踪"变化"**。每次生成日报，优先回答"跟上次相比，什么变了"，而不是编写一份孤立的日内新闻合集。

## Agent兼容性说明
本技能不绑定特定Agent，任何**支持技能(skill)机制、且具备"联网搜索/抓取网页 + 读写本地文件 + 执行shell命令"这三类能力**的Agent（Claude Code、Codex CLI、Gemini CLI、OpenCode等）都应能执行。使用时请注意：
- 文中出现的 `WebSearch`/`WebFetch`/`Read`/`Write`/`Bash` 是**Claude Code的工具名**，仅作为"需要哪类能力"的示例——换成其他Agent时，用该Agent自己对应的搜索/抓取/文件读写/shell工具即可，不要因为找不到同名工具就放弃执行。
- `scripts/send_daily_email.py` 是纯Python标准库脚本（smtplib/urllib/json），不依赖任何Claude专属能力，只要Agent能执行 `python3 <路径>` 就能直接复用。
- "第六步：发送邮件"里"已验证的限制"和"定时执行"两节，记录的是**在Claude Code环境下实测出的具体结论**（云端沙盒代理白名单、`CronCreate`、claude.ai routines等），这些工具/产品名是Claude专属的，其他Agent不会有同名机制。但背后的**通用原则**是一致的，务必保留：① 发邮件/写本地文件必须发生在能访问真实网络和本地凭证文件的执行环境里，不能在隔离的云端沙箱里执行；② 判断"能不能发出去"不要靠猜，直接尝试执行、失败了再记录原因；③ 定时任务用当前Agent自身支持的调度机制实现，没有等价机制就如实告知用户只能手动执行。

## 首次使用：收集配置
默认关注全部7个栏目、时区 Asia/Shanghai，无需额外确认。邮件发送依赖技能根目录下的 `config.json`（不是 `ai_daily_report_entity_state.json`，两者用途不同）：若该文件不存在，先按第六步"用法1"引导用户从 `config.example.json` 复制并填入真实SMTP信息（敏感信息只写本地`config.json`，不写入长期记忆），再继续生成日报；若已存在则直接复用，不必每次重新询问。

## 依赖能力（工具名以当前Agent实际提供的为准，下方括号内为Claude Code的对应工具名，仅供参考）
- 联网搜索与网页抓取（Claude Code: `WebSearch` / `WebFetch`）— 用于查证公司/模型动态、抓取OpenRouter排名、Artificial Analysis Intelligence Index等
- 本地文件读写（Claude Code: `Read` / `Write`）— 读写状态文件、保存日报
- Shell命令执行（Claude Code: `Bash`）— 运行 `scripts/send_daily_email.py` 发邮件

## 变化追踪机制（本技能核心，必执行）

### 1. 实体状态表（长期维护，跨日报复用）
在工作目录维护一个 `ai_daily_report_entity_state.json`，记录关键实体的"当前已知状态"，例如：
```json
{
  "companies": {"Apple": {"CEO": "John Ternus", "上任日期": "2026-09-01", "前任": "Tim Cook→执行董事长"}},
  "products": {"Manus": {"归属": "独立运营，Meta收购被中方监管否决", "最后确认日期": "2026-09-08"}},
  "models": {"Claude": {"最新版本": "Claude Fable 5.1 / Mythos 5.1", "发布日期": "2026-09-01"}},
  "ongoing_sagas": {"Anthropic IPO": {"最新进展": "150亿美元循环信贷落地，招股书预计9月下旬公开", "更新日期": "2026-09-08"}}
}
```
每次生成新日报前，先 `Read` 这个文件（不存在则从零建立，可以从用户提供的旧日报/spec.txt中初始化）。搜索到新信息后，与状态表逐项比对：
- 不一致 → 这是一条"变化"，必须在日报中突出标注
- 一致 → 无需重复写入日报正文（除非有新的具体事件）
生成完日报后，用本次确认的最新信息更新状态文件并 `Write` 回去。

### 2. 与上一期日报比对（逐条diff，不是重写）
生成新日报前，尽量找到上一次已保存的日报文件（`outputs/日报/` 目录中日期最近的一份，或用户上传的旧日报），逐栏目比对：
- **持续事件（ongoing sagas）**要显式注明进展，不要当成新新闻重写。例如："Anthropic IPO进展（较上期更新）：治谈时间由"9月下旬公开招股书"推迟至XX"，而不是把整个IPO背景重新讲一遍
- **已报道过的旧闻**不要重复收录，除非有新进展
- **预告类事件（如"XX发布会将于XX召开"）**在后续日报中要跟进结果，形成闭环（预告→实际发布→后续反馈）

### 3. 日报新增开头模块：🔄 较上期重要变化
在标题和顶部信息之后、正文栏目之前，新增一个强制存在的模块：
```
## 🔄 较上期重要变化
- **职位/人事变动**：（列出本实体表中变化的项）
- **公司归属/收购状态变化**：
- **产品/模型版本号变化**：
- **持续事件进展**：（IPO、诉讼、重大故障等）
```
如果确实无任何变化（罕见），写"无重大变化，持续跟踪XX项进展中"，不要删掉这个模块。

## 信息源清单（查证优先使用官方/权威来源）
- 公司官方新闻室：Apple Newsroom、OpenAI News、Google/Alphabet Blog、Meta Newsroom、Microsoft News、NVIDIA Newsroom等
- 排行/热度平台：GitHub Trending、OpenRouter Rankings（用量）、Artificial Analysis Intelligence Index（<https://artificialanalysis.ai/>，智能程度综合评分）、Hugging Face Trending
- 中文科技媒体作为补充：36氪、机器之心、量子位、**AIHOT**（<https://aihot.news/daily>，中文AI动态聚合日报，每日精选约6条核心新闻并标注原文链接，可作为"AI应用与大模型进展"栏目的补充信源与交叉核实渠道，仍需遵守查证规则：不确定的归属/头衔需另行WebSearch确认，不可直接照抄摘要）等
- 栏目→信源大致对应：公司动态→官方新闻室+主流科技媒体；大模型进展→官方发布页+OpenRouter+AIHOT；开源→GitHub Trending+Hugging Face

## 关注清单（迁移自历史spec.txt，仅作为"该搜什么"的范围提示，具体职位/归属信息务必当次核实）

**顶级科技公司**：Apple、Microsoft、Google/Alphabet、Meta、Amazon、Tesla、NVIDIA、Intel、AMD、IBM、Oracle、Salesforce、Netflix、Uber、Airbnb、Samsung、腾讯、阿里巴巴

**AI/大模型公司**：OpenAI、Anthropic、Google DeepMind、Meta AI、Microsoft AI、Amazon AI、NVIDIA AI、Midjourney、Stability AI、Cohere、Hugging Face、AI21 Labs、Aleph Alpha、Mistral AI、xAI、百度、阿里巴巴、腾讯、科大讯飞、字节跳动、MiniMax、月之暗面、智谱AI

**科技领袖关注人物**（人名仅作为"该查谁"的清单，当前头衔以实时搜索为准，不要照抄旧头衔）：Elon Musk、Tim Cook/继任者、Sundar Pichai、Satya Nadella、Mark Zuckerberg、Andy Jassy、Jensen Huang、Sam Altman、Dario Amodei、Demis Hassabis、Brian Chesky、Larry Ellison、Marc Benioff、Lisa Su、Craig Federighi、Brad Smith、Jeff Dean、Andrew Bosworth、Ilya Sutskever、Jared Kaplan、Yann LeCun、Kevin Scott 等

**AI开源影响力人物**：Soumith Chintala（PyTorch）、Clement Delangue（Hugging Face）、Jeremy Howard（fast.ai）、François Chollet（Keras）、Andrej Karpathy、Chris Lattner（Mojo）、Linus Torvalds

**前端影响力人物**：Dan Abramov（React）、尤雨溪（Vue.js）、Ryan Dahl（Node.js/Deno）、Rich Harris（Svelte）、Addy Osmani（Chrome/Web性能）

**重点监控开源产品/平台**：OpenClaw（版本/Pi Skills生态）、OpenRouter（周用量排名，须实际访问 `https://openrouter.ai/rankings` 取数并标注获取时间）、Artificial Analysis（智能程度综合排名，须实际访问 `https://artificialanalysis.ai/`（或其 `/models` 页）取数，注明当期Intelligence Index版本号如v4.3与获取时间）、LangChain、Hugging Face Transformers、vLLM/MLC LLM、Stable Diffusion生态、GitHub Trending

**前端技术范围**：框架（React/Vue/Angular/Svelte/Preact/Solid）、构建工具（Webpack/Vite/Rollup/Parcel/esbuild）、上层框架（Next.js/Nuxt.js/Gatsby/Astro/Remix）、状态管理（Redux/Pinia/Zustand等）、部署平台（Vercel/Netlify/Cloudflare Pages等）

## 查证规则
- 模型名/版本号/公司归属等硬信息优先用WebSearch核实，不凭内部知识杜撰。注意：随着时间推进，曾经不存在的模型名可能已真实发布，不要因为"看起来像幻觉"就不收录，一定以实时搜索结果为准
- 公司归属易错：MiniMax、月之暗面、智谱AI等均为独立公司，不是彼此的子公司
- 不确定的归属/头衔类信息，必须搜索确认后才写入，无法确认则省略该条而不是猜测

## 执行流程

### 第一步：读取状态与上一期日报
先 `Read` 实体状态表和最近一期已有日报（若存在），建立"已知基线"。

### 第二步：分栏目搜索（仅发现新信息即可，不需重新搜已知事实）
建议先用 `WebFetch` 访问 <https://aihot.news/daily> 快速扫一眼当天精选的中文AI动态（约6条，带原文链接），作为线索起点、辅助判断有哪些方向值得深挖，但不能只依赖它——具体事实仍要按下方七个栏目逐一WebSearch核实和补全，AIHOT的摘要不直接照抄。
按下列七个栏目搜索，优先最近3天：
1. 📈 顶级科技公司动态（Apple/Microsoft/Google/Meta/Amazon/Tesla/NVIDIA/Intel/AMD/IBM/Oracle/Samsung/腾讯/阿里等），重点核实领导层/归属是否变化
2. 🤖 AI应用与大模型进展（OpenAI/Anthropic/Google DeepMind/Meta AI/xAI/Mistral/百度/阿里/腾讯/字节/MiniMax/月之暗面/智谱等），重点标注版本号变化
3. 👥 科技领袖动态（CEO及关键高管的公开发言、职位变动）
4. 🧑‍💻 顶级产品负责人与核心开发者（ChatGPT/Claude Code/Gemini/Cursor/GitHub Copilot/Windsurf/Devin/Antigravity/Manus/GLM/Kimi/DeepSeek/OpenClaw/Hermes等），重点追踪人事变动和产品归属
5. 🔧 开源与技术创新（GitHub Trending、OpenRouter、Hugging Face、LangChain等），含OpenRouter排名子节
6. 🎨 前端技术动态（Next.js/Vite/React/Vue/shadcn等）
7. 🗓️ 七日动态回顾

无动态的栏目/产品不强行编造，跳过即可，可写"本栏目近3日无重大独立动态"。

如果单次搜索量很大（栏目多、需要交叉核实），拆分为"数据采集"和"报告生成"两阶段：先把所有搜索结果整理写入一个中间文件（如 `ai_daily_report_tmp_collected.md`），再基于该文件生成最终日报，避免上下文溢出。

### 第三步：对比状态表与上一期日报，提取变化
把本次搜索到的关键信息与已知基线逐项比对，列出所有变化项，用于填写"🔄 较上期重要变化"模块。

### 第四步：整理成完整日报
**样例参考**（用户提供的真实样本 `日报_2026-09-08_V1`）达到的详细程度作为目标基准：每条动态100-200字详细陈述（不是简短标题），包含具体数字/金额/百分比等硬信息，多个来源并列。内容结构：

- 标题：`# 科技AI日报 YYYY-MM-DD`
- 顶部：清单最后更新、智能体应用（写实际执行本次任务的Agent名称，如Claude Code/Codex CLI/Gemini CLI等，不要固定写死"Claude (Cowork)"）、使用模型（写实际调用的模型名）、报告生成时间、数据覆盖范围
- **🔄 较上期重要变化**（新增必含模块，见上）
- 七个栏目，每个公司/人物/项目用`###`分组，每条带日期、详细事实描述、来源
- OpenRouter排名放在开源栏目内，两个固定表格：表1周用量Top10取自 `https://openrouter.ai/rankings`；表2智能程度Top10改为取自 Artificial Analysis Intelligence Index（`https://artificialanalysis.ai/` 或 `/models`），因该页面是交互式图表，WebFetch常只能取到前3-5名的模型名/机构/分数，取不到的名次如实留空或注明"页面未直接列出"，不得编造；两表都需注明数据获取时间及Artificial Analysis当期Index版本号（如v4.3）
- 七日回顾按日期分组，每天2-4条要点
- 末尾：本日动态统计表 + 核心要求说明 + **📚 参考内容**（固定列出 [AIHOT](https://aihot.news/) 作为素材线索来源之一，每期必写不可省略）+ 标记行

**硬规则**：
- 日期+来源缺一不写入；最近3天占比≥50%；超7天无重大影响不收，超14天删除
- 超过7天但在本周内具有重大影响的事件（如大型发布会、重磅财报、重大收购），可收录但必须在条目开头标注`【回顾】`
- 质量门槛：每条动态必须是具体新闻事件（有明确的主体、动作、结果），不收录纯观点文章、无新信息的综述、促销/营销类信息（如电商降价、优惠活动）、泛泛的趋势预测/盘点文章
- 开源项目条目必须附项目链接（GitHub/GitLab等）

### 第五步：保存文件与更新状态表
- 日报保存到 `outputs/日报/日报_{日期}_V{n}.md`（同天重新生成用V2/V3，不覆盖）
- 用本次确认的最新信息更新 `ai_daily_report_entity_state.json` 并 `Write` 回去，为下一次生成做好基线

### 第六步：发送邮件（默认执行，非可选）
**只要 `config.json` 已配置好收件人等信息，生成日报md文件后必须紧接着发送邮件，不需要用户额外要求"发送一下"才去做**——除非用户明确说了"只生成不发送"，或`config.json`确实不存在（此时按下方"首次使用"引导用户配置，而不是跳过邮件这一步）。

使用本技能自带的 `scripts/send_daily_email.py`（来自历史Coze版本，已修复过日期格式解析导致邮件正文为空的bug，会自动把Markdown日报转换成带样式的HTML邮件），不要临时现写smtplib代码。

用法：
1. 首次使用时，复制 `config.example.json` 为同目录下的 `config.json`（注意是技能根目录，不是scripts/子目录，脚本按 `技能根目录/config.json` 查找配置），填入真实的 smtp_server/smtp_port/email_address（发件邮箱）/auth_code（邮箱的SMTP授权码，不是登录密码）/recipient（收件人）/sender_name。**`config.json` 只保存在用户本地工作区，不写入长期记忆，不随技能分享给他人**。
   - 可选：如果希望SMTP和Resend两条发送渠道投给不同邮箱（例如同域自发SMTP更不容易被判垃圾邮件），额外配置 `smtp_recipient`/`resend_recipient` 即可，两者分别只影响对应渠道的收件人，不配置则都回退到 `recipient`。
2. 运行 `python3 scripts/send_daily_email.py <日报md文件路径> [--force] [--to 收件人邮箱]`（脚本会自动定位技能根目录下的 config.json；`--force` 跳过去重检查，`--to` 可覆盖config.json里的收件人）。

**已验证的限制（重要，纠正过两次）**：Claude的**云端沙盒**和**已连接的外部本地设备执行环境**（`device_bash`），网络出站都走一个**按域名白名单放行**的代理，不是"只挡SMTP、放行HTTPS"这么简单——凡是不在白名单里的第三方域名，不管走什么协议都会被代理直接403拒绝（`X-Proxy-Error: blocked-by-allowlist`），白名单通常只包含Anthropic自身域名和主流包管理源（npm/pypi/crates等）。

**但**：在 **Claude Code 桌面应用/CLI 里直接用 Bash 工具、跑在用户本机（而非连接的外部设备、也非云端沙盒）** 时，走的是用户本机自己的真实网络，不经过上述代理，SMTP 已实测可直接发送成功（2026-09-12验证）。所以判断能不能发邮件的关键不是"是不是Claude在执行"，而是"这次执行是不是发生在受限的云端沙盒/外部连接设备里"——同样是Claude调用Bash，本机CLI环境和云端/远程设备环境的网络出站权限并不一样，不要一概而论。

**实测证据**：曾尝试改用 Resend 的 HTTPS API（`https://api.resend.com/emails`）替代SMTP，本以为能绕开限制——但云端沙盒和 `device_bash` 里分别用 curl 直连都收到代理返回的 `403 Forbidden`，`X-Proxy-Error: blocked-by-allowlist`，证明**这不是SMTP独有的限制，而是任何未被列入白名单的第三方服务（不管是SMTP还是HTTPS API）都连不通**。所以脚本里虽然保留了 Resend 发送支持（见下方`resend_api_key`配置），但**它在Claude的云端/已连接设备环境下同样跑不通**，仅在脚本被真正在沙盒之外执行时（见下方方案a/b）才有意义。

**执行原则（不要猜环境、不要提前跳过）**：不论当前判断自己是在云端沙盒、已连接的外部设备、还是本机CLI，Claude都应直接用Bash工具运行 `python3 scripts/send_daily_email.py ...` 去尝试发送，不要因为"怀疑会被代理拦截"就预先放弃或转而要求用户手动执行。是否真的会被拦截，跑一次就知道：
- 成功 → 正常汇报发送结果（收件人/主题/大小），结束
- 失败（无论是代理白名单403、SMTP认证错误，还是其他原因）→ 按下方"异常处理"记录失败原因，md文件本身已独立保存不受影响，再告知用户具体报错，不要替用户预判"这个环境肯定发不出去"

## 异常处理
| 情况 | 处理方式 |
|---|---|
| 某栏目搜索超时/无结果 | 标注"暂无最新动态"，不编造 |
| 邮件发送失败（不论具体原因：代理白名单403、SMTP认证错误等） | 如实记录失败原因（报错信息），md文件已独立保存不受影响；仅当明确是代理白名单403（`X-Proxy-Error: blocked-by-allowlist`）时，才提示用户可改在**真实本机终端**或**本机cron/launchd**运行该脚本；其他报错（如SMTP密码/授权码错误）应提示用户检查`config.json`配置，而不是归咎于环境限制 |
| OpenRouter页面无法访问 | 该表标注"本期暂未获取到实时数据" |
| Artificial Analysis页面无法访问，或网页抓取只返回部分名次（该页面是交互式图表，纯文本抓取实测通常只能取到前5名） | 若当前Agent具备浏览器/截图能力，优先用它截图该页面的柱状图（图表本身直接标注了模型名与分数，视觉读取即可取全Top10）；不具备此类能力则如实注明"页面未直接列出，仅取到前N名"，不编造分数 |
| 同一天重复生成 | 文件名自动递增 V1→V2→V3，不覆盖旧版本 |
| 公司归属/头衔不确定 | 必须WebSearch确认，无法确认则省略该条 |
| 单次搜索信息量过大 | 拆分为"数据采集"+"报告生成"两阶段，用中间临时文件衔接，避免上下文溢出 |

## 定时执行（已实测，2026-09-12）
当前结论：**本技能暂不支持真正意义上的定时任务，用户按需手动执行**。原因与实测过程：
- **claude.ai 云端 Routine**（网页 claude.ai/code/routines，`RemoteTrigger` 工具的 `job_config.ccr`）：运行在Anthropic云端沙盒，完全访问不到本地磁盘和本机网络——本技能的`config.json`（含SMTP授权码）、`outputs/日报/`、`ai_daily_report_entity_state.json` 都是本地文件，云端routine既读不到配置也发不出真实邮件，只能生成报告文本，闭环不完整
- 网页新建routine时弹出的 "Local" 选项理论上可能匹配本机执行，但其配对/配置流程本次未验证通过（无法在沙盒化的浏览器工具里登录测试），暂无法确认可行
- Claude Code 自带的 `CronCreate`/`CronList`/`CronDelete` 工具可以完整跑通（已实测生成md+发邮件成功），但有两条硬约束：recurring任务**7天后自动过期**需要手动续期，且**依赖创建它的Claude Code会话/进程持续运行**（不是系统级后台服务，进程关掉或电脑睡眠时不会触发）
- 备选方案（未在本项目采用，用户明确选择手动执行）：macOS `launchd` 系统级定时任务直接调用 `claude -p "..." --dangerously-skip-permissions` 无头执行——这是唯一同时满足"本地文件+真实网络+不依赖某个会话存活"的方案，如后续需要可参照此思路重新搭建

## 安全提示
- SMTP授权码、收件人等敏感信息只存在用户本地工作区配置文件里，不写入长期记忆或分享给他人
- 分享本技能时不要带上包含真实凭证的配置文件
