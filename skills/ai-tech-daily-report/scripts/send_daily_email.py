#!/usr/bin/env python3
"""
科技AI日报邮件发送脚本
直接使用smtplib发送，不依赖外部skill
"""
import sys
import os
import re
import html
import smtplib
import argparse
import json
import urllib.request
import urllib.error
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _esc(text):
    """转义为安全的HTML文本，防止markdown正文里偶然出现的<、>、&破坏邮件排版"""
    return html.escape(text or '', quote=False)


def _inline(text):
    """行内格式：转义 + 链接 + **加粗**；非http(s)链接（如 ./日报_xxx.md 相对链接）只保留标签文字"""
    escaped = _esc(text)

    def _link(m):
        label, url = m.group(1), m.group(2)
        if url.startswith('http://') or url.startswith('https://'):
            return f'<a href="{url}" style="color: #667eea; text-decoration: none;">{label}</a>'
        return label

    out = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', _link, escaped)
    out = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', out)
    return out


# 邮件正文各类块元素的内联样式（邮件客户端普遍不支持<style>，只能逐元素内联）
_S_H2 = 'margin: 32px 0 16px; font-size: 20px; font-weight: 600; color: #1a1a2e; padding-bottom: 8px; border-bottom: 2px solid #667eea;'
_S_CARD = 'margin-bottom: 20px; padding: 16px; background-color: #f8f9fc; border-radius: 8px; border-left: 4px solid #667eea;'
_S_H3 = 'margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #16213e;'
_S_P = 'margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #333;'
_S_LIST = 'margin: 0 0 10px; padding-left: 20px; font-size: 14px; line-height: 1.7; color: #333;'
_S_LI = 'margin-bottom: 8px;'
_S_QUOTE = 'margin: 0 0 10px; padding: 8px 12px; font-size: 13px; line-height: 1.7; color: #5f6368; background-color: #eef0f7; border-radius: 6px;'


def _render_table(lines):
    """渲染一个连续的markdown表格块；第一行为表头，跳过 |---| 分隔行"""
    def _cells(line):
        return [c.strip() for c in line.strip().strip('|').split('|')]

    header = _cells(lines[0])
    rows = [c for c in (_cells(l) for l in lines[1:])
            if not all(set(x) <= {'-', ':', ' '} for x in c)]
    out = '<table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px;"><thead><tr style="background-color: #667eea; color: #ffffff;">'
    out += ''.join(f'<th style="padding: 10px; text-align: left;">{_inline(h)}</th>' for h in header)
    out += '</tr></thead><tbody>'
    for i, row in enumerate(rows):
        bg = 'background-color: #f8f9fc;' if i % 2 == 0 else 'background-color: #ffffff;'
        out += f'<tr style="{bg}">'
        for cell in row:
            color = '#34a853' if re.match(r'^\+\d', cell) else '#333'
            out += f'<td style="padding: 10px; border-bottom: 1px solid #e8eaed; color: {color};">{_inline(cell)}</td>'
        out += '</tr>'
    return out + '</tbody></table>'


def _render_body(lines):
    """逐行渲染正文：## 栏目标题、### 分组卡片、列表、表格、引用、段落。
    每个块只渲染一次，不按固定条目格式做正则抽取，因此不会出现内容丢失或同一表格重复输出。"""
    out = []
    in_card = False
    i = 0

    def close_card():
        nonlocal in_card
        if in_card:
            out.append('</div>')
            in_card = False

    while i < len(lines):
        line = lines[i].rstrip()
        stripped = line.strip()

        if not stripped or re.fullmatch(r'-{3,}|\*{3,}', stripped):
            i += 1
            continue

        if stripped.startswith('## '):
            close_card()
            out.append(f'<h2 style="{_S_H2}">{_inline(stripped[3:].strip())}</h2>')
            i += 1
            continue

        if stripped.startswith('### '):
            close_card()
            out.append(f'<div style="{_S_CARD}"><h3 style="{_S_H3}">{_inline(stripped[4:].strip())}</h3>')
            in_card = True
            i += 1
            continue

        if stripped.startswith('|'):
            block = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                block.append(lines[i].strip())
                i += 1
            if len(block) >= 2:
                out.append(_render_table(block))
            continue

        list_re = re.compile(r'^\s*(?:[-*]|\d+\.)\s+')
        if list_re.match(line):
            ordered = bool(re.match(r'^\s*\d+\.', line))
            items = []
            while i < len(lines) and list_re.match(lines[i]):
                items.append(list_re.sub('', lines[i], count=1).strip())
                i += 1
            tag = 'ol' if ordered else 'ul'
            lis = ''.join(f'<li style="{_S_LI}">{_inline(t)}</li>' for t in items)
            out.append(f'<{tag} style="{_S_LIST}">{lis}</{tag}>')
            continue

        if stripped.startswith('>'):
            quote = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                quote.append(lines[i].strip().lstrip('>').strip())
                i += 1
            out.append(f'<p style="{_S_QUOTE}">{"<br>".join(_inline(q) for q in quote)}</p>')
            continue

        para = []
        while (i < len(lines) and lines[i].strip()
               and not re.match(r'^\s*(#{2,3} |\||>|[-*]\s|\d+\.\s|-{3,}$)', lines[i])):
            para.append(lines[i].strip())
            i += 1
        text = '<br>'.join(_inline(p) for p in para)
        # 单独一行的 *斜体* 结尾标记行（如"本日报由XX自动生成"）按脚注样式展示
        text = re.sub(r'^\*(.+)\*$', r'<em style="color: #5f6368;">\1</em>', text)
        out.append(f'<p style="{_S_P}">{text}</p>')

    close_card()
    return '\n'.join(out)


def markdown_to_html(markdown_text):
    """将Markdown日报转换为精美邮件HTML"""

    # 解析报告日期 - 支持两种标题格式
    # 格式1：# 科技AI日报 2026-05-31
    # 格式2：# 科技AI行业新闻日报\n## 2026年5月31日
    report_date = datetime.now().strftime('%Y-%m-%d')
    date_match = re.search(r'^# 科技AI日报 (\d{4}-\d{2}-\d{2})', markdown_text, re.MULTILINE)
    if date_match:
        report_date = date_match.group(1)
    else:
        cn = re.search(r'^## (\d{4})年(\d{1,2})月(\d{1,2})日', markdown_text, re.MULTILINE)
        if cn:
            report_date = f"{cn.group(1)}-{cn.group(2).zfill(2)}-{cn.group(3).zfill(2)}"

    # 顶部信息区：标题之后、第一条 --- 分隔线之前的内容
    # （清单最后更新/智能体应用/使用模型/报告生成时间/数据覆盖范围等）
    lines = markdown_text.split('\n')
    sep = next((n for n, l in enumerate(lines) if re.fullmatch(r'-{3,}', l.strip())), None)
    head_lines = lines[:sep] if sep is not None else []
    body_lines = lines[sep + 1:] if sep is not None else lines

    meta_rows = ''
    for l in head_lines:
        l = l.strip()
        if not l or l.startswith('# ') or re.match(r'^## \d{4}年', l):
            continue
        m = re.match(r'^\*\*(.+?)[：:]?\*\*\s*[：:]?\s*(.*)$', l)
        if m:
            key, val = m.group(1).strip(), m.group(2).strip().rstrip('*').strip()
            meta_rows += (f'<tr><td style="padding: 3px 12px 3px 0; color: #5f6368; font-size: 13px; white-space: nowrap; vertical-align: top;">{_esc(key)}</td>'
                          f'<td style="padding: 3px 0; color: #333; font-size: 13px; line-height: 1.6;">{_inline(val)}</td></tr>')
        else:
            meta_rows += f'<tr><td colspan="2" style="padding: 3px 0; color: #333; font-size: 13px; line-height: 1.6;">{_inline(l)}</td></tr>'

    content_html = _render_body(body_lines)
    meta_html = (f'''<tr>
                        <td style="padding: 16px 40px; background-color: #f8f9fc; border-bottom: 1px solid #e8eaed;">
                            <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">{meta_rows}</table>
                        </td>
                    </tr>''' if meta_rows else '')

    styled_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>科技AI日报 {_esc(report_date)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width: 680px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background-color: #667eea; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">🚀 科技AI日报</h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{_esc(report_date)}</p>
                        </td>
                    </tr>
                    {meta_html}
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            {content_html}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f8f9fc; border-top: 1px solid #e8eaed; text-align: center;">
                            <p style="margin: 0; color: #5f6368; font-size: 13px;">本报告基于公开信息整理，仅陈述事实，供行业参考</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''

    return styled_html


def get_smtp_config():
    """从config.json读取SMTP配置，如果不存在则回退到SECRET.md"""
    
    # 获取技能目录路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)
    main_dir = os.path.dirname(os.path.dirname(skill_dir))
    
    # 优先从 config.json 读取
    config_file = os.path.join(skill_dir, 'config.json')
    
    if os.path.exists(config_file):
        print(f"✓ 从 config.json 读取配置")
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        return {
            'smtp_server': config.get('smtp_server', 'smtp.qq.com'),
            'smtp_port': config.get('smtp_port', 465),
            'smtp_use_ssl': config.get('smtp_use_ssl', True),
            'email_address': config.get('email_address', ''),
            'auth_code': config.get('auth_code', ''),
            'recipient': config.get('recipient', ''),
            # 分渠道收件人（可选）：不同发送方式可以投给不同邮箱，未配置时回退到上面的 recipient
            'smtp_recipient': config.get('smtp_recipient', ''),
            'resend_recipient': config.get('resend_recipient', ''),
            'sender_name': config.get('sender_name', '科技AI日报'),
            # Resend HTTP API（可选，SMTP发送失败时的备用方式；见 send_via_resend）
            'resend_api_key': config.get('resend_api_key', ''),
            'resend_from': config.get('resend_from', 'onboarding@resend.dev'),
        }
    
    # 回退：从 SECRET.md 读取（兼容旧配置）
    print(f"⚠ config.json 不存在，回退到 SECRET.md")
    
    # 依次尝试多个位置
    candidates = [
        os.path.join(main_dir, "SECRET.md"),       # 主对话目录
        os.path.join(skill_dir, "SECRET.md"),       # 技能目录
        "./SECRET.md",                              # 当前工作目录
    ]
    
    secret_file = None
    for path in candidates:
        if os.path.exists(path):
            secret_file = path
            break
    
    if not secret_file:
        raise FileNotFoundError(f"配置文件不存在，请创建 config.json 或确保 SECRET.md 存在\n尝试位置: {candidates}")
    
    config = {
        'smtp_server': 'smtp.qq.com',
        'smtp_port': 465,
        'smtp_use_ssl': True,
        'sender_name': '科技AI日报',
        'recipient': '',  # SECRET.md 中没有收件人，需要在 config.json 中配置
    }
    
    if os.path.exists(secret_file):
        with open(secret_file, 'r', encoding='utf-8') as f:
            content = f.read()
            email_match = re.search(r'\*\*邮箱地址\*\*[：:]\s*(.+)', content)
            if email_match:
                config['email_address'] = email_match.group(1).strip()
            auth_match = re.search(r'\*\*授权码\*\*[：:]\s*(.+)', content)
            if auth_match:
                config['auth_code'] = auth_match.group(1).strip()
            smtp_match = re.search(r'\*\*SMTP服务器\*\*[：:]\s*(.+)', content)
            if smtp_match:
                config['smtp_server'] = smtp_match.group(1).strip()
            port_match = re.search(r'\*\*端口\*\*[：:]\s*(\d+)', content)
            if port_match:
                config['smtp_port'] = int(port_match.group(1))
    
    return config


def send_via_resend(config, to_email, subject, html_content):
    """通过 Resend HTTP API（https://api.resend.com/emails）发送邮件。
    走HTTPS，不受云端沙盒/已连接设备环境的SMTP出站限制。
    未验证自定义域名时，resend.dev 测试域名只能发给Resend账号自己的邮箱地址。
    """
    api_key = config.get('resend_api_key', '')
    if not api_key:
        raise ValueError("resend_api_key 未配置")

    payload = {
        'from': config.get('resend_from', 'onboarding@resend.dev'),
        'to': [to_email],
        'subject': subject,
        'html': html_content,
    }
    data = json.dumps(payload).encode('utf-8')

    req = urllib.request.Request(
        'https://api.resend.com/emails',
        data=data,
        method='POST',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            # 显式声明浏览器风格UA：urllib默认UA（Python-urllib/x.y）常被Resend前置的
            # Cloudflare判定为爬虫特征，直接403拦截（错误码1010），与API key/额度无关
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read().decode('utf-8')
            print(f"✓ Resend API 响应: {resp_body}")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        raise RuntimeError(f"Resend API 返回错误 {e.code}: {error_body}")


def send_email(smtp_config, to_email, subject, html_content):
    """使用SMTP发送HTML邮件"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = smtp_config['email_address']
    msg['To'] = to_email

    html_part = MIMEText(html_content, 'html', 'utf-8')
    msg.attach(html_part)

    if smtp_config.get('smtp_use_ssl', True):
        server = smtplib.SMTP_SSL(smtp_config['smtp_server'], smtp_config['smtp_port'], timeout=30)
    else:
        server = smtplib.SMTP(smtp_config['smtp_server'], smtp_config['smtp_port'], timeout=30)
        server.starttls()

    try:
        server.login(smtp_config['email_address'], smtp_config['auth_code'])
        server.sendmail(smtp_config['email_address'], [to_email], msg.as_string())
    finally:
        server.quit()


    return True


def main():
    parser = argparse.ArgumentParser(description='发送科技AI日报邮件')
    parser.add_argument('report_file', nargs='?', help='日报Markdown文件路径')
    parser.add_argument('--force', action='store_true', help='强制发送，跳过去重')
    parser.add_argument('--to', help='收件人邮箱（默认从配置读取）')
    args = parser.parse_args()
    
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    # 去重检查
    sent_record_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'outputs', '日报', '.sent_records.txt')
    if not args.force and os.path.exists(sent_record_file):
        with open(sent_record_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # 检查是否今天该版本已发送
            if current_date in content:
                print(f"⚠️ 今日({current_date})日报已发送过，跳过重复发送")
                print(f"如需重新发送，请使用 --force 参数")
                return True
    elif args.force:
        print("ℹ️ 强制发送模式，跳过去重检查")
    
    # 确定日报文件
    report_path = None
    if args.report_file and os.path.exists(args.report_file):
        report_path = args.report_file
    else:
        # 在outputs目录下查找今天的日报
        outputs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'outputs', '日报')
        candidates = []
        if os.path.exists(outputs_dir):
            for f in os.listdir(outputs_dir):
                if current_date in f and f.endswith('.md'):
                    candidates.append(os.path.join(outputs_dir, f))
        
        if candidates:
            # 优先选版本号最大的（按_V后的数字排序，而非文件名字符串排序，避免V10排到V9前面）
            def _version_num(path):
                m = re.search(r'_V(\d+)', os.path.basename(path))
                return int(m.group(1)) if m else 0
            candidates.sort(key=_version_num, reverse=True)
            report_path = candidates[0]
    
    if not report_path:
        print(f"❌ 未找到日报文件: {current_date}")
        sys.exit(1)
    
    print(f"✓ 读取报告: {report_path}")
    
    with open(report_path, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    # 转换为HTML
    html_content = markdown_to_html(markdown_content)
    print(f"✓ 转换为HTML ({len(html_content)} 字符)")
    
    # 获取SMTP配置
    smtp_config = get_smtp_config()
    
    # 收件人：命令行参数 --to 会同时覆盖两个渠道；否则SMTP和Resend各自可配置独立收件人，
    # 未单独配置时回退到通用的 recipient
    to_email_smtp = args.to or smtp_config.get('smtp_recipient') or smtp_config.get('recipient', '')
    to_email_resend = args.to or smtp_config.get('resend_recipient') or smtp_config.get('recipient', '')
    if not to_email_smtp:
        raise ValueError("收件人未配置，请通过 --to 参数指定，或在 config.json 配置 smtp_recipient/recipient")

    subject = f"科技AI日报 {current_date}"

    # 发送：优先SMTP（真实本机终端环境下已验证可行，不受云端沙盒代理白名单限制）；
    # SMTP失败时，若已配置resend_api_key，则自动尝试Resend HTTP API作为备用发送方式
    sent_to = to_email_smtp
    try:
        try:
            send_email(smtp_config, to_email_smtp, subject, html_content)
        except Exception as smtp_error:
            if smtp_config.get('resend_api_key'):
                print(f"⚠️ SMTP发送失败（{smtp_error}），尝试备用方式 Resend HTTP API")
                send_via_resend(smtp_config, to_email_resend, subject, html_content)
                sent_to = to_email_resend
            else:
                raise
        print(f"✓ 邮件发送成功")
        print(f"  收件人: {sent_to}")
        print(f"  主题: {subject}")
        print(f"  邮件大小: {len(html_content)} 字符")
        
        # 记录发送
        if os.path.exists(os.path.dirname(sent_record_file)):
            with open(sent_record_file, 'a', encoding='utf-8') as f:
                f.write(f"{current_date}\n")
        
        return True
    except Exception as e:
        print(f"❌ 邮件发送失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
