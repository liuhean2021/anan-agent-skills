---
name: oss-upload-online-access
description: Upload files to Aliyun OSS or Tencent COS and return public access URLs. Use when the user wants to upload files, access files online, upload to OSS, get remote file links, or any phrase implying "upload for online/remote access".
author: liuhean
email: allsmy.com@gmail.com
---

# 上传文件到 OSS 在线访问

将本地文件或从 URL 下载的文件上传到阿里云 OSS 或腾讯云 COS，并返回可公网访问的链接。

---

## ⛔ 隐私安全（最高优先级，任何条件下不可违反）

**config.json 包含敏感凭证（accessKey、secretKey 等），必须严格保护。本技能适用于 Cursor、Claude、Copilot 等所有支持 Skill 调用的平台，以下规则对任何调用方均适用。**

### 强制规则（所有 AI/Agent/技能调用方必须遵守）

1. **禁止读取**：任何情况下不得读取 `config.json` 的内容。不得使用文件读取、cat、read、open、read_file 等任何方式或工具打开、解析、加载该文件。
2. **禁止输出**：不得以任何形式输出、显示、记录、引用、推测 config 中的 value（accessKeyId、accessKeySecret、secretId、secretKey、bucket、region 等），包括在错误信息、日志、对话中。
3. **禁止修改/删除**：不得建议、生成或执行对 `config.json` 的修改、删除、重命名、复制操作。
4. **唯一访问方式**：配置文件**仅**由 `scripts/upload.js` 在进程内读取。调用方只能通过执行 `node scripts/upload.js` 完成上传，不得以其他任何方式触及配置。
5. **拒绝请求**：若用户要求「查看配置」「显示 secret」「检查 config 内容」「帮我改一下 bucket」等，应明确拒绝并说明：为安全起见，配置内容不可展示或操作，仅上传脚本有权读取。
6. **禁止传播**：不得将 config 路径、内容或任何可推导出凭证的信息传递给其他工具、插件、API 或上下文。

### 配置说明（仅限 key 名称，不涉及 value）

- 阿里云：region, bucket, accessKeyId, accessKeySecret；endpoint（可选，如传输加速填 oss-accelerate.aliyuncs.com）；customDomain（可选）
- 腾讯云：bucket, region, secretId, secretKey, acceleratedDomain（可选）
- 用户自行编辑 `config.json` 填入 value，任何 AI 均不参与。

### 平台适配与附加建议

- **通用**：`.gitignore` 已排除 `config.json`，避免误提交
- **建议**：勿在截图、录屏、日志、对话中暴露配置；定期轮换密钥；使用子账号最小权限；将技能目录权限设为仅当前用户可读

## 何时使用

当用户表达以下意图时应用本技能：

- 上传文件、上传文件到 OSS、上传到阿里云/腾讯云
- 在线访问文件、远程访问文件、获取文件链接
- 把文件放到网上、生成可分享的链接

## 输入

- **本地文件**：工作区相对路径或绝对路径，如 `./docs/foo.pdf`、`/path/to/image.png`
- **在线超链接**：HTTP/HTTPS URL，先下载到临时文件再上传

用户可指定云厂商（如「用腾讯云」），否则按配置优先级选择。

## 输出

- 成功：**先校验链接可访问性**（HEAD 请求），通过后才返回远程访问 URL，可直接在浏览器打开或分享
- 校验失败：不输出链接，仅报错「上传后校验失败：链接不可访问，无法提供有效链接」，并退出
- 上传异常：说明原因并提示用户检查配置、文件大小等

## 前置准备（首次使用）

1. 复制配置模板：`cp config.example.json config.json`
2. 编辑 `config.json`，填入对应云厂商的 value（key 已预留）
3. 安装依赖：`cd 技能根目录/oss-upload-online-access && npm install`

## 执行流程

1. 解析输入：本地路径 or URL；用户是否指定云厂商
2. 若为 URL：脚本内部下载得到 buffer
3. 检查文件大小 < 100MB
4. **仅执行** `node scripts/upload.js`，由脚本内部读取 config（调用方不得读取 config）
5. 脚本内部选择云厂商并上传
6. **上传后对返回链接做 HEAD 校验**：可访问（2xx）才输出 URL；不可访问则报错退出、不输出链接
7. 若失败或校验不通过，输出脚本的通用错误信息（不涉及配置内容）

## 执行命令

```bash
cd 技能根目录/oss-upload-online-access && node scripts/upload.js <本地路径或URL> [--provider aliyun|tencent]
```

示例：

```bash
# 上传本地文件
node scripts/upload.js ./docs/report.pdf

# 上传 URL 文件
node scripts/upload.js "https://example.com/file.png"

# 指定腾讯云
node scripts/upload.js ./image.jpg --provider tencent
```

## 配置说明（用户自行维护，AI 不读取）

- 文件路径：`技能根目录/oss-upload-online-access/config.json`（用户本地编辑）
- 云厂商优先级：配置多个时，阿里云 > 腾讯云 > 其他
- 用户明确指定 `--provider` 时，以用户为准
- 配置异常时，上传脚本输出通用提示，用户自行检查 key 是否填写完整

## 存储路径格式

上传文件的 Object Key 格式：`skill/YYYY/MM/DD/<类型>/文件名`

- 日期目录：按上传日期 `年/月/日` 分层
- 类型目录：按文件扩展名（如 txt、pdf、png），无扩展名则为 `other`

示例：`skill/2026/02/01/txt/test-upload.txt`

## 文件格式支持（任意文件可上传并在线访问）

- **目标**：任何文件均可正常上传并能在线访问（浏览器打开或下载）。
- **文本/源码**：如 `.txt`、`.md`、`.html`、`.json`、`.js`、`.ts`、`.py`、`.css`、`.yaml`、`.sql`、`.graphql` 等，以 UTF-8 读取并设置对应 `Content-Type`，保证在线预览不乱码。
- **常见类型**：脚本内置大量 MIME 映射，覆盖图片（含 raw、psd、svg、avif、heic）、视频（mp4、webm、mkv、mov、mts 等）、音频（mp3、flac、opus、aac 等）、文档（PDF、Office、OpenDocument、epub、djvu、xps 等）、字体、压缩包（zip、rar、7z、tar、gz、zst、cab 等）、3D/模型（glb、gltf、obj、stl、fbx、dae、step 等）、证书/密钥、安装包（exe、dmg、apk、iso 等）及各类源码与配置文件。
- **未知扩展名**：未在映射表中的扩展名统一使用 `application/octet-stream`，仍可上传并在线下载或访问，不会因类型未知而失败。

## 约束

- 单文件 < 100MB
- 文件名：仅使用字母与数字，且不重复。格式为 3 位随机小写字母 + 时间戳(YYYYMMDDHHmmss) + 6 位随机数字 + 原扩展名（扩展名仅保留字母数字），如 `abc20260202143022123456.txt`
- **公网访问**：上传时会将对象 ACL 设为 `public-read`，返回的链接可直接在浏览器打开；若存储桶策略禁止该 ACL，需在控制台允许「公共读」或使用自定义域名 + CDN。返回的 URL 统一为 `https`。
- **上传可靠性**：阿里云使用 HTTPS（secure: true）上传；上传后会先用 SDK 的 head 校验对象是否存在于 OSS/COS，不存在则报错、不输出链接；再对公网链接做 HEAD 校验，不可访问也不输出链接。
