/**
 * scripts/verify-asset-management-csv-cross-store.js
 * simplify_csv_scope_and_fix_graph_history_bug.md 2章の回帰テスト：
 * CSV Importが表示トグル（スコープ）を一切参照せず、CSVの中身（区分列）だけを見て、
 * 本人/配偶者行があれば個人ストアへ、法人行があれば法人ストアへ、両方あれば両方へ、
 * 実際に（localStorageへ）書き込むことを確認する。parseAssetCsvの分類結果
 * （personalGroups/hojinGroups）が正しくてもapplyAssetCsvが実際にlocalStorageへ反映
 * しなければ意味がないため、verify-asset-management-csv.jsの純粋関数テストとは別に、
 * localStorageシムを使ったエンドツーエンドの検証として分離する（シムは
 * verify-asset-management-loadholdings-dedup.jsと同じ最小限のパターンを再利用）。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

let store = {};
global.window = global.window || {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};

const { parseAssetCsv, applyAssetCsv } = require('../src/lib/assetManagement/exportImport');
const { loadHoldings } = require('../src/lib/assetManagement/storage');
const { loadHojinHoldings } = require('../src/lib/hojinAssetManagement/storage');

let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, detail) {
  if (ok) {
    pass++;
  } else {
    fail++;
    failedCases.push({ label, detail });
  }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const HISTORY_HEADER = 'ID,年月,口座カテゴリ,資産クラス,区分,金額(万円),更新日';
function csvText(rows) {
  return [HISTORY_HEADER, ...rows].join('\n');
}

// 今月ラベル（'今月扱い'のグループが現在holdingsへ同期されることを確認するため、実行時の年月を使う）。
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

console.log('='.repeat(80));
console.log('【両方混在CSV：本人/配偶者行・法人行それぞれが正しいストアへ書き込まれる】');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const text = csvText([
    `pers1,${nowYM},現金,現金,本人,100,`,
    `corp1,${nowYM},法人預金,現金,法人,300,`,
  ]);
  const parsed = parseAssetCsv(text);
  const result = applyAssetCsv(parsed);

  record(
    '1. applyAssetCsvの戻り値に個人・法人両方の更新結果が含まれる',
    result.holdings.length === 1 && result.holdings[0].id === 'pers1' && result.hojinHoldings.length === 1 && result.hojinHoldings[0].id === 'corp1',
    JSON.stringify({ holdings: result.holdings, hojinHoldings: result.hojinHoldings })
  );
  record(
    '2. loadHoldings()で個人ストア（lifeCompassAssetHoldings）に実際に反映されている',
    (() => { const h = loadHoldings(); return h.length === 1 && h[0].id === 'pers1'; })(),
    JSON.stringify(loadHoldings())
  );
  record(
    '3. loadHojinHoldings()で法人ストア（hojinAssetHoldings）に実際に反映されている',
    (() => { const h = loadHojinHoldings(); return h.length === 1 && h[0].id === 'corp1' && h[0].amount === 300; })(),
    JSON.stringify(loadHojinHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log('【法人行のみのCSV：個人ストアには一切書き込まれない】');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const text = csvText([`corp1,${nowYM},法人預金,現金,法人,500,`]);
  const parsed = parseAssetCsv(text);
  const result = applyAssetCsv(parsed);

  record(
    '4. personalGroupsが空のCSVでも、applyAssetCsvは個人ストアの現在状態（空）をそのまま返す（例外を投げない）',
    Array.isArray(result.holdings) && result.holdings.length === 0,
    JSON.stringify(result.holdings)
  );
  record(
    '5. 個人セクションでCSVをインポートしていなくても、法人行だけを含むCSVで法人ストアが更新される',
    (() => { const h = loadHojinHoldings(); return h.length === 1 && h[0].id === 'corp1'; })(),
    JSON.stringify(loadHojinHoldings())
  );
  record(
    '6. 個人ストアには一切書き込まれない（法人行しか無いCSVのため）',
    loadHoldings().length === 0,
    JSON.stringify(loadHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log('【本人/配偶者行のみのCSV：法人ストアには一切書き込まれない（対称性）】');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const text = csvText([`pers1,${nowYM},現金,現金,本人,100,`, `sp1,${nowYM},現金,現金,配偶者,200,`]);
  const parsed = parseAssetCsv(text);
  applyAssetCsv(parsed);

  record(
    '7. 本人/配偶者行のみのCSVでは法人ストアに一切書き込まれない',
    loadHojinHoldings().length === 0,
    JSON.stringify(loadHojinHoldings())
  );
  record(
    '8. 個人ストアには両方の行が反映されている',
    (() => { const h = loadHoldings(); return h.length === 2 && h.some((x) => x.id === 'pers1') && h.some((x) => x.id === 'sp1'); })(),
    JSON.stringify(loadHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: CSVの中身（区分列）だけで個人・法人ストアへの書き込みが決まることを確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));

delete global.window;
delete global.localStorage;
