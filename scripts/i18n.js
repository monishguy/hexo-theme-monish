'use strict';

/**
 * 把主题语言包转成普通对象，供模板 helper 使用。
 *
 * Hexo 8 只在渲染某篇文章时把 `__` / `_p` 注入模板 locals（见 hexo 的
 * i18n filter）：带 zh-CN front-matter 的文章拿到中文，没带 lang 的页面
 * 可能拿到 default。为了让主题所有页面语言一致，这里直接读取
 * `hexo.theme.i18n` 的语言数据，自己按站点 language 顺序合并。
 */

const LANGUAGE_ALIAS = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-hant': 'zh-TW',
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  ja: 'ja',
  'ja-jp': 'ja',
  ko: 'ko',
  'ko-kr': 'ko',
  fr: 'fr',
  'fr-fr': 'fr'
};

function languageList(hexo) {
  const configured = hexo.config && hexo.config.language;
  const list = Array.isArray(configured) ? configured.slice() : [configured];
  list.push('default');

  const out = [];
  list.forEach((name) => {
    if (!name) return;
    const value = String(name);
    [value, LANGUAGE_ALIAS[value], LANGUAGE_ALIAS[value.toLowerCase()]].forEach((candidate) => {
      if (candidate && out.indexOf(candidate) < 0) out.push(candidate);
    });
  });
  return out;
}

function buildStore(hexo) {
  const store = {};
  const i18n = hexo.theme && hexo.theme.i18n;
  if (!i18n || typeof i18n.get !== 'function') return store;

  languageList(hexo).forEach((name) => {
    let data;
    try {
      data = i18n.get(name);
    } catch (error) {
      data = undefined;
    }
    if (!data) return;
    if (typeof data.toObject === 'function') {
      const plain = data.toObject();
      Object.keys(plain).forEach((key) => {
        if (!(key in store)) store[key] = plain[key];
      });
      return;
    }
    if (typeof data === 'object') {
      Object.keys(data).forEach((key) => {
        if (!(key in store)) store[key] = data[key];
      });
    }
  });
  return store;
}

module.exports = { buildStore, languageList };
