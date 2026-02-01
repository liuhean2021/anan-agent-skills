---
name: oss-upload-online-access
description: Upload files to Aliyun OSS or Tencent COS and return public access URLs. Use when the user wants to upload files, access files online, upload to OSS, get remote file links, or any phrase implying "upload for online/remote access".
---

# 上传文件到 OSS 在线访问

将本地文件或从 URL 下载的文件上传到阿里云 OSS 或腾讯云 COS，并返回可公网访问的链接。

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

- 成功：返回**远程访问 URL**，可直接在浏览器打开或分享
- 失败：说明原因并提示用户检查配置、文件大小等

## 前置准备（首次使用）

1. 复制配置模板：`cp config.example.json config.json`
2. 编辑 `config.json`，填入对应云厂商的 value（key 已预留）
3. 安装依赖：`cd ~/.cursor/skills/oss-upload-online-access && npm install`

## 执行流程

1. 解析输入：本地路径 or URL；用户是否指定云厂商
2. 若为 URL：用 axios 下载到临时文件，得到 buffer
3. 检查文件大小 < 100MB
4. 读取 `~/.cursor/skills/oss-upload-online-access/config.json`
5. 选择云厂商：用户指定 > 配置优先级（阿里云 > 腾讯云 > 其他）
6. 若配置缺失或异常，提示用户补齐并退出
7. 确定文件名：优先保留原始名，有歧义时追加 `_YYYYMMDDHHmmss_XXX`（XXX 为 3 位随机数）
8. 调用 `scripts/upload.js` 执行上传
9. 输出返回的 URL

## 执行命令

```bash
cd ~/.cursor/skills/oss-upload-online-access && node scripts/upload.js <本地路径或URL> [--provider aliyun|tencent]
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

## 配置说明

- 路径：`~/.cursor/skills/oss-upload-online-access/config.json`
- 云厂商优先级：配置多个时，阿里云 > 腾讯云 > 其他
- 用户明确指定 `--provider` 时，以用户为准
- 配置异常时，输出缺失的 key 并提示用户填写

## 存储路径格式

上传文件的 Object Key 格式：`skill/YYYY/MM/DD/<类型>/文件名`

- 日期目录：按上传日期 `年/月/日` 分层
- 类型目录：按文件扩展名（如 txt、pdf、png），无扩展名则为 `other`

示例：`skill/2026/02/01/txt/test-upload.txt`

## 约束

- 单文件 < 100MB
- 文件名：OSS 支持的前提下优先保留原名，有歧义则追加 `_YYYYMMDDHHmmss_XXX`
