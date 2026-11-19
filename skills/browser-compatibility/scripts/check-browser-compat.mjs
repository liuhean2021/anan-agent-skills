#!/usr/bin/env node
/**
 * 前端构建产物浏览器兼容检查(通用,可复制到任意前端项目使用)
 * 所属技能:browser-compatibility(配套 SKILL.md 与 references/)
 *
 * 检查项:
 *   1. JS 语法级别:所有 .js/.mjs 必须能按 --ecma 指定的 ECMAScript 版本解析(否则老浏览器整包解析失败 → 白屏)
 *   1′ ESM 动态导入:目标浏览器都支持原生 ESM 动态导入时,`import()` / `import.meta` 不按 --ecma 判失败(它们属 ES2020,
 *      但凡支持 ESM 的浏览器都原生支持),单独计数;目标含不支持的浏览器(如 ie、Chrome < 64)时仍按语法超标处理
 *   1″ Worker / WASM:**只有被其他 JS 里 new Worker() / new SharedWorker() 引用到的文件**才视为 Worker,解析失败只告警不影响
 *      退出码(只影响用到它的功能,不会让整页白屏);按文件名猜 Worker 会把 worker-list-xx.js 这类主线程 chunk 误降级,
 *      所以文件名只用于提示。主包里 `new Worker(..., { type: 'module' })` 与 .wasm 文件按目标版本提示功能级可用范围。
 *      原样拷贝、不经 new Worker 引用的 vendor Worker(如 pdf.js 通过 workerSrc 字符串加载)请用 --exclude 跳过并单独记录
 *   2. 正则后行断言 (?<= / (?<!:语法属 ES2018,但 Safari < 16.4 不支持,--ecma 检查不出来,单独检测
 *   3. CSS 风险特性:统计产物中各特性出现次数;给出 --min 时,标出目标浏览器不支持的特性与受影响区间
 *   4. 影响评估查询:为每个问题生成 browserslist 查询(受影响区间 / 支持范围),用于估算受影响用户占比
 *   5. 横屏处理(仅 H5,即 --min 含 ios / android 等移动内核,或显式给 --h5):H5 默认按竖屏使用,检查产物中的横屏处理,
 *      区分「遮罩型」(`orientation: landscape` 媒体查询内含 position:fixed)与「仅布局型」(有横屏样式但没有遮罩),
 *      并识别 `screen.orientation.lock`;只告警不失败,详见 references/h5.md §5.1
 *
 * 用法:
 *   node scripts/check-browser-compat.mjs --dir <产物目录> --ecma <年份> [--min <浏览器=版本,...>]
 *   PC 例:--ecma 2018 --min chrome=64,safari=12,firefox=78
 *   H5 例:--ecma 2018 --min ios=12,android=64
 *   含 IE 11 的老栈(Vue 2 / React ≤ 17 + webpack):--ecma 5 --min ie=11,chrome=49,safari=10,firefox=52
 *   --h5                    显式声明这是 H5 项目:--min 只写 chrome=51 之类、不含 ios / android 时,也执行第 5 项横屏处理检查
 *   --exclude <目录名,...>  跳过产物中不经转译的原样拷贝目录(如 public/ 下的 tinymce、pdfjs),路径含该名即跳过
 *
 * --min 可用的浏览器名(别名按内核归并,版本号即该内核版本):
 *   chrome / edge / android / webview / and_chr → 按 Chromium 判断(Android WebView、微信 XWeb 等填其 Chromium 版本)
 *   safari / ios / ios_saf                      → 按 WebKit 判断(iOS 上所有浏览器与 App 内 WebView 均为 WebKit,版本 = iOS 系统版本)
 *   firefox                                     → 按 Gecko 判断
 *   ie                                          → 视为不支持全部 CSS 风险特性与后行断言(IE 停止演进,以 IE 11 为上限)
 *
 * 退出码:0 = 通过(CSS 风险只告警不失败);1 = JS 语法超标或命中不支持的正则后行断言;2 = 参数/环境错误
 * 依赖:acorn。从当前目录解析,找不到时经 ESLint 的 espree 间接获取(装了 ESLint 即可,无需额外安装);
 *       请在项目(含 node_modules 的)目录下运行。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createRequire } from 'node:module'

/** CSS 风险特性:最低支持版本(caniuse / MDN,核对于 2026-09;升级前以官方数据为准) */
const CSS_FEATURES = [
  { name: 'flex 布局 gap', re: /[{;]\s*gap\s*:/g, min: { chrome: 84, safari: 14.1, firefox: 63 }, fallback: '间距消失,元素挤在一起' },
  { name: ':is()', re: /:is\(/g, min: { chrome: 88, safari: 14, firefox: 78 }, fallback: '所在规则整条失效' },
  { name: ':where()', re: /:where\(/g, min: { chrome: 88, safari: 14, firefox: 78 }, fallback: '所在规则整条失效' },
  { name: ':has()', re: /:has\(/g, min: { chrome: 105, safari: 15.4, firefox: 121 }, fallback: '所在规则整条失效' },
  { name: ':focus-visible', re: /:focus-visible/g, min: { chrome: 86, safari: 15.4, firefox: 85 }, fallback: '所在规则整条失效(多为聚焦描边)' },
  { name: 'aspect-ratio', re: /aspect-ratio\s*:/g, min: { chrome: 88, safari: 15, firefox: 89 }, fallback: '宽高比失效' },
  { name: 'inset', re: /(?<![-\w])inset\s*:/g, min: { chrome: 87, safari: 14.1, firefox: 66 }, fallback: '定位失效' },
  { name: 'clamp()', re: /clamp\(/g, min: { chrome: 79, safari: 13.1, firefox: 75 }, fallback: '声明失效' },
  { name: 'color-mix()', re: /color-mix\(/g, min: { chrome: 111, safari: 16.2, firefox: 113 }, fallback: '颜色失效' },
  { name: '@container', re: /@container/g, min: { chrome: 105, safari: 16, firefox: 110 }, fallback: '容器查询规则失效' },
  { name: '@layer', re: /@layer/g, min: { chrome: 99, safari: 15.4, firefox: 97 }, fallback: '层内样式整体失效' },
  { name: 'CSS 嵌套 &', re: /\{[^{}]*&[\s.:#\[>+~]/g, min: { chrome: 112, safari: 16.5, firefox: 117 }, fallback: '嵌套规则失效' },
  { name: 'dvh/svh/lvh', re: /\d(dvh|svh|lvh)\b/g, min: { chrome: 108, safari: 15.4, firefox: 101 }, fallback: '尺寸声明失效(需保留 vh 回退)' }
]
/** 以下三项 ESM_DYNAMIC / MODULE_WORKER / WASM 数据核对于 2026-11,上面的 CSS_FEATURES 为 2026-09 */
/** ESM 动态导入 import() 与 import.meta 的最低版本(取两者较高者) */
const ESM_DYNAMIC = { min: { chrome: 64, safari: 11.1, firefox: 67 } }
/** module Worker(new Worker(url, { type: 'module' }))最低版本 */
const MODULE_WORKER = { min: { chrome: 80, safari: 15, firefox: 114 } }
/** WebAssembly 最低版本 */
const WASM = { min: { chrome: 57, safari: 11, firefox: 52 } }
/** 正则后行断言:Safari 16.4+ 才支持,其余主流浏览器 Chrome 62 / Firefox 78 起支持 */
const LOOKBEHIND = { re: /\(\?<[=!]/g, min: { chrome: 62, safari: 16.4, firefox: 78 } }

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    // 开关参数（如 --h5）后面没有值或紧跟另一个 --参数时记为 true
    const next = argv[i + 1]
    args[key.slice(2)] = next === undefined || next.startsWith('--') ? true : argv[++i]
  }
  return args
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

/** --min 的浏览器名 → 特性表使用的内核键 */
const ENGINE_ALIASES = {
  chrome: 'chrome',
  edge: 'chrome',
  android: 'chrome',
  webview: 'chrome',
  and_chr: 'chrome',
  safari: 'safari',
  ios: 'safari',
  ios_saf: 'safari',
  firefox: 'firefox',
  ie: 'ie'
}

/** --min 的浏览器名 → browserslist 浏览器名(用于生成影响评估查询) */
const BROWSERSLIST_NAMES = {
  chrome: 'chrome',
  edge: 'edge',
  android: 'and_chr',
  webview: 'and_chr',
  and_chr: 'and_chr',
  safari: 'safari',
  ios: 'ios_saf',
  ios_saf: 'ios_saf',
  firefox: 'firefox',
  ie: 'ie'
}

/** 内核键 → 特性最低版本;ie 不在特性表中 = 永不支持(Infinity) */
const minOf = (min, engine) => (engine === 'ie' ? min.ie ?? Infinity : min[engine])

/**
 * 影响评估:受影响区间 [基线, 特性最低版本) 与对应 browserslist 查询。
 * 用 `x >= 基线, not x >= 最低版本` 表达区间,避免小数版本(如 Safari 14.1)在区间写法下的边界误差。
 */
function affectedRanges(min, targets) {
  return targets
    .filter(([, engine, v]) => minOf(min, engine) !== undefined && v < minOf(min, engine))
    .map(([label, engine, v]) => {
      const m = minOf(min, engine)
      return m === Infinity
        ? { text: `${label} ${v}+(全部)`, query: `${BROWSERSLIST_NAMES[label]} >= ${v}` }
        : { text: `${label} ${v}~<${m}`, query: `${BROWSERSLIST_NAMES[label]} >= ${v}, not ${BROWSERSLIST_NAMES[label]} >= ${m}` }
    })
}

/** 返回目标中不满足 min 的项:[显示名, 版本] */
function unsupportedBy(min, targets) {
  return targets.filter(([, engine, v]) => minOf(min, engine) !== undefined && v < minOf(min, engine)).map(([label, , v]) => [label, v])
}

const args = parseArgs(process.argv.slice(2))
if (!args.dir || !args.ecma) {
  console.error('用法: node check-browser-compat.mjs --dir <产物目录> --ecma <年份,如 2018> [--min chrome=64,safari=12,firefox=78 | ios=12,android=64 | ie=11,chrome=49,...] [--exclude tinymce,pdfjs]')
  process.exit(2)
}
const ecma = Number(args.ecma)
/** [显示名, 内核键, 版本] */
const targets = String(args.min || '')
  .split(',')
  .filter(Boolean)
  .map((kv) => kv.split('=').map((s) => s.trim()))
  .map(([b, v]) => [b.toLowerCase(), ENGINE_ALIASES[b.toLowerCase()], Number(v)])
const invalid = targets.filter(([label, engine, v]) => !engine || Number.isNaN(v))
if (invalid.length) {
  console.error(`--min 含无法识别的项:${invalid.map(([l]) => l).join(', ')};可用:${Object.keys(ENGINE_ALIASES).join(' / ')}`)
  process.exit(2)
}

/**
 * 解析 acorn,依次尝试:① 项目直接依赖 acorn;② espree → acorn;③ eslint → espree → acorn。
 * espree 是 ESLint 的解析器、基于 acorn,凡装了 ESLint 的项目都能拿到;pnpm 严格隔离下
 * espree 不会被提升到项目根,所以要从 eslint 的位置再解析一次。多数项目无需额外安装。
 */
function loadAcorn() {
  const fromCwd = createRequire(join(process.cwd(), 'noop.js'))
  const chains = [
    () => fromCwd('acorn'),
    () => createRequire(fromCwd.resolve('espree'))('acorn'),
    () => createRequire(createRequire(fromCwd.resolve('eslint')).resolve('espree'))('acorn')
  ]
  for (const load of chains) {
    try {
      return load()
    } catch {
      // 尝试下一种解析方式
    }
  }
  return null
}
const acorn = loadAcorn()
if (!acorn) {
  console.error('未找到 acorn(也未找到 ESLint 的 espree),请在项目目录下运行,或安装:npm i -D acorn')
  process.exit(2)
}

const excludes = String(args.exclude || '').split(',').map((x) => x.trim()).filter(Boolean)
const files = walk(args.dir).filter((f) => !excludes.some((x) => f.includes(`/${x}/`)))
if (excludes.length) console.log(`已排除目录:${excludes.join(', ')}`)
const jsFiles = files.filter((f) => /\.(m?js)$/.test(f))
const cssFiles = files.filter((f) => f.endsWith('.css'))
let failed = false
/** 影响评估用:[问题名, 受影响区间列表] */
const impactQueries = []

/** 目标全部支持 ESM 动态导入时为 true(未给 --min 时不放行,保持严格) */
const esmDynamicOk = targets.length > 0 && unsupportedBy(ESM_DYNAMIC.min, targets).length === 0
/** 把 import( 与 import.meta 的 import 换成等长标识符,其余代码按 --ecma 照常检查,报错位置不偏移 */
const ESM_DYNAMIC_RE = /(?<![.\w$])import(?=\s*\(|\s*\.\s*meta\b)/g
/**
 * Worker 判定:只认「被 new Worker( / new SharedWorker( 引用到的文件名」。
 * 误判会把主线程的白屏级语法错误降成不计退出码的告警,所以不按内容(legacy 插件的 polyfills-legacy-*.js
 * 内联了 SystemJS,本就含 importScripts()),也不按文件名(Vite 会把 src/utils/worker.ts 输出成 worker-<hash>.js)判定。
 */
// 按「文件名」匹配:引用写在 URL 字符串里才能识别;变量传入、内联 Blob 等写法识别不到时一律按主包检查(偏严);
// 内联 Blob 字符串里恰好出现同名文件名时会被误收为引用(风险很低,且仅当产物里确有同名文件)
const WORKER_REF_RE = /new\s+(?:Shared)?Worker\s*\(([\s\S]{0,300}?)\)/g
const MODULE_WORKER_RE = /new\s+(?:Shared)?Worker\s*\([\s\S]{0,300}?type\s*:\s*["'`]module["'`]/
const baseName = (f) => f.split(/[\\/]/).pop()
const sources = new Map(jsFiles.map((f) => [f, readFileSync(f, 'utf8')]))
const referencedWorkers = new Set()
let moduleWorkerUsed = false
for (const src of sources.values()) {
  if (MODULE_WORKER_RE.test(src)) moduleWorkerUsed = true
  for (const m of src.matchAll(WORKER_REF_RE)) {
    for (const name of m[1].match(/[\w.-]+\.m?js\b/g) || []) referencedWorkers.add(name)
  }
}
const isWorkerFile = (f) => referencedWorkers.has(baseName(f))
/** 文件名像 Worker、但没有被 new Worker() 引用:按主包检查,只提示 */
const WORKER_LIKE_RE = /(?:^|[._-])worker(?:s)?(?=[._-]|$)/i
const workerLike = jsFiles.filter((f) => !isWorkerFile(f) && WORKER_LIKE_RE.test(baseName(f).replace(/\.m?js$/, '')))

console.log(`\n== 1. JS 语法级别(ES${ecma}),共 ${jsFiles.length} 个文件`)
let esmDynamicFiles = 0
const workerIssues = []
const workerFiles = []
for (const f of jsFiles) {
  const raw = sources.get(f)
  const worker = isWorkerFile(f)
  if (worker) workerFiles.push(relative(process.cwd(), f))
  let src = raw
  if (esmDynamicOk && ecma < 2020 && ESM_DYNAMIC_RE.test(raw)) {
    src = raw.replace(ESM_DYNAMIC_RE, '_mport')
    esmDynamicFiles++
  }
  ESM_DYNAMIC_RE.lastIndex = 0
  try {
    acorn.parse(src, { ecmaVersion: ecma, sourceType: 'module' })
  } catch (e) {
    const pos = e.pos ?? 0
    const detail = `${relative(process.cwd(), f)}: ${e.message}\n    …${raw.slice(Math.max(0, pos - 40), pos + 40).replace(/\s+/g, ' ')}…`
    if (worker) {
      workerIssues.push(detail)
      continue
    }
    failed = true
    console.log(`  ✗ ${detail}`)
  }
}
if (!failed) console.log(`  ✓ 主包全部可按 ES${ecma} 解析`)
if (esmDynamicFiles) {
  console.log(`  ✓ ${esmDynamicFiles} 个文件含 import() / import.meta:目标浏览器均原生支持 ESM 动态导入(Chrome 64 / Safari 11.1 / Firefox 67 起),已放行`)
}

// ---- 1″ Worker / WASM:只影响用到它的功能,不计入退出码 ----
const wasmFiles = files.filter((f) => f.endsWith('.wasm'))
if (workerFiles.length || workerLike.length || moduleWorkerUsed || wasmFiles.length) {
  console.log('\n== 1″. Worker / WASM(功能级可用范围,不计入退出码,见 references/standard.md §9.6)')
  if (workerFiles.length) {
    console.log(`  按 Worker 处理的文件(${workerFiles.length} 个,判定依据:被 new Worker() / new SharedWorker() 引用):`)
    for (const w of workerFiles) console.log(`    - ${w}`)
  }
  for (const d of workerIssues) console.log(`  ⚠ Worker 未按 ES${ecma} 转译:${d}`)
  if (workerLike.length) {
    console.log(`  ℹ ${workerLike.length} 个文件名含 worker 但没有被 new Worker() 引用,已按主包检查(语法错误会计入退出码):`)
    for (const w of workerLike) console.log(`    - ${relative(process.cwd(), w)}`)
    console.log('    → 若它们是 vendor 原样拷贝的 Worker(如 pdf.js 经 workerSrc 字符串加载),用 --exclude 跳过其目录并在兼容声明中单独记录')
  }
  const report = (name, feat) => {
    const blocked = unsupportedBy(feat.min, targets)
    const minText = Object.entries(feat.min).map(([b, v]) => `${b} ${v}`).join(' / ')
    console.log(`  ${blocked.length ? '⚠' : targets.length ? '✓' : 'ℹ'} ${name}(需 ${minText})${targets.length ? '' : ',未给 --min,仅列出要求'}${blocked.length ? ` → ${blocked.map(([b, v]) => `${b} ${v}`).join('/')} 上该功能不可用,须有降级路径` : ''}`)
    if (blocked.length) impactQueries.push([name, affectedRanges(feat.min, targets)])
  }
  if (moduleWorkerUsed) report('module Worker', MODULE_WORKER)
  if (wasmFiles.length) report(`WebAssembly(${wasmFiles.length} 个 .wasm)`, WASM)
  if (workerFiles.length || moduleWorkerUsed || wasmFiles.length) {
    console.log('    → 在兼容声明中写「功能级可用范围」,并在低版本上运行验证降级路径(如预览失败回退为下载)')
  }
}

/**
 * 区分两种出现位置(文本搜索分不清,会误报):
 * - 正则字面量 /(?<=x)/ :不支持的浏览器整包解析失败 → 白屏,判失败
 * - 字符串里 new RegExp('(?<=x)'):只在执行到时抛错,且常为条件分支(如 async-validator 的
 *   includeBoundaries 默认不启用),只提示人工确认
 */
function scanLookbehind(src) {
  // 快速路径:文本里根本没有 (?<= / (?<! 时无需词法分析(对数十 MB 产物可省下大半耗时)
  const total = (src.match(LOOKBEHIND.re) || []).length
  if (!total) return { literals: 0, inStrings: 0 }
  let literals = 0
  try {
    for (const tok of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module' })) {
      if (tok.type.label === 'regexp' && LOOKBEHIND.re.test(tok.value.pattern)) literals++
      LOOKBEHIND.re.lastIndex = 0
    }
  } catch {
    // 词法分析失败时该文件已在第 1 项报错
  }
  return { literals, inStrings: Math.max(0, total - literals) }
}

console.log('\n== 2. 正则后行断言 (?<= / (?<!')
const lookbehindBlocked = unsupportedBy(LOOKBEHIND.min, targets)
const blockedText = lookbehindBlocked.map(([b, v]) => `${b} ${v}`).join('/')
let lookbehindFound = false
for (const f of jsFiles) {
  const { literals, inStrings } = scanLookbehind(sources.get(f))
  const name = relative(process.cwd(), f)
  if (literals) {
    lookbehindFound = true
    if (lookbehindBlocked.length && !isWorkerFile(f)) failed = true
    console.log(
      lookbehindBlocked.length
        ? isWorkerFile(f)
          ? `  ⚠ ${name}: ${literals} 处正则字面量(Worker),目标 ${blockedText} 不支持 → 仅该 Worker 解析失败,影响用到它的功能,不计入退出码`
          : `  ✗ ${name}: ${literals} 处正则字面量,目标 ${blockedText} 不支持 → 整包解析失败(白屏)`
        : `  ⚠ ${name}: ${literals} 处正则字面量(目标均支持;Safari 需 ≥ 16.4)`
    )
    if (lookbehindBlocked.length) impactQueries.push(['正则后行断言字面量', affectedRanges(LOOKBEHIND.min, targets)])
  }
  if (inStrings) {
    lookbehindFound = true
    console.log(
      `  ⚠ ${name}: ${inStrings} 处位于字符串(运行时 new RegExp 构造)${lookbehindBlocked.length ? `,在 ${blockedText} 上执行到时会抛错,需人工确认是否可达` : ''}`
    )
  }
}
if (!lookbehindFound) console.log('  ✓ 未发现')

console.log(`\n== 3. CSS 风险特性,共 ${cssFiles.length} 个文件${targets.length ? `,目标 ${args.min}` : '(未给 --min,仅统计)'}`)
const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
for (const feat of CSS_FEATURES) {
  const count = (css.match(feat.re) || []).length
  if (!count) continue
  const blocked = unsupportedBy(feat.min, targets)
  const minText = Object.entries(feat.min).map(([b, v]) => `${b} ${v}`).join(' / ')
  const mark = blocked.length ? '⚠' : '✓'
  const note = blocked.length ? ` → ${blocked.map(([b]) => b).join('/')} 上:${feat.fallback}` : ''
  console.log(`  ${mark} ${feat.name.padEnd(16)} ${String(count).padStart(4)} 处  (需 ${minText})${note}`)
  if (blocked.length) {
    const ranges = affectedRanges(feat.min, targets)
    console.log(`      受影响区间:${ranges.map((r) => r.text).join(' / ')}`)
    impactQueries.push([feat.name, ranges])
  }
}

if (impactQueries.length) {
  const supported = targets.map(([label, , v]) => `${BROWSERSLIST_NAMES[label]} >= ${v}`).join(', ')
  console.log('\n== 4. 影响评估查询(用户占比;有项目访问统计时以统计为准,见 references/review.md §4.1)')
  console.log(`  支持范围(分母): npx browserslist@latest --coverage "${supported}"`)
  for (const [name, ranges] of impactQueries) {
    console.log(`  ${name}: npx browserslist@latest --coverage "${ranges.map((r) => r.query).join(', ')}"`)
  }
  console.log('  中国区把 --coverage 换成 "--coverage=CN"(zsh 下须加引号)')
}

// ---- 5. 横屏处理(H5 默认竖屏):--min 含移动内核或显式 --h5 时检查 ----
const MOBILE_LABELS = ['ios', 'ios_saf', 'android', 'webview', 'and_chr']
if (args.h5 || targets.some(([label]) => MOBILE_LABELS.includes(label))) {
  console.log('\n== 5. 横屏处理(H5 默认竖屏,见 references/h5.md §5.1)')
  // 取出每个含 orientation: landscape 的 @media 块(按花括号配平,兼容压缩后的单行 CSS)
  const landscapeBlocks = []
  const mediaRe = /@media[^{]*orientation\s*:\s*landscape[^{]*\{/gi
  for (let m = mediaRe.exec(css); m; m = mediaRe.exec(css)) {
    let depth = 1
    let i = m.index + m[0].length
    for (; i < css.length && depth > 0; i++) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0
    landscapeBlocks.push(css.slice(m.index + m[0].length, i - 1))
  }
  // 遮罩型:横屏块内有 position:fixed(全屏提示层的特征);否则只是横屏下的布局调整
  const overlay = landscapeBlocks.some((b) => /position\s*:\s*fixed/i.test(b))
  const lockApi = jsFiles.some((f) => /screen\.orientation\.lock/.test(sources.get(f)))
  if (overlay) {
    console.log(`  ✓ 产物中发现横屏遮罩(@media orientation: landscape 内含 position:fixed,共 ${landscapeBlocks.length} 个横屏媒体查询)`)
    console.log('    仍需人工确认:横屏下遮罩是否真的显示且可关闭(「继续横屏使用」)、竖屏 / 平板横屏不显示(852×393、568×320、1024×768 实测)')
  } else if (landscapeBlocks.length) {
    console.log(`  ⚠ 发现 ${landscapeBlocks.length} 个 orientation: landscape 媒体查询,但其中没有 position:fixed,看起来只是横屏布局调整而非遮罩提示`)
    console.log('    → 若项目声明支持横屏,请验证横屏布局;若默认竖屏,仍建议加可关闭的半透明横屏遮罩(h5.md §5.1)')
  } else {
    console.log('  ⚠ 产物中未发现横屏处理(无 orientation: landscape 媒体查询)')
    console.log('    → 手机横屏时页面将按横屏直接渲染;项目若默认竖屏,建议加可关闭的半透明横屏遮罩提示(h5.md §5.1);若声明支持横屏,请改为验证横屏布局')
  }
  if (lockApi) console.log('  ⚠ JS 中含 screen.orientation.lock:它仅在全屏 / PWA 下可用,在 iOS Safari 与微信内基本无效,不能作为横屏策略')
}

console.log(`\n结果:${failed ? '✗ 未通过(存在会导致白屏的 JS 问题)' : '✓ JS 通过'}${workerIssues.length ? ';Worker ⚠ 项影响对应功能,不影响退出码' : ''}${targets.length ? ';CSS ⚠ 项为样式退化风险,不影响退出码' : ''}\n`)
process.exit(failed ? 1 : 0)
