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
