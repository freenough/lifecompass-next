/**
 * scripts/verify-csv-profile-scope-fix.js
 * claude_instruction_phase2_yojitsu_csv_profile_scope_fix.md の回帰テスト。
 *
 * 修正前のバグ：
 *   1. rowToHolding()がprofileIdを常に'default'固定で書き込んでいた（実際にアクティブな
 *      プロファイルを使っていなかった）
 *   2. applyGroupsToStore()が、全プロファイル分がフラットに入ったグローバル配列（holdings/
 *      snapshots）を「CSVの今月分行のみ」で丸ごと置換していた（profileIdによるスコープ
 *      絞り込みが無かった）
 * この2つが組み合わさり、'default'以外のプロファイル（新規作成したプロファイルは全てこれに
 * 該当）でCSVインポートを行うと、他プロファイル（インポートを実行した当人のプロファイル含む）
 * の保有資産・スナップショットが全滅していた（claude_investigation_phase2_yojitsu_csv_import_
 * bug_v2.mdで実機再現・確認済み）。
 *
 * 本テストは、修正後にプロファイルの独立性が保たれていることを検証する。localStorageシムを
 * 使うため、他のスクリプトへの影響を避けるためfull-verify.js内で最後の方で実行する。
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
const { loadHoldings, saveHoldings, loadSnapshots, saveSnapshots } = require('../src/lib/assetManagement/storage');
const {
  loadHojinHoldings, saveHojinHoldings,
  loadSnapshots: loadHojinSnapshots, saveSnapshots: saveHojinSnapshots,
} = require('../src/lib/hojinAssetManagement/storage');

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

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function currentYearMonthCompact() {
  return currentYearMonth().replace('-', '');
}

// ================================================================
// SECTION 1: 個人側 — プロファイルAでインポート→プロファイルBが無変化
// ================================================================
console.log('='.repeat(80));
console.log('【個人側】プロファイルAでCSVインポート→プロファイルBの保有資産・記録が無変化');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const nowYMCompact = currentYearMonthCompact();

  // プロファイルBの既存データを用意（Aのインポートに巻き込まれないことを検証する対象）
  saveHoldings([
    { id: 'bh1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 777, updatedAt: '', profileId: 'profileB' },
  ]);
  saveSnapshots([
    { date: '2026-05', holdings: [{ id: 'bs1', owner: 'personal', accountCategory: 'NISA', assetClass: '全世界株', amount: 555, updatedAt: '', profileId: 'profileB' }], totalAmount: 555, profileId: 'profileB' },
  ]);

  // プロファイルAが今月分のCSVをインポート
  const text = csvText([`ah1,${nowYMCompact},現金,現金,本人,100,`]);
  const parsed = parseAssetCsv(text, 'profileA');
  applyAssetCsv(parsed, 'profileA');

  record(
    '1. Bの保有資産(profileB)がそのまま残る',
    loadHoldings().some((h) => h.id === 'bh1' && h.profileId === 'profileB' && h.amount === 777),
    JSON.stringify(loadHoldings())
  );
  record(
    '2. Bのスナップショット(profileB)がそのまま残る',
    loadSnapshots().some((s) => s.profileId === 'profileB' && s.date === '2026-05' && s.totalAmount === 555),
    JSON.stringify(loadSnapshots())
  );
  record(
    '3. Aの保有資産がprofileId=profileAで正しく反映される（defaultではない）',
    loadHoldings().some((h) => h.id === 'ah1' && h.profileId === 'profileA' && h.amount === 100),
    JSON.stringify(loadHoldings())
  );
  record(
    '4. 保有資産の総件数はA1件+B1件=2件のまま（Bが消えていない）',
    loadHoldings().length === 2,
    JSON.stringify(loadHoldings())
  );
  record(
    '5. nowYM以外の月（2026-05）はCSVに含まれていなくても一切変化しない',
    loadSnapshots().find((s) => s.date === '2026-05').totalAmount === 555,
    JSON.stringify(loadSnapshots())
  );
}

// ================================================================
// SECTION 2: 個人側 — 同一年月でも他プロファイルのスナップショットは独立
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【個人側】同一年月(2026-04)でも他プロファイルのスナップショットは独立して保持される');
console.log('='.repeat(80));

{
  store = {};
  saveSnapshots([
    { date: '2026-04', holdings: [{ id: 'b1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 400, updatedAt: '', profileId: 'profileB' }], totalAmount: 400, profileId: 'profileB' },
  ]);
  const text = csvText(['a1,202604,現金,現金,本人,900,']);
  const parsed = parseAssetCsv(text, 'profileA');
  applyAssetCsv(parsed, 'profileA');

  record(
    '6. 同一年月(2026-04)でもprofileBのスナップショットは変化しない',
    loadSnapshots().some((s) => s.date === '2026-04' && s.profileId === 'profileB' && s.totalAmount === 400),
    JSON.stringify(loadSnapshots())
  );
  record(
    '7. profileAの2026-04スナップショットが新規に(profileB側とは別に)追加される',
    loadSnapshots().some((s) => s.date === '2026-04' && s.profileId === 'profileA' && s.totalAmount === 900),
    JSON.stringify(loadSnapshots())
  );
  record(
    '8. 2026-04のスナップショットは2件（profileA・profileBそれぞれ独立）になる',
    loadSnapshots().filter((s) => s.date === '2026-04').length === 2,
    JSON.stringify(loadSnapshots())
  );
}

// ================================================================
// SECTION 3: 個人側 — 対象外の年月は消えない
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【個人側】同一プロファイル内でも、CSVに含まれない年月のデータは消えない');
console.log('='.repeat(80));

{
  store = {};
  const nowYM = currentYearMonth();
  const nowYMCompact = currentYearMonthCompact();
  saveSnapshots([
    { date: '2026-03', holdings: [{ id: 'old1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 200, updatedAt: '', profileId: 'profileA' }], totalAmount: 200, profileId: 'profileA' },
  ]);
  const text = csvText([`new1,${nowYMCompact},NISA,全世界株,本人,300,`]);
  const parsed = parseAssetCsv(text, 'profileA');
  applyAssetCsv(parsed, 'profileA');

  record(
    '9. CSVに含まれない2026-03のスナップショット（同一プロファイル）はそのまま残る',
    loadSnapshots().some((s) => s.date === '2026-03' && s.profileId === 'profileA' && s.totalAmount === 200),
    JSON.stringify(loadSnapshots())
  );
}

// ================================================================
// SECTION 4: 法人側 — プロファイルAでインポート→プロファイルBが無変化（個人側と対称）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【法人側】プロファイルAでCSVインポート→プロファイルBの法人保有資産・記録が無変化');
console.log('='.repeat(80));

{
  store = {};
  const nowYMCompact = currentYearMonthCompact();

  saveHojinHoldings([
    { id: 'bhj1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 888, updatedAt: '', profileId: 'profileB' },
  ]);
  saveHojinSnapshots([
    {
      date: '2026-05',
      hojinHoldings: [{ id: 'bhjs1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 666, updatedAt: '', profileId: 'profileB' }],
      personalHoldings: [],
      totalHojinAmount: 666,
      totalPersonalAmount: 0,
      profileId: 'profileB',
    },
  ]);

  const text = csvText([`ahj1,${nowYMCompact},法人預金,現金,法人,111,`]);
  const parsed = parseAssetCsv(text, 'profileA');
  applyAssetCsv(parsed, 'profileA');

  record(
    '10. 法人側：Bの保有資産(profileB)がそのまま残る',
    loadHojinHoldings().some((h) => h.id === 'bhj1' && h.profileId === 'profileB' && h.amount === 888),
    JSON.stringify(loadHojinHoldings())
  );
  record(
    '11. 法人側：Bのスナップショット(profileB)がそのまま残る',
    loadHojinSnapshots().some((s) => s.profileId === 'profileB' && s.date === '2026-05' && s.totalHojinAmount === 666),
    JSON.stringify(loadHojinSnapshots())
  );
  record(
    '12. 法人側：Aの保有資産がprofileId=profileAで正しく反映される',
    loadHojinHoldings().some((h) => h.id === 'ahj1' && h.profileId === 'profileA' && h.amount === 111),
    JSON.stringify(loadHojinHoldings())
  );
  record(
    '13. 法人側：保有資産の総件数はA1件+B1件=2件のまま',
    loadHojinHoldings().length === 2,
    JSON.stringify(loadHojinHoldings())
  );
}

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: CSVインポートが現在アクティブなプロファイルの範囲だけに閉じて動作することを確認しました。');
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
