/*
  header.js — 共通のナビゲーション・お知らせリボン・フッターを生成する
  各ページで window.pageConfig を定義してから defer で読み込む。
    currentPage: index / activities / publications / blog / about
    basePath:    サブフォルダのページは '../'
    title:       タブに出るタイトル（省略時は既存の <title>）
*/
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var page = window.pageConfig || {};
  var base = page.basePath || '';

  var NAV = [
    { key: 'activities', href: 'activities.html', label: '活動' },
    { key: 'publications', href: 'publications.html', label: '刊行物' },
    { key: 'blog', href: 'blog.html', label: 'ブログ' },
    { key: 'about', href: 'about.html', label: 'Aoristos について' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildHeader() {
    if (page.title) document.title = page.title;

    var links = NAV.map(function (n) {
      var cur = page.currentPage === n.key;
      return '<li><a href="' + base + n.href + '"' + (cur ? ' aria-current="page"' : '') + '>' + n.label + '</a></li>';
    }).join('');

    var html =
      '<a class="skip-link" href="#main">本文へスキップ</a>' +
      '<header class="gnav" id="gnav">' +
        '<div class="gnav-inner">' +
          '<a class="gnav-brand" href="' + base + 'index.html" aria-label="Aoristos ホーム">' +
            '<img class="gnav-logo" src="' + base + 'assets/aoristos-mark.svg" alt="" width="39" height="20">' +
            '<span class="gnav-brand-text">Aoristos</span>' +
          '</a>' +
          '<nav class="gnav-nav" id="gnavNav" aria-label="メイン">' +
            '<ul>' + links + '</ul>' +
          '</nav>' +
          '<button class="gnav-toggle" id="gnavToggle" type="button" aria-expanded="false" aria-controls="gnavNav" aria-label="メニューを開く">' +
            '<span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</header>' +
      '<div class="ribbon" id="ribbon" hidden></div>';

    document.body.insertAdjacentHTML('afterbegin', html);

    var toggle = document.getElementById('gnavToggle');
    var header = document.getElementById('gnav');
    function setOpen(open) {
      header.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('nav-locked', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    }
    toggle.addEventListener('click', function () { setOpen(!header.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 834px)').addEventListener('change', function (mq) { if (mq.matches) setOpen(false); });
  }

  function copyrightYears() {
    var start = CFG.since || new Date().getFullYear();
    var now = new Date().getFullYear();
    return now > start ? start + '–' + now : String(start);
  }

  function buildFooter() {
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="footer-inner">' +
        '<div class="footer-top">' +
          '<div class="footer-brand">' +
            '<img class="footer-logo" src="' + base + 'assets/aoristos-mark.svg" alt="" width="54" height="28">' +
            '<div><p class="footer-theme">Aoristos</p>' +
            '<p class="footer-event">問いを立て、解き、伝える。</p></div>' +
          '</div>' +
          '<div class="footer-cols">' +
            '<div><h2>サイト</h2><ul>' +
              '<li><a href="' + base + 'index.html">ホーム</a></li>' +
              NAV.map(function (n) { return '<li><a href="' + base + n.href + '">' + n.label + '</a></li>'; }).join('') +
            '</ul></div>' +
            '<div><h2>フォロー</h2><ul class="footer-social" id="footerSocial"><li class="footer-muted">準備中</li></ul></div>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<p>Copyright © ' + esc(copyrightYears()) + ' ' + esc(CFG.producer) + '.</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(footer);
  }

  /* シート連動：お知らせリボン（pin = TRUE の news）とフッターの SNS */
  function fillFromSheet() {
    if (!window.SiteSheet) return;
    window.SiteSheet.load().then(function (data) {
      var E = window.SiteSheet.esc;

      var pinned = data.news.filter(function (n) { return n.pin; });
      var ribbon = document.getElementById('ribbon');
      if (ribbon && pinned.length && !page.hideRibbon) {
        ribbon.innerHTML = '<div class="ribbon-inner">' + pinned.map(function (n) {
          var link = n.url ? ' <a href="' + E(n.url) + '"' + (/^https?:/.test(n.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + E(n.linkLabel || '詳しく見る') + '</a>' : '';
          return '<p><span>' + E(n.title) + (n.text ? '　' + E(n.text) : '') + '</span>' + link + '</p>';
        }).join('') + '</div>';
        ribbon.hidden = false;
      }

      var social = document.getElementById('footerSocial');
      if (social && data.links.length) {
        social.innerHTML = data.links.map(function (l) {
          var ic = window.SiteSheet.iconFor(l);
          return '<li><a href="' + E(l.url) + '" target="_blank" rel="noopener noreferrer" class="social-' + ic.key + '">' +
            ic.svg + '<span>' + E(l.title) + (l.text ? ' <small>' + E(l.text) + '</small>' : '') + '</span></a></li>';
        }).join('');
      }
    }).catch(function (err) { console.warn(err); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildHeader();
    buildFooter();
    fillFromSheet();
  });
})();
