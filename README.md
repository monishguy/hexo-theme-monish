# monish

> 以 Hexo 官方 [landscape](https://github.com/hexojs/hexo-theme-landscape) 为骨架重写的 **v2「纸卡」** 主题。
> 浅灰画布上一张超大圆角白卡，左栏超粗大标题 + 等宽导航，右栏白色药丸文章列表；
> 超粗无衬线标题 / 中性无衬线正文 / 打字机等宽小标签，**自托管 webfont**，零外链字体。
> 支持 **浅色 / 深色 / 自动** 三种模式。

- 主题目录：`themes/monish`
- 接口契约（class / CSS 变量 / i18n 键表的唯一真相）：[`DESIGN-CONTRACT.md`](./DESIGN-CONTRACT.md)
- 自检脚本：`node themes/monish/test/theme-unit-smoke.mjs`

---

## 目录

- [特性](#特性)
- [环境要求](#环境要求)
- [安装](#安装)
  - [方式 A：git clone 到 themes/（推荐）](#方式-agit-clone-到-themes推荐)
  - [方式 B：从 GitHub 直接装入 node_modules（一条命令）](#方式-b从-github-直接装入-node_modules一条命令)
  - [方式 C：直接把整个目录复制过去（Windows PowerShell）](#方式-c直接把整个目录复制过去windows-powershell)
- [不干扰当前主题的预览构建](#不干扰当前主题的预览构建)
- [站点配置](#站点配置)
- [主题配置逐项说明](#主题配置逐项说明)
- [字体](#字体)
- [动效](#动效)
- [404 页面](#404-页面)
- [三种主题模式](#三种主题模式)
- [i18n 多语言](#i18n-多语言)
- [前端 API（window.Monish）](#前端-apiwindowmonish)
- [目录结构](#目录结构)
- [自检与开发](#自检与开发)
- [常见问题](#常见问题)
- [License](#license)

---

## 特性

**版式（v2 纸卡）**

- **页面骨架**：浅灰画布 + 一张超大圆角白卡（`.shell`，圆角 44px、大范围柔和阴影）；页脚在卡片外，是一条居中等宽小字。
- **左栏 rail**：超粗无衬线大标题（Archivo Black 角色）+ 虚线圆环头像 + 作者名；底部是等宽大写导航（`首页 / 归档 / 分类 / 标签 / 关于`）与工具按钮（搜索 / 主题切换 / RSS）。桌面 `position: sticky`。
- **右栏**：一条竖分隔线把它和左栏分开；首页是**药丸文章列表**（等宽日期 `SEP 27` + 白卡标题/摘要），其它页是一张内容卡；卡片右侧内缘有**竖向滚动指示条**。
- **配色**：主体黑白灰，强调色只做点缀（链接 / hover / 激活 / 焦点环）—— 浅色 `#7FA88B`，深色 `#8FBF9F`。
- **字体**：超粗标题 / 中性正文 / 等宽小标签三个角色，全部可在配置里换；默认走**主题自带的 7 个 woff2**（latin 子集约 155 KB，零外链）。见 [字体](#字体)。

**功能**

- **三种模式**：`auto`（跟随系统）/ `light` / `dark`，用户选择写入 `localStorage`，刷新保持；`<head>` 内联脚本防 FOUC。
- **首屏两种模式**：`hero.layout: card`（默认，左栏大标题即首屏）/ `full`（全屏铺满强调色的独立首屏，下滑进入列表）/ `center` / `banner`。
- **列表页**：归档（按月 / 按年）、分类、标签，全部收进同一张内容卡，观感一致。
- **文章页**：超粗标题 + 等宽日期 / 标签 / 元信息（作者、阅读时长、字数、分类、更新日期）、目录 TOC（可折叠、滚动高亮）、上一篇/下一篇、版权声明、代码块（语言标签 + 复制按钮 + 语法着色）、图片灯箱。
- **搜索**：可选的客户端本地搜索，构建时生成 `search.json`。
- **评论**：支持 Valine / Disqus / Giscus（默认关闭）。
- **无障碍**：「跳到主要内容」、`aria-label`、`aria-current`、键盘可达、`:focus-visible`；正文与标签的灰色都按 AA 4.5:1 取值。
- **响应式**：断点 `≤1200 / ≤900 / ≤768 / ≤480`；≤900px 左栏折成吸顶顶栏 + 抽屉菜单，另含打印样式。
- **纯 CSS + vanilla JS**：11 个 CSS 文件、1 个 JS 文件，无打包步骤；只有图标字体走 CDN，离线时降级为文字而不阻塞构建。
- **i18n**：内置 `zh-CN` / `en` / `zh-TW` / `ja` 四份语言包，键集合由脚本强制一致。

---

## 不干扰当前主题的预览构建

如果你站点正用着别的主题（例如 `theme: stellar`），又想在**不改站点 `_config.yml`** 的前提下
预览 monish，用主题自带的 `_preview.yml` 覆盖：

```bash
# 输出到 public-monish/，不碰 public/，也不改 theme 设置
npx hexo generate --config _config.yml,themes/monish/_preview.yml

# 起预览服务（4100 端口）
npx hexo server -p 4100 --config _config.yml,themes/monish/_preview.yml
```

自检脚本会自动优先检查 `public-monish/`（存在时），所以站点切回别的主题后
`node themes/monish/test/theme-unit-smoke.mjs` 依然检查的是 monish 的产物。

---

## 环境要求

| 项目 | 要求 |
| --- | --- |
| Hexo | `>= 6.0.0`（主题 `package.json` 声明；本仓库实测 8.1.2） |
| Hexo 渲染器 | `hexo-renderer-ejs`、`hexo-renderer-marked` |
| Node.js | `>= 14.0.0`（主题 `package.json` 的 `engines`），推荐 18+ |
| 其它插件（可选） | `hexo-generator-index` / `-archive` / `-category` / `-tag`，`hexo-server`，`hexo-deployer-git` |

主题自带的 `package.json` 只声明元数据与 `npm test`（跑自检脚本），**没有任何运行时依赖**，
因此不需要在主题目录执行 `npm install`。

---

## 安装

> **当前状态**：主题**尚未发布到 npm registry**，所以 `npm install hexo-theme-monish`
> 现在还不可用。请用下面的 git 方式安装。

### 方式 A：git clone 到 themes/（推荐）

```bash
cd your-hexo-site/themes
git clone https://github.com/monishguy/hexo-theme-monish.git monish
```

想锁定某个版本就加 `--branch`：

```bash
git clone --branch v2.0.0 --depth 1 https://github.com/monishguy/hexo-theme-monish.git monish
```

也可以直接下载 Release 压缩包解压到 `themes/monish`：

<https://github.com/monishguy/hexo-theme-monish/releases>

### 方式 B：从 GitHub 直接装入 node_modules（一条命令）

Hexo 会先找 `themes/<theme 名>`，找不到就回退到 `node_modules/hexo-theme-<theme 名>`
（见 hexo 的 `load_config.js`）。而 `npm` 支持从 GitHub 拉取，装出来的目录名正好是
`hexo-theme-monish`，所以下面这条命令能让 Hexo 的回退解析命中：

```bash
cd your-hexo-site
npm install github:monishguy/hexo-theme-monish
```

```yaml
# your-hexo-site/_config.yml
theme: monish        # 注意：不带 hexo-theme- 前缀
```

> ⚠️ 部分环境把 npm 的 git/remote 类型依赖禁掉了（报 `EALLOWGIT` / `EALLOWREMOTE`），
> 这时请改用方式 A。可以用 `npm config get allow-git` 确认自己的策略。

### 方式 C：直接把整个目录复制过去（Windows PowerShell）

```powershell
Copy-Item -Recurse -Force .\themes\monish D:\your-hexo-site\themes\monish
```

> `themes/monish` 的优先级**高于** `node_modules/hexo-theme-monish`：
> 想改主题就放 `themes/`，想跟着上游走就只留 `node_modules` 那份。

### 之后：启用并构建

**站点根目录**的 `_config.yml`（不是主题自己的那份）：

```yaml
# your-hexo-site/_config.yml
theme: monish
language: zh-CN
```

```bash
npx hexo clean
npx hexo generate
npx hexo server          # 默认 http://localhost:4000
```

4）部署（需已配置 `hexo-deployer-git`）：

```bash
npx hexo clean && npx hexo generate && npx hexo deploy
```

> `themes/monish/_config.yml` 修改后**不需要**重启 `hexo server`；
> 但 `languages/*.yml` 是构建期解析的，改完语言包要重新 `hexo generate`。

---

## 站点配置

主题大部分信息会**回退到站点 `_config.yml`**。以本站为例：

```yaml
# your-hexo-site/_config.yml
title: 捣蒜小站
subtitle: ''
description: ''
keywords:
author: MonishGuy
language: zh-CN
timezone: ''
url: http://www.monishguy.tech     # 影响 url_for / 绝对链接，务必正确
root: /
permalink: :year/:month/:day/:title/
theme: monish
```

主题配置项留空时的回退顺序：

| 主题配置 | 回退到 |
| --- | --- |
| `site.title` | 站点 `title` → `Hexo` |
| `site.subtitle` | 站点 `subtitle` → 站点 `description` |
| `site.description` | 站点 `description` |
| `site.keywords` | 站点 `keywords` |
| `site.author` | 站点 `author` |
| `hero.slogan` | `site.title` |
| `hero.subtitle` | `site.subtitle` |
| `author_card.name` | `site.author` |
| `footer.since` | 自动取最早一篇文章的年份 |

---

## 主题配置逐项说明

以下全部在 `themes/monish/_config.yml` 中修改。**留空即回退**，不填也不会报错。

### `site` —— 站点信息

```yaml
site:
  title:            # 留空取站点 config.title
  subtitle:         # 留空取站点 config.subtitle / config.description
  description:      # 留空取站点 config.description
  keywords:         # 留空取站点 config.keywords
  author:           # 留空取站点 config.author
```

### `hero` —— 首页首屏

```yaml
hero:
  enable: true
  layout: card            # card | full | center | banner
  background: accent      # accent | image
  background_image:       # layout: banner 且 background: image 时使用，如 /images/hero.jpg
  overlay: 0.18           # 背景图遮罩强度 0~1（仅 background: image 时生效）
  slogan:                 # 首屏主标题，留空回退 site.title
  subtitle:               # 首屏副标题，留空回退 site.subtitle
  scroll_hint: true       # 是否显示「向下浏览」提示
  scroll_hint_text:       # 留空使用语言包 scroll_down
  height: 100svh          # 首屏高度（仅独立首屏布局用）
  particles: false        # 睡莲光斑装饰
```

| 键 | 可选值 / 默认 | 说明 |
| --- | --- | --- |
| `enable` | `true` | `card` 模式下它控制大标题是否显示；其它模式控制是否输出独立首屏 |
| `layout` | `card`（默认） \| `full` \| `center` \| `banner` | **`card`**：不渲染独立首屏，左栏那块超粗大标题就是首屏主角（v2 纸卡风格）。**`full`**：全屏铺满强调色的独立首屏，下滑进入列表（此时左栏大标题由 CSS 隐藏）。`center` / `banner`：较矮的首屏，适合配图，不显示下滑提示 |
| `background` | `accent` \| `image` | `image` 时用 `background_image` 铺底 |
| `background_image` | 路径 | 建议放 `source/images/` 下，写站点绝对路径 `/images/hero.jpg` |
| `overlay` | `0.18` | 遮罩强度，值越大背景图越暗/字越清晰 |
| `slogan` / `subtitle` | 文本 | 独立首屏的主/副标题；`slogan` 同时是 `card` 模式下左栏大标题的文案（空则回退 `site.title`） |
| `scroll_hint` | `true` | 下滑提示，点击平滑滚动到 `#latest-posts` |
| `scroll_hint_text` | 文本 | 覆盖语言包 `scroll_down` |
| `height` | `100svh` | 独立首屏的高度；桌面等价 `100vh`，移动端 `svh` 可避开地址栏抖动 |
| `particles` | `false` | 光斑装饰（纯 CSS + 轻量 JS） |

### `nav` —— 顶部导航

```yaml
nav:
  enable: true
  sticky: true            # 滚动时吸顶
  home: true              # 菜单最前插入「首页」
  menu:                   # 名称: 路径（名称写语言包键名或自定义文字）
    archives: /archives/
    categories: /categories/
    tags: /tags/
    about: /about/
  rss: /atom.xml          # 留空则不显示 RSS 图标
```

- `menu` 的**键名**会被当作语言包键名翻译（如 `archives` → 「归档」）；找不到的键原样输出，也可以直接写中文名。
- `rss` 填 `config.feed` 的地址（常见为 `/atom.xml` 或 `/rss2.xml`）。

### `posts` —— 首页最新博文

```yaml
posts:
  section_title:          # 留空使用语言包 latest_posts
  excerpt_length: 120     # 摘要字数；0 = 只用 <!-- more --> 之前的内容
  show_cover: true        # 卡片是否显示封面
  show_categories: true
  show_tags: false
  show_readmore: true
  readmore_text:          # 留空使用语言包 read_more
  date_format: MMM D, YYYY
  card_min_width: 300px   # 响应式栅格卡片最小宽度
  columns: 3              # 大屏列数 1~4
```

### `author_card` —— 作者（左栏头衔 + 信息浮层）

左栏那块「虚线圆圈头像 + 名字」。**点击名字会弹出一个信息浮层**，里面按 `links` 的顺序
列出站点作者想公开的社交信息（GitHub / B站 / QQ……一个或多个都行）。

```yaml
author_card:
  enable: true
  avatar:                 # 头像图片路径，如 /images/avatar.png；留空 = 虚线圆环 + 名字首字母
  name:                   # 留空回退 site.author
  description:            # 浮层里名字下方的一句话简介，留空不显示
  links:                  # 图标键: 值 —— 至少填一项，名字才会变成可点的按钮
    github: https://github.com/monishguy
    bilibili: https://space.bilibili.com/000000
    zhihu: https://www.zhihu.com/people/your-name
    qq: 10001             # 普通文本 → 渲染成「图标 + 名称 + 值」的只读行
    mail: mailto:hi@example.com
```

| 值的形态 | 渲染结果 |
| --- | --- |
| `http(s)://…` 或 `//…` | 新窗口打开的链接（自动带 `target="_blank" rel="noopener"`） |
| `mailto:…` | 邮件链接 |
| 其它任意文本（`10001`、微信号…） | 只读行，值右对齐显示 |

> `links` 全空时，名字只是普通文字、不弹层 —— 这是刻意的：一个点不开的按钮比没有按钮更糟。

**换头像**：把图片放进站点的 `source/images/`，然后 `avatar: /images/avatar.png`。
不填就用虚线圆环 + 名字首字母（首字母取自 `name` → `site.author` → `site.title`）。

图标键支持：`github` `mail`/`email` `twitter` `weibo` `zhihu` `bilibili` `rss`
`link`/`website` `telegram` `qq` `wechat` `instagram` `youtube` `stack-overflow`
`codepen` `gitlab` `linkedin` `facebook` `douban` `steam` `mastodon` 等，未知键回退链接图标。

### `footer` —— 页脚

```yaml
footer:
  since:                  # 留空自动取最早文章年份
  copyright:              # 自定义版权文案，支持 HTML；留空使用 © 年份 作者
  powered: true           # 是否显示「由 Hexo 驱动」
  icp:                    # 备案号，留空不显示
  icp_link: https://beian.miit.gov.cn/
  links:                  # 名称: 路径
    archives: /archives/
    tags: /tags/
```

### `sidebar` —— 侧栏（v2 已停用）

> **v2 纸卡风格不再有左右侧栏**：桌面固定是「左栏站点身份（`.rail`）+ 右栏内容卡」，
> 模板不再渲染 `.sidebar-col` / `.widget*`，CSS 也一条相关规则都没有。
> 下面这些键保留**仅为兼容旧配置**，改它们不会有任何效果。

```yaml
sidebar:
  enable: false           # v2 无效，保留键位
  position: right         # left | right
  widgets:                # author | category | tag | tagcloud | archive | recent_posts
    - author
    - category
    - tag
    - recent_posts
  recent_posts_limits: 5
```

### `post` —— 文章页

```yaml
post:
  toc: true               # 目录
  toc_depth: 3            # 目录最大层级
  excerpt_link:           # 「阅读更多」链接文案，留空不显示
  copyright: true         # 版权声明
  updated: true           # 显示更新日期
  word_count: true        # 显示字数
  reading_time: true      # 显示阅读时长
  reward:                 # 打赏二维码图片路径，留空不显示
  prev_next: true         # 上一篇 / 下一篇
  related: false          # 相关文章
  related_limits: 3
  excerpt_link_icon: true  # 预留（当前模板未使用）
  comments:
    enable: false
    system: valine        # valine | disqus | giscus
    valine:
      enable: false
      appId:
      appKey:
      placeholder:
      lang: zh-cn
    disqus_shortname:
    giscus:
      repo:
      repo_id:
      category:
      category_id:
      mapping: pathname
      lang: zh-CN
```

- `toc` 只在正文存在 `h2`/`h3`（受 `toc_depth` 限制）时才有内容。
- 评论三种系统互斥，只需填对应那一组；`enable: false` 时整段不输出。

### `archive` —— 归档页

```yaml
archive:
  type: monthly           # monthly | yearly
  show_count: true        # 显示每组文章数
```

### `appearance` —— 外观

```yaml
appearance:
  default_mode: auto      # auto | light | dark（首次访问的默认模式）
  accent: "#7FA88B"       # 强调色：黑白灰版式里的点缀（链接 / hover / 激活 / 焦点环）
  accent_dark: "#8FBF9F"  # 深色模式强调色
  radius: 44px            # 大卡片圆角（--radius-card）

  # 字体三角色，留空用内置默认值
  display_font:           # 超粗标题，默认 "Archivo Black"
  body_font:              # 正文，默认 "Inter"
  mono_font:              # 等宽小标签 / 代码，默认 "JetBrains Mono"

  # webfont 交付：local（主题自带 woff2，默认）| none（只用系统字体）| cdn（Google Fonts）
  webfont: local

  enable_transition: true # 主题切换淡入过渡
  enable_animation: true  # 入场 / 滚动动画（始终尊重 prefers-reduced-motion）
```

> `serif_font` / `code_font` 是 v1 的旧键，仍可用（分别当作 `body_font` / `mono_font`），
> 新配置请用上面三个角色名。

---

## 字体

v2 用三个字体角色，全部可换：

| 角色 | 变量 | 默认 | 用在哪 |
| --- | --- | --- | --- |
| 超粗标题 | `--font-display` | Archivo Black | 左栏大标题、文章标题、正文 h2–h6 |
| 正文 | `--font-body` | Inter | 段落、摘要、列表标题 |
| 等宽小标签 | `--font-mono` | JetBrains Mono | 导航、日期、tag、元信息、代码块 |

**自托管 webfont（`source/fonts/` + `source/css/fonts.css`）**

主题自带 7 个 woff2（latin 子集，合计约 155 KB），**不依赖任何 CDN**：

| 文件 | 角色 |
| --- | --- |
| `archivo-black-400.woff2` | `--font-display` |
| `inter-{400,500,600}.woff2` | `--font-body` |
| `jetbrains-mono-{400,500,700}.woff2` | `--font-mono` |

- 全部 **SIL OFL 1.1**，来源与版本见 [`source/fonts/LICENSES.txt`](./source/fonts/LICENSES.txt)。
- `@font-face` 带 latin `unicode-range`，浏览器对**中文直接跳过**这些字体，
  由字体栈尾部的系统 CJK 字体承接 —— 不会因为中文字形而拖慢加载。
- `font-display: swap`：字体没到位时先用回退字体显示，不出现空白。
- 想用系统字体（体积归零）：`appearance.webfont: none`；
  想走 Google Fonts：`appearance.webfont: cdn`。

**中文字形怎么办？** 这三款 webfont 都没有中文字形，中文会自动回退到字体栈里的
系统字体（微软雅黑 / 苹方 / Noto Sans CJK）。想彻底统一中文外观，把
`display_font` / `body_font` 改成你装的「思源黑体 / 霞鹜文楷」等即可。
`Archivo Black` 的 `@font-face` 声明成 `font-weight: 400 900` 区间，
所以大标题设 700 时不会出现「合成粗体」，中文回退过去也能正常加粗。

**等宽栈（代码块与等宽小标签）** 在 webfont 之后还接了一长串各平台 IDE 自带的等宽字体：

| 平台 | 实际会命中 |
| --- | --- |
| Windows | Cascadia Code（Win11 / VS 2022）→ **Consolas**（各版本自带） |
| macOS | SF Mono（随 Xcode）→ Menlo → Monaco |
| Linux | JetBrains Mono / Fira Code → DejaVu Sans Mono / Ubuntu Mono |
| 中文 | Sarasa Mono SC（更纱黑体）→ Noto Sans Mono CJK SC → 微软雅黑 / 苹方 |

> 行号槽走同一套等宽栈并额外开了 `font-variant-numeric: tabular-nums`，
> 三位数以上的行号不会左右跳。代码块必须显式声明 `font-family: var(--font-mono)` ——
> Hexo 高亮产物是裸 `<pre><span class="line">`，没有 `<code>` 元素（契约 §5.3）。

> **实现说明（改这些值时的唯一真相）**：`appearance` 里的可配值会在 `<head>` 里被
> 渲染成一组带 `--user-` 前缀的 CSS 变量（`--user-accent` / `--user-accent-dark` /
> `--user-radius` / `--user-font-serif` / `--user-font-mono`），再由
> `source/css/variables.css` 用 `var(--user-x, 默认值)` 消费成契约 §2 的设计令牌。
> 之所以绕一层，是因为注入的 `<style>` 位于 10 个主题样式表之前，同名变量会被
> 样式表覆盖 —— 所以**不要在自定义 CSS 里直接写 `--accent`，请在 `:root` 覆盖
> `--user-accent`**（或在 `_config.yml` 里改 `appearance.accent`）。

## 动效

主题的动效遵循一条原则：**只动 `transform` 和 `opacity`**（GPU 合成，不触发重排），
并且每一个动效都有 `prefers-reduced-motion` 的降级。动效令牌都在 `variables.css`：

| 令牌 | 值 | 用在哪 |
| --- | --- | --- |
| `--speed-instant` | 90ms | 按下反馈 |
| `--speed-fast` | 170ms | hover / 链接 / 标签 |
| `--speed` | 320ms | 抽屉、搜索、作者浮层、卡片抬升 |
| `--speed-medium` | 460ms | 区块滚动入场 |
| `--speed-slow` | 720ms | 首屏标题入场 |
| `--ease-out-expo` | `cubic-bezier(.16, 1, .3, 1)` | **所有「揭示」类动画的默认曲线**：快进慢出、软着陆 |
| `--ease-out-back` | `cubic-bezier(.34, 1.56, .64, 1)` | 轻微过冲，只给确认类小反馈 |
| `--ease-spring` | `linear(0, .32 8%, .79 20%, 1.03 30%, 1.01 46%, 1)` | 手写弹簧曲线。`cubic-bezier` 表达不了「过冲-落定」，`linear()` 可以 —— 小元件用它就有 JS 弹簧的手感，不必引动画库 |
| `--stagger` | 70ms | 列表错峰步长 |

具体有哪些动效：

- **滚动入场**：卡片、文章块、归档分组等带 `data-reveal` 的元素，从下方 14px 淡入上浮，
  同一组内按 `--stagger`（70ms）依次错峰。延迟按「同一父节点内第几个」算，所以首页第 30 张卡片不会等 2 秒。
- **原生滚动驱动（渐进增强）**：正文里的 `h2`–`h4`、图片、代码块、引用、表格，在支持
  `animation-timeline: view()` 的浏览器里由 CSS 直接驱动（跑在合成线程上，零 JS）；
  不支持的浏览器（如 Firefox）静默退回上一条的 IntersectionObserver 版本。
- **竖向滚动条**：滚动中滑块用 `scaleX(1.9)` 微微加宽并加深，停手 400ms 收回（iOS 手感）。
- **卡片 hover**：药丸上浮 2px + 阴影加深 + 标题转强调色。
- **正文链接**：hover 时下划线由 1px 加粗到 2px；指向外站的链接带 `↗`，hover 时右上角轻移。
- **面板**：抽屉、搜索框、作者浮层都用 `--speed` + `--ease-out-expo` 落地。
- **复制成功**：按钮用 `--ease-spring` 做一次「放大 8% → 落定」的确认反馈。
- **主题切换**：`appearance.enable_transition: true` 时颜色过渡，不闪白。

**降级**（`prefers-reduced-motion: reduce`）：所有动画/过渡收成 0.01ms，位移与缩放取消，
但**内容一律给到终态而不是隐藏** —— 避免有人看到一片空白。用 `*` 通配符兜底，新加的动效不必回来补名单。

**关闭动画**：`appearance.enable_animation: false` 会在 `<html>` 上写 `data-animation="false"`，
滚动入场与原生滚动动画全部停用（元素直接是终态）。

---

## 404 页面

`npx hexo generate` 会产出 `/404.html`，**不需要你在站点 `source/` 里加任何文件**。

界面：整屏留白，超大字号的 `404` + 本地化文案，底部是「首页 / 归档」两个入口。

「不存在的页面进 404」由**产出这个文件**来保证 —— 静态托管平台对未知路径都会返回根目录的
`/404.html`：

| 平台 | 行为 |
| --- | --- |
| GitHub Pages / Cloudflare Pages | 未知路径自动返回 `/404.html` ✅ |
| Netlify / Vercel | 同上 ✅（也可另配 `_redirects`，非必需） |
| 本地 `hexo server` | 直接访问 `/404.html` 预览 |

实现放在 `scripts/generator.js`（Hexo 生成器），而不是主题 `source/404.md` ——
主题 `source/` 里的文件只会被当**静态资源**拷贝，不渲染 markdown / front-matter，会输出未渲染的原文。

> 改这个页面的模板时注意：`layout/404.ejs` 的 front-matter 必须保留 `layout: false`。
> Hexo 给生成器路由构造 locals 时把 `layout` 默认设成 `'layout'`，不关掉会被 `layout.ejs`
> 再包一层（页面里出现两个 `<!DOCTYPE>`、并在卡片里再套一份）。

---

### `features` —— 功能开关

```yaml
features:
  search: false           # 客户端本地搜索（构建时生成 /search.json）
  lightbox: true          # 图片点击放大
  copy_code: true         # 代码块复制按钮
  back_to_top: true
  progress_bar: true      # 顶部阅读进度条
  pjax: false             # 预留，当前版本未启用
```

### `analytics` 与 `favicon`

```yaml
analytics:
  google_analytics:       # UA-XXXXXX-X / G-XXXXXXX
  gauges:                 # Gauges site id
favicon:                  # 留空则不输出 shortcut icon 链接
                          # 想启用就把图标放到站点 source/ 下，再写 /favicon.png
```

---

## 三种主题模式

主题切换脚本会在 `<html>` 上写两个属性：

| 属性 | 值 | 说明 |
| --- | --- | --- |
| `data-theme` | `light` \| `dark` | **实际生效**的明暗（`auto` 时也会按系统解析后写入，保证 CSS 单一分支生效） |
| `data-theme-mode` | `auto` \| `light` \| `dark` | 用户**选择的模式**（用于区分「自动」并显示对应图标/文案） |

### 用法一：配置默认模式

```yaml
# themes/monish/_config.yml
appearance:
  default_mode: auto     # auto 跟随系统 / light 强制浅色 / dark 强制深色
```

只影响**首次访问**；用户手动切换后由 `localStorage` 记忆，配置不再生效。

### 用法二：页面按钮切换

右上角主题按钮按 `auto → light → dark → auto` 循环，文案与图标同步更新
（`theme_auto` / `theme_light` / `theme_dark`）。选择写入 `localStorage.monish-theme`。

### 用法三：代码手动控制

```js
// 读取当前模式（'auto' | 'light' | 'dark'）
Monish.theme.get();

// 直接设置
Monish.theme.set('dark');

// 循环切换
Monish.theme.toggle();

// 把 auto 解析成实际明暗
Monish.theme.resolve('auto');   // 'light' | 'dark'

// 仅按存储值重新应用
Monish.theme.apply();

// 等价的原生写法
localStorage.setItem('monish-theme', 'light');
location.reload();
```

无 JS 时：`variables.css` 保留 `@media (prefers-color-scheme: dark)` 兜底，跟随系统；
JS 可用时以 `data-theme` 为准。若要去掉「刷新闪烁」，**不要**删除 `_partial/head.ejs`
里的内联引导脚本，也不要把它移到样式表之后。

清空记忆并回到配置默认值：

```js
localStorage.removeItem('monish-theme');
```

---

## i18n 多语言

### 语言包位置与规则

```
themes/monish/languages/
├── zh-CN.yml
├── en.yml
├── zh-TW.yml
└── ja.yml
```

站点 `_config.yml` 的 `language: zh-CN` 决定加载哪一份；缺失时依次回退
主题 `default` → `en` → `scripts/helpers.js` 内置兜底 `FALLBACK` → 键名本身。

**硬约束**：四份语言包的键集合必须完全一致，键表由
[`DESIGN-CONTRACT.md`](./DESIGN-CONTRACT.md) §6 冻结（当前 **v1.3 = 61 键**）。
`en.yml` 等文件里的注释行、空行、键顺序都不影响解析，但**不要增删键**。

### 键表速查

权威键表就是 `DESIGN-CONTRACT.md` §6 代码块本身。需要机器可读清单时：

- 直接看 §6（当前 v1.3，61 键）；
- 或跑 `node themes/monish/test/theme-unit-smoke.mjs`，`(c)` / `(d)` 会打印实测键数，
  解析逻辑在脚本的 `parseContractKeys()` 里，可以直接复用。

### 在模板里调用

```ejs
<%= monish_t('archives') %>                         <%# 普通键 %>
<%= monish_t('powered_by', 'Hexo') %>               <%# 带 %s 的键，按顺序替换 %>
<%= monish_t('site_running', 5) %>                  <%# zh: 已运行 5 年 %>
```

带参数的键只有三个：`powered_by`、`site_running`、`page`（都是单个 `%s`）。
`total_posts`、`words`、`minutes` 是**计数单位**，由模板与数字拼接（如 `12 篇文章`）。

### 覆盖单条文案（不改语言包）

```yaml
# themes/monish/_config.yml
hero:
  scroll_hint_text: 往下看看
posts:
  section_title: 近期随笔
  readmore_text: 继续阅读
```

### 新增一门语言

```bash
# 1) 复制一份现成语言包（键不要动，只改冒号右边的值）
cp themes/monish/languages/en.yml themes/monish/languages/ko.yml

# 2) 站点 _config.yml 指定语言
#    language: ko

# 3) 重新构建并自检
npx hexo clean && npx hexo generate
node themes/monish/test/theme-unit-smoke.mjs
```

只支持 `zh-CN` / `en` / `zh-TW` / `ja` 以外的语言时，页面其余部分仍可用；
未翻译的键会走 `FALLBACK` 英文兜底。

---

## 前端 API（window.Monish）

`source/js/monish.js` 为 vanilla JS，不依赖任何库，暴露：

| API | 说明 |
| --- | --- |
| `Monish.theme.get()` | 返回 `'auto' \| 'light' \| 'dark'`（读 `localStorage.monish-theme`） |
| `Monish.theme.set(mode)` | 写入存储 + `<html data-theme>` + `data-theme-mode`，同步按钮状态与文案 |
| `Monish.theme.toggle()` | 按 `auto → light → dark → auto` 循环 |
| `Monish.theme.resolve(mode)` | 把模式解析为实际明暗 `'light' \| 'dark'` |
| `Monish.theme.apply()` | 仅应用当前存储值 |
| `Monish.toast(msg)` | 轻提示（复制成功等） |
| `Monish.config` | 运行时功能开关（`search` / `lightbox` / `copyCode` / `animation`，读自 `<body data-*>`） |

其它约定（模板与 CSS 依赖，勿随意改动）：

- `hero-ready`、`monish-ready` 加在 `<html>`；`is-scrolled` 加在 `#site-header`；
  `is-revealed` 加在 `[data-reveal]` 元素；`is-lightbox-open` 加在 `<body>`。
- 状态类与 class 清单见 `DESIGN-CONTRACT.md` §3。

---

## 目录结构

```
themes/monish/
├── _config.yml                  # 主题配置（唯一配置真相）
├── DESIGN-CONTRACT.md           # 模板 / 样式 / 脚本 三方接口契约
├── README.md                    # 本文档
├── _preview.yml                 # 不干扰站点当前主题的预览构建配置
├── languages/                   # 语言包（4 份，键集合强制一致）
│   ├── zh-CN.yml  en.yml  zh-TW.yml  ja.yml
├── layout/                      # EJS 模板
│   ├── layout.ejs               # 全站外壳（.shell / .rail / .main / 滚动轨道）
│   ├── index.ejs  post.ejs  page.ejs  404.ejs
│   ├── archive.ejs  archive-detail.ejs  category.ejs  tag.ejs
│   └── _partial/                # head / rail / mobile-drawer / hero
│                                # post-list / post-pill / archive-list
│                                # category-list / tag-list / footer
│                                # after-footer / analytics / comments
│                                # lightbox / search
├── scripts/
│   ├── helpers.js               # Hexo helper + 构建期 filter（搜索索引 / 代码块语言标签）
│   ├── generator.js             # 生成 /404.html（主题 source/ 里的文件不会被渲染成页面）
│   └── i18n.js                  # 读取主题语言包（按站点 language 合并）
├── source/
│   ├── fonts/                   # 自托管 woff2 ×7 + LICENSES.txt
│   ├── css/                     # 11 个纯 CSS 文件（文件名冻结，见契约 §9）
│   │   ├── fonts.css      variables.css  base.css    shell.css
│   │   ├── hero.css       post-list.css  page.css    post.css
│   │   └── footer.css     extras.css     responsive.css
│   └── js/
│       └── monish.js            # 前端脚本，暴露 window.Monish
├── test/
│   └── theme-unit-smoke.mjs     # 零依赖冒烟检查
├── package.json                 # npm 包元数据（name 必须 hexo-theme-monish）
└── LICENSE                      # MIT（自带字体为 SIL OFL 1.1，见 source/fonts/LICENSES.txt）
```

服务端 helper 一览（`scripts/helpers.js`）：

| helper | 用途 |
| --- | --- |
| `monish_config()` | 主题配置 + 站点回退，模板里统一用 `cfg.xxx` 读取 |
| `monish_t(key, ...args)` | i18n 翻译（`%s` 顺序替换；语言包缺失时回退内置英文表） |
| `monish_icon(name)` | 社交图标名 → Fork Awesome class |
| `monish_excerpt(post, len)` | 摘要（优先 `<!-- more -->`，其次按字数截断） |
| `monish_word_count(content)` | 中英混排字数 |
| `monish_reading_time(content)` | 阅读时长（分钟，空正文返回 0 表示不显示） |
| `monish_first_image(content)` | 取正文第一张图做封面 |
| `monish_feed_path()` | 站点真的会生成 feed 时才返回订阅路径，否则空串（避免 `/atom.xml` 404） |

---

## 自检与开发

```bash
# 在站点根目录（或主题目录）执行皆可，路径按脚本自身位置解析
node themes/monish/test/theme-unit-smoke.mjs

# 或者在主题目录下用 package.json 里的脚本
cd themes/monish && npm test
```

纯 Node ESM，**零外部依赖**，退出码 `0`（全部通过）/ `1`（有 FAIL）。
每项输出 `PASS` / `FAIL` / `SKIP` 一行，附缺失清单：

| 项 | 检查内容 |
| --- | --- |
| a | 主题必需目录/文件存在且非空（`_config.yml`、8 个 `layout/*.ejs`、`source/js/monish.js`、`languages/zh-CN.yml`、`DESIGN-CONTRACT.md`） |
| b | 契约 §9 的 **11 个** CSS 文件存在且非空（并在有额外 CSS 时给出提示） |
| c | `zh-CN` / `en` / `zh-TW` / `ja` 四份语言包键集合完全一致 |
| d | 语言包键集合与 `DESIGN-CONTRACT.md` §6 键表完全一致 |
| e | 首页含 `.shell` / `.rail` / `.rail-slogan` / `.post-list` / `latest-posts` / `.post-pill` / `scroll-track` / `theme-toggle`；文章页含 `.monish-prose` / `.card` / `.card-title`。**产物不存在时 SKIP，不算失败** |
| f | `layout/**/*.ejs` 中的 `theme.a.b` 与 `cfg.a.b` 配置键都能在 `themes/monish/_config.yml` 中找到 |
| g | 模板里 `monish_t()` / `__()` 用到的 i18n 键都在语言包中（单向校验：模板用到的键必须存在） |
| h | `public/index.html` 的文案语言与站点 `language` 一致 —— 防止 `monish_t()` 没命中语言包、整站落到 `scripts/helpers.js` 的英文 `FALLBACK` |

> 产物目录解析顺序：`MONISH_PUBLIC_DIR` 环境变量 → `public-monish/`（存在时）→ `public/`。
> 站点若正用别的主题，请先用 `_preview.yml` 生成 `public-monish/`，否则 (e)(h) 检查的是别人主题的 HTML。

约定：

- `DESIGN-CONTRACT.md` 是模板、CSS、JS 的**唯一接口真相**。要新增 class、CSS 变量或
  i18n 键，先改契约，再改实现 —— i18n 键表变更后必须同步四份语言包并重跑上面的脚本。
- 修改 CSS 时不要增删文件名（契约 §9 冻结），不要硬编码颜色（用 §2 令牌）。
- `(e)` / `(f)` / `(g)` / `(h)` 检查的是**构建产物与模板**，改了模板或语言包后请
  `npx hexo clean && npx hexo generate` 再重跑；只跑 `hexo generate`（不 clean）
  可能沿用旧产物/缓存，导致检查结果与源码不一致。
- 提交前建议：`npx hexo clean && npx hexo generate && node themes/monish/test/theme-unit-smoke.mjs`。

---

## 常见问题

**1. 图标不显示 / 出现方块**
图标字体 Fork Awesome 走 jsDelivr CDN；离线或被拦截时图标缺失，**不影响构建与布局**
（有字体栈兜底）。需要完全离线可把字体文件本地托管，并改 `_partial/head.ejs` 的引用。

**2. 首页没有首屏 hero**
检查 `hero.enable` 是否为 `true`；且 hero 只出现在**首页第一页**，翻页后走普通页头。

**3. 刷新时深浅色闪一下（FOUC）**
`<head>` 里的内联引导脚本必须在任何样式表之前执行。若手动改过 `_partial/head.ejs`，
请恢复其位置，或用 `appearance.enable_transition: false` 减弱过渡。

**4. 切换主题后刷新又变回去了**
主题选择存在 `localStorage.monish-theme`（`auto` / `light` / `dark`）。
浏览器隐私模式或禁用存储时不记忆，属正常。

**5. 搜索没反应**
需要 `features.search: true` 并**重新构建**（构建期生成 `/search.json`）；
且必须通过 http 访问（`hexo server`），直接双击 `file://` 打开无效。

**6. 文章页没有目录（TOC）**
需要 `post.toc: true`，且正文里有 `h2`/`h3`；层级由 `post.toc_depth` 控制。

**7. 首页没有摘要 / 摘要太长**
`posts.excerpt_length: 120` 控制截断字数；设为 `0` 则只取 `<!-- more -->` 之前的内容。
推荐在正文里手动插入 `<!-- more -->`。

**8. 中文显示成了系统默认黑体 / 标题不够粗**
三款自带 webfont（Archivo Black / Inter / JetBrains Mono）都**没有中文字形**，
中文按设计回退到字体栈里的系统字体。想统一中文外观：
```yaml
appearance:
  display_font: '"Source Han Sans SC", "PingFang SC", sans-serif'
  body_font: '"Source Han Sans SC", "PingFang SC", sans-serif'
```
`Archivo Black` 的 `@font-face` 已声明 `font-weight: 400 900`，所以中文回退过去
在 700 字重下会正确加粗、不会被合成粗体。若只想用系统字体、不要 webfont：
`appearance.webfont: none`。

**9. 评论区不显示**
`post.comments.enable: true` 且 `system` 与对应配置（`valine` / `disqus` / `giscus`）都填好。

**10. 备案号 / 页脚版权不显示**
`footer.icp` 留空则不显示备案；`footer.copyright` 留空则输出「© 年份 作者」。

**11. 改了语言包但页面没变**
语言包在**构建期**解析：改完要 `npx hexo generate`（开发中 `hexo server` 需重启或清缓存）。

**12. 为什么没有侧栏 / 侧栏配置没反应**
v2 纸卡风格没有左右侧栏，桌面固定是「左栏站点身份 + 右栏内容卡」。
`sidebar.*` 仅保留键位兼容旧配置，改它不会有任何效果。

**13. 想改强调色 / 圆角**
`appearance.accent`（浅色）与 `appearance.accent_dark`（深色）、`appearance.radius`（大卡片圆角）。
更细粒度的设计令牌见 `DESIGN-CONTRACT.md` §2。

**14. 构建报错「找不到 partial」**
说明 `layout/_partial/` 下有模板文件缺失或为空，
先跑 `node themes/monish/test/theme-unit-smoke.mjs` 看 (a)/(f) 项的缺失清单。

**15. 想要 404 页面**
Hexo 的页面（Page）只能由**站点** `source/` 生成 —— 主题的 `source/` 里放 `.md` 只会被
当成静态资源拷贝（`/404.html` 会输出未渲染的原文），所以 404 页需要放在你自己的站点里：

```bash
# 在站点根目录执行
npx hexo new page 404
```

然后编辑 `source/404/index.md`，把 front-matter 补成：

```yaml
---
title: 404
permalink: /404.html
layout: 404
comments: false
sidebar: false
---
```

主题已经内置 `layout/404.ejs`（`.not-found` / `.not-found-code` / `.btn-primary`），
只要指定 `layout: 404` 就会套用，文案取自语言包的 `not_found` / `not_found_desc` / `back_home`。
注意：`permalink` 用 `/404.html` 是为了让 GitHub Pages / Netlify / Vercel 直接识别；
本地 `hexo server` 访问 `/404.html` 同样可见。

**16. 导航菜单名还是英文（archives / categories / tags / about）**
菜单文案默认取 `nav.menu` 的键名，这是有意的（允许你写任何自定义名称）。
想让它们跟随语言包，把键名改成对应语言（或直接写中文）：

```yaml
nav:
  menu:
    归档: /archives/
    分类: /categories/
    标签: /tags/
    关于: /about/
```

站点自带的「独立页」`source/tags/index.md`、`source/categories/index.md` 无需改 front-matter：
主题在 `layout/page.ejs` 里按路径识别，会自动渲染标签云 / 分类卡片，
标题也会用语言包的 `tags` / `categories`（而不是文件里的英文 `title`）。

---

## License

- **主题代码**：MIT（全文见主题目录下的 `LICENSE`），作者 MonishGuy，
  仓库 <https://github.com/monishguy/hexo-theme-monish>。
- **文章内容**：默认按 `CC BY-NC-SA 4.0` 标注（见 `post.copyright` 与语言包 `license_note`）。
  如需改成自己的协议，修改 `themes/monish/languages/zh-CN.yml` 的 `license_note`，
  或关闭 `post.copyright` 后自行在文章里声明。
- **第三方资源**：Fork Awesome 图标字体（CDN 引入，遵循其自身许可）与 Hexo 本体（MIT）版权归各自作者。
