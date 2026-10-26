# Aoristos — 公式サイト

Aoristos の公式サイトです。活動の紹介、部誌や解説などの刊行物、ブログを掲載します。

**制作・運用: Aoristos**

---

## 何をどこで更新するか

| 更新したいもの | 場所 |
| --- | --- |
| ブログ記事 | Google スプレッドシート（`type` = `post`） |
| トップのお知らせタイル | Google スプレッドシート（`type` = `news`） |
| X・Instagram などの SNS リンク | Google スプレッドシート（`type` = `link`） |
| 活動の一覧 | `assets/activities.csv` |
| 活動の詳しい情報 | `assets/activities-details.json` |
| 刊行物の一覧 | `publications.html` |
| PDF の本体 | `assets/docs/` |
| スプレッドシートの URL・お知らせの初期値 | `assets/config.js` |

スプレッドシートを書き換えると、**サイトを再アップロードしなくても数分で反映**されます
（Google 側の公開キャッシュとブラウザのキャッシュで最大5分ほどかかります）。

---

## スプレッドシートの使い方

### 初回の準備

1. `templates/site-data-template.xlsx`（または `.csv`）を Google スプレッドシートに読み込みます。
2. 「ファイル → 共有 → ウェブに公開」で、対象のシートを **カンマ区切り形式（.csv）** で公開します。
3. 表示された URL を `assets/config.js` の `sheetCsvUrl` に貼ります。

> **いまは `sheetCsvUrl` が空です。** 空のあいだは、ブログ・SNS は表示されず、トップのお知らせには `config.js` の `defaultNews` が出ます。
> テンプレートの `news` / `link` / `post` の行はサンプルです。URL やアカウント名を本物に書き換えるか、行を削除してください。

### 列の意味

1行目の見出しは変えないでください（日本語の見出し「種類」「タイトル」なども読み取れます）。

| 列 | 内容 |
| --- | --- |
| `type` | `post`＝ブログ記事 / `news`＝トップのお知らせ / `link`＝SNS などのリンク。`#` で始まる行はメモとして無視されます |
| `visible` | `FALSE` で非表示（下書き）。空欄なら表示 |
| `pin` | `news`：`TRUE` でトップ以外のページ上部の帯にも表示 ／ `post`：`TRUE` で一覧の先頭に固定 |
| `date` | `2026/10/20` や `2026/10/20 18:00`。`post` は**未来の日時にするとその時刻まで公開されません（予約投稿）** |
| `id` | 記事の URL になる半角英数字。`hello` なら `blog/post.html?id=hello`。公開後は変えない |
| `title` | 記事タイトル／お知らせの見出し／サービス名（`X`、`Instagram`） |
| `text` | 記事の概要／お知らせの説明文／SNS のアカウント名（`@...`） |
| `body` | 記事本文（下の記法） |
| `url` | お知らせ・SNS のリンク先。サイト内のページは `activities/aorxc.html` のようにトップからの位置で書けます |
| `link_label` | お知らせのボタンの文字（例「読む」「購入する」） |
| `image` | 画像の URL。Google ドライブの共有リンク（「リンクを知っている全員」が閲覧可）もそのまま使えます。`news` では `pdf` / `tshirt` と書くと内蔵のイラストを表示 |
| `tags` | 記事のタグ。`お知らせ,刊行物` のようにカンマ区切り。最初のタグがカードの上に表示されます |
| `author` | 記事の筆者 |
| `style` | お知らせタイルの色。`light`（白）/ `dark`（黒）。空欄なら自動 |

### 記事本文（`body`）の書き方

セル内の改行は **Alt + Enter**（Mac は **⌘ + Enter**）。HTML は書けません（安全のため）。

```
空行をはさむと段落が分かれます。

## 見出し
### 小見出し

- 箇条書き
1. 番号付きリスト
> 強調したい一文（引用）

**太字** や [リンクの文字](https://example.com) も使えます。
![写真の説明](画像のURL)

---（区切り線）
```

### 表示の確認

URL の末尾に `?data=local` を付けると、スプレッドシートの代わりに `templates/site-data-template.csv` を読み込みます（デザイン確認用）。
例：`index.html?data=local`

---

## 活動を追加する

1. `assets/activities.csv` に1行追加します。`tags` の1つ目がカード上の分類名になり、絞り込みボタンは CSV のタグから自動生成されます。

   ```csv
   title,description,thumb,link,tags,tags2,tags3
   "活動名","説明文","","activities/newpage.html","企画","問題作成",""
   ```

2. 詳細を `assets/activities-details.json` に追加します。`id` はファイル名（`newpage`）と一致させてください。
   `details`（表）と `links`（ボタン）は省略できます。
3. ページを生成します。CSV にない古いページは自動で削除されます（このスクリプトが生成したページだけが対象）。

   ```bash
   npm run generate
   ```

## 刊行物（PDF）を追加する

1. PDF を `assets/docs/` に置きます（ファイル名は半角英数字）。
2. `publications/jpho2026-background.html` をコピーして、タイトル・説明・PDF のパス・ページ数を書き換えます。
3. `publications.html` にカードを1枚追加します。

---

## 公開（Cloudflare）

`main` に push すると、Cloudflare に接続していれば自動でデプロイされます（`npx wrangler deploy`）。

- 設定は `wrangler.jsonc`（Worker 名は `aoristos`）
- 公開しないファイル（`node_modules`・`readme.md`・`photo/` など）は `.assetsignore` に書きます
- 存在しない URL には `404.html` を表示します

## ローカルで動かす

`fetch` を使うため、ファイルを直接開かずローカルサーバー経由で開いてください。

```bash
npm start          # python3 -m http.server 8000
```

<http://localhost:8000> を開きます。

---

## ファイル構成

```
/
├── index.html              トップ
├── activities.html         活動一覧（検索・絞り込み）
├── activities/*.html       活動の詳細（generate-pages.js で生成）
├── publications.html       刊行物の一覧
├── publications/*.html     PDF を読むページ
├── blog.html               ブログ一覧
├── blog/post.html          ブログ記事（?id=記事ID）
├── about.html              Aoristos について
├── 404.html
├── generate-pages.js       活動詳細ページの生成
├── templates/
│   ├── site-data-template.csv   スプレッドシートのひな形
│   └── site-data-template.xlsx  同（書式つき）
└── assets/
    ├── config.js           サイト設定（シート URL・お知らせの初期値）
    ├── sheet.js            スプレッドシートの読み込み・本文の整形
    ├── header.js           ナビ・お知らせ帯・フッター
    ├── script.js           活動一覧・トップの活動・スクロール演出
    ├── home.js             トップのお知らせ・最新記事・SNS
    ├── blog.js             ブログ一覧と記事
    ├── activity-detail.js  活動詳細
    ├── style.css           全体のスタイル
    ├── activities.csv / activities-details.json
    ├── docs/               PDF
    ├── favicon.svg / logo.svg / aoristos-mark.svg
    └── blackboard-art*.webp
```

各ページの `<head>` では `config.js` を最初に（`defer` なしで）読み、その後 `sheet.js` → `header.js` → 各ページのスクリプトの順に `defer` で読み込みます。

---

## 設計方針

- **デザイン**：余白と文字で見せる。影・グラデーション・絵文字は使わない。白・薄灰・黒の帯を交互に置く
- **軽さ**：Web フォントなし（端末内蔵フォント）、外部ライブラリなし。スプレッドシートは1ページにつき1回だけ取得し、数分間ブラウザに保持
- **アクセシビリティ**：キーボード操作、`prefers-reduced-motion` で動きを停止、見出し順の維持

---

## 未対応・TODO

- **スプレッドシート**：新しいシートを作って `config.js` の `sheetCsvUrl` に設定
- **SNS・連絡先**：シートの `link` 行と `about.html` の「お問い合わせ」に記入
- **部誌 PDF 版の購入リンク**：`assets/activities-details.json` の `bushi` に追記
- **科学の甲子園・これまでの実績**：具体的な内容（年度・結果など）を `activities-details.json` に追記
- **AorXC の問題と解答**：公開したら `publications.html` に追加
