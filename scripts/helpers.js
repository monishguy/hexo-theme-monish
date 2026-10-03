/* global hexo */
'use strict';

/**
 * monish 主题服务端扩展：template helper + 构建期 filter。
 *
 * 这里只依赖 hexo 全局对象与 Node 内置模块，不引入任何第三方运行时依赖。
 */

const { buildStore } = require('./i18n');

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 深合并：src 覆盖 target，但不修改 target */
function deepMerge(target, src) {
  const out = Object.assign({}, target);
  if (!isObject(src)) return out;
  Object.keys(src).forEach((key) => {
    const value = src[key];
    if (isObject(value) && isObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  });
  return out;
}

/** 空值判断：'' / null / undefined / NaN / 空数组 / 空对象都算空 */
function isEmpty(value) {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

/** 第一个非空值 */
function pick(...values) {
  for (const value of values) {
    if (!isEmpty(value)) return value;
  }
  return undefined;
}

function escapeAttr(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 去掉 html 标签与 markdown 标记，得到纯文本 */
function plainText(html, limit) {
  let text = String(html || '')
    .replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\s*/,' ') // 去掉 front-matter
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    /* 代码块工具条是主题注入的装饰（语言名 + 复制按钮），不能算进摘要/字数 */
    .replace(/<div class="code-toolbar"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<!--more-->/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~>#]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (limit && limit > 0 && text.length > limit) {
    text = text.slice(0, limit).trim() + '…';
  }
  return text;
}

/** 从正文里取第一张图片地址 */
function firstImage(content) {
  const html = String(content || '');
  const htmlMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch) return htmlMatch[1];
  const mdMatch = html.match(/!\[[^\]]*\]\(([^)\s]+)/);
  if (mdMatch) return mdMatch[1];
  return '';
}

/**
 * 摘要。优先级（关键）：
 *   1. `<!-- more -->` 标记 —— 渲染后的 content 里它已变成 `<span id="more">`，
 *      而 Hexo 会把标记前的内容放进 `post.excerpt`，因此先看 excerpt；
 *   2. raw 里的字面 `<!-- more -->`（渲染管线未处理时的兜底）；
 *   3. 没有标记时按长度截断，此时**只取正文**，不要拿 raw（带着 front-matter）。
 * 返回 { text, truncated, hasMore }
 */
function excerptOf(post, length) {
  const item = post || {};
  const content = String(item.content || '');
  const raw = String(item.raw || '');
  const rawMarker = raw.search(/<!--\s*more\s*-->/i) >= 0;
  const contentMarker = /<span[^>]+id=["']more["']/i.test(content);

  if (rawMarker || contentMarker) {
    const source = item.excerpt ? String(item.excerpt) : (rawMarker ? raw.slice(0, raw.search(/<!--\s*more\s*-->/i)) : content);
    return {
      text: plainText(source, 0),
      truncated: false,
      hasMore: true
    };
  }

  const full = plainText(content || raw, 0);
  const limit = typeof length === 'number' && length >= 0 ? length : 120;
  if (limit === 0) {
    return { text: full, truncated: false, hasMore: false };
  }
  const truncated = full.length > limit;
  return {
    text: truncated ? full.slice(0, limit).trim() + '…' : full,
    truncated,
    hasMore: truncated
  };
}

/** 中英混排字数：CJK 按字计，其他按词计 */
function countWords(content) {
  const text = plainText(content, 0);
  if (!text) return 0;
  const cjk = text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjk ? cjk.length : 0;
  const rest = text.replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g, ' ');
  const wordCount = rest.split(/[^\p{L}\p{N}]+/u).filter(Boolean).length;
  return cjkCount + wordCount;
}

/** 阅读时长（分钟，向上取整；空正文返回 0，表示"不显示"） */
function readingTime(content, cjkPerMinute, wordsPerMinute) {
  const text = plainText(content, 0);
  if (!text) return 0;
  const cjkChars = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const other = text.replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g, ' ');
  const words = other.split(/[^\p{L}\p{N}]+/u).filter(Boolean).length;
  const minutes = Math.ceil(cjkChars / (cjkPerMinute || 350) + words / (wordsPerMinute || 220));
  return Math.max(1, minutes);
}

// ---------------------------------------------------------------------------
// 主题配置：主题 _config.yml 为主，站点 _config.yml 兜底
// ---------------------------------------------------------------------------

function configFor(ctx) {
  const site = ctx.config || {};
  const theme = ctx.theme || {};

  const themeSite = isObject(theme.site) ? theme.site : {};
  const appearance = isObject(theme.appearance) ? theme.appearance : {};

  return {
    site: {
      title: pick(themeSite.title, site.title, 'Hexo'),
      subtitle: pick(themeSite.subtitle, site.subtitle, site.description, ''),
      description: pick(themeSite.description, site.description, ''),
      keywords: pick(themeSite.keywords, site.keywords, ''),
      author: pick(themeSite.author, site.author, '')
    },
    hero: deepMerge({
      enable: true,
      layout: 'full',
      background: 'accent',
      background_image: '',
      overlay: 0.18,
      slogan: '',
      subtitle: '',
      scroll_hint: true,
      scroll_hint_text: '',
      height: '100vh',
      particles: false
    }, theme.hero),
    nav: deepMerge({
      enable: true,
      sticky: true,
      home: true,
      menu: {},
      rss: ''
    }, theme.nav),
    posts: deepMerge({
      section_title: '',
      excerpt_length: 120,
      show_cover: true,
      show_categories: true,
      show_tags: false,
      show_readmore: true,
      readmore_text: '',
      date_format: 'MMM D, YYYY',
      card_min_width: '300px',
      columns: 3
    }, theme.posts),
    author_card: deepMerge({
      enable: true,
      avatar: '',
      name: '',
      description: '',
      links: {}
    }, theme.author_card),
    footer: deepMerge({
      since: '',
      copyright: '',
      powered: true,
      icp: '',
      icp_link: 'https://beian.miit.gov.cn/',
      links: {}
    }, theme.footer),
    sidebar: deepMerge({
      enable: true,
      position: 'right',
      widgets: ['category', 'tag', 'recent_posts'],
      recent_posts_limits: 5
    }, theme.sidebar),
    post: deepMerge({
      toc: true,
      toc_depth: 3,
      excerpt_link: '',
      copyright: true,
      updated: true,
      word_count: true,
      reading_time: true,
      reward: '',
      prev_next: true,
      related: false,
      related_limits: 3,
      comments: {
        enable: false,
        system: 'valine',
        valine: { enable: false, appId: '', appKey: '', placeholder: '', lang: 'zh-cn' },
        disqus_shortname: '',
        giscus: {
          repo: '', repo_id: '', category: '', category_id: '', mapping: 'pathname', lang: 'zh-CN'
        }
      }
    }, theme.post),
    archive: deepMerge({ type: 'monthly', show_count: true }, theme.archive),
    appearance: deepMerge({
      default_mode: 'auto',
      accent: '#7FA88B',
      accent_dark: '#8FBF9F',
      radius: '44px',
      display_font: 'Archivo Black',
      body_font: 'Inter',
      mono_font: 'JetBrains Mono',
      webfont: 'local',
      /* v1 兼容别名：serif_font / code_font 仍可用，分别当作 body / mono */
      serif_font: '',
      code_font: '',
      enable_transition: true,
      enable_animation: true
    }, appearance),
    features: deepMerge({
      search: false,
      lightbox: true,
      copy_code: true,
      back_to_top: true,
      progress_bar: true,
      pjax: false
    }, theme.features),
    analytics: deepMerge({
      google_analytics: '',
      gauges: ''
    }, theme.analytics),
    favicon: pick(theme.favicon, ''),
    raw: theme
  };
}

// ---------------------------------------------------------------------------
// 语言包兜底：主题语言包与站点语言包合并，缺键时回退 en -> 内置默认
// ---------------------------------------------------------------------------

const FALLBACK = {
  home: 'Home',
  archives: 'Archives',
  categories: 'Categories',
  category: 'Category',
  tags: 'Tags',
  tag: 'Tag',
  about: 'About',
  friends: 'Friends',
  latest_posts: 'Latest Posts',
  all_posts: 'All Posts',
  read_more: 'Read More',
  scroll_down: 'Scroll Down',
  back_to_top: 'Back to top',
  posted_on: 'Posted on',
  updated_on: 'Updated on',
  reading_time: 'Reading time',
  minutes: 'min',
  words: 'words',
  word_count: 'Words',
  prev_post: 'Previous',
  next_post: 'Next',
  toc: 'Contents',
  toc_empty: 'No headings',
  share: 'Share',
  comment: 'Comment',
  comments: 'Comments',
  no_comment: 'No comments yet',
  search: 'Search',
  search_placeholder: 'Search posts…',
  search_empty: 'No results',
  search_results: 'Results',
  powered_by: 'Powered by %s',
  theme: 'Theme',
  theme_light: 'Light',
  theme_dark: 'Dark',
  theme_auto: 'Auto',
  menu: 'Menu',
  close: 'Close',
  expand: 'Expand',
  copied: 'Copied',
  copy: 'Copy',
  skip_to_content: 'Skip to content',
  sidebar: 'Sidebar',
  license_note: 'Please credit the author and source with a link.',
  not_found: 'Page not found',
  total_posts: 'posts',
  site_running: 'Running for %s years',
  rss: 'RSS',
  mode_switch: 'Switch theme',
  no_posts: 'No posts yet',
  pages: 'Pages',
  topics: 'Topics',
  author: 'Author',
  copyright: 'Copyright',
  published: 'Published',
  prev_page: 'Prev',
  next_page: 'Next',
  more: 'More'
};

/** 读取主题语言包（按站点 language 顺序合并），缺失时回退内置英文表。 */
function makeTranslate(hexo) {
  let store = null;
  const lookup = () => {
    if (!store) store = buildStore(hexo);
    return store;
  };

  return function translate(key, ...args) {
    let value = lookup()[key];
    if (isEmpty(value)) value = FALLBACK[key] || key;
    if (args.length && typeof value === 'string' && value.indexOf('%s') >= 0) {
      let index = 0;
      value = value.replace(/%s/g, () => {
        const arg = args[index];
        index += 1;
        return arg === undefined || arg === null ? '' : String(arg);
      });
    }
    return value;
  };
}

// ---------------------------------------------------------------------------
// 注册 helper
// ---------------------------------------------------------------------------

hexo.extend.helper.register('monish_config', function monishConfig() {
  return configFor(this);
});

let translator = null;

hexo.extend.helper.register('monish_t', function monishTranslate(key, ...args) {
  if (!translator) translator = makeTranslate(hexo);
  return translator(key, ...args);
});

/** 图标名 -> Fork Awesome 类名 */
const ICON_MAP = {
  github: 'fa-github',
  mail: 'fa-envelope-o',
  email: 'fa-envelope-o',
  twitter: 'fa-twitter',
  weibo: 'fa-weibo',
  zhihu: 'fa-question-circle-o',
  bilibili: 'fa-television',
  rss: 'fa-rss',
  feed: 'fa-rss',
  link: 'fa-link',
  website: 'fa-link',
  blog: 'fa-link',
  telegram: 'fa-telegram',
  qq: 'fa-qq',
  wechat: 'fa-weixin',
  weixin: 'fa-weixin',
  instagram: 'fa-instagram',
  youtube: 'fa-youtube-play',
  'stack-overflow': 'fa-stack-overflow',
  stackoverflow: 'fa-stack-overflow',
  codepen: 'fa-codepen',
  gitlab: 'fa-gitlab',
  gitee: 'fa-git',
  linkedin: 'fa-linkedin',
  facebook: 'fa-facebook',
  douban: 'fa-book',
  steam: 'fa-steam',
  mastodon: 'fa-mastodon',
  reddit: 'fa-reddit',
  npm: 'fa-npm',
  docker: 'fa-docker',
  android: 'fa-android',
  apple: 'fa-apple',
  linux: 'fa-linux',
  code: 'fa-code',
  book: 'fa-book',
  music: 'fa-music',
  camera: 'fa-camera-retro',
  gamepad: 'fa-gamepad',
  palette: 'fa-paint-brush'
};

hexo.extend.helper.register('monish_icon', function monishIcon(name) {
  const key = String(name || '').toLowerCase().trim();
  const cls = ICON_MAP[key] || (key.indexOf('fa-') === 0 ? key : 'fa-link');
  return cls;
});

/** 模板侧摘要：返回 { text, hasMore } */
hexo.extend.helper.register('monish_excerpt', function monishExcerpt(post, length) {
  return excerptOf(post || {}, length);
});

/** 模板侧字数 */
hexo.extend.helper.register('monish_word_count', function monishWordCount(content) {
  return countWords(content);
});

/** 模板侧阅读时长 */
hexo.extend.helper.register('monish_reading_time', function monishReadingTime(content) {
  return readingTime(content);
});

/** 第一张图片 */
hexo.extend.helper.register('monish_first_image', function monishFirstImage(content) {
  return firstImage(content);
});

/**
 * 日期版式用的英文月份缩写 / 日 / 完整标签。
 *
 * 设计图里列表与文章页的日期是 `FEB` / `1`、`FEB 1` 这种三字母月份 + 数字，
 * 属于版式元素：用英文缩写才能在任何语言下保持同样的视觉宽度。
 * （moment 的 MMM 在 zh-CN 下会输出「2月」，会把版式撑歪。）
 */
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function isMomentLike(value) {
  return !!value && typeof value.month === 'function' && typeof value.date === 'function';
}

hexo.extend.helper.register('monish_month', function monishMonth(value) {
  if (!isMomentLike(value)) return '';
  return MONTH_ABBR[value.month()] || '';
});

hexo.extend.helper.register('monish_day', function monishDay(value) {
  if (!isMomentLike(value)) return '';
  return String(value.date());
});

hexo.extend.helper.register('monish_date_label', function monishDateLabel(value) {
  if (!isMomentLike(value)) return '';
  return [MONTH_ABBR[value.month()] || '', value.date()].join(' ').trim();
});

/**
 * 订阅源路径：只有站点真的会生成 feed 时才返回路径，否则返回空串。
 * 否则主题默认的 /atom.xml 会在没装 hexo-generator-feed 的站点上变成 404。
 */
hexo.extend.helper.register('monish_feed_path', function monishFeedPath() {
  const theme = hexo.theme.config || {};
  const nav = isObject(theme.nav) ? theme.nav : {};
  const configured = pick(hexo.config.feed, nav.rss, '');
  if (!configured) return '';

  let hasFeedPlugin = false;
  try {
    require.resolve('hexo-generator-feed', { paths: [hexo.base_dir, hexo.theme_dir] });
    hasFeedPlugin = true;
  } catch (error) {
    hasFeedPlugin = false;
  }
  return hasFeedPlugin ? configured : '';
});


// ---------------------------------------------------------------------------
// 构建期 filter：本地搜索索引 + 主题配置兜底
// ---------------------------------------------------------------------------

hexo.extend.filter.register('after_generate', function monishSearchIndex() {
  const cfg = configFor({ config: hexo.config, theme: hexo.theme.config || hexo.theme });
  if (!cfg.features.search) return;

  const posts = hexo.locals.get('posts');
  const data = posts.sort('-date').map((post) => ({
    title: post.title || '',
    url: post.path ? '/' + String(post.path).replace(/^\//, '') : '/',
    date: post.date ? post.date.format('YYYY-MM-DD') : '',
    categories: post.categories ? post.categories.toArray().map((c) => c.name) : [],
    tags: post.tags ? post.tags.toArray().map((t) => t.name) : [],
    content: plainText(post.content, 3000)
  }));

  hexo.route.set('search.json', () => JSON.stringify(data));
  hexo.log.info('monish: search.json generated (%d posts)', data.length);
});

hexo.extend.filter.register('before_generate', function monishConfigGuard() {
  const theme = hexo.theme.config || {};
  if (!isObject(theme.appearance)) {
    hexo.log.warn('monish: theme _config.yml 缺少 appearance 段落，将使用默认值');
  }
  const cfg = configFor({ config: hexo.config, theme });
  const missing = [];
  ['site', 'hero', 'nav', 'posts', 'author_card', 'footer', 'sidebar', 'post', 'archive', 'appearance', 'features'].forEach((key) => {
    if (!isObject(theme[key])) missing.push(key);
  });
  if (missing.length) {
    hexo.log.debug('monish: 以下配置段使用默认值 -> %s', missing.join(', '));
  }
  hexo.log.debug('monish: accent=%s mode=%s serif=%s', cfg.appearance.accent, cfg.appearance.default_mode, cfg.appearance.serif_font || '(built-in)');
});

// ---------------------------------------------------------------------------
// 代码块：把语言名注入 figure.highlight，供右上角标签显示
// ---------------------------------------------------------------------------

/** 语法高亮器写在 figure class 上的语言名 -> 展示名 */
const LANGUAGE_LABEL = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  json: 'JSON',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  styl: 'Stylus',
  stylus: 'Stylus',
  md: 'Markdown',
  markdown: 'Markdown',
  yml: 'YAML',
  yaml: 'YAML',
  sh: 'Shell',
  shell: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  ps: 'PowerShell',
  powershell: 'PowerShell',
  py: 'Python',
  python: 'Python',
  rb: 'Ruby',
  ruby: 'Ruby',
  go: 'Go',
  golang: 'Go',
  rs: 'Rust',
  rust: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  c: 'C',
  h: 'C',
  cpp: 'C++',
  'c++': 'C++',
  cs: 'C#',
  csharp: 'C#',
  php: 'PHP',
  sql: 'SQL',
  diff: 'Diff',
  ini: 'INI',
  toml: 'TOML',
  dockerfile: 'Dockerfile',
  docker: 'Dockerfile',
  makefile: 'Makefile',
  nginx: 'Nginx',
  vue: 'Vue',
  svelte: 'Svelte',
  graphql: 'GraphQL',
  lua: 'Lua',
  swift: 'Swift',
  dart: 'Dart',
  kotlin: 'Kotlin',
  r: 'R',
  matlab: 'MATLAB',
  tex: 'TeX',
  latex: 'LaTeX'
};

function languageLabelFrom(raw) {
  const lang = String(raw || '').trim().toLowerCase();
  if (!lang) return '';
  if (LANGUAGE_LABEL[lang]) return LANGUAGE_LABEL[lang];
  return lang.charAt(0).toUpperCase() + lang.slice(1);
}

/**
 * 代码块后处理（只作用于 figure.highlight，不碰正文其它内容）：
 *
 * 1. 注入 `<div class="code-toolbar">`，里面放语言标签 `<span class="code-language">`。
 *    复制按钮由前端 JS 追加进同一个工具条（两者同处右上角，互不遮挡）。
 * 2. 删掉每个 `<pre>` 结尾那个多余的 `<br>`。
 *    Hexo 高亮产物每行后面都会跟一个 `<br>`，最后一行后面那个会在代码块
 *    底部渲染出一条空行。放在构建期删掉比用 CSS `:last-child` 更可靠
 *    （运行时复制按钮会 append 进块内，把 `:last-child` 顶掉）。
 */
hexo.extend.filter.register('after_post_render', function monishCodeBlocks(data) {
  if (!data || typeof data.content !== 'string') return data;

  data.content = data.content.replace(
    /<figure\b[^>]*\bclass="[^"]*\bhighlight\b[^"]*"[\s\S]*?<\/figure>/g,
    (figure) => {
      let out = figure;

      // 工具条 + 语言标签（没有语言名时工具条仍然注入，用来承载复制按钮）
      if (!/\bcode-toolbar\b/.test(out)) {
        const classMatch = out.match(/<figure\b[^>]*\bclass="([^"]*)"/);
        let toolbar = '<div class="code-toolbar"';
        if (classMatch) {
          const languages = String(classMatch[1])
            .split(/\s+/)
            .filter((name) => name && !['highlight', 'hljs'].includes(name));
          const label = languageLabelFrom(languages[0]);
          if (label) {
            toolbar += '><span class="code-language" aria-hidden="true">' + escapeHtml(label) + '</span';
          }
        }
        toolbar += '></div';
        out = out.replace(/(<figure\b[^>]*\bclass="[^"]*")/, '$1>' + toolbar);
      }

      // 结尾多余的 <br>
      out = out.replace(/\s*<br\s*\/?>\s*<\/pre>/g, '</pre>');

      // 给 <table> 套一层横向滚动容器：长代码行要能左右滑，而不是被
      // .highlight 的 overflow:hidden 裁掉。工具条留在容器外，横滚时不跟着跑。
      if (!/\bcode-scroll\b/.test(out)) {
        out = out.replace(
          /<table>([\s\S]*?)<\/table>/,
          (m, inner) => '<div class="code-scroll"><table>' + inner + '</table></div>'
        );
      }

      return out;
    }
  );

  return data;
});
