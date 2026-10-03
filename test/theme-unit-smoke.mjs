#!/usr/bin/env node
/**
 * monish 主题单元冒烟检查（零依赖、纯 Node ESM）
 * ---------------------------------------------------------------------------
 * 用法：
 *   node themes/monish/test/theme-unit-smoke.mjs
 *   node test/theme-unit-smoke.mjs              # 在主题目录下运行也可以
 *
 * 覆盖：
 *   (a) 主题必需目录 / 文件存在且非空
 *   (b) DESIGN-CONTRACT.md §9 的 10 个 CSS 文件存在且非空
 *   (c) zh-CN / en / zh-TW / ja 四份语言包键集合完全一致
 *   (d) 语言包键集合与契约 §6 的键表完全一致（从契约文件解析）
 *   (e) public/ 构建产物包含关键 class（产物不存在则 SKIP）
 *   (f) layout/**\/*.ejs 中出现的 theme.a.b / cfg.a.b 键都能在 theme _config.yml 中找到
 *   (g) layout/**\/*.ejs 里 monish_t()/__() 用到的 i18n 键都在语言包中，且带参键传了参数
 *   (h) public/index.html 的文案语言与站点 language 一致（不落英文 FALLBACK 兜底）
 *
 * 输出：每项 PASS / FAIL / SKIP 一行 + 汇总；有任何 FAIL 时退出码为 1。
 * 说明：public/ 由 `hexo generate` 产出，构建前 (e) 会打印 SKIP，不算失败。
 *       layout/ 尚未写完（目录缺失 / 无 .ejs / 全部为空）时 (f) 会打印 SKIP。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 路径定位：全部基于脚本自身位置相对推算，不写死盘符
// ---------------------------------------------------------------------------
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const THEME_DIR = path.resolve(SCRIPT_DIR, '..');           // <repo>/themes/monish
const SITE_DIR = path.resolve(THEME_DIR, '..', '..');       // <repo>
const CONTRACT_FILE = path.join(THEME_DIR, 'DESIGN-CONTRACT.md');
const THEME_CONFIG = path.join(THEME_DIR, '_config.yml');
const LANG_DIR = path.join(THEME_DIR, 'languages');
const LAYOUT_DIR = path.join(THEME_DIR, 'layout');
const CSS_DIR = path.join(THEME_DIR, 'source', 'css');

/**
 * 构建产物目录的解析顺序：
 *   1. MONISH_PUBLIC_DIR 环境变量
 *   2. public-monish/  —— monish 的独立预览构建
 *      （npx hexo generate --config _config.yml,themes/monish/_preview.yml）
 *   3. public/         —— 站点当前主题的产物
 * 站点可能正用着别的主题，所以优先认准 monish 自己的预览目录，
 * 否则 (e)(h) 会去检查别人主题的 HTML 从而误报。
 */
function resolvePublicDir() {
  if (process.env.MONISH_PUBLIC_DIR) return path.resolve(process.env.MONISH_PUBLIC_DIR);
  const preview = path.join(SITE_DIR, 'public-monish');
  if (fs.existsSync(path.join(preview, 'index.html'))) return preview;
  return path.join(SITE_DIR, 'public');
}
const PUBLIC_DIR = resolvePublicDir();

// DESIGN-CONTRACT.md §6 要求至少有这四份语言包
const LANGUAGES = ['zh-CN', 'en', 'zh-TW', 'ja'];

// (a) 主题必需文件（相对主题根目录）
const REQUIRED_THEME_FILES = [
  '_config.yml',
  'DESIGN-CONTRACT.md',
  'layout/layout.ejs',
  'layout/index.ejs',
  'layout/post.ejs',
  'layout/page.ejs',
  'layout/archive.ejs',
  'layout/category.ejs',
  'layout/tag.ejs',
  'source/js/monish.js',
  'languages/zh-CN.yml'
];

// (b) DESIGN-CONTRACT.md §9 冻结的 11 个 CSS 文件（不得增删）
const REQUIRED_CSS_FILES = [
  'fonts.css',
  'variables.css',
  'base.css',
  'shell.css',
  'hero.css',
  'post-list.css',
  'page.css',
  'post.css',
  'footer.css',
  'extras.css',
  'responsive.css'
];

// (e) 首页关键标记 / 文章页关键标记（均为 class token，不是 CSS 选择器字符串）
// v2「纸卡」：没有 .site-header / .post-card，首页是 .shell + .rail + .post-pill
const HOME_MARKERS = [
  'shell',
  'rail',
  'rail-slogan',
  'post-list',
  'latest-posts',
  'post-pill',
  'scroll-track',
  'theme-toggle'
];
const POST_MARKERS = ['monish-prose', 'card', 'card-title'];

// ---------------------------------------------------------------------------
// 结果收集与输出
// ---------------------------------------------------------------------------
const results = [];

function record(status, title, detail) {
  results.push({ status, title, detail: detail || [] });
}

function ok(title, detail) {
  record('PASS', title, detail);
}

function bad(title, detail) {
  record('FAIL', title, detail);
}

function skip(title, detail) {
  record('SKIP', title, detail);
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------
function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function sizeOf(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return -1;
  }
}

/** 递归收集文件（返回相对 base 的 posix 风格路径） */
function walkFiles(dir, filter, base = dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkFiles(full, filter, base, out);
    } else if (entry.isFile()) {
      if (!filter || filter(full)) {
        out.push(path.relative(base, full).split(path.sep).join('/'));
      }
    }
  }
  return out;
}

/**
 * 极简 YAML 顶层键解析（自写，不引第三方库）。
 * 只认行首（零缩进）的 `key: value` 字面键 —— 语言包就是这种扁平结构。
 * 返回 Map(key -> 去掉引号的值)。
 */
function parseTopLevelYaml(text) {
  const map = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    if (/^\s*$/.test(rawLine)) continue;
    if (/^\s*#/.test(rawLine)) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$/.exec(rawLine);
    if (!m) continue;
    let value = (m[2] === undefined ? '' : m[2]).trim();
    if (value.length >= 2) {
      const quote = value[0];
      if ((quote === "'" || quote === '"') && value[value.length - 1] === quote) {
        value = value.slice(1, -1);
      }
    }
    if (!map.has(m[1])) map.set(m[1], value);
  }
  return map;
}

function parseTopLevelYamlKeys(text) {
  return [...parseTopLevelYaml(text).keys()];
}

/**
 * 极简嵌套键路径解析：把 theme _config.yml 解析成 `a.b.c` 形式的路径集合
 * （包含中间节点，例如 `nav` 与 `nav.menu`、`nav.menu.archives`）。
 */
function parseYamlKeyPaths(text) {
  const paths = new Set();
  const stack = []; // [{ indent, key }]

  for (const rawLine of text.split(/\r?\n/)) {
    if (/^\s*$/.test(rawLine)) continue;
    if (/^\s*#/.test(rawLine)) continue;
    const m = /^(\s*)([^#\s][^:]*?)\s*:(\s|$)/.exec(rawLine);
    if (!m) continue;

    const indent = m[1].replace(/\t/g, '  ').length;
    const key = m[2].trim();
    if (!key || /^[-?]/.test(key)) continue;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const full = [...stack.map((s) => s.key), key].join('.');
    paths.add(full);
    paths.add(key);
    stack.push({ indent, key });
  }
  return paths;
}

/**
 * 收集 HTML 里 class 属性的全部 token，外加所有 id。
 *
 * 契约里的标记有的是 class 有的是 id（例如 `.post-list` 带 `id="latest-posts"`），
 * 只扫 class 会把 id 误判成缺失。
 */
function classTokens(html) {
  const set = new Set();
  const classRe = /class="([^"]*)"/g;
  let m;
  while ((m = classRe.exec(html)) !== null) {
    for (const token of m[1].split(/\s+/)) if (token) set.add(token);
  }
  const idRe = /\bid="([^"]*)"/g;
  while ((m = idRe.exec(html)) !== null) {
    const id = m[1].trim();
    if (id) set.add(id);
  }
  return set;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 带边界的包含判断：避免 'posts' 命中 class="latest-posts" 这类子串误报。
 */
function containsWord(html, text) {
  if (!text) return false;
  return new RegExp(`(?<![\\w-])${escapeRegex(text)}(?![\\w-])`).test(html);
}

function diffSets(a, b) {
  return [...a].filter((v) => !b.has(v)).sort();
}

/** 从 DESIGN-CONTRACT.md 的 §6 小节里解析键表代码块 */
function parseContractKeys() {
  if (!isFile(CONTRACT_FILE)) return null;
  const md = fs.readFileSync(CONTRACT_FILE, 'utf8');
  const heading = /^##\s*6\.[^\n]*$/m.exec(md);
  if (!heading) return null;
  const body = md.slice(heading.index);
  const blocks = body.matchAll(/```[^\n]*\n([\s\S]*?)```/g);

  for (const block of blocks) {
    const tokens = block[1].split(/\s+/).filter(Boolean);
    if (tokens.length < 20) continue;
    if (tokens.some((t) => t.includes(':'))) continue; // 跳过键值示例块
    if (!tokens.every((t) => /^[a-z][a-z0-9_]*$/.test(t))) continue;
    return new Set(tokens);
  }
  return null;
}

/** 从文本中抽取 `${prefix}.a.b` 形式的引用（排除 postsCfg.x / config.theme.x 之类） */
function extractRefs(text, prefix) {
  const refs = new Set();
  const re = new RegExp(
    `(?<![\\w.$-])${prefix}\\.([A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)*)`,
    'g'
  );
  let m;
  while ((m = re.exec(text)) !== null) refs.add(m[1]);
  return refs;
}

// ---------------------------------------------------------------------------
// (a) 主题必需文件
// ---------------------------------------------------------------------------
function checkRequiredFiles() {
  const missing = [];
  const empty = [];
  for (const rel of REQUIRED_THEME_FILES) {
    const full = path.join(THEME_DIR, rel);
    if (!isFile(full)) missing.push(rel);
    else if (sizeOf(full) === 0) empty.push(rel);
  }
  const total = REQUIRED_THEME_FILES.length;
  if (!missing.length && !empty.length) {
    ok(`(a) 主题必需文件齐全（${total}/${total}，均非空）`);
    return;
  }
  const detail = [];
  if (missing.length) detail.push(`缺失 ${missing.length} 个: ${missing.join(', ')}`);
  if (empty.length) detail.push(`空文件 ${empty.length} 个: ${empty.join(', ')}`);
  bad(`(a) 主题必需文件（${total - missing.length - empty.length}/${total}）`, detail);
}

// ---------------------------------------------------------------------------
// (b) §9 CSS 文件清单
// ---------------------------------------------------------------------------
function checkCssFiles() {
  const missing = [];
  const empty = [];
  for (const name of REQUIRED_CSS_FILES) {
    const full = path.join(CSS_DIR, name);
    if (!isFile(full)) missing.push(`source/css/${name}`);
    else if (sizeOf(full) === 0) empty.push(`source/css/${name}`);
  }
  const extra = [];
  if (fs.existsSync(CSS_DIR)) {
    for (const rel of walkFiles(CSS_DIR, (f) => f.endsWith('.css'))) {
      if (!REQUIRED_CSS_FILES.includes(path.basename(rel))) extra.push(`source/css/${rel}`);
    }
  }
  const total = REQUIRED_CSS_FILES.length;
  const detail = [];
  if (missing.length) detail.push(`缺失: ${missing.join(', ')}`);
  if (empty.length) detail.push(`空文件: ${empty.join(', ')}`);
  if (extra.length) detail.push(`§9 之外的 CSS（提示，不计失败）: ${extra.join(', ')}`);

  if (!missing.length && !empty.length) {
    ok(`(b) §9 CSS 文件齐全且非空（${total}/${total}）`, extra.length ? detail : []);
    return;
  }
  bad(`(b) §9 CSS 文件（${total - missing.length - empty.length}/${total}）`, detail);
}

// ---------------------------------------------------------------------------
// (c) 四份语言包键集合一致
// ---------------------------------------------------------------------------
function checkLanguageParity() {
  const maps = new Map();
  const missingFiles = [];
  for (const lang of LANGUAGES) {
    const full = path.join(LANG_DIR, `${lang}.yml`);
    if (!isFile(full)) {
      missingFiles.push(`languages/${lang}.yml`);
      continue;
    }
    maps.set(lang, new Set(parseTopLevelYamlKeys(fs.readFileSync(full, 'utf8'))));
  }
  if (missingFiles.length) {
    bad(`(c) 语言包键集合一致性（缺文件: ${missingFiles.join(', ')}）`);
    return;
  }
  const base = maps.get('zh-CN');
  const problems = [];
  for (const lang of LANGUAGES) {
    if (lang === 'zh-CN') continue;
    const cur = maps.get(lang);
    const missing = diffSets(base, cur);
    const extra = diffSets(cur, base);
    if (missing.length) problems.push(`${lang} 缺键: ${missing.join(', ')}`);
    if (extra.length) problems.push(`${lang} 多键: ${extra.join(', ')}`);
  }
  const counts = LANGUAGES.map((l) => `${l}=${maps.get(l).size}`).join(' ');
  if (problems.length) {
    bad(`(c) 四份语言包键集合不一致（${counts}）`, problems);
    return;
  }
  ok(`(c) 四份语言包键集合完全一致（${counts}）`);
}

// ---------------------------------------------------------------------------
// (d) 语言包键集合 == 契约 §6 键表
// ---------------------------------------------------------------------------
function checkContractKeys() {
  const contractKeys = parseContractKeys();
  if (!contractKeys) {
    bad('(d) 无法从 DESIGN-CONTRACT.md §6 解析键表');
    return;
  }
  const zhFile = path.join(LANG_DIR, 'zh-CN.yml');
  if (!isFile(zhFile)) {
    bad('(d) 契约键表一致性（languages/zh-CN.yml 缺失）', [`契约 §6 共 ${contractKeys.size} 个键`]);
    return;
  }
  const actual = new Set(parseTopLevelYamlKeys(fs.readFileSync(zhFile, 'utf8')));
  const missing = diffSets(contractKeys, actual);
  const extra = diffSets(actual, contractKeys);
  if (missing.length || extra.length) {
    const detail = [];
    if (missing.length) detail.push(`语言包缺键 ${missing.length} 个: ${missing.join(', ')}`);
    if (extra.length) detail.push(`语言包多键 ${extra.length} 个: ${extra.join(', ')}`);
    bad(`(d) 契约 §6 键表一致性（契约 ${contractKeys.size} 键 / 语言包 ${actual.size} 键）`, detail);
    return;
  }
  ok(`(d) 语言包与契约 §6 键表完全一致（${contractKeys.size} 键）`);
}

// ---------------------------------------------------------------------------
// (e) public/ 构建产物关键 class
// ---------------------------------------------------------------------------
function checkPublicArtifacts() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    skip('(e) public/ 构建产物检查 —— 目录不存在，请先运行 hexo generate');
    return;
  }
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  const notes = [];

  if (!isFile(indexPath)) {
    skip('(e) public/ 构建产物检查 —— public/index.html 不存在');
    return;
  }

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const indexTokens = classTokens(indexHtml);
  const missHome = HOME_MARKERS.filter((marker) => !indexTokens.has(marker));

  // 文章页：找任意一个含 .monish-prose / <article class="post" 的 index.html
  const candidates = walkFiles(PUBLIC_DIR, (f) => path.basename(f) === 'index.html')
    .filter((rel) => rel !== 'index.html')
    .slice(0, 600);

  let postRel = null;
  let postHtml = null;
  for (const rel of candidates) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, rel), 'utf8');
    if (html.includes('monish-prose') || /<article[^>]+class="[^"]*\bpost\b/.test(html)) {
      postRel = rel;
      postHtml = html;
      break;
    }
  }

  const problems = [];
  if (missHome.length) problems.push(`public/index.html 缺少标记: ${missHome.join(', ')}`);

  if (postHtml) {
    const postTokens = classTokens(postHtml);
    const missPost = POST_MARKERS.filter((marker) => !postTokens.has(marker));
    const hasHeading = /<h2[\s>]/i.test(postHtml);
    if (missPost.includes('monish-prose')) problems.push(`public/${postRel} 缺少 .monish-prose`);
    if (missPost.includes('post-toc')) {
      if (hasHeading) problems.push(`public/${postRel} 有 <h2> 但缺少 .post-toc`);
      else notes.push(`public/${postRel} 无 <h2>，post-toc 允许省略`);
    }
    notes.push(`文章页样本: public/${postRel}`);
  } else {
    notes.push(`未找到文章页样本（已扫描 ${candidates.length} 个 index.html），post-toc 检查跳过`);
  }

  if (problems.length) {
    bad('(e) public/ 构建产物关键标记', [...problems, ...notes]);
    return;
  }
  ok('(e) public/ 构建产物关键标记（首页 8/8，文章页 OK）', notes);
}

// ---------------------------------------------------------------------------
// (f) + (g) 依赖：读取 layout/ 下全部 .ejs
// ---------------------------------------------------------------------------
function readLayoutSources() {
  const empty = { sources: new Map(), reason: null };
  if (!fs.existsSync(LAYOUT_DIR)) {
    empty.reason = 'layout/ 目录尚未创建';
    return empty;
  }
  const files = walkFiles(LAYOUT_DIR, (f) => f.endsWith('.ejs'));
  if (!files.length) {
    empty.reason = 'layout/ 下暂无 .ejs 文件';
    return empty;
  }
  const sources = new Map();
  for (const rel of files) {
    sources.set(`layout/${rel}`, fs.readFileSync(path.join(LAYOUT_DIR, rel), 'utf8'));
  }
  const nonEmpty = [...sources.values()].filter((s) => s.trim().length > 0).length;
  if (!nonEmpty) {
    empty.reason = `${files.length} 个 .ejs 文件均为空（模板尚未写完）`;
    return empty;
  }
  return { sources, reason: null };
}

/** 把 key -> 文件 的收集器写成有序清单 */
function formatMissing(map, prefix) {
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, files]) => `${prefix}${key}  ← ${[...files].sort().join(', ')}`);
}

// ---------------------------------------------------------------------------
// (f) layout/**/*.ejs 的 theme.a.b / cfg.a.b 键都能在 theme _config.yml 中找到
// ---------------------------------------------------------------------------
function checkTemplateConfigKeys() {
  const { sources, reason } = readLayoutSources();
  if (reason) {
    skip(`(f) 模板配置键检查 —— ${reason}`);
    return;
  }
  if (!isFile(THEME_CONFIG)) {
    bad('(f) 模板配置键检查 —— themes/monish/_config.yml 缺失');
    return;
  }

  const configPaths = parseYamlKeyPaths(fs.readFileSync(THEME_CONFIG, 'utf8'));
  const themeRefs = new Map(); // key -> Set(file)
  const cfgRefs = new Map();
  const exempt = new Set(['raw']); // cfg.raw = 站点原始 config，不属于主题 _config.yml

  for (const [label, source] of sources) {
    if (!source.trim()) continue;
    for (const key of extractRefs(source, 'theme')) {
      if (!themeRefs.has(key)) themeRefs.set(key, new Set());
      themeRefs.get(key).add(label);
    }
    for (const key of extractRefs(source, 'cfg')) {
      if (exempt.has(key.split('.')[0])) continue;
      if (!cfgRefs.has(key)) cfgRefs.set(key, new Set());
      cfgRefs.get(key).add(label);
    }
  }

  const missingTheme = new Map();
  for (const [key, files] of themeRefs) {
    if (configPaths.has(key) || configPaths.has(key.split('.')[0])) continue;
    missingTheme.set(key, files);
  }
  const missingCfg = new Map();
  for (const [key, files] of cfgRefs) {
    if (configPaths.has(key) || configPaths.has(key.split('.')[0])) continue;
    missingCfg.set(key, files);
  }

  const detail = [
    ...formatMissing(missingTheme, 'theme.'),
    ...formatMissing(missingCfg, 'cfg.')
  ];
  const total = themeRefs.size + cfgRefs.size;
  if (missingTheme.size || missingCfg.size) {
    bad(
      `(f) 模板配置键（theme.* ${themeRefs.size} 个 / cfg.* ${cfgRefs.size} 个，` +
        `未定义 ${missingTheme.size + missingCfg.size} 个）`,
      detail
    );
    return;
  }
  ok(`(f) 模板配置键全部可解析（theme.* ${themeRefs.size} 个 / cfg.* ${cfgRefs.size} 个，共 ${total} 个）`);
}

// ---------------------------------------------------------------------------
// (g) layout/**/*.ejs 里 monish_t()/__() 用到的 i18n 键都在语言包中
// ---------------------------------------------------------------------------
const I18N_CALL_PATTERNS = [
  [
    /\bmonish_t\(\s*['"]([a-z][a-z0-9_]*)['"]/g,
    /\bmonish_t\(\s*['"]([a-z][a-z0-9_]*)['"]\s*\)/g
  ],
  [
    /(?<![\w.])__\(\s*['"]([a-z][a-z0-9_]*)['"]/g,
    /(?<![\w.])__\(\s*['"]([a-z][a-z0-9_]*)['"]\s*\)/g
  ]
];

function checkTemplateI18nKeys() {
  const { sources, reason } = readLayoutSources();
  if (reason) {
    skip(`(g) 模板 i18n 键检查 —— ${reason}`);
    return;
  }
  const packFile = path.join(LANG_DIR, 'zh-CN.yml');
  if (!isFile(packFile)) {
    bad('(g) 模板 i18n 键检查 —— languages/zh-CN.yml 缺失');
    return;
  }
  const pack = parseTopLevelYaml(fs.readFileSync(packFile, 'utf8'));

  const used = new Map();      // key -> Set(file)
  const missing = new Map();   // key -> Set(file)
  const badFormat = new Map(); // key -> Set(file)：带 %s 但调用未传参

  for (const [label, source] of sources) {
    if (!source.trim()) continue;
    for (const [re, reNoArg] of I18N_CALL_PATTERNS) {
      let m;
      while ((m = re.exec(source)) !== null) {
        const key = m[1];
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(label);
        if (!pack.has(key)) {
          if (!missing.has(key)) missing.set(key, new Set());
          missing.get(key).add(label);
        }
      }
      while ((m = reNoArg.exec(source)) !== null) {
        const key = m[1];
        const value = pack.get(key) || '';
        if (value.includes('%s')) {
          if (!badFormat.has(key)) badFormat.set(key, new Set());
          badFormat.get(key).add(label);
        }
      }
    }
  }

  if (!used.size) {
    skip('(g) 模板 i18n 键检查 —— 模板中未发现 monish_t()/__() 调用');
    return;
  }

  const detail = [
    ...formatMissing(missing, ''),
    ...[...badFormat.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, files]) => `${key} 含 %s 但调用未传参  ← ${[...files].sort().join(', ')}`)
  ];

  if (missing.size || badFormat.size) {
    bad(
      `(g) 模板 i18n 键（模板用到 ${used.size} 个，` +
        `语言包缺 ${missing.size} 个 / 未传参 ${badFormat.size} 个）`,
      detail
    );
    return;
  }
  ok(`(g) 模板 i18n 键全部命中语言包（用到 ${used.size} 个）`);
}

// ---------------------------------------------------------------------------
// (h) public/index.html 的文案语言与站点 language 一致
//     防止 monish_t() 没命中语言包、整站落到 scripts/helpers.js 的英文 FALLBACK
// ---------------------------------------------------------------------------
const I18N_PROBE_KEYS = [
  'scroll_down',
  'total_posts',
  'latest_posts',
  'read_more',
  'all_posts',
  'home',
  'no_posts'
];

/** 读站点 _config.yml 的顶层 language */
function parseSiteLanguage() {
  const file = path.join(SITE_DIR, '_config.yml');
  if (!isFile(file)) return '';
  const m = /^language:\s*(.*)$/m.exec(fs.readFileSync(file, 'utf8'));
  if (!m) return '';
  let value = m[1].trim();
  if (value.length >= 2 && /^['"]/.test(value) && value.endsWith(value[0])) {
    value = value.slice(1, -1);
  }
  return value.trim();
}

/** 从 scripts/helpers.js 解析英文兜底表 FALLBACK（解析失败返回 null） */
function parseHelperFallback() {
  const file = path.join(THEME_DIR, 'scripts', 'helpers.js');
  if (!isFile(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('const FALLBACK');
  if (start < 0) return null;
  const end = src.indexOf('};', start);
  if (end < 0) return null;
  const map = new Map();
  const re = /^\s{2}([a-z][a-z0-9_]*):\s*(?:'([^']*)'|"([^"]*)")\s*,?\s*$/gm;
  let m;
  while ((m = re.exec(src.slice(start, end))) !== null) {
    map.set(m[1], m[2] !== undefined ? m[2] : m[3]);
  }
  return map.size >= 10 ? map : null;
}

function checkBuiltLanguage() {
  const indexFile = path.join(PUBLIC_DIR, 'index.html');
  if (!isFile(indexFile)) {
    skip('(h) 构建产物文案语言检查 —— public/index.html 不存在');
    return;
  }
  const lang = parseSiteLanguage();
  if (!lang || lang === 'default' || lang.toLowerCase() === 'en') {
    skip(`(h) 构建产物文案语言检查 —— 站点 language=${lang || '(未设置)'}，与英文兜底无法区分`);
    return;
  }
  const packFile = path.join(LANG_DIR, `${lang}.yml`);
  if (!isFile(packFile)) {
    skip(`(h) 构建产物文案语言检查 —— languages/${lang}.yml 不存在`);
    return;
  }

  const pack = parseTopLevelYaml(fs.readFileSync(packFile, 'utf8'));
  const fallback = parseHelperFallback();
  const html = fs.readFileSync(indexFile, 'utf8');
  const probes = I18N_PROBE_KEYS.filter((key) => pack.has(key) && pack.get(key));

  const present = probes.filter((key) => containsWord(html, pack.get(key)));
  const leaked = [];
  if (fallback) {
    for (const key of probes) {
      const fallbackValue = fallback.get(key);
      const packValue = pack.get(key);
      if (!fallbackValue || fallbackValue === packValue) continue;
      if (containsWord(html, fallbackValue) && !containsWord(html, packValue)) {
        leaked.push(`出现英文兜底 "${fallbackValue}"，而语言包值 "${packValue}" 未出现  ← ${key}`);
      }
    }
  }

  if (leaked.length) {
    bad(`(h) public/index.html 文案语言（站点 language=${lang}）`, [
      ...leaked,
      '说明 monish_t() 没命中语言包，落到了 scripts/helpers.js 的英文 FALLBACK'
    ]);
    return;
  }
  if (!present.length) {
    bad(`(h) public/index.html 文案语言（站点 language=${lang}）`, [
      `探针键 ${probes.join(', ')} 的语言包文案一个都没出现，疑似 i18n 未生效`
    ]);
    return;
  }
  ok(`(h) public/index.html 文案语言与 language=${lang} 一致（命中 ${present.length}/${probes.length} 个探针键）`);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
function main() {
  console.log('monish theme unit smoke');
  console.log(`  theme   : ${THEME_DIR}`);
  console.log(`  site    : ${SITE_DIR}`);
  console.log(`  public  : ${PUBLIC_DIR}`);
  console.log('');

  const guarded = [
    ['a', checkRequiredFiles],
    ['b', checkCssFiles],
    ['c', checkLanguageParity],
    ['d', checkContractKeys],
    ['e', checkPublicArtifacts],
    ['f', checkTemplateConfigKeys],
    ['g', checkTemplateI18nKeys],
    ['h', checkBuiltLanguage]
  ];
  for (const [id, fn] of guarded) {
    try {
      fn();
    } catch (err) {
      bad(`(${id}) 检查过程抛出异常`, [String(err && err.stack ? err.stack : err)]);
    }
  }

  const width = Math.max(...results.map((r) => r.title.length));
  for (const r of results) {
    console.log(`${r.status.padEnd(4)} ${r.title.padEnd(width)}${r.status === 'PASS' && !r.detail.length ? '' : ''}`);
    for (const line of r.detail) console.log(`       ↳ ${line}`);
  }

  const count = (s) => results.filter((r) => r.status === s).length;
  const failed = count('FAIL');
  console.log('');
  console.log('-'.repeat(64));
  console.log(`汇总: PASS ${count('PASS')}  FAIL ${failed}  SKIP ${count('SKIP')}  （共 ${results.length} 项）`);
  console.log(failed ? '结果: FAIL' : '结果: PASS');
  process.exitCode = failed ? 1 : 0;
}

main();
