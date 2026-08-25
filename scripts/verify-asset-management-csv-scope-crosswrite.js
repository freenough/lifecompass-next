/**
 * scripts/verify-asset-management-csv-scope-crosswrite.js
 * csv_yyyymm_format_and_import_scope_fix.md 2章の回帰テスト：
 * combinedスコープでのCSV Importが、実際に「もう一方のストア」（localStorage）へ
 * クロス書き込みすることを確認する。parseHistoryCsv/parseHojinHistoryCsvの分類結果
 * （groups/hojinGroups/personalGroups）が正しくてもapplyHistoryCsv/applyHojinHistoryCsv
 * が実際にlocalStorageへ反映しなければ意味がないため、verify-asset-management-csv.jsの
 * 純粋関数テストとは別に、localStorageシムを使ったエンドツーエンドの検証として分離する
 * （シムはverify-asset-management-loadholdings-dedup.jsと同じ最小限のパターンを再利用）。
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

const { parseHistoryCsv, applyHistoryCsv } = require('../src/lib/assetManagement/exportImport');
const { parseHojinHistoryCsv, applyHojinHistoryCsv } = require('../src/lib/hojinAssetManagement/exportImport');
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
console.log('【個人側CSVインポート（combined）：法人ストアへのクロス書き込み】');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const text = csvText([
    `pers1,${nowYM},現金,現金,本人,100,`,
    `corp1,${nowYM},法人預金,現金,法人,300,`,
  ]);
  const parsed = parseHistoryCsv(text, 'combined');
  const result = applyHistoryCsv(parsed);

  record(
    '1. applyHistoryCsv(combined)の戻り値に法人側の更新結果が含まれる',
    result.hojinHoldings && result.hojinHoldings.length === 1 && result.hojinHoldings[0].id === 'corp1',
    JSON.stringify(result.hojinHoldings)
  );
  record(
    '2. loadHojinHoldings()で法人ストア（hojinAssetHoldings）に実際に反映されている',
    (() => { const h = loadHojinHoldings(); return h.length === 1 && h[0].id === 'corp1' && h[0].amount === 300; })(),
    JSON.stringify(loadHojinHoldings())
  );
  record(
    '3. loadHoldings()で個人ストア自体も通常通り反映されている（クロス書き込みが自ストアの書き込みを壊さない）',
    (() => { const h = loadHoldings(); return h.length === 1 && h[0].id === 'pers1'; })(),
    JSON.stringify(loadHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log('【法人側CSVインポート（combined）：個人ストアへのクロス書き込み】');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const text = csvText([
    `corp1,${nowYM},法人預金,現金,法人,500,`,
    `pers1,${nowYM},現金,現金,本人,700,`,
    `sp1,${nowYM},現金,現金,配偶者,900,`,
  ]);
  const parsed = parseHojinHistoryCsv(text, 'combined');
  const result = applyHojinHistoryCsv(parsed);

  record(
    '4. applyHojinHistoryCsv(combined)の戻り値に個人側の更新結果が含まれる',
    result.personalHoldings && result.personalHoldings.length === 2,
    JSON.stringify(result.personalHoldings)
  );
  record(
    '5. loadHoldings()で個人ストア（lifeCompassAssetHoldings）に実際に反映されている',
    (() => { const h = loadHoldings(); return h.length === 2 && h.some((x) => x.id === 'pers1') && h.some((x) => x.id === 'sp1'); })(),
    JSON.stringify(loadHoldings())
  );
  record(
    '6. loadHojinHoldings()で法人ストア自体も通常通り反映されている（対称性の確認、16/17の逆方向）',
    (() => { const h = loadHojinHoldings(); return h.length === 1 && h[0].id === 'corp1' && h[0].amount === 500; })(),
    JSON.stringify(loadHojinHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log('【personalOnlyスコープ：クロス書き込みが発生しないことの確認（Bug B対策の維持）】');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const text = csvText([
    `pers1,${nowYM},現金,現金,本人,100,`,
    `corp1,${nowYM},法人預金,現金,法人,300,`,
  ]);
  const parsed = parseHistoryCsv(text, 'personalOnly');
  applyHistoryCsv(parsed);

  record(
    '7. 個人側CSVインポート（personalOnly）では法人ストアに一切書き込まれない',
    loadHojinHoldings().length === 0,
    JSON.stringify(loadHojinHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: combinedスコープでのCSVインポートによるクロスストア書き込みを確認しました。');
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
