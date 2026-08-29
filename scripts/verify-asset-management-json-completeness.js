/**
 * scripts/verify-asset-management-json-completeness.js
 * json_export_completeness_and_history_bug.md の回帰テスト。
 *   1章：JSON Exportが法人スナップショット自身の古いpersonalHoldings/totalPersonalAmount
 *        （記録タイミングによって歯抜けになりうる表示用の複製）をそのまま書き出していた
 *        バグの修正（withCorrectedHojinSnapshots）。
 *   2章：JSON Exportに不足していた設定値（目標資産額・個人化想定比率）・移転履歴ログを追加し、
 *        JSON Importでも正しく適用される（設定値は上書き、移転ログはid一致でマージ）ことの確認。
 * 本番のwithCorrectedHojinSnapshots/parseJsonPayload/applyJsonPayloadを直接importして
 * 呼び出すだけで、独自の再実装は含まない。exportToJson自体はdocument/URL.createObjectURLに
 * 依存するためNode上では直接呼べず、ブラウザ実機での確認と役割分担する。
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

const { withCorrectedHojinSnapshots, parseJsonPayload, applyJsonPayload } = require('../src/lib/assetManagement/exportImport');
const { loadTargetAmount } = require('../src/lib/assetManagement/storage');
const { loadTargetAmount: loadHojinTargetAmount, loadPersonalizationRatio } = require('../src/lib/hojinAssetManagement/storage');
const { loadTransferLog } = require('../src/lib/hojinAssetManagement/transferLog');

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

console.log('='.repeat(80));
console.log('【1章：withCorrectedHojinSnapshots（JSON Exportの過去月断面バグ修正）】');
console.log('='.repeat(80));

{
  const hojinSnapshots = [
    { date: '2026-07', hojinHoldings: [], personalHoldings: [], totalHojinAmount: 900, totalPersonalAmount: 0, profileId: 'default' },
  ];
  const personalSnapshots = [
    { date: '2026-07', holdings: [{ id: 'p1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 250, updatedAt: '' }], totalAmount: 250, profileId: 'default' },
  ];
  const result = withCorrectedHojinSnapshots(hojinSnapshots, personalSnapshots);
  record(
    '1. 個人ストア自身の真の記録履歴と一致する年月は、personalHoldings/totalPersonalAmountが補正される',
    result[0].totalPersonalAmount === 250 && result[0].personalHoldings.length === 1 && result[0].personalHoldings[0].id === 'p1',
    JSON.stringify(result[0])
  );
}
{
  const hojinSnapshots = [
    { date: '2026-06', hojinHoldings: [], personalHoldings: [], totalHojinAmount: 500, totalPersonalAmount: 0, profileId: 'default' },
  ];
  const result = withCorrectedHojinSnapshots(hojinSnapshots, []); // 個人側に一致する記録が無い
  record(
    '2. 一致する個人記録が無い年月は、元の値のままフォールバックする（データを失わない）',
    result[0].totalPersonalAmount === 0 && result[0].date === '2026-06',
    JSON.stringify(result[0])
  );
}

console.log('\n' + '='.repeat(80));
console.log('【2章：parseJsonPayload（設定値・移転ログの有無検出）】');
console.log('='.repeat(80));

{
  const withSettings = JSON.stringify({ version: 1, holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [], targetAmount: 5000, hojinTargetAmount: 3000, personalizationRatio: 70, transferLog: [] });
  const parsed = parseJsonPayload(withSettings);
  record('3. targetAmount等を含む新形式：includesSettings=true', parsed.includesSettings === true && parsed.isOldHojinFormat === false, JSON.stringify(parsed));
}
{
  const withoutSettings = JSON.stringify({ version: 1, holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [] });
  const parsed = parseJsonPayload(withoutSettings);
  record('4. 設定値を含まない新形式：includesSettings=false', parsed.includesSettings === false, JSON.stringify(parsed));
}
{
  const oldHojin = JSON.stringify({ version: 1, scope: 'combined', hojinHoldings: [], snapshots: [] });
  const parsed = parseJsonPayload(oldHojin);
  record('5. 旧法人形式（scopeキーあり）：isOldHojinFormat=true・includesSettings=false', parsed.isOldHojinFormat === true && parsed.includesSettings === false, JSON.stringify(parsed));
}

console.log('\n' + '='.repeat(80));
console.log('【2章：applyJsonPayload（設定値は上書き、移転ログはid一致でマージ）】');
console.log('='.repeat(80));

{
  store = {};
  const payload = JSON.stringify({
    version: 1,
    holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [],
    targetAmount: 8000,
    hojinTargetAmount: 4000,
    personalizationRatio: 65,
    transferLog: [
      { id: 'log1', executedAt: '2026-01-01T00:00:00.000Z', mode: 'withdrawal', amount: 100, appliedRate: 70, hojinDelta: -100, personalDelta: 70 },
    ],
  });
  const parsed = parseJsonPayload(payload);
  applyJsonPayload(parsed);

  record('6. targetAmount（個人）が実際にlocalStorageへ上書きされている', loadTargetAmount() === 8000, `actual=${loadTargetAmount()}`);
  record('7. hojinTargetAmount（法人）が実際にlocalStorageへ上書きされている', loadHojinTargetAmount() === 4000, `actual=${loadHojinTargetAmount()}`);
  record('8. personalizationRatioが実際にlocalStorageへ上書きされている', loadPersonalizationRatio() === 65, `actual=${loadPersonalizationRatio()}`);
  record(
    '9. 移転履歴ログが実際にlocalStorageへ反映されている（新規追加）',
    loadTransferLog().length === 1 && loadTransferLog()[0].id === 'log1',
    JSON.stringify(loadTransferLog())
  );
}
{
  // 既存ログ（log1）がある状態で、同じidの更新1件・新規1件を含むJSONを取り込む → id一致は上書き、不一致は追加。
  const payload = JSON.stringify({
    version: 1,
    holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [],
    transferLog: [
      { id: 'log1', executedAt: '2026-01-01T00:00:00.000Z', mode: 'withdrawal', amount: 999, appliedRate: 70, hojinDelta: -999, personalDelta: 700 },
      { id: 'log2', executedAt: '2026-02-01T00:00:00.000Z', mode: 'salary', amount: 200, appliedRate: null, hojinDelta: -200, personalDelta: 200 },
    ],
  });
  const parsed = parseJsonPayload(payload);
  applyJsonPayload(parsed);

  const log = loadTransferLog();
  record(
    '10. 移転履歴ログ：id一致（log1）は上書き、不一致（log2）は追加。既存ログを失わない',
    log.length === 2 && log.find((e) => e.id === 'log1').amount === 999 && log.find((e) => e.id === 'log2').amount === 200,
    JSON.stringify(log)
  );
}
{
  // 旧法人形式（scopeキーあり）をImportしても、設定値には一切触れない（isOldHojinFormatのガード確認）。
  store = {};
  const { saveTargetAmount } = require('../src/lib/assetManagement/storage');
  saveTargetAmount(1234);
  const oldHojin = JSON.stringify({ version: 1, scope: 'combined', hojinHoldings: [{ id: 'c1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 100, updatedAt: '' }], snapshots: [] });
  const parsed = parseJsonPayload(oldHojin);
  applyJsonPayload(parsed);
  record('11. 旧法人形式のImportでは個人のtargetAmountに一切触れない', loadTargetAmount() === 1234, `actual=${loadTargetAmount()}`);
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: JSON Exportの過去月断面バグ修正・設定値/移転ログの完全性を確認しました。');
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
