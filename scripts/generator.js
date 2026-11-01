/* global hexo */
'use strict';

/**
 * 生成 /404.html。
 *
 * 为什么用 generator 而不是 `source/404.md`：
 *   主题 `source/` 里的文件只会被当成**静态资源**拷贝（不渲染 front-matter /
 *   markdown），所以 404 页必须由生成器产出，否则会输出未渲染的原文。
 *   放在这里的好处是使用者的站点 `source/` 一个文件都不用加。
 *
 * 宿主适配（静态站通用的 404 约定）：
 *   · GitHub Pages / Cloudflare Pages：未知路径自动返回 /404.html
 *   · Netlify / Vercel：同上（也可另配 _redirects，非必需）
 *   所以「不存在的页面都进 404」由产出这个文件来保证。
 */

const PATH = '404.html';

hexo.extend.generator.register('monish_404', function monish404() {
  /**
   * 生成器回调的返回值会**整体**成为模板 locals（见 hexo 的
   * createLoadThemeRoute → view.render(locals)），所以这里要自带一个 `page`，
   * 否则 layout/head 里的 is_home()、page.title 之类会拿到 undefined 而报错。
   * page 上所有「页面类型」字段都留空，is_* 系列就会一致地返回 false。
   */
  return {
    path: PATH,
    layout: '404',
    title: '404',
    path_original: PATH,
    page: {
      path: PATH,
      title: '404',
      type: '404'
    }
  };
});

/**
 * 生成 /sitemap.xml。
 *
 * 为什么主题自己生成而不是要求装 hexo-generator-sitemap：
 *   · 那是一个**构建期插件**，装它要改使用者站点的 package.json；
 *   · 而 sitemap 的规则很稳定（文章 + 独立页 + 归档/分类/标签索引），
 *     三十行就能覆盖，还跟主题的路由规则天然一致。
 *
 * 装了官方插件时让位：
 *   hexo-generator-sitemap 会把配置挂到 hexo.config.sitemap 上，
 *   检测到就直接返回，避免两条路由抢同一个 /sitemap.xml。
 */

function xmlEscape(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * sitemap 里的 <loc> 必须是**合法的 URI**：中文、空格、`#`、`?` 都要百分号编码，
 * 否则 Bing / Google 会当成坏 URL 丢掉（Hexo 的 post.path 是未编码的原文，
 * 例如 `2026/09/26/应用发布/禁用摇一摇/`）。
 * 只编码路径段，保留分隔用的 `/`。
 */
function encodePath(path) {
  return String(path || '')
    .split('/')
    .map((segment) => (segment ? encodeURIComponent(segment) : segment))
    .join('/');
}

function absoluteUrl(config, path) {
  const root = String(config.url || '').replace(/\/+$/, '');
  const clean = encodePath(String(path || '').replace(/^\/+/, ''));
  if (!root) return '/' + clean;
  return root + '/' + clean;
}

function isoDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

hexo.extend.generator.register('monish_sitemap', function monishSitemap(locals) {
  const themeConfig = (hexo.theme && hexo.theme.config) || {};
  const seo = themeConfig.seo || {};

  if (seo.sitemap === false) return;
  // 官方插件已经接管，主题不要再抢同名路由
  if (hexo.config && hexo.config.sitemap) return;

  const config = hexo.config || {};
  const entries = [];
  const seen = new Set();

  const push = (path, lastmod, changefreq, priority) => {
    const url = absoluteUrl(config, path);
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, lastmod: isoDate(lastmod), changefreq, priority });
  };

  // 首页
  push('', locals.posts && locals.posts.length ? locals.posts.first().date : new Date(), 'daily', '1.0');

  // 文章
  (locals.posts ? locals.posts.toArray() : []).forEach((post) => {
    if (!post || post.published === false) return;
    push(post.path, post.updated || post.date, 'monthly', '0.8');
  });

  // 独立页
  (locals.pages ? locals.pages.toArray() : []).forEach((item) => {
    if (!item || !item.path) return;
    push(item.path, item.updated || item.date, 'monthly', '0.6');
  });

  // 归档 / 分类 / 标签索引（有才加）
  const addIndex = (routePath, lastmod, priority) => {
    if (!routePath) return;
    push(routePath, lastmod, 'weekly', priority);
  };
  addIndex('archives/', locals.posts && locals.posts.length ? locals.posts.first().date : null, '0.5');
  addIndex('categories/', null, '0.4');
  addIndex('tags/', null, '0.4');

  if (!entries.length) return;

  const body = entries
    .map((item) => {
      const parts = ['<url><loc>' + xmlEscape(item.url) + '</loc>'];
      if (item.lastmod) parts.push('<lastmod>' + item.lastmod + '</lastmod>');
      if (item.changefreq) parts.push('<changefreq>' + item.changefreq + '</changefreq>');
      if (item.priority) parts.push('<priority>' + item.priority + '</priority>');
      parts.push('</url>');
      return parts.join('');
    })
    .join('\n  ');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ' +
    body +
    '\n</urlset>\n';

  return {
    path: 'sitemap.xml',
    data: xml
  };
});
