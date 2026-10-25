/* global hexo */
'use strict';

/**
 * 把 `source/_posts` 下的**文件夹名当作分类**。
 *
 *   _posts/ct1/test01.md        → 分类 ct1
 *   _posts/技术/Kotlin/x.md     → 分类 技术 > Kotlin（Hexo 的层级分类）
 *   _posts/随手记.md            → 分类「未分类」
 *
 * 为什么写进 Hexo 的 Category 模型，而不是在模板里算：
 * 只有分类进了模型，`/categories/` 列表页、`/categories/ct1/` 分类详情页、
 * 文章页的分类链接才会**全部自动成立**；模板层硬算的话这三处都得自己实现一遍。
 *
 * 时机选 `before_generate`：文件已处理完（Post 都在数据库里）、生成器还没跑，
 * 在这里 setCategories，后面的 category 生成器读到的就是新分类。
 *
 * ⚠️ 不能用 `before_post_render`：post 的 categories 关系在
 * processor/post.js 里就已经按 front-matter 建好了，而渲染发生在 generate
 * 阶段，顺序上已经太晚。
 */

const DEFAULTS = {
  from_folder: true,
  uncategorized: '未分类',
  override_front_matter: false
};

function readOptions() {
  const themeCfg = (hexo.theme && hexo.theme.config) || {};
  const raw = themeCfg.categories;
  const options = Object.assign({}, DEFAULTS);

  // 允许写成标量：categories: false / categories: true
  if (typeof raw === 'boolean') {
    options.from_folder = raw;
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (typeof raw.from_folder === 'boolean') options.from_folder = raw.from_folder;
    if (typeof raw.uncategorized === 'string') options.uncategorized = raw.uncategorized.trim();
    if (typeof raw.override_front_matter === 'boolean') {
      options.override_front_matter = raw.override_front_matter;
    }
  }

  // 旧键兼容：若有人写了 categories_folder: false
  if (themeCfg.categories_folder === false) options.from_folder = false;

  return options;
}

/**
 * 从 post.source 反推文件夹层级。
 * Hexo 里 post.source 形如 `_posts/ct1/test01.md`（相对 source_dir、/ 分隔）。
 */
function folderPathOf(source) {
  const normalized = String(source || '').replace(/\\/g, '/');
  const match = normalized.match(/^_posts\/(.+)$/i);
  if (!match) return [];

  const segments = match[1].split('/');
  segments.pop(); // 去掉文件名，剩下的是目录层级

  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment.charAt(0) !== '.' && segment.charAt(0) !== '_');
}

/**
 * 判断 front-matter 里是否**显式**写了分类。
 *
 * ⚠️ 不能看 `post.categories`：那是 Category 模型的关系，本脚本跑过一次之后
 * 它就非空了，第二次构建时会把「我们自己写的分类」误判成作者写的 front-matter，
 * 于是文章换文件夹也不会更新。只能回原文：`post.raw` 是
 * processor/post.js 赋的整个文件内容（含 front-matter）。
 */
function frontMatterHasCategories(post) {
  const raw = String(post.raw || '');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return false;
  // Hexo 支持的别名：categories / category / cats
  return /^\s*(categories|category|cats)\s*:/m.test(match[1]);
}

/** setCategories 接受「字符串 = 单层」或「数组 = 层级」两种元素 */
function toCategorySpec(folderPath, uncategorized) {
  if (!folderPath.length) return uncategorized ? [uncategorized] : [];
  if (folderPath.length === 1) return [folderPath[0]];
  return [folderPath];
}

hexo.extend.filter.register('before_generate', function () {
  const options = readOptions();
  if (!options.from_folder) return;

  const posts = hexo.locals.get('posts');
  if (!posts || !posts.length) return;

  const jobs = [];

  posts.forEach((post) => {
    if (post.published === false) return;
    if (typeof post.notPublished === 'function' && post.notPublished()) return;
    if (!options.override_front_matter && frontMatterHasCategories(post)) return;

    const spec = toCategorySpec(folderPathOf(post.source), options.uncategorized);
    if (!spec.length) return;

    jobs.push(post.setCategories(spec));
  });

  if (!jobs.length) return;

  // setCategories 是异步写库的，返回 Promise 让 Hexo 等它写完再进生成器，
  // 否则 /categories/ 读到的还是旧关系。
  return Promise.all(jobs).then(() => {
    hexo.log.debug('[monish] 按文件夹归类：%d 篇', jobs.length);
  });
});