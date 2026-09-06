/**
 * scripts/verify-asset-composition-bar.js
 * instruction_asset_management_page_layout_review.md 0.4節の回帰テスト：
 * 「個人資産＋法人保有資産」内訳バーが、目標資産額に対する比率ではなく、
 * 個人資産＋法人保有資産の合計を100%とした内訳のみを示す方式になっていることを確認する。
 *
 * 本番のcalcCompositionPercentages（src/lib/hojinAssetManagement/compositionBar.ts）を
 * そのままimportして呼び出すだけで、独自の再実装は含まない。
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

const { calcCompositionPercentages } = require('../src/lib/hojinAssetManagement/compositionBar');

console.log('='.repeat(80));
console.log('【calcCompositionPercentages：個人資産＋法人保有資産の合計を100%とした内訳】');
console.log('='.repeat(80));

{
  // 目標資産額が10,000万円あっても、個人585万円・法人300万円の合計885万円を基準に
  // 分割される（目標資産額の値自体は一切引数に取らない＝計算方式から完全に切り離されている）。
  const { personalPct, hojinPct } = calcCompositionPercentages(585, 300);
  record('1. 個人585万円・法人300万円→常に合計885万円が100%になる（personalPct+hojinPct=100）',
    Math.abs(personalPct + hojinPct - 100) < 1e-9, `personalPct=${personalPct}, hojinPct=${hojinPct}`);
  record('2. personalPct=585/885*100≈66.1%', Math.abs(personalPct - (585 / 885) * 100) < 1e-9, `personalPct=${personalPct}`);
}
{
  const { personalPct, hojinPct } = calcCompositionPercentages(0, 0);
  record('3. 両方0円でもゼロ除算エラーにならず、hojinPct=100（境界値）',
    personalPct === 0 && hojinPct === 100, `personalPct=${personalPct}, hojinPct=${hojinPct}`);
}
{
  const { personalPct, hojinPct } = calcCompositionPercentages(1000, 0);
  record('4. 法人資産0円→personalPct=100%・hojinPct=0%（バーは常に満幅のまま個人資産のみ表示）',
    personalPct === 100 && hojinPct === 0, `personalPct=${personalPct}, hojinPct=${hojinPct}`);
}
{
  const { personalPct, hojinPct } = calcCompositionPercentages(0, 1000);
  record('5. 個人資産0円→personalPct=0%・hojinPct=100%',
    personalPct === 0 && hojinPct === 100, `personalPct=${personalPct}, hojinPct=${hojinPct}`);
}

console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: 内訳バーが目標資産額から独立した計算方式になっていることを確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));

Module._resolveFilename = originalResolveFilename;
