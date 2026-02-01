#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const SKILL_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(SKILL_ROOT, 'config.json');
const DIR_PREFIX = 'skill';

function getObjectDir(filename) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const ext = (path.extname(filename) || '').slice(1).toLowerCase() || 'other';
  return `${DIR_PREFIX}/${y}/${m}/${d}/${ext}`;
}

function removeSpecialChars(str) {
  return String(str || '').replace(/[^\w\s\-\.]/g, '');
}

function extractDomain(url) {
  const m = url.match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : null;
}

function safeFilename(original) {
  const base = path.basename(original);
  const safe = base.replace(/[^\w\s\-\.]/g, '_').replace(/\s+/g, '_');
  if (!safe || safe.length === 0) {
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const rand = Math.floor(100 + Math.random() * 900);
    return `file_${ts}_${rand}`;
  }
  return safe;
}

function uniqueFilename(original) {
  const ext = path.extname(original);
  const base = path.basename(original, ext);
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${base}_${ts}_${rand}${ext}`;
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('错误：配置文件不存在。请复制 config.example.json 为 config.json 并填入配置。');
    process.exit(1);
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('错误：config.json 格式无效。');
    process.exit(1);
  }
}

function isAliyunConfigured(cfg) {
  const a = cfg.aliyun || {};
  return !!(a.region && a.bucket && a.accessKeyId && a.accessKeySecret);
}

function isTencentConfigured(cfg) {
  const t = cfg.tencent || {};
  return !!(t.bucket && t.region && t.secretId && t.secretKey);
}

function selectProvider(cfg, userProvider) {
  if (userProvider) {
    const p = userProvider.toLowerCase();
    if (p === 'aliyun' && isAliyunConfigured(cfg)) return 'aliyun';
    if (p === 'tencent' && isTencentConfigured(cfg)) return 'tencent';
    console.error(`错误：用户指定了 ${userProvider}，但该云厂商配置不完整。请检查 config.json。`);
    process.exit(1);
  }
  if (isAliyunConfigured(cfg)) return 'aliyun';
  if (isTencentConfigured(cfg)) return 'tencent';
  console.error('错误：未找到有效配置。请至少配置阿里云或腾讯云，并填写 region、bucket、accessKeyId、accessKeySecret（或 secretId、secretKey）。');
  process.exit(1);
}

function getBufferFromUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return getBufferFromUrl(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_SIZE) {
          res.destroy();
          reject(new Error('文件超过 100MB 限制'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadAliyun(buffer, filename, cfg) {
  const ALIOSS = require('ali-oss');
  const a = cfg.aliyun || {};
  const client = new ALIOSS({
    region: removeSpecialChars(a.region),
    accessKeyId: a.accessKeyId,
    accessKeySecret: a.accessKeySecret,
    bucket: removeSpecialChars(a.bucket),
  });
  const dir = getObjectDir(filename);
  const key = `${dir}/${filename}`;
  const result = await client.put(key, buffer, { timeout: 600000 });
  let url = result.url;
  if (a.customDomain) {
    const d = extractDomain(url);
    if (d) url = url.replace(d, a.customDomain.replace(/\/$/, ''));
  }
  return url;
}

function uploadTencent(buffer, filename, cfg) {
  return new Promise((resolve, reject) => {
    const COS = require('cos-nodejs-sdk-v5');
    const t = cfg.tencent || {};
    const cos = new COS({
      SecretId: t.secretId,
      SecretKey: t.secretKey,
      FileParallelLimit: 10,
      Timeout: 600000,
    });
    const dir = getObjectDir(filename);
    const key = `${dir}/${filename}`;
    cos.putObject(
      {
        Bucket: removeSpecialChars(t.bucket),
        Region: removeSpecialChars(t.region),
        Key: key,
        StorageClass: 'STANDARD',
        Body: buffer,
      },
      (err, data) => {
        if (err) return reject(err);
        let url = (data.Location || '').replace(/^(http:\/\/|https:\/\/|\/\/|)(.*)/, 'https://$2');
        if (t.acceleratedDomain) {
          url = url.replace(/^(https:\/\/[^/]+)(\/.*)$/, `https://${t.acceleratedDomain}$2`);
        }
        resolve(url);
      }
    );
  });
}

async function main() {
  const args = process.argv.slice(2);
  let input = null;
  let provider = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      provider = args[i + 1];
      i++;
    } else if (!input) {
      input = args[i];
    }
  }

  if (!input) {
    console.error('用法: node scripts/upload.js <本地路径或URL> [--provider aliyun|tencent]');
    process.exit(1);
  }

  const cfg = loadConfig();
  const chosen = selectProvider(cfg, provider);

  let buffer;
  let suggestedFilename;

  if (/^https?:\/\//i.test(input)) {
    try {
      buffer = await getBufferFromUrl(input);
    } catch (e) {
      console.error('下载失败:', e.message || e);
      process.exit(1);
    }
    try {
      const u = new URL(input);
      suggestedFilename = path.basename(u.pathname) || 'download';
      if (!path.extname(suggestedFilename)) suggestedFilename += '.bin';
    } catch {
      suggestedFilename = `download_${Date.now()}.bin`;
    }
  } else {
    const fp = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
    if (!fs.existsSync(fp)) {
      console.error('错误：文件不存在:', fp);
      process.exit(1);
    }
    const stat = fs.statSync(fp);
    if (!stat.isFile()) {
      console.error('错误：不是文件:', fp);
      process.exit(1);
    }
    if (stat.size > MAX_SIZE) {
      console.error('错误：文件超过 100MB 限制');
      process.exit(1);
    }
    buffer = fs.readFileSync(fp);
    suggestedFilename = path.basename(fp);
  }

  const filename = safeFilename(suggestedFilename) || uniqueFilename(suggestedFilename);

  try {
    let url;
    if (chosen === 'aliyun') {
      url = await uploadAliyun(buffer, filename, cfg);
    } else {
      url = await uploadTencent(buffer, filename, cfg);
    }
    console.log(url);
  } catch (e) {
    // 仅输出通用错误信息，绝不泄露配置、凭证或堆栈
    console.error('上传失败，请检查网络连接或 config.json 中的配置是否正确。');
    process.exit(1);
  }
}

main();
