/*
  config.js — Aoristos 公式サイト
  サイト全体の設定はこのファイルだけを直せば全ページに反映されます。
*/
window.SITE_CONFIG = {
  // 基本情報
  siteName: 'Aoristos',
  producer: 'Aoristos',
  since: 2026,           // フッターの Copyright の開始年

  /*
    Google スプレッドシート（「ウェブに公開」→ CSV）の URL。
    ブログ記事・トップのお知らせ・SNS リンクをここから読み込みます。
    空のままだと、お知らせ（下の defaultNews）以外は表示されません。
    列の意味は templates/site-data-template.csv と README を参照。
  */
  sheetCsvUrl: '',

  // シートの読み込み結果をブラウザに保持する時間（分）。通信量の節約用。
  sheetCacheMinutes: 3,

  /*
    トップのお知らせタイルの初期値。
    シートに type=news の行が1つもないとき（またはシートが読めないとき）にだけ表示されます。
    art: 'pdf' / 'tshirt' で内蔵のイラストを表示。
  */
  defaultNews: [
    {
      title: '部誌・解説を公開しています。',
      text: '物理チャレンジ 2026 第2チャレンジ理論問題の背景解説など。',
      url: 'publications.html',
      linkLabel: '刊行物を見る',
      art: 'pdf',
      style: 'light',
      pin: false
    }
  ],

  // シートが読めなかったときだけ使う SNS リンク（シートに type=link の行があればそちらが優先）
  fallbackLinks: []
};

// JS が動く環境の目印（スクロール演出などに使用）
document.documentElement.classList.add('js');
