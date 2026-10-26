#!/usr/bin/env node
/*
  generate-pages.js — Aoristos 公式サイト

  assets/activities.csv の link 列に書かれた活動ページ（activities/*.html）を生成する。
  本文は activities/<id>.html を開いたときに assets/activity-detail.js が
  assets/activities-details.json から組み立てるため、ここでは共通の器だけを出力する。

  エコ方針:
    - 外部 npm パッケージに依存しない（csv-parser / fs-extra を廃止）
    - ページは本文を持たない「器」なので、常にテンプレートと同じ内容に揃える

  使い方:
    npm run generate   CSV に合わせて activities/*.html を作成・更新し、CSV にないページを削除
*/

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CSV_PATH = path.join(ROOT, 'assets', 'activities.csv');
const OUTPUT_DIR = path.join(ROOT, 'activities');
const FORCE = process.argv.includes('--force');

/** RFC4180 相当の最小 CSV パーサ（引用符とエスケープ済み引用符に対応） */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter(r => r.some(v => v.trim() !== ''));
  if (!nonEmpty.length) return [];

  const header = nonEmpty.shift().map(h => h.trim());
  return nonEmpty.map(cols => {
    const o = {};
    header.forEach((h, i) => { o[h] = (cols[i] || '').trim(); });
    return o;
  });
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageTemplate(project) {
  const title = escapeHtml(project.title);
  const description = escapeHtml(project.description);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Aoristos</title>
  <meta name="description" content="${description}">
  <meta name="author" content="Aoristos">
  <meta name="theme-color" content="#ffffff">
  <link rel="icon" href="../favicon.ico" sizes="any">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/style.css">
  <script>
    window.pageConfig = { currentPage: 'activities', basePath: '../' };
  </script>
  <script src="../assets/config.js"></script>
  <script src="../assets/sheet.js" defer></script>
  <script src="../assets/header.js" defer></script>
  <script src="../assets/activity-detail.js" defer></script>
</head>
<body>

<main id="main">
  <article id="activityDetail">
    <!-- 本文は assets/activities-details.json から生成されます -->
    <header class="page-hero page-hero-left">
      <div class="container">
        <h1 class="page-title">${title}</h1>
        <p class="page-lead">${description}</p>
      </div>
    </header>
  </article>
</main>

</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('assets/activities.csv が見つかりません');
    process.exit(1);
  }

  const projects = parseCSV(fs.readFileSync(CSV_PATH, 'utf8')).filter(p => p.title && p.link);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let created = 0;
  let skipped = 0;

  for (const project of projects) {
    // link は "activities/aorxc.html" 形式
    const fileName = path.basename(project.link);
    const outputPath = path.join(OUTPUT_DIR, fileName);

    if (fs.existsSync(outputPath) && !FORCE && fs.readFileSync(outputPath, 'utf8') === pageTemplate(project)) {
      skipped++;
      continue;
    }

    fs.writeFileSync(outputPath, pageTemplate(project), 'utf8');
    console.log(`生成・更新: activities/${fileName}`);
    created++;
  }

  // CSV から消えた企画のページを削除
  // （このスクリプトが生成した「器」だけが対象。activities/ に手で置いたページは CSV になくても残す）
  const GENERATED_MARK = '本文は assets/activities-details.json から生成されます';
  const keep = new Set(projects.map(p => path.basename(p.link)));
  let removed = 0;
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (f.endsWith('.html') && !keep.has(f) &&
        fs.readFileSync(path.join(OUTPUT_DIR, f), 'utf8').includes(GENERATED_MARK)) {
      fs.unlinkSync(path.join(OUTPUT_DIR, f));
      console.log(`削除（CSV にない）: activities/${f}`);
      removed++;
    }
  }

  console.log(`\n完了: ${created} 件生成・更新 / ${skipped} 件変更なし / ${removed} 件削除`);
}

main();
