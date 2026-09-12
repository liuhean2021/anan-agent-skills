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


def _safe_href(url):
    """只允许http(s)链接作为可点击的href，其余协议（如javascript:）一律不生成超链接"""
    if url and (url.startswith('http://') or url.startswith('https://')):
        return html.escape(url, quote=True)
    return None


def _escape_and_linkify(text):
    """整体转义后，再把其中 [标签](http(s)://...) 形式的markdown链接还原成可点击<a>标签；
    非http(s)协议的链接保持转义后的纯文本展示，不可点击"""
    escaped = _esc(text)

    def _replace(m):
        # 注意：此时label/url已经是_esc(text)转义过一次的结果，
        # 这里只做协议前缀判断、不能再调用_safe_href（会导致&amp;被二次转义成&amp;amp;）
        label, url = m.group(1), m.group(2)
        if url.startswith('http://') or url.startswith('https://'):
            return f'<a href="{url}" style="color: #667eea; text-decoration: none;">{label}</a>'
        return m.group(0)

    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', _replace, escaped)


def markdown_to_html(markdown_text):
    """将Markdown日报转换为精美邮件HTML"""
    
    # 解析报告信息 - 支持两种标题格式
    # 格式1：# 科技AI日报 2026-05-31
    # 格式2：# 科技AI行业新闻日报\n## 2026年5月31日
    date_match = re.search(r'# 科技AI日报 (\d{4}-\d{2}-\d{2})', markdown_text)
    if not date_match:
        date_match = re.search(r'## (\d{4}年\d{1,2}月\d{1,2}日)', markdown_text)
        if date_match:
            # 将"2026年5月31日"转换为"2026-05-31"格式
            date_str = date_match.group(1)
            year_match = re.search(r'(\d{4})年', date_str)
            month_match = re.search(r'(\d{1,2})月', date_str)
            day_match = re.search(r'(\d{1,2})日', date_str)
            if year_match and month_match and day_match:
                year = year_match.group(1)
                month = month_match.group(1).zfill(2)
                day = day_match.group(1).zfill(2)
                report_date = f"{year}-{month}-{day}"
            else:
                report_date = datetime.now().strftime('%Y-%m-%d')
        else:
            report_date = datetime.now().strftime('%Y-%m-%d')
    else:
        report_date = date_match.group(1)

    # 解析生成时间 - 支持两种格式
    # 格式1：**报告生成时间**：2026-05-31 06:03
    # 格式2：**日报生成时间：2026年5月31日 06:03**
    time_match = re.search(r'\*\*报告生成时间\*\*[：:]\s*([\d\-\s:]+)', markdown_text)
    if not time_match:
        time_match = re.search(r'\*\*日报生成时间：(.+?)\*\*', markdown_text)
    gen_time = time_match.group(1).strip() if time_match else ''
    
    # 解析各栏目
    sections = re.split(r'^---$', markdown_text, flags=re.MULTILINE)
    
    content_html = ''
    keypoints_html = ''
    total_news = 0
    total_sources = 0
    section_count = 0
    
    for section in sections:
        section = section.strip()
        if not section:
            continue
        
        title_match = re.match(r'^## (.+)$', section, re.MULTILINE)
        if not title_match:
            continue
        
        section_title = title_match.group(1).strip()
        
        # 跳过统计部分
        if '本日动态统计' in section_title:
            news_match = re.search(r'\*\*总动态数\*\*[：:]\s*(\d+)', section)
            if news_match:
                total_news = int(news_match.group(1))
            sources_match = re.search(r'\*\*总信源数\*\*[：:]\s*(\d+)', section)
            if sources_match:
                total_sources = int(sources_match.group(1))
            continue
        
        if '核心要点' in section_title:
            points = re.findall(r'\d+\.\s*\*\*([^*]+)\*\*[：:]\s*([^\n]+)', section)
            for title, desc in points:
                keypoints_html += f'<li style="margin-bottom: 10px;"><strong style="color: #c44536;">{_esc(title.strip())}</strong>：{_esc(desc.strip())}</li>\n'
            continue
        
        section_count += 1
        
        # 栏目容器
        content_html += f'''<div style="margin-bottom: 32px;">
            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1a1a2e; padding-bottom: 8px; border-bottom: 2px solid #667eea;">{_esc(section_title)}</h2>
        '''
        
        # 提取条目 - 支持两种结构：
        # 结构1：有 ### 子标题（如 Apple、Microsoft 等公司）
        # 结构2：没有子标题，直接是 **（日期）** 条目（如前端技术动态）
        items_with_header = re.split(r'^### ', section, flags=re.MULTILINE)[1:]
        
        if items_with_header:
            # 结构1：有子标题的条目
            for item in items_with_header:
                lines = item.strip().split('\n')
                if not lines:
                    continue
                
                item_title = lines[0].strip()
                
                # 提取字段 - 支持三种格式：
                # 格式A（引用块）：> **摘要**：xxx > **来源**：[title](url)
                # 格式B（列表项）：- **标题**：内容
                # 格式C（日报标准格式）：**（5月30日）** 内容...（来源：xxx http://...）
                time_match_item = re.search(r'>\s*\*\*时间\*\*[：:]\s*([^\n]+)', item)
                summary_match = re.search(r'>\s*\*\*摘要\*\*[：:]\s*(.+?)(?=>\s*\*\*来源|\Z)', item, re.DOTALL)
                source_match = re.search(r'>\s*\*\*来源\*\*[：:]\s*\[([^\]]+)\]\(([^)]+)\)', item)
                link_match = re.search(r'>\s*\*\*项目链接\*\*[：:]\s*\[([^\]]+)\]\(([^)]+)\)', item)
                progress_match = re.search(r'>\s*\*\*最新进展\*\*[：:]\s*(.+?)(?=>\s*\*\*来源|\Z)', item, re.DOTALL)
                
                # 格式B：列表项 - 收集所有 - 开头的行
                list_items = re.findall(r'^-\s+\*\*([^*]+)\*\*[：:]\s*(.+)$', item, re.MULTILINE)
                
                # 格式C：日报标准格式 - **（日期）** 内容...（来源：xxx url）
                # 支持：**（5月30日）**、**（截至2026年5月31日）**、**（2026年5月31日）**
                daily_items = re.findall(r'\*\*（[^）]*?(\d{1,2}月\d{1,2}日)）\*\*\s*(.+?)(?=（来源：|\*\*（[^）]*\d{1,2}月\d{1,2}日|\Z)', item, re.DOTALL)
                
                item_html = f'''<div style="margin-bottom: 20px; padding: 16px; background-color: #f8f9fc; border-radius: 8px; border-left: 4px solid #667eea;">
                    <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #16213e;">{_esc(item_title)}</h3>
                '''

                if time_match_item:
                    item_html += f'<p style="margin: 0 0 8px; font-size: 13px; color: #5f6368;">📅 {_esc(time_match_item.group(1).strip())}</p>'

                if link_match:
                    link_label = _esc(link_match.group(1))
                    link_href = _safe_href(link_match.group(2))
                    if link_href:
                        item_html += f'<p style="margin: 0 0 8px; font-size: 13px;"><a href="{link_href}" style="color: #667eea; text-decoration: none;">🔗 {link_label}</a></p>'
                    else:
                        item_html += f'<p style="margin: 0 0 8px; font-size: 13px;">🔗 {link_label}</p>'

                if summary_match:
                    summary = summary_match.group(1).strip()
                    summary = re.sub(r'\*\*', '', summary)
                    summary = summary.replace('  ', ' ').strip()
                    item_html += f'<p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #333;">{_escape_and_linkify(summary)}</p>'

                if progress_match:
                    progress = progress_match.group(1).strip()
                    progress = re.sub(r'\*\*', '', progress)
                    item_html += f'<p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #333;">{_escape_and_linkify(progress)}</p>'

                # 格式B：列表项渲染
                if list_items and not summary_match:
                    for li_title, li_content in list_items:
                        li_content = re.sub(r'\*\*', '', li_content).strip()
                        li_content = _escape_and_linkify(li_content)
                        item_html += f'<p style="margin: 0 0 8px; font-size: 14px; line-height: 1.7; color: #333;"><strong>{_esc(li_title)}：</strong>{li_content}</p>'
                
                # 格式C：日报标准格式渲染
                if daily_items and not summary_match and not list_items:
                    for date, content in daily_items:
                        content = content.strip()
                        # 提取来源 - 格式：（来源：xxx url）
                        source_match_daily = re.search(r'（来源：([^）]+)）', content)
                        if source_match_daily:
                            source_text = source_match_daily.group(1).strip()
                            # 分离来源名称和URL
                            url_match = re.search(r'(https?://\S+)', source_text)
                            if url_match:
                                source_url = url_match.group(1)
                                source_name = source_text.replace(source_url, '').strip()
                            else:
                                source_name = source_text
                                source_url = None
                            # 移除来源部分
                            content = content[:content.find('（来源：')].strip()

                        # 清理内容中的加粗标记
                        content = re.sub(r'\*\*', '', content)

                        item_html += f'<p style="margin: 0 0 8px; font-size: 13px; color: #5f6368;">📅 {_esc(date)}</p>'
                        item_html += f'<p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #333;">{_esc(content)}</p>'
                        if source_match_daily and source_url:
                            href = _safe_href(source_url)
                            if href:
                                item_html += f'<p style="margin: 0;"><a href="{href}" style="font-size: 13px; color: #667eea; text-decoration: none;">🔗 {_esc(source_name)}</a></p>'
                            else:
                                item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_name)}</p>'
                        elif source_match_daily:
                            item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_name)}</p>'

                if source_match:
                    source_title = source_match.group(1)
                    href = _safe_href(source_match.group(2))
                    if href:
                        item_html += f'<p style="margin: 0;"><a href="{href}" style="font-size: 13px; color: #667eea; text-decoration: none;">🔗 {_esc(source_title)}</a></p>'
                    else:
                        item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_title)}</p>'

                # 如果以上格式都没匹配到，尝试提取普通文本内容
                if not summary_match and not list_items and not daily_items:
                    # 提取来源
                    general_source = re.search(r'（来源：([^）]+)）', item)
                    if general_source:
                        # 移除来源部分
                        clean_content = item[:item.find('（来源：')].strip()
                        # 移除标题行
                        clean_content = '\n'.join(clean_content.split('\n')[1:]).strip()
                    else:
                        # 移除标题行
                        clean_content = '\n'.join(item.split('\n')[1:]).strip()

                    # 清理加粗标记
                    clean_content = re.sub(r'\*\*', '', clean_content)
                    # 转义后再转换换行（转义不会影响\n本身，顺序安全）
                    clean_content = _escape_and_linkify(clean_content).replace('\n', '<br>')

                    if clean_content:
                        item_html += f'<p style="margin: 0; font-size: 14px; line-height: 1.7; color: #333;">{clean_content}</p>'

                    if general_source:
                        source_text = general_source.group(1).strip()
                        url_match = re.search(r'(https?://\S+)', source_text)
                        if url_match:
                            source_url = url_match.group(1)
                            source_name = source_text.replace(source_url, '').strip()
                            href = _safe_href(source_url)
                            if href:
                                item_html += f'<p style="margin: 0;"><a href="{href}" style="font-size: 13px; color: #667eea; text-decoration: none;">🔗 {_esc(source_name)}</a></p>'
                            else:
                                item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_name)}</p>'
                        else:
                            item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_text)}</p>'
                
                item_html += '</div>'
                content_html += item_html
        else:
            # 结构2：没有子标题，直接是 **（日期）** 格式的条目
            # 提取所有日报格式的条目
            # 支持：**（5月30日）**、**（截至2026年5月31日）**、**（2026年5月31日）**
            direct_items = re.findall(r'\*\*（[^）]*?(\d{1,2}月\d{1,2}日)）\*\*\s*(.+?)(?=（来源：|\*\*（[^）]*\d{1,2}月\d{1,2}日|\Z)', section, re.DOTALL)
            
            for date, content in direct_items:
                content = content.strip()
                # 提取来源 - 格式：（来源：xxx url）
                source_match_daily = re.search(r'（来源：([^）]+)）', content)
                if source_match_daily:
                    source_text = source_match_daily.group(1).strip()
                    # 分离来源名称和URL
                    url_match = re.search(r'(https?://\S+)', source_text)
                    if url_match:
                        source_url = url_match.group(1)
                        source_name = source_text.replace(source_url, '').strip()
                    else:
                        source_name = source_text
                        source_url = None
                    # 移除来源部分
                    content = content[:content.find('（来源：')].strip()
                
                # 清理内容中的加粗标记
                content = re.sub(r'\*\*', '', content)
                
                item_html = f'''<div style="margin-bottom: 20px; padding: 16px; background-color: #f8f9fc; border-radius: 8px; border-left: 4px solid #667eea;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #5f6368;">📅 {_esc(date)}</p>
                    <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.7; color: #333;">{_esc(content)}</p>
                '''

                if source_match_daily and source_url:
                    href = _safe_href(source_url)
                    if href:
                        item_html += f'<p style="margin: 0;"><a href="{href}" style="font-size: 13px; color: #667eea; text-decoration: none;">🔗 {_esc(source_name)}</a></p>'
                    else:
                        item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_name)}</p>'
                elif source_match_daily:
                    item_html += f'<p style="margin: 0; font-size: 13px; color: #5f6368;">🔗 {_esc(source_name)}</p>'
                
                item_html += '</div>'
                content_html += item_html
        
        # 检查表格（一个栏目内可能有多张独立表格，如OpenRouter用量表+Artificial Analysis智能程度表，
        # 必须按"连续的表格行块"分开识别，不能把多张表的行混在一起当成一张表，
        # 否则后一张表的表头会被当成前一张表的普通数据行，样式上完全分不清）
        table_blocks = re.findall(r'(?:^\|.*\|.*\|[ \t]*$\n?)+', section, flags=re.MULTILINE)
        for block in table_blocks:
            lines = [l for l in block.strip('\n').split('\n') if l.strip()]
            if len(lines) < 2:
                continue

            header_cells = [c.strip() for c in lines[0].strip().strip('|').split('|')]
            rows = []
            for line in lines[1:]:
                cells = [c.strip() for c in line.strip().strip('|').split('|')]
                if cells and all(set(c) <= {'-', ':', ' '} for c in cells):
                    continue  # 跳过 |---|---| 分隔行
                rows.append(cells)

            if not rows:
                continue

            # margin-top加大：每张表和上方内容（含上一张表）之间留出明显间距
            content_html += '<table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px;"><thead><tr style="background-color: #667eea; color: white;">'
            for h in header_cells:
                content_html += f'<th style="padding: 10px; text-align: left;">{_esc(h)}</th>'
            content_html += '</tr></thead><tbody>'

            for i, row in enumerate(rows):
                bg = 'background-color: #f8f9fc;' if i % 2 == 0 else ''
                content_html += f'<tr style="{bg}">'
                for cell in row:
                    color = '#34a853' if '+' in cell else '#333'
                    content_html += f'<td style="padding: 10px; border-bottom: 1px solid #e8eaed; color: {color};">{_esc(cell)}</td>'
                content_html += '</tr>'

            content_html += '</tbody></table>'

        content_html += '</div>'
    
    # 构建完整HTML
    styled_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>科技AI日报 {_esc(report_date)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">🚀 科技AI日报</h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{_esc(report_date)}</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 16px 40px; background-color: #f8f9fc; border-bottom: 1px solid #e8eaed;">
                            <span style="color: #5f6368; font-size: 13px;">生成时间：{_esc(gen_time)}</span>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 30px 40px;">
                            {content_html}
                        </td>
                    </tr>
                    
                    {"<tr><td style='padding: 0 40px 30px;'><div style='background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 12px; padding: 24px;'><h3 style='margin: 0 0 16px; color: #c44536; font-size: 16px; font-weight: 600;'>🎯 今日要点</h3><ol style='margin: 0; padding-left: 20px; color: #333; font-size: 14px; line-height: 1.8;'>" + keypoints_html + "</ol></div></td></tr>" if keypoints_html else ""}
                    
                    {"<tr><td style='padding: 0 40px 30px;'><table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background-color: #f8f9fc; border-radius: 12px; overflow: hidden;'><tr><td style='padding: 20px; text-align: center; border-right: 1px solid #e8eaed;'><div style='font-size: 32px; font-weight: 700; color: #667eea;'>" + str(total_news) + "</div><div style='font-size: 13px; color: #5f6368; margin-top: 4px;'>条动态</div></td><td style='padding: 20px; text-align: center; border-right: 1px solid #e8eaed;'><div style='font-size: 32px; font-weight: 700; color: #667eea;'>" + str(total_sources) + "</div><div style='font-size: 13px; color: #5f6368; margin-top: 4px;'>个信源</div></td><td style='padding: 20px; text-align: center;'><div style='font-size: 32px; font-weight: 700; color: #667eea;'>" + str(section_count) + "</div><div style='font-size: 13px; color: #5f6368; margin-top: 4px;'>个栏目</div></td></tr></table></td></tr>" if total_news > 0 else ""}
                    
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
