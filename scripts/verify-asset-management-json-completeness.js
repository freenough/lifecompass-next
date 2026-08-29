/**
 * scripts/verify-asset-management-json-completeness.js
 * json_export_completeness_and_history_bug.md・json_import_replace_not_merge.mdの回帰テスト。
 *   1章：JSON Exportが法人スナップショット自身の古いpersonalHoldings/totalPersonalAmount
 *        （記録タイミングによって歯抜けになりうる表示用の複製）をそのまま書き出していた
 *        バグの修正（withCorrectedHojinSnapshots）。
 *   2章：JSON Exportに不足していた設定値（目標資産額・個人化想定比率）・移転履歴ログを追加。
 *   3章（json_import_replace_not_merge.md）：JSON Importはペイロードに含まれる範囲を
 *        「マージ」ではなく「置き換え」る（バックアップ時点の状態に戻す＝ペイロードに存在
 *        しないデータは削除される）ことの確認。
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
const { loadTargetAmount, loadSnapshots, loadHoldings, saveHoldings, saveTargetAmount } = require('../src/lib/assetManagement/storage');
const {
  loadTargetAmount: loadHojinTargetAmount,
  loadPersonalizationRatio,
  loadSnapshots: loadHojinSnapshots,
  loadHojinHoldings,
  saveHojinHoldings,
} = require('../src/lib/hojinAssetManagement/storage');
const { loadTransferLog } = require('../src/lib/hojinAssetManagement/transferLog');
const { MAX_SNAPSHOTS } = require('../src/lib/assetManagement/config');

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
console.log('【parseJsonPayload（hasContent：確認ダイアログを出すかどうかの判定）】');
console.log('='.repeat(80));

{
  const withData = JSON.stringify({ version: 1, holdings: [{ id: 'a', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 1, updatedAt: '' }], snapshots: [], hojinHoldings: [], hojinSnapshots: [] });
  const parsed = parseJsonPayload(withData);
  record('3. holdingsを含む新形式：hasContent=true', parsed.hasContent === true && parsed.isOldHojinFormat === false, JSON.stringify(parsed));
}
{
  const withSettingsOnly = JSON.stringify({ version: 1, targetAmount: 5000 });
  const parsed = parseJsonPayload(withSettingsOnly);
  record('4. 設定値のみでもhasContent=true（設定値も置き換え対象のため）', parsed.hasContent === true, JSON.stringify(parsed));
}
{
  const empty = JSON.stringify({ version: 1 });
  const parsed = parseJsonPayload(empty);
  record('5. 認識可能なキーを1つも含まない場合はhasContent=false', parsed.hasContent === false, JSON.stringify(parsed));
}
{
  const oldHojin = JSON.stringify({ version: 1, scope: 'combined', hojinHoldings: [{ id: 'c1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 1, updatedAt: '' }], snapshots: [] });
  const parsed = parseJsonPayload(oldHojin);
  record('6. 旧法人形式（scopeキーあり）：isOldHojinFormat=true・hojinHoldingsがあればhasContent=true', parsed.isOldHojinFormat === true && parsed.hasContent === true, JSON.stringify(parsed));
}

console.log('\n' + '='.repeat(80));
console.log('【json_import_replace_not_merge.md 1章：applyJsonPayloadはマージではなく置き換え】');
console.log('='.repeat(80));

{
  // バックアップ取得後に増えたデータ（persNew）がある状態で、バックアップ時点のholdings
  // （persOld1件のみ）をImportすると、persNewは消え、persOld1件だけの状態に戻るはず。
  store = {};
  saveHoldings([
    { id: 'persOld', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 100, updatedAt: '' },
    { id: 'persNew', owner: 'personal', accountCategory: 'NISA', assetClass: '全世界株', amount: 200, updatedAt: '' },
  ]);
  const backupPayload = JSON.stringify({
    version: 1,
    holdings: [{ id: 'persOld', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 100, updatedAt: '' }],
    snapshots: [], hojinHoldings: [], hojinSnapshots: [],
  });
  const parsed = parseJsonPayload(backupPayload);
  const result = applyJsonPayload(parsed);

  record(
    '7. holdings：バックアップ後に増えたpersNewが消え、バックアップ時点のpersOldだけになる（マージではなく置き換え）',
    result.holdings.length === 1 && result.holdings[0].id === 'persOld',
    JSON.stringify(result.holdings)
  );
  record('8. loadHoldings()でも実際にlocalStorageから消えている', loadHoldings().length === 1 && loadHoldings()[0].id === 'persOld', JSON.stringify(loadHoldings()));
}
{
  // snapshots（記録履歴）も同様：バックアップに無い年月（2026-08）は削除される。
  store = {};
  const { saveSnapshots } = require('../src/lib/assetManagement/storage');
  saveSnapshots([
    { date: '2026-07', holdings: [], totalAmount: 250, profileId: 'default' },
    { date: '2026-08', holdings: [], totalAmount: 999, profileId: 'default' }, // バックアップ後に追加された記録（想定）
  ]);
  const backupPayload = JSON.stringify({
    version: 1, holdings: [],
    snapshots: [{ date: '2026-07', holdings: [], totalAmount: 250, profileId: 'default' }],
    hojinHoldings: [], hojinSnapshots: [],
  });
  const parsed = parseJsonPayload(backupPayload);
  const result = applyJsonPayload(parsed);
  record(
    '9. snapshots：ペイロードに存在しない2026-08の記録が削除され、2026-07だけが残る',
    result.snapshots.length === 1 && result.snapshots[0].date === '2026-07',
    JSON.stringify(result.snapshots)
  );
  record('10. loadSnapshots()でも実際にlocalStorageから消えている', loadSnapshots().length === 1, JSON.stringify(loadSnapshots()));
}
{
  // hojinHoldings/hojinSnapshotsも対称に置き換えになる。
  store = {};
  saveHojinHoldings([
    { id: 'corpOld', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 500, updatedAt: '' },
    { id: 'corpNew', owner: 'corporate', accountCategory: '法人証券口座', assetClass: '全世界株', amount: 700, updatedAt: '' },
  ]);
  const backupPayload = JSON.stringify({
    version: 1, holdings: [], snapshots: [],
    hojinHoldings: [{ id: 'corpOld', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 500, updatedAt: '' }],
    hojinSnapshots: [],
  });
  const parsed = parseJsonPayload(backupPayload);
  const result = applyJsonPayload(parsed);
  record(
    '11. hojinHoldings：バックアップ後に増えたcorpNewが消え、corpOldだけになる',
    result.hojinHoldings.length === 1 && result.hojinHoldings[0].id === 'corpOld',
    JSON.stringify(result.hojinHoldings)
  );
  record('12. loadHojinHoldings()でも実際にlocalStorageから消えている', loadHojinHoldings().length === 1, JSON.stringify(loadHojinHoldings()));
}
{
  // 移転履歴ログも置き換えに変更（以前はid一致マージだった）。既存ログ（logOld）がある状態で、
  // 別のログ（logBackup）だけを含むペイロードをImportすると、logOldは消える。
  store = {};
  const payload1 = JSON.stringify({
    version: 1, holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [],
    transferLog: [{ id: 'logOld', executedAt: '2026-01-01T00:00:00.000Z', mode: 'withdrawal', amount: 100, appliedRate: 70, hojinDelta: -100, personalDelta: 70 }],
  });
  applyJsonPayload(parseJsonPayload(payload1));
  record('13. 前提：logOldが一旦保存されている', loadTransferLog().length === 1 && loadTransferLog()[0].id === 'logOld', JSON.stringify(loadTransferLog()));

  const payload2 = JSON.stringify({
    version: 1, holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [],
    transferLog: [{ id: 'logBackup', executedAt: '2026-02-01T00:00:00.000Z', mode: 'salary', amount: 200, appliedRate: null, hojinDelta: -200, personalDelta: 200 }],
  });
  applyJsonPayload(parseJsonPayload(payload2));
  const log = loadTransferLog();
  record(
    '14. 移転履歴ログ：logOldが消え、logBackupだけの状態に置き換わる（id一致マージではない）',
    log.length === 1 && log[0].id === 'logBackup',
    JSON.stringify(log)
  );
}
{
  // 設定値は元々「上書き」であり変更不要（指示書1章：念のため確認）。
  store = {};
  saveTargetAmount(1234);
  const payload = JSON.stringify({ version: 1, holdings: [], snapshots: [], hojinHoldings: [], hojinSnapshots: [], targetAmount: 9999 });
  applyJsonPayload(parseJsonPayload(payload));
  record('15. 設定値（目標資産額）は引き続き上書きされる（変更不要の確認）', loadTargetAmount() === 9999, `actual=${loadTargetAmount()}`);
}
{
  // 旧法人形式（scopeキーあり）をImportしても、設定値には一切触れない（isOldHojinFormatのガード確認）。
  store = {};
  saveTargetAmount(1234);
  const oldHojin = JSON.stringify({ version: 1, scope: 'combined', hojinHoldings: [{ id: 'c1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 100, updatedAt: '' }], snapshots: [] });
  const parsed = parseJsonPayload(oldHojin);
  applyJsonPayload(parsed);
  record('16. 旧法人形式のImportでは個人のtargetAmountに一切触れない', loadTargetAmount() === 1234, `actual=${loadTargetAmount()}`);
}
{
  // ペイロードに含まれないキー（法人データ）には一切触れない（指示書1章：置き換えの対象は
  // 「ペイロードに存在する範囲」だけ）。
  store = {};
  saveHojinHoldings([{ id: 'corpKeep', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 999, updatedAt: '' }]);
  const personalOnlyPayload = JSON.stringify({ version: 1, holdings: [{ id: 'p1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 1, updatedAt: '' }], snapshots: [] });
  applyJsonPayload(parseJsonPayload(personalOnlyPayload));
  record(
    '17. hojinHoldingsキーを含まないJSONをImportしても、法人データには一切触れない',
    loadHojinHoldings().length === 1 && loadHojinHoldings()[0].id === 'corpKeep',
    JSON.stringify(loadHojinHoldings())
  );
}

console.log('\n' + '='.repeat(80));
console.log('【保存上限（MAX_SNAPSHOTS）：ペイロード自体がMAX_SNAPSHOTSを超える場合のtrimmed/removed】');
console.log('='.repeat(80));

{
  // 置き換え方式では既存データは無関係になるため、トリミングが発生しうるのは
  // 「ペイロード自体がMAX_SNAPSHOTSを超える」場合のみ。
  store = {};
  const bigPayloadSnapshots = Array.from({ length: MAX_SNAPSHOTS + 4 }, (_, i) => {
    const y = 1990 + Math.floor(i / 12);
    const m = String((i % 12) + 1).padStart(2, '0');
    return { date: `${y}-${m}`, holdings: [], totalAmount: i, profileId: 'default' };
  });
  const payload = JSON.stringify({ version: 1, holdings: [], snapshots: bigPayloadSnapshots, hojinHoldings: [], hojinSnapshots: [] });
  const parsed = parseJsonPayload(payload);
  const result = applyJsonPayload(parsed);

  record(
    '18. ペイロード自体がMAX_SNAPSHOTS超過時、戻り値のsnapshotsが実際の保存件数（trimmed後）と一致する',
    result.snapshots.length === MAX_SNAPSHOTS && loadSnapshots().length === MAX_SNAPSHOTS,
    `result.snapshots.length=${result.snapshots.length}, loadSnapshots().length=${loadSnapshots().length}`
  );
  record('19. 超過分がresult.removedとして呼び出し側へ通知される', result.removed.length === 4, `removed.length=${result.removed.length}`);
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: JSON Exportの完全性・過去月断面バグ修正・Importの置き換え方式を確認しました。');
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
