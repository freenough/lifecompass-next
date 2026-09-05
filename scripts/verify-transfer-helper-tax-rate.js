/**
 * scripts/verify-transfer-helper-tax-rate.js
 * instruction_transfer_helper_tax_rate_fix.md の回帰テスト。
 *
 * 本番のcalcPersonalDelta（src/lib/hojinAssetManagement/transferHelper.ts）をそのまま
 * importして呼び出すだけで、独自の再実装は含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

const path = require('path');
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return originalResolveFilename.call(this, request, ...rest);
};

let pass = 0, fail = 0;
const failedCases = [];
function record(label, ok, detail) {
  if (ok) { pass++; } else { fail++; failedCases.push({ label, detail }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const { calcPersonalDelta } = require('../src/lib/hojinAssetManagement/transferHelper');

console.log('='.repeat(80));
console.log('【calcPersonalDelta：適用税率の計算式（個人側受取額＝移転額×(1−適用税率)）】');
console.log('='.repeat(80));

{
  const result = calcPersonalDelta('withdrawal', 100, 35);
  record('1. 移転額100万円・適用税率35%（新デフォルト）→個人側受取額65万円',
    result === 65, `result=${result}`);
}
{
  const result = calcPersonalDelta('withdrawal', 100, 0);
  record('2. 適用税率0%→個人側受取額は移転額そのまま(100万円)（税負担なしの境界値）',
    result === 100, `result=${result}`);
}
{
  const result = calcPersonalDelta('withdrawal', 100, 100);
  record('3. 適用税率100%→個人側受取額0万円（全額税金として失われる境界値）',
    result === 0, `result=${result}`);
}
{
  const result = calcPersonalDelta('withdrawal', 200, 45);
  record('4. 移転額200万円・適用税率45%→個人側受取額110万円',
    result === 110, `result=${result}`);
}
{
  const result = calcPersonalDelta('salary', 100, 35);
  record('5. 役員報酬・給与モードは税率を適用せず全額(100万円)がそのまま個人側へ（既存仕様）',
    result === 100, `result=${result}`);
}
{
  // 修正前の実装（amount * rate / 100）ならここは35万円になっていたはずの回帰確認。
  const result = calcPersonalDelta('withdrawal', 100, 35);
  record('6. 修正前の計算式(移転額×適用税率/100=35万円)には一致しない（向きが逆でないことの確認）',
    result !== 35, `result=${result}`);
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: 資産移転ヘルパーの適用税率計算式修正を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));

Module._resolveFilename = originalResolveFilename;
