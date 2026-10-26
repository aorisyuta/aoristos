/*
  activity-detail.js — 活動ページ（activities/<id>.html）の本文を
  assets/activities-details.json から組み立てる。ファイル名が活動 ID。
*/
(function () {
  'use strict';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function specRow(label, value) {
    var row = el('div', 'spec-row');
    row.appendChild(el('dt', null, label));
    row.appendChild(el('dd', null, value));
    return row;
  }

  function render(p, root) {
    document.title = p.title + ' — Aoristos';

    var hero = el('header', 'page-hero page-hero-left');
    var inner = el('div', 'container');
    if (p.category) inner.appendChild(el('p', 'eyebrow', p.category));
    inner.appendChild(el('h1', 'page-title', p.title));
    if (p.description) inner.appendChild(el('p', 'page-lead', p.description));
    hero.appendChild(inner);

    var body = el('div', 'container detail-body');

    if (p.thumb) {
      var fig = el('figure', 'detail-figure');
      var img = el('img');
      img.src = '../' + p.thumb;
      img.alt = '';
      img.decoding = 'async';
      img.addEventListener('error', function () { fig.remove(); });
      fig.appendChild(img);
      body.appendChild(fig);
    }

    if (p.fullDescription) {
      var about = el('section', 'detail-about');
      about.appendChild(el('h2', 'section-title-sm', 'この活動について'));
      about.appendChild(el('p', null, p.fullDescription));
      body.appendChild(about);
    }

    if (p.details && p.details.length) {
      var specs = el('section', 'detail-specs');
      specs.appendChild(el('h2', 'section-title-sm', '詳しく'));
      var dl = el('dl', 'spec-list');
      p.details.forEach(function (d) { dl.appendChild(specRow(d.label, d.content)); });
      specs.appendChild(dl);
      body.appendChild(specs);
    }

    if (p.links && p.links.length) {
      var actions = el('p', 'pdf-actions detail-links');
      p.links.forEach(function (l, i) {
        var a = el('a', i === 0 ? 'btn' : 'btn btn-ghost', l.label);
        a.href = /^https?:/.test(l.href) ? l.href : '../' + l.href;
        if (/^https?:/.test(l.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        actions.appendChild(a);
      });
      body.appendChild(actions);
    }

    var back = el('p', 'detail-back');
    var a = el('a', 'more-link more-back', '活動一覧へ戻る');
    a.href = '../activities.html';
    back.appendChild(a);
    body.appendChild(back);

    root.textContent = '';
    root.appendChild(hero);
    root.appendChild(body);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('activityDetail');
    if (!root) return;
    var id = location.pathname.split('/').pop().replace(/\.html$/, '');

    fetch('../assets/activities-details.json').then(function (res) {
      if (!res.ok) throw new Error('activities-details.json の取得に失敗しました (' + res.status + ')');
      return res.json();
    }).then(function (data) {
      var p = (data.activities || []).filter(function (x) { return x.id === id; })[0];
      if (!p) throw new Error('活動が見つかりません: ' + id);
      render(p, root);
    }).catch(function (err) {
      console.error(err);
      var c = root.querySelector('.container') || root;
      c.insertAdjacentHTML('beforeend', '<p class="empty">詳しい情報を読み込めませんでした。<a href="../activities.html">活動一覧</a>からお探しください。</p>');
    });
  });
})();
