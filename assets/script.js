/*
  script.js — 活動一覧 / トップの活動レール / スクロール演出
  活動データは assets/activities.csv（1行目が見出し）。
*/
(function () {
  'use strict';

  function base() { return (window.pageConfig && window.pageConfig.basePath) || ''; }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- 活動データ（assets/activities.csv） ---------- */
  var cache = null;
  function loadActivities() {
    if (cache) return cache;
    cache = fetch(base() + 'assets/activities.csv').then(function (res) {
      if (!res.ok) throw new Error('activities.csv の取得に失敗しました (' + res.status + ')');
      return res.text();
    }).then(function (text) {
      return window.SiteSheet.parseCSV(text).filter(function (r) { return r.title; }).map(function (p) {
        p.tagList = ['tags', 'tags2', 'tags3'].map(function (k) { return (p[k] || '').trim(); }).filter(Boolean);
        return p;
      });
    });
    return cache;
  }

  function buildCard(p, b) {
    var card = el('article', 'project-card');
    card.setAttribute('data-tags', p.tagList.join(','));

    if (p.thumb && p.thumb.trim()) {
      var img = el('img', 'project-thumb');
      img.src = b + p.thumb.trim();
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { img.remove(); });
      card.appendChild(img);
    }

    var body = el('div', 'project-body');
    if (p.tagList[0]) body.appendChild(el('p', 'eyebrow', p.tagList[0]));

    var head = el('div', 'project-head');
    var h3 = el('h3', 'project-title');
    if (p.link) {
      var a = el('a', null, p.title);
      a.href = b + p.link;
      h3.appendChild(a);
    } else {
      h3.textContent = p.title;
    }
    head.appendChild(h3);
    body.appendChild(head);

    if (p.description) {
      var desc = el('div', 'project-description');
      desc.appendChild(el('p', null, p.description));
      body.appendChild(desc);
    }

    var rest = p.tagList.slice(1);
    if (rest.length) {
      var tags = el('ul', 'project-tags');
      rest.forEach(function (t) { tags.appendChild(el('li', null, t)); });
      body.appendChild(tags);
    }

    if (p.link) {
      var more = el('a', 'more-link', '詳しく見る');
      more.href = b + p.link;
      more.setAttribute('aria-label', p.title + ' の詳細');
      body.appendChild(more);
    }

    card.appendChild(body);
    return card;
  }

  /* ---------- 活動一覧（activities.html） ---------- */
  function initActivitiesPage() {
    var grid = document.getElementById('activitiesGrid');
    if (!grid) return;
    var b = base();

    loadActivities().then(function (rows) {
      var frag = document.createDocumentFragment();
      var tagSet = [];
      rows.forEach(function (p) {
        p.tagList.forEach(function (t) { if (tagSet.indexOf(t) === -1) tagSet.push(t); });
        frag.appendChild(buildCard(p, b));
      });
      grid.textContent = '';
      grid.appendChild(frag);

      var count = document.getElementById('activitiesCount');
      var filterList = document.getElementById('filterList');
      if (filterList) {
        filterList.innerHTML = '';
        ['すべて'].concat(tagSet).forEach(function (t, i) {
          var btn = el('button', 'chip', t);
          btn.type = 'button';
          btn.setAttribute('data-filter', i === 0 ? '*' : t);
          btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
          filterList.appendChild(btn);
        });
      }

      var cards = Array.prototype.slice.call(grid.querySelectorAll('.project-card'));
      var search = document.getElementById('activitiesSearch');
      var none = document.getElementById('activitiesNoResults');

      function apply() {
        var q = search && search.value ? search.value.trim().toLowerCase() : '';
        var active = filterList ? filterList.querySelector('[aria-pressed="true"]') : null;
        var cat = active ? active.getAttribute('data-filter') : '*';
        var visible = 0;
        cards.forEach(function (c) {
          var tags = (c.getAttribute('data-tags') || '').split(',');
          var show = (!q || c.textContent.toLowerCase().indexOf(q) !== -1) && (cat === '*' || tags.indexOf(cat) !== -1);
          c.hidden = !show;
          if (show) visible++;
        });
        if (none) none.hidden = visible !== 0;
        if (count) count.textContent = visible + '件の活動';
      }

      if (search) search.addEventListener('input', apply);
      if (filterList) filterList.addEventListener('click', function (e) {
        var btn = e.target.closest('.chip');
        if (!btn) return;
        filterList.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
        apply();
      });

      apply();
    }).catch(function (err) {
      console.error(err);
      grid.innerHTML = '<p class="empty">活動データを読み込めませんでした。時間をおいて再度お試しください。</p>';
    });
  }

  /* ---------- トップの活動（横スクロール） ---------- */
  function initFeatured() {
    var rail = document.getElementById('featuredRail');
    if (!rail) return;
    var b = base();
    loadActivities().then(function (rows) {
      var frag = document.createDocumentFragment();
      rows.forEach(function (p, i) {
        var a = el('a', 'rail-card');
        a.href = p.link ? b + p.link : b + 'activities.html';
        if (p.tagList[0]) a.appendChild(el('p', 'eyebrow', p.tagList[0]));
        a.appendChild(el('h3', null, p.title));
        a.appendChild(el('p', 'rail-desc', p.description));
        a.appendChild(el('span', 'rail-index', String(i + 1).padStart(2, '0')));
        frag.appendChild(a);
      });
      rail.textContent = '';
      rail.appendChild(frag);
      initRailButtons(rail);
    }).catch(function (e) { console.warn(e); });
  }

  function initRailButtons(rail) {
    var prev = document.getElementById('railPrev');
    var next = document.getElementById('railNext');
    if (!prev || !next) return;
    function step() { var c = rail.querySelector('.rail-card'); return c ? c.getBoundingClientRect().width + 20 : 300; }
    function update() {
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    }
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- スクロールで静かに現れる（IntersectionObserver で一度だけ） ---------- */
  function initReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  window.SiteActivities = { load: loadActivities };

  document.addEventListener('DOMContentLoaded', function () {
    initActivitiesPage();
    initFeatured();
    initReveal();
  });
})();
