/*
  home.js — トップページのシート連動部分
  - お知らせタイル（type = news）：部誌 PDF 版、Tシャツ など（シートに無ければ config.js の初期値）
  - 最新のブログ記事 3 件（type = post）
  - SNS リンク（type = link）
*/
(function () {
  'use strict';

  function ext(url) { return /^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ''; }

  function renderTiles(news, E) {
    var wrap = document.getElementById('tiles');
    var section = document.getElementById('tilesSection');
    if (!wrap || !section) return;
    if (!news.length) { section.hidden = true; return; }

    wrap.innerHTML = news.map(function (n, i) {
      var tone = n.style === 'dark' || n.style === 'light' ? n.style : (i % 4 === 1 || i % 4 === 2 ? 'dark' : 'light');
      var wide = news.length % 2 === 1 && i === 0 ? ' tile-wide' : '';
      var cta = n.url
        ? '<p class="tile-links"><a class="btn' + (tone === 'dark' ? ' btn-light' : '') + '" href="' + E(n.url) + '"' + ext(n.url) + '>' + E(n.linkLabel || '詳しく見る') + '</a></p>'
        : '';
      var img = n.image
        ? '<img class="tile-img" src="' + E(n.image) + '" alt="" loading="lazy" decoding="async">'
        : n.art ? '<img class="tile-img tile-art" src="assets/art/' + E(n.art) + '.svg" alt="" width="480" height="300" decoding="async">' : '';
      return '<article class="tile tile-' + tone + wide + (img ? ' has-img' : '') + '">' +
        '<div class="tile-copy">' +
          '<h3>' + E(n.title) + '</h3>' +
          (n.text ? '<p class="tile-sub">' + E(n.text) + '</p>' : '') +
          cta +
        '</div>' + img +
      '</article>';
    }).join('');
    section.hidden = false;
  }

  function renderPosts(posts, E) {
    var list = document.getElementById('latestPosts');
    var section = document.getElementById('latestSection');
    if (!list || !section) return;
    if (!posts.length) { section.hidden = true; return; }

    list.innerHTML = posts.slice(0, 3).map(function (p) {
      var href = 'blog/post.html?id=' + encodeURIComponent(p.id);
      return '<li><a class="news-item" href="' + href + '">' +
        (p.image ? '<img src="' + E(p.image) + '" alt="" loading="lazy" decoding="async">' : '<span class="news-noimg" aria-hidden="true"></span>') +
        '<span class="news-text">' +
          (p.tags[0] ? '<span class="eyebrow">' + E(p.tags[0]) + '</span>' : '') +
          '<span class="news-title">' + E(p.title) + '</span>' +
          '<time class="news-date">' + E(p.dateLabel) + '</time>' +
        '</span></a></li>';
    }).join('');
    section.hidden = false;
  }

  function renderSocial(links, E) {
    var wrap = document.getElementById('socialLinks');
    var section = document.getElementById('followSection');
    if (!wrap || !section) return;
    if (!links.length) { section.hidden = true; return; }
    wrap.innerHTML = links.map(function (l) {
      var ic = window.SiteSheet.iconFor(l);
      return '<li><a class="social-card social-' + ic.key + '" href="' + E(l.url) + '" target="_blank" rel="noopener noreferrer">' +
        ic.svg + '<span class="social-name">' + E(l.title) + '</span>' +
        (l.text ? '<span class="social-handle">' + E(l.text) + '</span>' : '') +
      '</a></li>';
    }).join('');
    section.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.SiteSheet) return;
    window.SiteSheet.load().then(function (data) {
      var E = window.SiteSheet.esc;
      renderTiles(data.news, E);
      renderPosts(data.posts, E);
      renderSocial(data.links, E);
    }).catch(function (err) {
      console.warn(err);
      ['tilesSection', 'latestSection', 'followSection'].forEach(function (id) {
        var s = document.getElementById(id);
        if (s) s.hidden = true;
      });
    });
  });
})();
