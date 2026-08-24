/**
 * scripts/verify-asset-management-loadholdings-dedup.js
 * fix_loadHoldings_missing_dedup.md の回帰テスト。
 *
 * loadSnapshots()は読み込みのたびに自己修復（正規化・重複排除して保存し直す）するが、
 * loadHoldings()/loadHojinHoldings()にはその自己修復が無く、mergeById導入前に書き込まれた
 * 重複データ（同一id）が新規の書き込みが起きない限り永久に残り続けていた。本テストは、
 * 「壊れた重複データを含む状態からload〜()を呼ぶと、自動的に重複排除されて保存し直される」
 * ことを、Node上に最小限のlocalStorageシムを用意したうえで、本番のloadHoldings/
 * loadHojinHoldings/saveHoldings/saveHojinHoldingsを直接呼び出して確認する
 * （独自の重複排除ロジックの再実装は行わない）。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

// --- 最小限のlocalStorageシム（Node上でstorage.tsのwindow/localStorage依存コードを動かすため） ---
let store = {};
global.window = global.window || {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};

const { loadHoldings, saveHoldings } = require('../src/lib/assetManagement/storage');
const { loadHojinHoldings, saveHojinHoldings } = require('../src/lib/hojinAssetManagement/storage');

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

const dup = (id, amount) => ({
  id, owner: 'personal', accountCategory: '現金', assetClass: '現金', amount, updatedAt: '2026-08-01T00:00:00.000Z',
});
const dupCorp = (id, amount) => ({
  id, owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount, updatedAt: '2026-08-01T00:00:00.000Z',
});

// ================================================================
// SECTION 1: loadHoldings（個人）— 壊れた重複データからの自己修復
// ================================================================
console.log('='.repeat(80));
console.log('【loadHoldings（個人）：壊れた重複データの自己修復】');
console.log('='.repeat(80));

{
  store = {};
  // mergeById導入前に書き込まれてしまった想定の、同一idを複数含む壊れたデータを直接注入。
  localStorage.setItem('lifeCompassAssetHoldings', JSON.stringify([dup('a', 100), dup('b', 200), dup('a', 100), dup('a', 100)]));

  const result = loadHoldings();
  record(
    '1. 壊れた重複データ（idが3回登場）を1回loadHoldings()するだけで1件に収束する',
    result.length === 2 && result.filter((h) => h.id === 'a').length === 1,
    JSON.stringify(result)
  );

  const persisted = JSON.parse(localStorage.getItem('lifeCompassAssetHoldings'));
  record(
    '2. 追加のsaveHoldings()呼び出しなしに、localStorage自体も重複排除された状態で保存し直されている',
    persisted.length === 2,
    JSON.stringify(persisted)
  );

  // ページを開いただけ（再インポート等の追加操作なし）で解消されることの確認：
  // 一度loadHoldings()した後、何もせずもう一度loadHoldings()しても安定して2件のまま。
  const second = loadHoldings();
  record('3. 続けてもう一度loadHoldings()しても件数が変化しない（安定）', second.length === 2, JSON.stringify(second));
}

{
  store = {};
  const clean = [dup('x', 100), dup('y', 200)];
  saveHoldings(clean);
  const result = loadHoldings();
  record(
    '4. 元々重複の無いクリーンなデータはそのまま変化しない',
    result.length === 2 && JSON.stringify(result) === JSON.stringify(clean),
    JSON.stringify(result)
  );
}

{
  store = {};
  record('5. データが存在しない場合は空配列を返す（例外を投げない）', JSON.stringify(loadHoldings()) === '[]');
}

// ================================================================
// SECTION 2: loadHojinHoldings（法人）— 同一の欠陥（§2で確認済み）の回帰テスト
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【loadHojinHoldings（法人）：壊れた重複データの自己修復】');
console.log('='.repeat(80));

{
  store = {};
  localStorage.setItem('hojinAssetHoldings', JSON.stringify([dupCorp('p', 300), dupCorp('q', 0), dupCorp('p', 300)]));

  const result = loadHojinHoldings();
  record(
    '6. 壊れた重複データ（idが2回登場）を1回loadHojinHoldings()するだけで1件に収束する',
    result.length === 2 && result.filter((h) => h.id === 'p').length === 1,
    JSON.stringify(result)
  );

  const persisted = JSON.parse(localStorage.getItem('hojinAssetHoldings'));
  record('7. localStorage自体も重複排除された状態で保存し直されている', persisted.length === 2, JSON.stringify(persisted));
}

{
  store = {};
  const clean = [dupCorp('m', 10)];
  saveHojinHoldings(clean);
  const result = loadHojinHoldings();
  record(
    '8. 元々重複の無いクリーンなデータはそのまま変化しない',
    result.length === 1 && JSON.stringify(result) === JSON.stringify(clean),
    JSON.stringify(result)
  );
}

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: loadHoldings/loadHojinHoldingsの重複排除・自己修復を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));

// full-verify.js内で後続スクリプトに影響しないよう、シムを後片付けする。
delete global.window;
delete global.localStorage;
