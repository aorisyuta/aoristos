/*
  sheet.js — Google スプレッドシート（CSV 公開）からサイトのデータを読む
  - ブログ記事（type = post）
  - トップのお知らせ・販売情報（type = news）
  - SNS などのリンク（type = link）

  1 ページにつき通信は 1 回。sessionStorage に数分キャッシュしてページ移動では再取得しない。
  URL に ?data=local を付けると templates/site-data-template.csv を読む（確認用）。
*/
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var CACHE_KEY = 'aoristos-sheet-v1';

  /* ---------- CSV（RFC 4180: セル内の改行・カンマ・"" に対応） ---------- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', q = false;
    text = String(text || '').replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { q = false; }
        } else { field += c; }
      } else if (c === '"') { q = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') { field += c; }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];

    var header = rows.shift().map(function (h) { return normalizeKey(h); });
    return rows
      .filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); })
      .map(function (r) {
        var o = {};
        header.forEach(function (h, idx) { if (h) o[h] = (r[idx] == null ? '' : String(r[idx])).trim(); });
        return o;
      });
  }

  // 日本語の見出しでも動くようにする
  var KEY_ALIASES = {
    '種類': 'type', '表示': 'visible', '固定': 'pin', 'ピン': 'pin', '日付': 'date', '日時': 'date',
    'id': 'id', 'スラッグ': 'id', 'タイトル': 'title', '見出し': 'title', '説明': 'text', '概要': 'text',
    '本文': 'body', 'リンク': 'url', 'url': 'url', 'ボタン': 'link_label', 'リンク文字': 'link_label',
    '画像': 'image', 'タグ': 'tags', '著者': 'author', '筆者': 'author', 'スタイル': 'style', '色': 'style'
  };
  function normalizeKey(h) {
    var k = String(h || '').trim().replace(/^﻿/, '');
    var lower = k.toLowerCase();
    return KEY_ALIASES[k] || KEY_ALIASES[lower] || lower;
  }

  /* ---------- 値の整形 ---------- */
  function truthy(v, dflt) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === '') return dflt;
    return ['true', 'yes', '1', 'on', '○', '〇', 'はい', '表示', '公開'].indexOf(s) !== -1;
  }

  /** "2026/10/20" "2026-10-20 18:00" "2026年10月20日" などを Date（日本時間）に */
  function parseDate(s) {
    s = String(s || '').trim();
    if (!s) return null;
    var m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    var iso = m[1] + '-' + pad(m[2]) + '-' + pad(m[3]) + 'T' + pad(m[4] || '0') + ':' + (m[5] || '00') + ':00+09:00';
    var d = new Date(iso);
    return isNaN(d) ? null : d;
  }
  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  function formatDate(d) {
    if (!d) return '';
    var j = new Date(d.getTime() + 9 * 3600000); // 日本時間で表示
    return j.getUTCFullYear() + '年' + (j.getUTCMonth() + 1) + '月' + j.getUTCDate() + '日';
  }

  /** Google ドライブの共有リンクを画像として表示できる URL に変換 */
  function imageUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    var m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1600';
    return safeUrl(u);
  }

  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[\w./#?=&%-]+$/.test(u) && !/^[a-z]+:/i.test(u)) {
      // サイト内の相対パスは、トップからの位置として書けばどのページでも正しく飛ぶ
      if (/^(\/|#|\.\.?\/)/.test(u)) return u;
      return ((window.pageConfig && window.pageConfig.basePath) || '') + u;
    }
    return '';
  }

  function slugify(s, i) {
    var base = String(s || '').trim().toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '');
    return base || 'post-' + (i + 1);
  }

  /* ---------- 本文の簡易記法（HTML は書けない＝安全） ----------
     空行で段落 / ## 見出し / ### 小見出し / - 箇条書き / 1. 番号付き / > 引用
     ![説明](画像URL) / [文字](URL) / **太字** / --- 区切り線
  */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inline(text) {
    var out = esc(text);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var href = safeUrl(url.replace(/&amp;/g, '&'));
      if (!href) return label;
      var ext = /^https?:/i.test(href);
      return '<a href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
    });
    // 裸の URL もリンクに
    out = out.replace(/(^|[\s（(])(https?:\/\/[^\s<）)]+)/g, function (_, pre, url) {
      return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
    return out;
  }

  function renderBody(src) {
    var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    var html = [], para = [], list = null;

    function flushPara() {
      if (para.length) { html.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; }
    }
    function flushList() {
      if (list) { html.push('<' + list.tag + '>' + list.items.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; }
    }

    lines.forEach(function (raw) {
      var line = raw.trim();
      var m;
      if (!line) { flushPara(); flushList(); return; }
      if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
        flushPara(); flushList();
        var lv = m[1].length;
        html.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>');
      } else if (/^(-{3,}|＿{3,}|―{3,})$/.test(line)) {
        flushPara(); flushList(); html.push('<hr>');
      } else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
        flushPara(); flushList();
        var src2 = imageUrl(m[2]);
        if (src2) {
          html.push('<figure><img src="' + esc(src2) + '" alt="' + esc(m[1]) + '" loading="lazy" decoding="async">' +
            (m[1] ? '<figcaption>' + esc(m[1]) + '</figcaption>' : '') + '</figure>');
        }
      } else if ((m = line.match(/^[-・*]\s+(.*)$/))) {
        flushPara();
        if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
        list.items.push(m[1]);
      } else if ((m = line.match(/^\d+[.．)]\s+(.*)$/))) {
        flushPara();
        if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
        list.items.push(m[1]);
      } else if ((m = line.match(/^[>＞]\s?(.*)$/))) {
        flushPara(); flushList();
        html.push('<blockquote><p>' + inline(m[1]) + '</p></blockquote>');
      } else {
        flushList();
        para.push(line);
      }
    });
    flushPara(); flushList();
    return html.join('\n');
  }

  /* ---------- 取得 ---------- */
  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      var ttl = (CFG.sheetCacheMinutes || 3) * 60000;
      if (Date.now() - c.t > ttl) return null;
      return c.text;
    } catch (e) { return null; }
  }
  function writeCache(text) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), text: text })); } catch (e) { /* 容量超過などは無視 */ }
  }

  function sourceUrl() {
    var base = (window.pageConfig && window.pageConfig.basePath) || '';
    var params = new URLSearchParams(location.search);
    if (params.get('data') === 'local') return { url: base + 'templates/site-data-template.csv', cache: false };
    if (!CFG.sheetCsvUrl) return null; // シート未設定：お知らせ・ブログ・SNS は表示しない
    return { url: CFG.sheetCsvUrl, cache: true };
  }

  function build(rows) {
    var now = new Date();
    var data = { posts: [], news: [], links: [] };

    rows.forEach(function (r, i) {
      var type = String(r.type || '').trim().toLowerCase();
      if (!type || type.charAt(0) === '#') return;              // 空行・説明行
      if (!truthy(r.visible, true)) return;                     // visible = FALSE は非表示

      var date = parseDate(r.date);
      var art = artKey(r.image);
      var item = {
        id: r.id ? slugify(r.id, i) : '',
        title: r.title || '',
        text: r.text || '',
        body: r.body || '',
        url: safeUrl(r.url),
        linkLabel: r.link_label || '',
        image: art ? '' : imageUrl(r.image),
        art: art,
        tags: String(r.tags || '').split(/[,、，]/).map(function (t) { return t.trim(); }).filter(Boolean),
        author: r.author || '',
        style: String(r.style || '').trim().toLowerCase(),
        pin: truthy(r.pin, false),
        date: date,
        dateLabel: formatDate(date),
        order: i
      };

      if (type === 'post' || type === 'blog' || type === '記事' || type === 'ブログ') {
        if (date && date > now) return;                          // 予約投稿：日時になるまで出さない
        if (!item.id) item.id = slugify('', i);
        data.posts.push(item);
      } else if (type === 'news' || type === 'お知らせ' || type === '販売') {
        data.news.push(item);
      } else if (type === 'link' || type === 'sns' || type === 'リンク') {
        if (item.url) data.links.push(item);
      }
    });

    data.posts.sort(function (a, b) {
      if (a.pin !== b.pin) return a.pin ? -1 : 1;
      return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0) || a.order - b.order;
    });
    // news はシートの並び順（上の行ほど先に表示）。1件もなければ config.js の初期値
    if (!data.news.length) data.news = defaultNews();
    if (!data.links.length && CFG.fallbackLinks) data.links = CFG.fallbackLinks.slice();
    return data;
  }

  /** image 列に pdf / tshirt と書くと内蔵イラストを使う */
  function artKey(v) {
    var s = String(v || '').trim().toLowerCase();
    if (/^(pdf|部誌|book|booklet)$/.test(s)) return 'pdf';
    if (/^(tshirt|t-shirt|tシャツ|ｔシャツ|shirt)$/.test(s)) return 'tshirt';
    return '';
  }

  function defaultNews() {
    return (CFG.defaultNews || []).map(function (n, i) {
      return {
        id: '', title: n.title || '', text: n.text || '', body: '',
        url: safeUrl(n.url), linkLabel: n.linkLabel || '', image: n.image ? imageUrl(n.image) : '',
        art: n.art || '', tags: [], author: '', style: n.style || '', pin: !!n.pin,
        date: null, dateLabel: '', order: i
      };
    });
  }

  var promise = null;
  function load() {
    if (promise) return promise;
    var src = sourceUrl();
    if (!src) {
      promise = Promise.resolve({ posts: [], news: defaultNews(), links: (CFG.fallbackLinks || []).slice() });
      return promise;
    }
    var cached = src.cache ? readCache() : null;

    promise = (cached != null ? Promise.resolve(cached) : fetch(src.url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error('スプレッドシートの取得に失敗しました (' + res.status + ')');
      return res.text();
    }).then(function (text) {
      if (/^\s*</.test(text)) throw new Error('CSV ではなく HTML が返りました。シートを「ウェブに公開」→ CSV で公開してください。');
      if (src.cache) writeCache(text);
      return text;
    })).then(function (text) {
      return build(parseCSV(text));
    }, function (err) {
      // シートが読めなくても、トップの販売タイルと SNS の初期値は出す
      console.warn(err);
      return { posts: [], news: defaultNews(), links: (CFG.fallbackLinks || []).slice(), error: err };
    });
    return promise;
  }

  /* ---------- SNS アイコン ---------- */
  var ICONS = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.32l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1C3.7 15 3.6 14.7 3.6 12s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1 1.1-.1 1.4-.2 4.2-.2ZM12 2c-2.7 0-3.1 0-4.2.1C4.2 2.2 2.2 4.2 2.1 7.8 2 8.9 2 9.3 2 12s0 3.1.1 4.2c.1 3.6 2.1 5.6 5.7 5.7 1.1.1 1.5.1 4.2.1s3.1 0 4.2-.1c3.6-.1 5.6-2.1 5.7-5.7.1-1.1.1-1.5.1-4.2s0-3.1-.1-4.2c-.1-3.6-2.1-5.6-5.7-5.7C15.1 2 14.7 2 12 2Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0Zm-2.1 4.3a3.5 3.5 0 0 1-2.5-6l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a1.5 1.5 0 0 0 2.1 2.1l2.1-2.1a1 1 0 1 1 1.4 1.4l-2.1 2.1a3.5 3.5 0 0 1-2.4 1.1Zm6.5-2.8a1 1 0 0 1-.7-1.7l2.1-2.1a1.5 1.5 0 0 0-2.1-2.1l-2.1 2.1a1 1 0 1 1-1.4-1.4l2.1-2.1a3.5 3.5 0 0 1 4.9 4.9l-2.1 2.1a1 1 0 0 1-.7.3Z"/></svg>'
  };
  function iconFor(link) {
    var s = (link.title + ' ' + link.url).toLowerCase();
    if (/(^|\W)x(\W|$)|twitter|x\.com/.test(s)) return { key: 'x', svg: ICONS.x };
    if (/instagram|インスタ/.test(s)) return { key: 'instagram', svg: ICONS.instagram };
    if (/youtube|youtu\.be/.test(s)) return { key: 'youtube', svg: ICONS.youtube };
    return { key: 'link', svg: ICONS.link };
  }

  window.SiteSheet = {
    load: load,
    parseCSV: parseCSV,
    renderBody: renderBody,
    esc: esc,
    iconFor: iconFor,
    formatDate: formatDate
  };
})();
