/* global hexo */
'use strict';

/**
 * Markdown 增强：脚注 / GitHub 警示块 / ==高亮==
 *
 * 为什么需要这个脚本 —— `hexo-renderer-marked`（marked 15）的实际行为：
 *
 *   [^1]        → 被当成「引用式链接」，渲染成 <a href="脚注内容">^1</a>
 *   [^1]: 内容  → 被当成链接定义，直接吞掉
 *   > [!NOTE]   → 原样输出成 <p>[!NOTE]</p>，没有任何样式
 *   ==高亮==    → 原样输出，被转义成 &#x3D;&#x3D;
 *
 * 三个特性挂在两个时机上，顺序不能换：
 *
 *   before_post_render（markdown → html 之前）
 *     · 脚注：把 [^1] 定义抽走、引用换成 <sup> + 悬浮提示、文末追加脚注区
 *     · ==高亮==：换成 <mark>
 *   after_post_render（html 之后）
 *     · 警示块：把 <blockquote> 里的 [!TYPE] 改写成 .md-alert 结构
 *
 * 脚注必须在渲染前处理：等到 after_post_render，[^1] 已经被 marked 变成
 * 一个指向「脚注内容」的链接了，回不去。
 */

const { buildStore } = require('./i18n');

/* 语言包文案：警示块标题、脚注区标题、回链 aria-label 都要跟着站点 language 走。
   buildStore 与 helpers.js 用的是同一个（按站点 language 合并主题语言包）。 */
let i18nStore = null;

function t(key, fallback) {
  if (!i18nStore) {
    try {
      i18nStore = buildStore(hexo);
    } catch (error) {
      i18nStore = {};
    }
  }
  const value = i18nStore[key];
  return typeof value === 'string' && value ? value : fallback;
}

const ALERT_TYPES = [
  { key: 'NOTE', cls: 'note', icon: 'fa-info-circle', fallback: 'Note' },
  { key: 'TIP', cls: 'tip', icon: 'fa-lightbulb-o', fallback: 'Tip' },
  { key: 'IMPORTANT', cls: 'important', icon: 'fa-exclamation-circle', fallback: 'Important' },
  { key: 'WARNING', cls: 'warning', icon: 'fa-exclamation-triangle', fallback: 'Warning' },
  { key: 'CAUTION', cls: 'caution', icon: 'fa-times-circle-o', fallback: 'Caution' }
];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 把文本切成「代码段」与「非代码段」，只对非代码段做替换。
 *
 * 需要它是因为文档里既有 `==高亮==` 这种扩展语法，又有
 * `` `==高亮==` `` 这种**把它当示例写进行内代码**的用法 ——
 * 不跳过代码段就会把示例也渲染成高亮。
 * 同时处理围栏代码块（``` / ~~~）与行内代码（`…`，含多反引号）。
 */
function mapOutsideCode(text, mapper) {
  const lines = String(text).split('\n');
  const out = [];
  let fence = null; // { marker, len }

  lines.forEach((line) => {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      out.push(line);
      if (fenceMatch && fenceMatch[1][0] === fence.marker && fenceMatch[1].length >= fence.len) {
        fence = null;
      }
      return;
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0], len: fenceMatch[1].length };
      out.push(line);
      return;
    }
    out.push(mapperInline(line, mapper));
  });

  return out.join('\n');
}

function mapperInline(line, mapper) {
  // 行内代码：`…` / ``…`` / ```…```，反引号数量要成对
  const parts = String(line).split(/(`+[^`]*\1)/g);
  return parts
    .map((part) => {
      if (/^`+/.test(part) && part.length >= 2) return part; // 行内代码原样保留
      return mapper(part);
    })
    .join('');
}

// ---------------------------------------------------------------------------
// 1. 脚注
// ---------------------------------------------------------------------------

/** 抽出 [^label]: 定义（支持缩进续行，跳过围栏代码块），返回剩余正文 */
function extractFootnoteDefs(text) {
  const lines = String(text).split('\n');
  const defs = new Map();
  const kept = [];
  let fence = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);

    if (fence) {
      kept.push(line);
      if (fenceMatch && fenceMatch[1][0] === fence.marker && fenceMatch[1].length >= fence.len) fence = null;
      i++;
      continue;
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0], len: fenceMatch[1].length };
      kept.push(line);
      i++;
      continue;
    }

    const defMatch = line.match(/^\[\^([^\]\s]+)\]:[ \t]*(.*)$/);
    if (!defMatch) {
      kept.push(line);
      i++;
      continue;
    }

    const label = defMatch[1];
    let body = defMatch[2] || '';
    // 缩进续行（2 空格 / 制表符起头）属于这条脚注
    while (i + 1 < lines.length && /^(?:[ \t]{2,}|\t)\S/.test(lines[i + 1])) {
      body += '\n' + lines[i + 1].replace(/^(?:[ \t]{2,}|\t)/, '');
      i++;
    }
    defs.set(label, (defs.get(label) || '') + body);
    i++;
  }

  return { defs, text: kept.join('\n') };
}

/** 脚注正文允许行内 markdown（链接、行内代码、强调），交给渲染器处理 */
function renderFootnoteInline(text) {
  const source = String(text || '').trim();
  if (!source) return '';
  try {
    const html = hexo.render.renderSync({ text: source, engine: 'markdown' }) || '';
    // 去掉包在外面的 <p>…</p>，只留行内片段
    return html.trim().replace(/^<p>/, '').replace(/<\/p>$/, '');
  } catch (error) {
    return escapeHtml(source);
  }
}

function buildFootnoteSection(order, defs) {
  if (!order.length) return '';

  const items = order.map((label, index) => {
    const num = index + 1;
    const body = renderFootnoteInline(defs.get(label));
    return (
      '<li id="fn-' + num + '" class="footnote-item">' +
      '<span class="footnote-num">' + num + '.</span>' +
      '<span class="footnote-text">' + body + '</span>' +
      '<a class="footnote-backref" href="#fnref-' + num + '" aria-label="' + escapeHtml(t('footnote_back', '回到正文')) + '">\u21a9</a>' +
      '</li>'
    );
  }).join('\n');

  return (
    '\n\n<section class="footnotes" role="doc-endnotes" aria-label="脚注">' +
    '<h2 class="footnotes-title">' + escapeHtml(t('footnotes', '脚注')) + '</h2>' +
    '<ol class="footnotes-list">\n' + items + '\n</ol></section>\n'
  );
}

function applyFootnotes(text) {
  const { defs, text: body } = extractFootnoteDefs(text);
  if (!defs.size) return text;

  const order = [];
  const replaced = mapOutsideCode(body, (segment) =>
    segment.replace(/\[\^([^\]\s]+)\]/g, (full, label) => {
      if (!defs.has(label)) return full;
      let index = order.indexOf(label);
      if (index < 0) {
        order.push(label);
        index = order.length - 1;
      }
      const num = index + 1;
      // 悬浮提示里放纯文本（去掉标签），避免 <a> 套 <a>
      const tipText = String(defs.get(label) || '').replace(/\s+/g, ' ').trim();
      return (
        '<sup class="fn-ref" id="fnref-' + num + '">' +
        '<a class="fn-ref-link" href="#fn-' + num + '" role="doc-noteref">' + num + '</a>' +
        '<span class="fn-pop" role="doc-endnote" aria-hidden="true">' +
        '<span class="fn-pop-num">' + num + '</span>' +
        '<span class="fn-pop-text">' + escapeHtml(tipText) + '</span>' +
        '</span></sup>'
      );
    })
  );

  return replaced + buildFootnoteSection(order, defs);
}

// ---------------------------------------------------------------------------
// 2. 行内扩展语法 → 对应 HTML 标签
// ---------------------------------------------------------------------------

/**
 * 文档里列的四个 Markdown 扩展，marked 15 一个都不认，而且 `~下标~` 还会被
 * 当成删除线渲染成 <del>（`H~2~O` 变成 H<del>2</del>O，比不支持更糟）。
 * 这里在渲染前把它们换成标准 HTML 标签，作者就不用退回手写标签。
 *
 *    ==高亮==   → <mark>
 *    ^上标^     → <sup>
 *    ~下标~     → <sub>   （双 ~~ 删除线不受影响，靠前后 lookaround 排除）
 *    ++下划线++ → <u>
 *
 * 所有替换都走 mapOutsideCode：行内代码与围栏代码块里的示例保持原样
 * （文档里就有 `` `==高亮==` `` 这种把语法当示例写的用法）。
 */
const INLINE_EXTENSIONS = [
  { re: /==(?=\S)([^\n]*?\S)==/g, tag: 'mark' },
  // 不允许跨越 [ ]：避免把 [^1] … [^2] 之间的两个 ^ 误判成一对上标
  { re: /\^(?=[^\[\]\s^])([^\[\]^\n]*?[^\[\]^\s])\^/g, tag: 'sup' },
  { re: /(?<!~)~(?=[^\[\]\s~])([^\[\]~\n]*?[^\[\]~\s])~(?!~)/g, tag: 'sub' },
  { re: /\+\+(?=\S)([^\n]*?\S)\+\+/g, tag: 'u' }
];

function applyInlineExtensions(text) {
  return mapOutsideCode(text, (segment) => {
    let out = segment;
    INLINE_EXTENSIONS.forEach((item) => {
      out = out.replace(item.re, '<' + item.tag + '>$1</' + item.tag + '>');
    });
    return out;
  });
}

// ---------------------------------------------------------------------------
// 3. GitHub 警示块（在 HTML 上改，因为要整体替换 <blockquote>）
// ---------------------------------------------------------------------------

function transformAlerts(html) {
  const alertPattern = ALERT_TYPES.map((item) => item.key).join('|');

  return String(html).replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (whole, inner) => {
    // 只在「第一个 <p> 以 [!TYPE] 开头」时改写，普通引用原样返回
    const openPattern = new RegExp('^\\s*<p>\\s*\\[!(' + alertPattern + ')\\](?:<br\\s*\\/?>)?([\\s\\S]*?)(?:<\\/p>|$)');
    const match = inner.match(openPattern);
    if (!match) return whole;

    const type = ALERT_TYPES.find((item) => item.key === match[1]);
    if (!type) return whole;

    // [!/TYPE] 同一段里 <br> 之后还有内容时，那部分属于正文
    let rest = match[2] || '';
    rest = rest.replace(/^\s+/, '');

    // 丢掉被我们吃掉的那一段 <p>，剩下的（其它 <p>/<ul>/…）就是警示块正文
    let body = inner.slice(match[0].length);

    if (rest) {
      // 把 <br> 换行还原成独立段落，避免多行内容挤成一行
      const paragraphs = rest.split(/<br\s*\/?>/i)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => '<p>' + line + '</p>')
        .join('\n');
      body = paragraphs + body;
    }

    body = body.trim();
    if (!body) body = '';

    return (
      '<div class="md-alert md-alert--' + type.cls + '">' +
      '<p class="md-alert-title">' +
      '<span class="md-alert-icon fa ' + type.icon + '" aria-hidden="true"></span>' +
      '<span class="md-alert-label">' + t('alert_' + type.cls, type.fallback) + '</span>' +
      '</p>' +
      (body ? '<div class="md-alert-body">' + body + '</div>' : '') +
      '</div>'
    );
  });
}

// ---------------------------------------------------------------------------
// 4. <details> 里的裸文本包成 <p>
// ---------------------------------------------------------------------------

/**
 * marked 把 `<details>` 当原始 HTML 块整段透传，里面的文字**不会**被包进
 * `<p>`。于是 CSS 的 `details > :not(summary)` 选不到它（文本节点没有标签），
 * 展开后的文字会贴着卡片左边缘，和 summary 的文字对不齐。
 *
 * 这里把 summary 之后的裸文本包成 <p>，让它和正文其它段落共用同一套
 * margin / line-height，同时能被 CSS 缩进到与 summary 文字左对齐。
 *
 * 已经以块级元素开头的内容原样返回，不重复包裹。
 */
function normalizeDetails(html) {
  return String(html).replace(
    /<details(\s[^>]*)?>([\s\S]*?)<\/details>/gi,
    (whole, attrs, inner) => {
      const split = inner.match(/^([\s\S]*?<\/summary>)([\s\S]*)$/i);
      if (!split) return whole;

      const head = split[1];
      const rest = (split[2] || '').trim();
      if (!rest) return whole;

      // 已经是块级元素开头就不动
      if (/^<(p|div|ul|ol|pre|blockquote|figure|table|h[1-6]|section|form)\b/i.test(rest)) {
        return whole;
      }

      return '<details' + (attrs || '') + '>' + head + '<p>' + rest + '</p></details>';
    }
  );
}

// ---------------------------------------------------------------------------
// 注册过滤器
// ---------------------------------------------------------------------------

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || typeof data.content !== 'string') return data;
  let content = data.content;
  // 顺序：先抽脚注（[^1] 里的 ^ 不能参与上标替换），再做行内扩展
  content = applyFootnotes(content);
  content = applyInlineExtensions(content);
  data.content = content;
  return data;
});

hexo.extend.filter.register('after_post_render', function (data) {
  if (!data || typeof data.content !== 'string') return data;
  data.content = normalizeDetails(transformAlerts(data.content));
  return data;
});
