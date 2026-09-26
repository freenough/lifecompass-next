/**
 * scripts/verify-personalization-ratio.js
 * instruction_remove_transfer_helper_and_update_personalization_ratio.md の回帰テスト。
 *   0.2節：個人化想定比率（「適用税率」表示に変更）のデフォルト値70→25
 *   0.4節：「個人＋法人（個人化後）」合計行の計算
 *
 * 本番のloadPersonalizationRatio（src/lib/hojinAssetManagement/storage.ts）・
 * calcPersonalizedAmount/calcCombinedTotal（src/lib/hojinAssetManagement/personalization.ts）を
 * そのままimportして呼び出すだけで、独自の再実装は含まない。
 */

require('./lib/registerTsNode');

const path = require('path');
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return originalResolveFilename.call(this, request, ...rest);
};

let store = {};
global.window = global.window || {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};

let pass = 0, fail = 0;
const failedCases = [];
function record(label, ok, detail) {
  if (ok) { pass++; } else { fail++; failedCases.push({ label, detail }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const { loadPersonalizationRatio, savePersonalizationRatio } = require('../src/lib/hojinAssetManagement/storage');
const { calcPersonalizedAmount, calcCombinedTotal } = require('../src/lib/hojinAssetManagement/personalization');

console.log('='.repeat(80));
console.log('【loadPersonalizationRatio：デフォルト値70→25】');
console.log('='.repeat(80));

{
  store = {};
  const ratio = loadPersonalizationRatio();
  record('1. 未保存の状態（localStorageに値なし）→デフォルト値25', ratio === 25, `ratio=${ratio}`);
}
{
  store = {};
  savePersonalizationRatio(40);
  const ratio = loadPersonalizationRatio();
  record('2. 保存済みの値がある場合はその値をそのまま返す（デフォルト値に上書きされない）',
    ratio === 40, `ratio=${ratio}`);
}

console.log('\n' + '='.repeat(80));
console.log('【calcPersonalizedAmount / calcCombinedTotal：「個人＋法人（個人化後）」合計行】');
console.log('='.repeat(80));

// fix_hojin_personalization_rate.md：適用税率は負担率なので、個人化想定額＝法人保有資産×(100−適用税率)%。
{
  const result = calcPersonalizedAmount(1000, 25);
  record('3. 法人保有資産1000万円・適用税率25%（デフォルト）→個人化想定額750万円',
    result === 750, `result=${result}`);
}
{
  const result = calcCombinedTotal(585, 1000, 25);
  record('4. 個人資産585万円＋法人保有資産1000万円×(100−25)%（750万円）→個人＋法人（個人化後）1335万円',
    result === 1335, `result=${result}`);
}
{
  const result = calcCombinedTotal(585, 1000, 0);
  record('5. 適用税率0%→個人＋法人（個人化後）は個人資産＋法人保有資産全額(1585万円)',
    result === 1585, `result=${result}`);
}
{
  const result = calcCombinedTotal(585, 1000, 100);
  record('6. 適用税率100%→個人＋法人（個人化後）は個人資産のみ(585万円)',
    result === 585, `result=${result}`);
}
{
  // スライダーを動かした際に連動して変わることの確認（同じhojinTotal・personalTotalで比率だけ変える）。
  const before = calcCombinedTotal(500, 800, 20);
  const after = calcCombinedTotal(500, 800, 60);
  record('7. 比率を20%→60%に変更すると、個人＋法人（個人化後）の合計も連動して変わる（320万円減）',
    before - after === 320 && before === 1140 && after === 820, `before=${before}, after=${after}`);
}
{
  const result = calcPersonalizedAmount(1000, 42);
  record('8. 法人保有資産1000万円・適用税率42%→個人化想定額580万円',
    result === 580, `result=${result}`);
}
{
  const result = calcPersonalizedAmount(1000, 0);
  record('9. 法人保有資産1000万円・適用税率0%→個人化想定額1000万円（全額）',
    result === 1000, `result=${result}`);
}
{
  const result = calcPersonalizedAmount(1000, 100);
  record('10. 法人保有資産1000万円・適用税率100%→個人化想定額0万円',
    result === 0, `result=${result}`);
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: 個人化想定比率のデフォルト値変更・合計行の計算を確認しました。');
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
Module._resolveFilename = originalResolveFilename;
