/*
  blog.js — ブログ（スプレッドシートの type = post の行）
  一覧: blog.html   記事: blog/post.html?id=記事ID
*/
(function () {
  'use strict';

  var base = (window.pageConfig && window.pageConfig.basePath) || '';

  function postHref(p) { return base + 'blog/post.html?id=' + encodeURIComponent(p.id); }

  function cover(p, E, cls) {
    return p.image
      ? '<img class="' + cls + '" src="' + E(p.image) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="' + cls + ' noimg" aria-hidden="true"><img src="' + base + 'assets/aoristos-mark.svg" alt=""></span>';
  }

  function cardHTML(p, E, featured) {
    return '<article class="post-card' + (featured ? ' post-featured' : '') + '">' +
      '<a href="' + postHref(p) + '">' +
        cover(p, E, 'post-cover') +
        '<div class="post-card-text">' +
          (p.tags[0] ? '<p class="eyebrow">' + E(p.tags[0]) + '</p>' : '') +
          '<h3>' + E(p.title) + '</h3>' +
          (featured && p.text ? '<p class="post-summary">' + E(p.text) + '</p>' : '') +
          '<time>' + E(p.dateLabel) + '</time>' +
        '</div>' +
      '</a></article>';
  }

  /* ---------- 一覧 ---------- */
  function renderList(posts) {
    var list = document.getElementById('blogList');
    if (!list) return;
    var E = window.SiteSheet.esc;
    var chips = document.getElementById('blogTags');

    if (!posts.length) {
      list.innerHTML = '<p class="empty">まだ記事はありません。公開までもうしばらくお待ちください。</p>';
      return;
    }

    var tags = [];
    posts.forEach(function (p) { p.tags.forEach(function (t) { if (tags.indexOf(t) === -1) tags.push(t); }); });

    function draw(tag) {
      var shown = tag ? posts.filter(function (p) { return p.tags.indexOf(tag) !== -1; }) : posts;
      list.innerHTML = shown.map(function (p, i) { return cardHTML(p, E, !tag && i === 0); }).join('');
    }

    if (chips && tags.length > 1) {
      chips.innerHTML = ['すべて'].concat(tags).map(function (t, i) {
        return '<button type="button" class="chip" data-tag="' + (i ? E(t) : '') + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + E(t) + '</button>';
      }).join('');
      chips.hidden = false;
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('.chip');
        if (!b) return;
        chips.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        draw(b.getAttribute('data-tag'));
      });
    }
    draw('');
  }

  /* ---------- 記事 ---------- */
  function renderPost(posts) {
    var article = document.getElementById('postArticle');
    if (!article) return;
    var E = window.SiteSheet.esc;
    var id = new URLSearchParams(location.search).get('id');
    var index = -1;
    posts.forEach(function (p, i) { if (p.id === id) index = i; });

    if (index === -1) {
      article.innerHTML = '<div class="post-head"><h1>記事が見つかりません</h1>' +
        '<p class="post-lead">公開が終了したか、URL が変わった可能性があります。</p>' +
        '<p><a class="more-link" href="' + base + 'blog.html">ブログ一覧へ</a></p></div>';
      return;
    }

    var p = posts[index];
    document.title = p.title + ' — Aoristos ブログ';
    var meta = document.querySelector('meta[name="description"]');
    if (meta && p.text) meta.setAttribute('content', p.text);

    var shareText = encodeURIComponent(p.title + ' | Aoristos');
    var shareUrl = encodeURIComponent(location.href);

    article.innerHTML =
      '<header class="post-head">' +
        '<p class="eyebrow">' + E(p.tags[0] || 'ブログ') + '</p>' +
        '<h1>' + E(p.title) + '</h1>' +
        (p.text ? '<p class="post-lead">' + E(p.text) + '</p>' : '') +
        '<p class="post-byline"><time>' + E(p.dateLabel) + '</time>' + (p.author ? '<span>' + E(p.author) + '</span>' : '') + '</p>' +
      '</header>' +
      (p.image ? '<figure class="post-hero"><img src="' + E(p.image) + '" alt="" decoding="async"></figure>' : '') +
      '<div class="post-body">' + window.SiteSheet.renderBody(p.body) + '</div>' +
      '<footer class="post-foot">' +
        (p.tags.length ? '<ul class="post-tags">' + p.tags.map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="post-share">' +
          '<a class="share-btn" href="https://x.com/intent/post?text=' + shareText + '&url=' + shareUrl + '" target="_blank" rel="noopener noreferrer">' + window.SiteSheet.iconFor({ title: 'x', url: '' }).svg + '<span>ポスト</span></a>' +
          '<button class="share-btn" type="button" id="copyLink"><span>リンクをコピー</span></button>' +
        '</div>' +
      '</footer>';

    var copy = document.getElementById('copyLink');
    if (copy) copy.addEventListener('click', function () {
      var done = function () { copy.querySelector('span').textContent = 'コピーしました'; };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () {});
    });

    // 前後の記事
    var more = document.getElementById('postMore');
    if (more) {
      var others = posts.filter(function (x) { return x.id !== p.id; });
      var related = others.filter(function (x) { return x.tags.some(function (t) { return p.tags.indexOf(t) !== -1; }); });
      var pick = related.concat(others.filter(function (x) { return related.indexOf(x) === -1; })).slice(0, 3);
      if (pick.length) {
        more.innerHTML = '<div class="container"><h2 class="section-title-sm">ほかの記事</h2>' +
          '<div class="post-grid">' + pick.map(function (x) { return cardHTML(x, E, false); }).join('') + '</div>' +
          '<p class="center"><a class="more-link" href="' + base + 'blog.html">ブログ一覧へ</a></p></div>';
        more.hidden = false;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.SiteSheet) return;
    var target = document.getElementById('blogList') || document.getElementById('postArticle');
    if (!target) return;
    window.SiteSheet.load().then(function (data) {
      if (data.error) throw data.error;
      renderList(data.posts);
      renderPost(data.posts);
    }).catch(function (err) {
      console.error(err);
      target.innerHTML = '<p class="empty">記事を読み込めませんでした。時間をおいて再度お試しください。</p>';
    });
  });
})();
