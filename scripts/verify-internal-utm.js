/**
 * scripts/verify-internal-utm.js
 * サイト内リンクにutmパラメータが付いていないことを確認する（再発防止）。
 * docs/fixes の internal-utm-to-ga4-event・implementation.md 5節。
 *
 * サイト内リンクにutmが付いていると、GA4ではそのクリックの時点で流入元がutmの値に置き換わり、
 * 本来の集客経路（検索・X・noteなど）が見えなくなる。サイト内の移動はGA4のクリックイベント
 * （trackEvent）で計測する。外部から www.freenough.com へ入ってくるリンクのutm（note記事など）は対象外で、
 * そもそもこのリポジトリには含まれない。
 *
 * 確認すること:
 * 1. 公開中の記事本文（src/content/blog/*.md・src/content/hitori-hojin-blog/*.md。未公開の old/ は除く）に、
 *    サイト内向けのリンクでutmを含むものが0件
 * 2. src/data/concerns.ts のお悩みカードのリンク（ctaUrl・articleUrl）にutmが含まれていない
 * 3. （追加）src/ のコード（記事本文を除く）に、サイト内向けのリンクでutmを含むものが0件
 * 失敗した場合は、対象のファイル:行を出力する。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const fs = require('fs');
const path = require('path');
const { CONCERNS } = require('../src/data/concerns');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, details = []) {
  if (ok) pass++; else { fail++; failedCases.push({ label, details }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}`);
  if (!ok) details.forEach((d) => console.log(`    ${d}`));
}

// サイト内向けのURLか（相対パス・basePath・自サイトのドメイン・旧Vercelドメイン）
const SITE_URL_PATTERN = /^(\/(?!\/)|https?:\/\/(www\.)?freenough\.com(\/|$)|https?:\/\/freenough-lifecompass\.vercel\.app(\/|$))/;
const isSiteUrl = (url) => SITE_URL_PATTERN.test(url);

// テキスト中のURL（Markdownリンク・href・文字列リテラル）のうち、utmを含むサイト内向けのものを探す
function findInternalUtm(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  const URL_IN_LINE = /(?:\]\(|href=["']|["'`])((?:\/|https?:\/\/)[^\s)"'`]*utm_[^\s)"'`]*)/g;
  lines.forEach((line, i) => {
    for (const m of line.matchAll(URL_IN_LINE)) {
      if (isSiteUrl(m[1])) hits.push({ line: i + 1, url: m[1] });
    }
  });
  return hits;
}

// ----------------------------------------------------------------
// 1. 公開中の記事本文（old/ は除く）
// ----------------------------------------------------------------
const CONTENT_DIRS = ['src/content/blog', 'src/content/hitori-hojin-blog'];
const contentHits = [];
let contentFiles = 0;
for (const dir of CONTENT_DIRS) {
  // 直下の .md だけを読む（src/lib/blog.ts・hitoriHojinBlog.ts と同じ。old/ などのサブフォルダは公開されない）
  for (const name of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md'))) {
    contentFiles++;
    const rel = `${dir}/${name}`;
    for (const hit of findInternalUtm(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      contentHits.push(`${rel}:${hit.line}  ${hit.url}`);
    }
  }
}
record(`1. 公開中の記事本文（${contentFiles}ファイル）に、utm付きのサイト内リンクが0件`, contentHits.length === 0, contentHits);

// ----------------------------------------------------------------
// 2. お悩みカードのリンク（src/data/concerns.ts）
// ----------------------------------------------------------------
const concernsText = fs.readFileSync(path.join(ROOT, 'src/data/concerns.ts'), 'utf8').split(/\r?\n/);
const concernHits = [];
for (const c of CONCERNS) {
  for (const key of ['ctaUrl', 'articleUrl']) {
    const url = c[key];
    if (url && /utm_/i.test(url)) {
      const line = concernsText.findIndex((l) => l.includes(url)) + 1;
      concernHits.push(`src/data/concerns.ts:${line}  ${c.id}.${key} = ${url}`);
    }
  }
}
record(`2. お悩みカード（${CONCERNS.length}件）のリンクにutmが含まれていない`, concernHits.length === 0, concernHits);

// ----------------------------------------------------------------
// 3. src/ のコード（記事本文を除く）
// ----------------------------------------------------------------
const codeHits = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (rel !== 'src/content') walk(rel);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      for (const hit of findInternalUtm(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
        codeHits.push(`${rel}:${hit.line}  ${hit.url}`);
      }
    }
  }
}
walk('src');
record('3. src/ のコード（記事本文を除く）に、utm付きのサイト内リンクが0件', codeHits.length === 0, codeHits);

// 判定ロジック自体の確認（検出できるべきものを検出し、外部から入ってくる用のutmは検出しないこと）
const selfTest = [
  ['[a](/asset-simulator/app?utm_source=blog&utm_medium=referral)', 1],
  ['href="/app?utm_source=hojin_lp"', 1],
  ["const X = '/app?utm_source=tools&utm_campaign=x_tool';", 1],
  ['[a](https://www.freenough.com/asset-simulator?utm_source=blog)', 1],
  ['[a](https://freenough-lifecompass.vercel.app/simulator?utm_source=blog)', 1],
  ['[a](https://note.com/freenough/n/xxx?utm_source=site)', 0],
  ['[a](/asset-simulator/app)', 0],
];
const selfTestNg = selfTest.filter(([text, n]) => findInternalUtm(text).length !== n).map(([text, n]) => `期待${n}件: ${text}`);
record('（判定ロジックの自己確認）サイト内のutmを検出し、外部サイト宛てのutmは検出しない', selfTestNg.length === 0, selfTestNg);

console.log('='.repeat(80));
console.log(`結果: PASS=${pass} FAIL=${fail}`);
if (fail > 0) {
  console.log('--- FAILED CASES ---');
  failedCases.forEach((c) => {
    console.log(`  - ${c.label}`);
    c.details.forEach((d) => console.log(`      ${d}`));
  });
  process.exitCode = 1;
}
