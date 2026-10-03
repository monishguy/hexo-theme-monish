# monish 主题设计契约 v1（冻结）

> 本文件是模板（EJS）、样式（CSS）、脚本（JS）三方的**唯一接口真相**。
> 任何一方需要新增 class / id / CSS 变量时，必须先改本文件，并通知其余两方。
>
> 主题定位：以 Hexo 官方 landscape 主题为骨架重写。衬线字体正文（serif），
> 莫奈睡莲浅绿为强调色（accent），支持 浅色 / 深色 / 自动 三种模式。

---

## 0. 目录与职责边界（写权限互斥）

| 路径 | 负责人 | 说明 |
| --- | --- | --- |
| `themes/monish/_config.yml` | Lead | 主题配置，唯一配置真相 |
| `themes/monish/layout/**` | Lead | EJS 模板 |
| `themes/monish/source/js/**` | Lead | 前端脚本 |
| `themes/monish/scripts/**` | Lead | Hexo 服务端 helper / filter |
| `themes/monish/source/css/**` | CSS owner | 全部样式（**文件清单见 §9，不得增删文件名**） |
| `themes/monish/languages/**` | i18n owner | 翻译 |
| `themes/monish/README.md` | i18n owner | 文档 |
| `themes/monish/test/theme-unit-smoke.mjs` | i18n owner | 构建冒烟检查 |
| `themes/monish/.gitignore`, `package.json` | Lead | 元数据 |

CSS owner / i18n owner **禁止** 修改 `layout/`、`source/js/`、`_config.yml`。
Lead 负责最终 `hexo clean && hexo generate` 与产物核对。

---

## 1. 主题配置 schema（`themes/monish/_config.yml`）

模板中出现 `theme.x.y` 的键与此处一一对应。模板必须对缺省值做兜底（`||` 默认值），
缺配置时 **不得** 抛错。

```yaml
# 站点信息（留空则回退到 Hexo 站点 _config.yml）
site:
  title:            # 回退 config.title
  subtitle:         # 回退 config.subtitle，再回退 config.description
  description:      # 回退 config.description
  keywords:         # 回退 config.keywords
  author:           # 回退 config.author

# 首页首屏
hero:
  enable: true
  layout: card            # card（v2 默认，左栏超粗大标题）| full | center | banner
  background: accent      # accent | image
  background_image:       # layout: banner 且 background: image 时使用
  overlay: 0.18           # 0~1，背景图遮罩强度
  slogan:                 # 首屏主标题，留空回退 site.title
  subtitle:               # 首屏副标题，留空回退 site.subtitle
  scroll_hint: true       # 是否显示下滑提示
  scroll_hint_text:       # 留空使用 i18n: scroll_down
  height: 100vh           # 首屏高度
  particles: false        # 预留：睡莲光斑装饰

# 顶部导航
nav:
  enable: true
  sticky: true
  home: true              # 是否在菜单最前插入首页
  menu:                   # 名称: 路径
    archives: /archives/
    categories: /categories/
    tags: /tags/
    about: /about/
  rss: /atom.xml          # 留空则不显示

# 首页最新博文
posts:
  section_title:          # 留空使用 i18n: latest_posts
  excerpt_length: 120     # 摘要字数（0 = 用 <!-- more -->）
  show_cover: true
  show_categories: true
  show_tags: false
  show_readmore: true
  readmore_text:          # 留空使用 i18n: read_more
  date_format: MMM D, YYYY

# 作者卡片（侧栏 / 页脚）
author_card:
  enable: true
  avatar:
  name:                   # 回退 site.author
  description:
  links:                  # 图标键: URL，键见 §4 图标表
    github:
    mail:

# 页脚
footer:
  since:                  # 留空自动取最早文章年份
  copyright:              # 自定义版权文案，支持 HTML
  powered: true
  icp:                    # 备案号，留空不显示
  icp_link: https://beian.miit.gov.cn/
  links:                  # 名称: URL

# 侧栏（目录页 / 归档页）
sidebar:
  enable: true
  position: right         # left | right
  widgets:                # category | tag | tagcloud | archive | recent_posts
    - category
    - tag
    - recent_posts
  recent_posts_limits: 5

# 文章页
post:
  toc: true
  toc_depth: 3
  excerpt_link:
  copyright: true
  updated: true
  word_count: true
  reading_time: true
  reward:                 # 可选：打赏二维码图片路径
  prev_next: true
  related: false
  related_limits: 3
  comments:
    enable: false
    system: valine        # valine | disqus | giscus
    valine: {enable: false, appId: '', appKey: '', placeholder: '', lang: zh-cn}
    disqus_shortname:
    giscus: {repo: '', repo_id: '', category: '', category_id: '', mapping: pathname, lang: zh-CN}

# 归档页
archive:
  type: monthly           # monthly | yearly
  show_count: true

# 外观
appearance:
  default_mode: auto      # auto | light | dark  —— auto 跟随系统
  accent: "#7FA88B"       # 强调色（黑白灰里的点缀：链接 / hover / 激活）
  accent_dark: "#8FBF9F"  # 深色模式强调色
  radius: 44px            # 面板圆角（写进 --radius-card）
  # ---- 字体三角色（v2）；留空用主题内置默认值 ----
  display_font:           # 超粗标题，默认 "Archivo Black"
  body_font:              # 正文，默认 "Inter"（serif_font 作兼容别名）
  mono_font:              # 等宽小标签 / 代码，默认 "JetBrains Mono"
  # ---- webfont 交付方式 ----
  # local: 用主题自带的 7 个 woff2（默认，离线可用、国内稳）
  # none:  不引入 fonts.css，只用系统字体
  # cdn:   改用 Google Fonts（国内不稳，仅备选）
  webfont: local
  enable_transition: true # 主题切换过渡动画
  enable_animation: true  # 滚动/入场动画（尊重 prefers-reduced-motion）

# 功能
features:
  search: false           # 客户端本地搜索
  lightbox: true          # 图片点击放大
  copy_code: true         # 代码块复制按钮
  back_to_top: true
  progress_bar: true      # 阅读进度条
  pjax: false             # 预留，默认关闭

# 第三方
analytics:
  google_analytics:
  gauges:
favicon:                  # 留空则不输出 shortcut icon 链接（避免指向不存在的文件）
```

---

## 2. 设计令牌（CSS 自定义属性）— v2「纸卡」风格

根选择器规则与 v1 相同：`html[data-theme="light|dark"]` 显式分支 +
`@media (prefers-color-scheme: dark) html:not([data-theme])` 兜底；
**两处深色声明必须逐条完全一致**。

### 2.1 颜色

| 变量 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `--canvas` | `#F0F0EE` | `#121212` | 页面底色（大卡片外的灰） |
| `--surface` | `#FFFFFF` | `#1A1A1A` | 主面板 `.shell` / 内容卡 `.card` |
| `--surface-2` | `#FFFFFF` | `#202020` | 列表里的药丸卡 `.post-pill` |
| `--surface-3` | `#F6F6F4` | `#262626` | 输入框 / 代码块底 |
| `--text` | `#101010` | `#F2F2F0` | 主文字（近黑） |
| `--text-muted` | `#8C8C8C` | `#9C9C9C` | 正文 / 摘要灰 |
| `--text-faint` | `#B4B4B4` | `#6E6E6E` | 日期 / 次要标签 |
| `--border` | `#E8E8E5` | `#2A2A2A` | 描边 / 分隔 |
| `--line` | `#DCDCD8` | `#343434` | 竖分隔线 / 时间线 |
| `--accent` | `#7FA88B` | `#8FBF9F` | 链接 / hover / 激活（点缀） |
| `--accent-strong` | `#5F8A6C` | `color-mix(in srgb, var(--accent) 74%, var(--text))` | 强调文字 |
| `--accent-soft` | `#EAF1EB` | `color-mix(in srgb, var(--accent) 16%, var(--surface))` | 药丸底 |
| `--shadow-card` | `0 30px 70px rgba(20,20,20,.10), 0 2px 8px rgba(20,20,20,.04)` | `0 30px 70px rgba(0,0,0,.55)` | `.shell` |
| `--shadow-pill` | `0 12px 30px rgba(20,20,20,.06)` | `0 12px 30px rgba(0,0,0,.4)` | `.post-pill` |
| `--shadow-hover` | `0 18px 44px rgba(20,20,20,.10)` | `0 18px 44px rgba(0,0,0,.5)` | hover 抬升 |

配色纪律：**页面主体是黑白灰**，绿色只出现在链接、hover、激活态、focus ring、
少量强调（tag chip hover、复制成功反馈）。不要用绿色做大面积底色。

### 2.2 圆角 / 尺寸 / 动效

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--radius-card` | `44px` | `.shell` |
| `--radius-lg` | `26px` | `.card` / `.post-pill` |
| `--radius-md` | `16px` | 内层小块 |
| `--radius-sm` | `10px` | 按钮 / 输入框 |
| `--radius-pill` | `999px` | tag / 徽标 |
| `--shell-pad` | `22px` | canvas 到 `.shell` 的间距 |
| `--shell-min-h` | `calc(100vh - var(--shell-pad) * 2)` | 面板最小高度 |
| `--rail-w` | `minmax(240px, 30%)` | 左栏宽度（grid 用） |
| `--gap-rail` | `clamp(28px, 4vw, 64px)` | 两栏间距 |
| `--space-1`…`--space-8` | 沿用 v1（4/8/12/16/24/32/48/64px） | — |
| `--speed-fast` / `--speed` / `--speed-slow` | `160ms` / `320ms` / `720ms` | — |
| `--ease` | `cubic-bezier(.22,.61,.36,1)` | — |
| `--nav-height` | `56px` | 移动端顶栏高度（≤900px 才用） |

### 2.3 字体

```
--font-display: "Archivo Black", "Inter", "PingFang SC", "Microsoft YaHei",
                "Hiragino Sans GB", "Noto Sans SC", system-ui, sans-serif;
--font-body:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
                "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", Roboto,
                "Helvetica Neue", Arial, sans-serif;
--font-mono:    "JetBrains Mono", <v1 的完整 IDE 等宽栈，见 §5>;
```

| 变量 | 值 | 用途 |
| --- | --- | --- |
| `--fs-display` | `clamp(2.4rem, 5.6vw, 4.75rem)` | 左栏超粗大标题 |
| `--lh-display` | `.9` | 大标题行高（要紧） |
| `--ls-display` | `-.02em` | 大标题字距 |
| `--fs-title` | `clamp(1.6rem, 3.4vw, 2.6rem)` | 文章页标题 |
| `--fs-body` | `16.5px` | 正文 |
| `--lh-body` | `1.75` | 正文行高 |
| `--fs-label` | `12px` | 等宽小标签（导航 / 日期 / tag / 元信息） |
| `--ls-label` | `.1em` | 等宽小标签字距 |

**等宽小标签统一写法**（导航、日期、tag、元信息、语言标签都用它）：

```css
font-family: var(--font-mono);
font-size: var(--fs-label);
letter-spacing: var(--ls-label);
text-transform: uppercase;   /* 中文不受影响 */
color: var(--text-faint);
```

---

## 3. HTML 结构契约 — v2

### 3.1 页面骨架

```html
<html lang="zh-CN" data-theme-mode="auto" data-theme="light"
      data-page="home|post|page|archive|category|tag"
      data-animation="true" data-lightbox="true" data-copy-code="true" data-search="false"
      data-label-copy="复制" data-label-copied="已复制"
      data-label-search-placeholder="…" data-label-search-empty="…"
      data-root="/"
      data-display="card|splash">            <!-- 当前 hero 模式，CSS 用它切换首屏 -->
<body class="monish is-home|is-page">
  <a class="skip-link" href="#main">跳到主要内容</a>

  <div class="shell" id="shell">
    <aside class="rail" id="rail"> …见 3.2… </aside>
    <div class="main" id="main"> …见 3.3… </div>
    <div class="scroll-track" id="scroll-track" aria-hidden="true">
      <span class="scroll-thumb" id="progress-bar"></span>
    </div>
  </div>

  <footer class="site-footer" id="site-footer"> …见 3.6… </footer>
  <div class="toast" id="toast" role="status" aria-hidden="true" hidden></div>
  <div class="nav-backdrop" id="nav-backdrop" hidden></div>
  <div class="nav-drawer" id="nav-drawer" hidden> …见 3.2b… </div>
</body>
```

- **v1 的 `.site-header` / `#site-header` / `.container` / `.layout-2col` / `.sidebar-col` 全部废弃**。
- `.shell` 是那张大圆角白卡；`.scroll-track` 固定贴在面板右侧内缘（竖向滚动指示，对应图示右边那根圆角灰条）。

### 3.2 左栏 rail（站点身份 + 导航）

```html
<aside class="rail" id="rail">
  <div class="rail-top">
    <p class="rail-slogan" id="rail-slogan">Let’s Get Started</p>

    <div class="rail-identity">
      <button class="rail-author" id="author-toggle" type="button"
              aria-expanded="false" aria-controls="author-popover">
        <span class="author-avatar" aria-hidden="true">M</span>
        <span class="author-name">MonishGuy</span>
      </button>
      <!-- ≤900px 才显示的右上角菜单入口 -->
      <button class="util-btn nav-toggle" id="nav-toggle" type="button"
              aria-expanded="false" aria-controls="nav-drawer">菜单</button>

      <div class="author-popover" id="author-popover" hidden>
        <p class="author-popover-name">MonishGuy</p>
        <p class="author-popover-desc">简介</p>
        <ul class="author-links">
          <li class="author-link-item">
            <a class="author-link" href="https://github.com/…" target="_blank" rel="noopener">
              <span class="fa fa-github"></span><span class="author-link-label">github</span>
            </a>
          </li>
          <li class="author-link-item">
            <!-- 非链接的值渲染成只读行 -->
            <span class="author-link author-link--text">
              <span class="fa fa-qq"></span><span class="author-link-label">qq</span>
              <span class="author-link-value">10001</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div class="rail-bottom">
    <nav class="rail-nav" id="rail-nav">…</nav>
    <div class="rail-utils">…搜索 / 主题切换 / RSS…</div>
  </div>
</aside>
```

- `.rail-slogan`：超粗大标题，`--font-display` + `--fs-display`，可多行折行（`hero.layout: card` 时它就是首屏主角，代替 v1 的全屏色块）。
- `.rail` 在桌面是列内 `position: sticky`（`top: var(--shell-pad)`），滚动内容时身份区不动；它同时是 `.author-popover` 的定位参照链。
- `.rail-identity`：`position: relative`，包住作者块 + 移动端菜单按钮 + 作者弹层。
- `.rail-nav` / `.rail-link`：等宽大写小标签；相邻项之间的「/」由 CSS `::after` 画，**模板不要再写分隔符**。
- `.rail-link.is-active`：`color: var(--accent-strong)`。
- `.util-btn`：等宽小字按钮，无边框，`color: var(--text-faint)`，hover 转 `--accent-strong`。
- **作者块**：`author_card.links` 里**至少有一项**时才把 `.rail-author` 渲染成 `<button>` 并输出 `.author-popover`；否则只是一个不可点的 `<div>`。值是 `http(s)://` → 链接（新窗口），否则渲染成只读行（`.author-link--text` + `.author-link-value`，例如 QQ 号）。
- **移动端（≤900px）**：`.nav-toggle` 在这里（右上角，药丸外观）；`.rail-utils` 里的 `.theme-toggle` 被 CSS 隐藏，主题切换改从抽屉里切（抽屉里有一个 `<button class="drawer-link theme-toggle">`，JS 会同步所有 `.theme-toggle` 的文案）。
- 折叠顶栏只有两行：`.rail-top`（标题 + 身份）与 `.rail-bottom`（导航 + 搜索/RSS）。

### 3.2b 移动抽屉（复用 v1 机制，样式按 v2 调）

结构与 v1 完全一致（`.nav-backdrop` + `.nav-drawer` + `.nav-drawer-inner` + `.drawer-link`
+ `.is-open` 状态 + `hidden` 兜底），只是配色/圆角跟随 v2。`z-index` 关系不变：
`backdrop 45 < 移动顶栏 50 < drawer 60`。

### 3.3 主区容器

```html
<div class="main" id="main">
  <!-- 首页：列表 -->
  <!-- 其它页：一张内容卡 -->
</div>
```

`.main` 左侧有一条竖分隔线（`border-inline-start: 1px solid var(--line)`），
对应图示两栏之间的那根线。`.main` 自身负责内边距，不加滚动容器。

### 3.4 首页列表（`layout/index.ejs`）

```html
<div class="post-list" id="latest-posts">
  <article class="post-row">
    <time class="post-row-date" datetime="2026-02-01">
      <span class="date-month">FEB</span>
      <span class="date-day">1</span>
    </time>
    <a class="post-pill" href="/2026/02/01/xxx/">
      <h2 class="post-pill-title">标题</h2>
      <p class="post-pill-excerpt">摘要…</p>
    </a>
  </article>
  …
</div>

<nav class="pagination" aria-label="分页"> … </nav>
```

- `.post-row`：grid `auto 1fr`，日期列固定窄宽，与药丸卡顶部对齐。
- `.post-row-date`：等宽小标签，**月份与日竖排两行**（图示 `FEB` / `1`）。
  月份用 `date_format` 的 `MMM`（英文缩写）；模板输出 `<span class="date-month">` + `<span class="date-day">`。
- `.post-pill`：`--surface-2` 底 + `--radius-lg` + `--shadow-pill`；hover 抬升 2px + `--shadow-hover`，
  标题转 `--accent-strong`。
- `.post-pill-title`：`--font-body` 700 / 1.35rem（**不是** display 字体，图示里药丸内标题是粗黑体正文）。
- `.post-pill-excerpt`：`--text-muted`，最多 2 行截断（`-webkit-line-clamp: 2`）。
- 空状态 `.empty-state`；分页 `.pagination` / `.page-number` / `.extend` 沿用 v1 类名，样式按 v2 调。
- 没有封面（图示列表无图），`posts.show_cover` 失效：保留配置但列表不再渲染 `.post-card-cover`。

### 3.5 内容卡（文章页 / 独立页 / 归档 / 分类 / 标签）

```html
<article class="card" id="content-card" itemscope itemtype="https://schema.org/BlogPosting">
  <header class="card-head">
    <time class="post-date" datetime="2026-02-01">FEB 1</time>
    <h1 class="card-title">标题</h1>
    <div class="post-tags">
      <a class="tag-chip" href="/tags/x/">#标签</a>
    </div>
    <dl class="card-meta">
      <div class="meta-item"><dt>作者</dt><dd>MonishGuy</dd></div>
      <div class="meta-item"><dt>阅读时长</dt><dd>3 分钟</dd></div>
    </dl>
  </header>

  <div class="post-toc" id="post-toc"> …目录，结构同 v1… </div>

  <div class="card-body monish-prose" itemprop="articleBody"> …正文… </div>

  <footer class="card-foot">
    <div class="post-copyright">…</div>
    <nav class="post-nav">…上一篇 / 下一篇…</nav>
    <section class="comments" id="comments">…</section>
  </footer>
</article>
```

- `.card`：`--surface` 底 + `--radius-card` + `--shadow-card`，不要边框（靠阴影浮起）。
- `.card-head` 里的时间、tag、meta 全部走等宽小标签。
- `.card-title`：`--font-display` + `--fs-title` + `--lh-display`。
- 归档 / 分类 / 标签页：`.card` 内放列表或分组，沿用 `.archive-groups` / `.archive-group*` /
  `.term-card*` / `.term-index*`（v1 类名保留，样式按 v2 重做）。
- **列表型页面（归档/分类/标签）不再有侧栏 widget**：`sidebar.*` 配置保留但桌面布局改为
  左栏 rail + 主区内容卡，**不再渲染 `.sidebar-col` / `.widget*`**。模板侧的
  `_partial/sidebar.ejs` 与 `_widget/*.ejs` 保留为「可选侧栏」但默认不启用。

### 3.5b 404 页（独立整页，由生成器产出）

```html
<main class="error-page" id="main">
  <a class="error-home" href="/">返回首页</a>
  <h1 class="error-heading">
    <span class="error-code">404</span>
    <span class="error-title">页面走丢了</span>
  </h1>
  <p class="error-desc">找不到的说明文案</p>
  <nav class="error-links">
    <a class="error-link" href="/">首页</a>
    <a class="error-link" href="/archives/">归档</a>
  </nav>
</main>
```

两条硬约束：

1. **由 `scripts/generator.js` 生成 `404.html`**，不要放到主题 `source/`：
   主题 `source/` 里的文件只会被当**静态资源**拷贝（不渲染 markdown / front-matter），
   会输出未渲染的原文。生成器也让使用者站点 `source/` 一个文件都不用加。
2. `layout/404.ejs` **必须写 front-matter `layout: false`**：
   Hexo 给生成器路由构造 locals 时把 `options.layout` 默认设成 `'layout'`，
   不关掉就会被 `layout/layout.ejs` 再包一层（页面里会出现两个 `<!DOCTYPE>`、并在 shell 里再套一份）。

样式：整屏留白、超大 `.error-code`（`--font-display`），`.error-title` 单独一档更小的字号
（它可能是「页面走丢了」这种多字中文，和 404 共用 vw 尺寸会横向撑爆）。
静态站（GitHub Pages / Cloudflare Pages / Netlify / Vercel）对未知路径都会返回
根目录的 `/404.html`，所以「不存在的页面进 404」由产出这个文件保证。

### 3.6 页脚

```html
<footer class="site-footer" id="site-footer">
  <div class="footer-inner">
    <span class="footer-copyright">© 2025–2026 MonishGuy</span>
    <span class="footer-powered">Powered by Hexo</span>
    <span class="footer-theme-name">monish</span>
  </div>
</footer>
```

页脚在 `.shell` **外面**，是页面底部一条居中的等宽小字，无背景无边框。

### 3.7 首屏两种模式（`hero.layout`）

| 取值 | 行为 |
| --- | --- |
| `card`（**新默认**） | 不渲染独立首屏。左栏 `.rail-slogan` 显示超粗大标题，`data-display="card"` |
| `full` | 首页第一页渲染 v1 的全屏强调色 hero（保留 `.hero` 全部结构与类名），`data-display="splash"`；此时左栏大标题隐藏 |
| `center` / `banner` | 同 v1，`data-display="splash"` |

`.hero*` 全部类名与结构沿用 v1（§3.4 of v1：`.hero` / `.hero-bg` / `.hero-overlay` /
`.hero-inner` / `.hero-title` / `.hero-subtitle` / `.hero-meta` / `.hero-scroll`），
配色改为 v2（默认按 `--accent` 铺底）。`hero.particles` 保留。

### 3.8 代码块 / 灯箱 / 搜索 / 提示

结构与 v1 完全一致（`.code-toolbar` / `.code-language` / `.highlight*` /
`.code-copy` / `.lightbox*` / `.search-*` / `.toast`），只按 v2 的配色、圆角、字体调整。
代码块字体继续走 `--font-mono`（§5）。

**`.code-scroll`（v2 新增，横向滚动容器）** —— 由 `scripts/helpers.js` 的
`after_post_render` filter 在构建期注入，包在 `figure.highlight` 的 `<table>` 外面：

```html
<figure class="highlight kotlin">
  <div class="code-toolbar">…语言标签 + 复制按钮…</div>
  <div class="code-scroll">          <!-- overflow-x: auto，真正滚的是它 -->
    <table><tr><td class="gutter">…</td><td class="code">…</td></tr></table>
  </div>
</figure>
```

三个必须一起成立的点，缺一个长行就会被裁掉、看不到滚动条：

1. **滚动必须放在包住 `<table>` 的容器上**。`table` 是 `width:100%` 的 auto 布局，
   长行会把**表格本身**撑得比容器宽；此时若滚动加在 `pre` 上，`.highlight` 的
   `overflow:hidden` 会先把表格裁掉 —— 一个滚动条都不会出现。
2. **工具条必须在滚动容器之外**，否则横滚时语言标签和复制按钮会跟着跑出视野。
3. **`figure.highlight` 里的 `pre` 要 `overflow: visible`**（用
   `.monish-prose .highlight pre` 压过 `.monish-prose pre`），否则会出现两条横向滚动条。

行号槽 `td.gutter` 用 `position: sticky; inset-inline-start: 0` + 不透明底色，
横滚时固定在左侧、代码从底下滑过。

### 3.9 状态类汇总（v2）

| class | 加在 | 触发者 |
| --- | --- | --- |
| `hero-ready` | `<html>` | JS |
| `is-scrolled` | 移动顶栏 | JS |
| `is-active` | `.rail-link` / `.drawer-link` / `.main-nav-link` | 模板 |
| `is-open` | `#nav-drawer` / `#nav-backdrop` / `.search-box` / `.post-toc` / `.lightbox` | JS |
| `is-hidden` | `#back-to-top` / `#scroll-track` | JS |
| `is-revealed` | `[data-reveal]` | IntersectionObserver |
| `is-lightbox-open` | `<body>` | JS |
| `is-copied` | `.code-copy` | JS |

## 4. 图标表（Fork Awesome，`<span class="fa fa-xxx">`）

CSS 不依赖图标，图标由模板写死。配置里的 `links` 键 → 图标类：

`github` → `fa-github`，`mail`/`email` → `fa-envelope-o`，`twitter` → `fa-twitter`，
`weibo` → `fa-weibo`，`zhihu` → `fa-question-circle`，`bilibili` → `fa-television`，
`rss` → `fa-rss`，`link`/`website` → `fa-link`，`telegram` → `fa-telegram`，
`qq` → `fa-qq`，`wechat` → `fa-weixin`，`instagram` → `fa-instagram`，
`youtube` → `fa-youtube-play`，`stack-overflow` → `fa-stack-overflow`，
`codepen` → `fa-codepen`，`gitlab` → `fa-gitlab`，`linkedin` → `fa-linkedin`，
`facebook` → `fa-facebook`，`douban` → `fa-book`，`steam` → `fa-steam`，
`mastodon` → `fa-mastodon`，其余 → `fa-link`。

> Fork Awesome CSS 由 `_partial/head.ejs` 通过 `css('https://cdn.jsdelivr.net/npm/fork-awesome@1.2.0/css/fork-awesome.min.css')` 引入。
> 离线时图标缺失可接受（字体栈兜底），不阻塞构建。

---

## 5. 字体与自托管 webfont

### 5.1 三个字体角色（v2）

```
--font-display: "Archivo Black", "Inter", "PingFang SC", "Microsoft YaHei",
                "Hiragino Sans GB", "Noto Sans SC", system-ui, sans-serif;
--font-body:    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
                "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", Roboto,
                "Helvetica Neue", Arial, sans-serif;
--font-mono:    "JetBrains Mono", "Cascadia Code", "Cascadia Mono", "JetBrains Mono",
                "JetBrainsMono Nerd Font", "Fira Code", "Fira Mono", "Source Code Pro",
                "IBM Plex Mono", "Roboto Mono", "Hack", "Inconsolata", "Victor Mono",
                "Anonymous Pro", "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas,
                "Liberation Mono", "DejaVu Sans Mono", "Ubuntu Mono", "Noto Sans Mono",
                "Sarasa Mono SC", "Sarasa Fixed SC", "Noto Sans Mono CJK SC",
                "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB",
                ui-monospace, monospace;
```

> v1 的 `--font-serif` / `--font-sans` **已废弃**。v2 是「超粗无衬线标题 + 中性无衬线正文 +
> 等宽小标签」，不再用衬线。`appearance.serif_font` 作为 `body_font` 的兼容别名保留。

### 5.2 自托管 webfont（`source/fonts/` + `source/css/fonts.css`）

主题自带 7 个 woff2（latin 子集，合计约 155 KB），**不依赖任何 CDN**：

| 文件 | 角色 | 字体 / 字重 |
| --- | --- | --- |
| `archivo-black-400.woff2` | `--font-display` | Archivo Black 400 |
| `inter-{400,500,600}.woff2` | `--font-body` | Inter 400 / 500 / 600 |
| `jetbrains-mono-{400,500,700}.woff2` | `--font-mono` | JetBrains Mono 400 / 500 / 700 |

- `fonts.css` 必须**第一个**引入（在 `variables.css` 之前），里面是 7 条 `@font-face`：
  相对路径 `url("../fonts/xxx.woff2")`、`font-display: swap`、
  以及 fontsource 的 latin `unicode-range`（三款共用同一段，见文件内注释）。
- `unicode-range` 让浏览器对中文**直接跳过**这些拉丁子集，由栈尾系统 CJK 字体承接。
- 全部为 **SIL OFL 1.1**；来源、版本、许可证见 `source/fonts/LICENSES.txt`。
- 三个角色名都可在 `appearance.display_font / body_font / mono_font` 里改；
  `appearance.webfont: none` 时 `head.ejs` 不引入 `fonts.css`，只用系统字体。

### 5.3 代码等宽栈的三条硬约定（v1.4 起，继续有效）

1. 栈里全是**各平台出厂自带或 IDE 自带的等宽字体**，本地取用 → 无 FOUT、不重排。
2. **CSS 必须显式给代码块声明 `font-family: var(--font-mono)`。**
   Hexo 高亮产物是裸 `<pre><span class="line">`，**没有 `<code>` 元素**，
   只给 `.monish-prose code` 声明等于没管代码块 —— 它会掉到浏览器默认的 `monospace`。
   至少要覆盖 `.monish-prose pre`、`.highlight pre`、`.highlight td.gutter pre`。
3. 代码块里的**中文注释**靠栈尾 CJK 字体兜底；中文不吃 webfont（无 CJK 字形）。

---

## 6. i18n 键（`languages/*.yml`）

模板只允许出现以下 `__()` 键（至少 `zh-CN`、`en`、`zh-TW`、`ja` 四份；其余语言缺失时 Hexo 回退 default）。
**v1.3（共 61 键，四份语言包键集合必须与此完全一致）**。

```
home  archives  categories  category  tags  tag  about  friends
latest_posts  all_posts  no_posts  read_more  scroll_down  back_to_top
posted_on  updated_on  reading_time  minutes  words  word_count
prev_post  next_post  toc  toc_empty  share  comment  comments  no_comment
search  search_placeholder  search_empty  search_results
powered_by  theme  theme_light  theme_dark  theme_auto  mode_switch  rss
menu  close  expand  copied  copy  not_found  not_found_desc  back_home
page  pages  total_posts  site_running  topics  author  copyright  published
prev_page  next_page  more
skip_to_content  sidebar  license_note
```

> v1.1 变更（Lead 通知）：新增 `no_posts` / `rss` / `pages` / `topics`；
> `site_running` 改为带一个 `%s`（如 `已运行 %s 年`）；`total_posts` 改为计数单位
> （如 `篇文章`，模板输出形如 `12 篇文章`）；移除 `collapse` /
> `copy_code` / `license` / `days`。
>
> v1.2 变更（Lead 通知）：补充模板已在用的 `skip_to_content`（跳到主要内容）、
> `sidebar`（侧栏 aria-label）、`license_note`（版权声明小字）。
>
> v1.3 变更（Lead 决定，回应 lang-docs 冲突 1）：**恢复 `expand`**
> （灯箱 aria-label，zh-CN 放大 / en Expand / zh-TW 放大 / ja 拡大）。
> 合计 **61 键**（57 + 3 + 1），由 `test/theme-unit-smoke.mjs` 实测校验。

键值示例（`zh-CN`）：
```yaml
home: 首页
archives: 归档
latest_posts: 最新文章
no_posts: 暂无文章
read_more: 阅读全文
scroll_down: 向下浏览
reading_time: 阅读时长
minutes: 分钟
total_posts: 篇文章
site_running: 已运行 %s 年
powered_by: 由 %s 强力驱动
```

`powered_by` / `site_running` / `page` 等带参键用 `__('powered_by', 'Hexo')` 调用
（`util.format` 风格，`site_running`、`page` 同理带一个 `%s`）；
`total_posts` / `words` / `minutes` 等是计数单位，由模板与数字直接拼接。

---

## 7. JS 行为契约（`source/js/monish.js`，vanilla，无依赖）

暴露 `window.Monish`：

| API | 说明 |
| --- | --- |
| `Monish.theme.get()` | 返回 `'auto' \| 'light' \| 'dark'`（读 `localStorage.monish-theme`） |
| `Monish.theme.set(mode)` | 写 localStorage + `<html data-theme>` + `data-theme-mode`，同步切换按钮 `data-mode` / 文案 |
| `Monish.theme.toggle()` | 在 `auto → light → dark → auto` 间循环 |
| `Monish.theme.apply()` | 仅应用当前存储值 |
| `Monish.toast(msg)` | 轻提示（用于“已复制”） |

初始化顺序（`DOMContentLoaded`）：
1. `theme.apply()`
2. `<html>.classList.add('hero-ready')`
3. header 滚动监听（`is-scrolled`）、阅读进度（`#progress-bar`）、返回顶部（`#back-to-top`）
4. `[data-reveal]` 的 IntersectionObserver（无 IO 时直接加 `.is-revealed`）
5. 目录高亮 + `#post-toc-toggle` 折叠
6. 代码复制按钮（追加进 `.code-toolbar`；无工具条时退回 `figure.highlight` 或 `<pre>`）
7. lightbox
8. 搜索（`features.search` 为 true 时才输出搜索界面）

`<head>` 内联阻塞脚本（防 FOUC，必须内联、必须在样式表之前）：
```js
(function(){try{var m=localStorage.getItem('monish-theme')||'auto';
var d=m==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;
var e=document.documentElement;e.setAttribute('data-theme-mode',m);
if(m!=='auto')e.setAttribute('data-theme',m);else e.setAttribute('data-theme',d);}catch(e){}})();
```
> 注意：`auto` 时**同时**写解析后的 `data-theme`（保证 CSS 单一分支生效）与
> `data-theme-mode="auto"`（保证 JS/样式能区分“自动”）。系统主题变化时由 JS 监听
> `matchMedia` 变更重新解析。
> 因此 CSS 的自动分支可以只用 `html[data-theme="dark"]`，无需媒体查询——但为
> 无 JS 场景，CSS 仍需保留 `@media (prefers-color-scheme: dark)` 作为兜底
> （用 `html:not([data-theme])` 限定，避免与显式选择冲突）。

---

## 8. 验收标准（Definition of Done）

1. `npx hexo clean && npx hexo generate` 在 `theme: monish` 下 0 报错、0 警告（除已知离线字体警告）。
2. `public/index.html` 含 `.hero`、`.hero-title`、`.hero-subtitle`、`#latest-posts`、`.post-card`。
3. `public/index.html` 的 `<html>` 在无 JS 时仍为浅色、可读；有 JS 时按 localStorage 生效。
4. 文章页含 `.post-toc`（有标题时）、`.post-content.monish-prose`、`.post-nav`、`.post-copyright`。
5. 归档 / 分类 / 标签页生成成功，`.archive-list` 或 `.post-list` 存在。
6. `languages/zh-CN.yml` 与 `en.yml` 键集合一致（由 `test/theme-unit-smoke.mjs` 校验）。
7. 首屏：标题/副标题淡入 + 短距离上浮；`#hero-scroll` 平滑滚动到 `#latest-posts`。
8. 浅色 / 深色 / 自动三态可切换且刷新后保持；`prefers-color-scheme` 生效。
9. 桌面 / 移动端（≤768px）无横向滚动、导航可用。
10. 所有 `.monish-prose` 元素（标题、段落、列表、引用、表格、代码、图片）都有样式。

---

## 9. CSS 文件清单（v2：11 个，文件名冻结）

全部为**纯 CSS**（Hexo 直接拷贝，不经预处理器）。`head.ejs` 按此顺序引入：

| # | 文件 | 内容 |
| --- | --- | --- |
| **0** | `source/css/fonts.css` | **7 条 `@font-face`（§5.2）**，必须最先引入 |
| 1 | `source/css/variables.css` | §2 全部设计令牌；`:root` 浅色、`html[data-theme="dark"]` 深色、`@media (prefers-color-scheme: dark)` 兜底（限定 `html:not([data-theme])`） |
| 2 | `source/css/base.css` | reset / `box-sizing` / 滚动条 / `body` 排版 / 标题 / 链接 / 选中态 / `.no-scroll` / `.is-hidden` / `.sr-only` / `:focus-visible` / `[data-reveal]` / `.is-revealed` / 打印 |
| 3 | `source/css/shell.css` | **v2 新增**：`.shell`（大圆角白卡）/ `.rail` / `.rail-top` / `.rail-slogan` / `.rail-author` / `.author-avatar` / `.author-name` / `.rail-bottom` / `.rail-nav` / `.rail-link` / `.rail-utils` / `.util-btn` / `.main`（含左侧竖分隔线）/ `.scroll-track` / `.scroll-thumb` / `.skip-link` / 移动顶栏与 `.nav-backdrop` / `.nav-drawer` / `.drawer-link` |
| 4 | `source/css/hero.css` | `.hero`（仅 `layout: full/center/banner` 用）/ `.hero-bg` / `.hero-overlay` / `.hero-inner` / `.hero-title` / `.hero-subtitle` / `.hero-meta` / `.hero-scroll` / `.hero-particles` / `hero-ready` 入场动画 |
| 5 | `source/css/post-list.css` | `.post-list` / `.post-row` / `.post-row-date` / `.date-month` / `.date-day` / `.post-pill` / `.post-pill-title` / `.post-pill-excerpt` / `.tag-chip` / `.meta-item` / `.pagination` / `.page-number` / `.extend` / `.empty-state` |
| 6 | `source/css/page.css` | `.card` / `.card-head` / `.post-date` / `.card-title` / `.card-meta` / `.card-body` / `.card-foot` / `.archive-groups` / `.archive-group*` / `.term-card*` / `.term-index*` / `.tagcloud*` / `.breadcrumb*` / `.btn*` / **404 独立整页 `.error-page` / `.error-home` / `.error-heading` / `.error-code` / `.error-title` / `.error-desc` / `.error-links` / `.error-link`** |
| 7 | `source/css/post.css` | `.post-toc*` / `.monish-prose` 全量正文排版 / `.highlight` 代码块（`.code-toolbar` / `.code-language` / **`.code-scroll` 横向滚动容器** / 行号槽 `td.gutter`（sticky）/ `--hl-*` 令牌着色）/ `.code-copy` / `.post-copyright` / `.post-nav` / `.comments` |
| 8 | `source/css/footer.css` | `.site-footer` / `.footer-inner` / `.footer-copyright` / `.footer-powered` / `.footer-theme-name` / `.footer-icp` / `.back-to-top` |
| 9 | `source/css/extras.css` | `.lightbox*` / `.search-box` / `.search-field` / `.search-input` / `.search-results` / `.search-result-*` / `.search-mask` / `.toast` |
| 10 | `source/css/responsive.css` | 全部媒体查询：`≤1200px` / `≤900px`（rail 折叠）/ `≤768px` / `≤480px`；抽屉、单列、表格横向滚动、`@media print` |

约束：
- 只使用 §2 变量名，禁止硬编码颜色（`currentColor`、`transparent`、`inherit`、`#fff`/`#000` 底衬除外）。
- 禁止 `!important`（除非覆盖第三方内联样式并在注释中说明原因）。
- 禁止依赖未在 §3 出现的 class / id。
- 深色令牌只能定义一次，其余处复用。
- **所有宽度（320 / 375 / 480 / 768 / 900 / 992 / 1200 / 1440）都不得横向滚动。**
- v1 遗留类名（`.site-header` / `.container` / `.layout-2col` / `.sidebar-col` / `.post-card*` /
  `.section-head` / `.latest-posts` / `.page-hero`）在 v2 不再使用，**CSS 里不要再为它们写规则**。
