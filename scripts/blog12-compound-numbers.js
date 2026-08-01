/**
 * scripts/blog12-compound-numbers.js
 * ブログ記事12本目(複利計算ツール/tools/compound題材、利回りvs年数比較)用の数値算出。
 * 使い捨てスクリプト。本番の calcFutureValue()(src/lib/financeCore.ts)を直接importして
 * 使用する。独自の再実装・手計算は行わない。既定の積立タイミング仕様(年金終価の閉じた式、
 * 年末積立方式)をそのまま使用し、記事用に計算条件を変更していない。
 * 実行: node scripts/blog12-compound-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const fs = require('fs');
const path = require('path');
const { calcFutureValue } = require('../src/lib/financeCore');

const CURRENT_ASSETS = 0;   // 万円
const MONTHLY = 3;          // 万円/月

function calcCase(years, ratePct) {
  const asset = calcFutureValue(CURRENT_ASSETS, MONTHLY, years, ratePct);
  const principal = MONTHLY * 12 * years;
  const gain = asset - principal;
  return { years, rate: ratePct, principal, gain, asset };
}

function fmt(v) {
  return Math.round(v).toLocaleString('ja-JP');
}

// ── 検証A: 年数の効果(利回り5%固定) ──
const caseA = [20, 30, 40].map(years => ({ pattern: 'A', ...calcCase(years, 5) }));

// ── 検証B: 利回りの効果(30年固定) ──
const caseB = [3, 5, 7].map(rate => ({ pattern: 'B', ...calcCase(30, rate) }));

// ── 検証C: 年数×利回りのクロス表(3×3=9パターン) ──
const caseC = [];
for (const years of [20, 30, 40]) {
  for (const rate of [3, 5, 7]) {
    caseC.push({ pattern: 'C', ...calcCase(years, rate) });
  }
}

console.log('='.repeat(90));
console.log('共通条件: 現在資産0円・毎月積立3万円。calcFutureValue()(src/lib/financeCore.ts)を直接使用');
console.log('='.repeat(90));

console.log('\n### 検証A: 年数の効果(年利5%固定)\n');
console.log('| 積立年数 | 元本(万円) | 運用益(万円) | 最終資産(万円) |');
console.log('|---|---|---|---|');
caseA.forEach(c => console.log(`| ${c.years}年 | ${fmt(c.principal)} | ${fmt(c.gain)} | ${fmt(c.asset)} |`));

console.log('\n### 検証B: 利回りの効果(30年固定)\n');
console.log('| 年利 | 元本(万円) | 運用益(万円) | 最終資産(万円) |');
console.log('|---|---|---|---|');
caseB.forEach(c => console.log(`| ${c.rate}% | ${fmt(c.principal)} | ${fmt(c.gain)} | ${fmt(c.asset)} |`));

console.log('\n### 検証C: 年数×利回りクロス表(9パターン)\n');
console.log('| 年数\\利回り | 3% | 5% | 7% |');
console.log('|---|---|---|---|');
for (const years of [20, 30, 40]) {
  const row = caseC.filter(c => c.years === years);
  console.log(`| ${years}年 | ${row.map(c => `元本${fmt(c.principal)}/益${fmt(c.gain)}/計${fmt(c.asset)}`).join(' | ')} |`);
}

// ── CSV出力 ──
const allRows = [...caseA, ...caseB, ...caseC];
const csvHeader = 'pattern,years,rate,principal,gain,asset';
const csvLines = allRows.map(c =>
  `${c.pattern},${c.years},${c.rate},${Math.round(c.principal)},${Math.round(c.gain)},${Math.round(c.asset)}`
);
const csv = [csvHeader, ...csvLines].join('\n');

const CSV_PATH = path.join(__dirname, '..', 'docs', 'fixes', 'active', 'blog12_compound_numbers.csv');
fs.writeFileSync(CSV_PATH, csv, 'utf8');

console.log('\n' + '='.repeat(90));
console.log('CSV(グラフ作成用)');
console.log('='.repeat(90));
console.log(csv);
console.log(`\nCSVファイル出力先: ${CSV_PATH}`);

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));
