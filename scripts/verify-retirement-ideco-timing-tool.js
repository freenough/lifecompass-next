/**
 * scripts/verify-retirement-ideco-timing-tool.js
 * 第9弾ツール(退職金×iDeCo受給タイミング比較)の検証スクリプト。
 * verify-retirement-tax-tool.js・verify-ideco-withdrawal-tool.jsと同じ、
 * 手書きPASS/FAIL集計パターンに統一する。
 *
 * src/lib/tax/retirementIdecoTiming.ts(新ツール側)と、
 * src/lib/tax/retirement.ts の calcRetirementDeduction/calcRetirementIncomeTax
 * (再利用元・既存実装、無変更)を直接importして使う。独自の再実装は行わない
 * (整合性検証は既存関数を呼び出した結果同士の比較のみ)。
 *
 * 実行: node scripts/verify-retirement-ideco-timing-tool.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcOverlapYears,
  determineRuleApplicability,
  calculateSecondWithholdingTax,
  calcRetirementIdecoTiming,
} = require('../src/lib/tax/retirementIdecoTiming');
const { calcRetirementDeduction, calcRetirementIncomeTax } = require('../src/lib/tax/retirement');

let pass = 0, fail = 0;

function check(label, actual, expected, tolerance = 0) {
  const ok = tolerance > 0 ? Math.abs(actual - expected) <= tolerance : actual === expected;
  if (ok) {
    pass++;
    console.log(`[PASS] ${label} — actual=${actual} expected=${expected}`);
  } else {
    fail++;
    console.log(`[FAIL] ${label} — actual=${actual} expected=${expected}`);
  }
}

console.log('='.repeat(90));
console.log('【calcOverlapYears】D-3(1)の4パターン(指示書の検証表)');
console.log('='.repeat(90));

{
  // 完全重複: 勤続35年(25-60歳)・iDeCo20年(40-60歳)、退職金60歳・iDeCo60歳
  const r = calcOverlapYears(60, 35, 60, 20);
  check('完全重複:重複期間', r.overlapYears, 20);
  check('完全重複:合算勤続年数', r.combinedServiceYears, 35);
}
{
  // 一部重複: 勤続35年(25-60歳)・iDeCo20年(45-65歳)、退職金60歳・iDeCo65歳
  const r = calcOverlapYears(60, 35, 65, 20);
  check('一部重複:重複期間', r.overlapYears, 15);
  check('一部重複:合算勤続年数', r.combinedServiceYears, 40);
}
{
  // 隣接(重複なし): 勤続35年(25-60歳)・iDeCo5年(60-65歳)、退職金60歳・iDeCo65歳
  const r = calcOverlapYears(60, 35, 65, 5);
  check('隣接(重複なし):重複期間', r.overlapYears, 0);
  check('隣接(重複なし):合算勤続年数', r.combinedServiceYears, 40);
}
{
  // 完全分離: 勤続35年(25-60歳)・iDeCo5年(65-70歳)、退職金60歳・iDeCo70歳
  // (単純な「期間の外周」ではなく区間の積集合で計算することの確認が今回の修正ポイント)
  const r = calcOverlapYears(60, 35, 70, 5);
  check('完全分離:重複期間(0年になること)', r.overlapYears, 0);
  check('完全分離:合算勤続年数', r.combinedServiceYears, 40);
}

console.log('\n' + '='.repeat(90));
console.log('【determineRuleApplicability】適用ルール判定の境界値');
console.log('='.repeat(90));

{
  // iDeCoが先・受給間隔ちょうど9年 → 対象(10年ルール、前年以前9年内)
  const r = determineRuleApplicability(69, 60);
  check('iDeCo先・9年:order', r.order, 'ideco_first');
  check('iDeCo先・9年:appliedRule', r.appliedRule, 'ten_year_rule');
  check('iDeCo先・9年:対象', r.isAdjustmentApplicable, true);
}
{
  // iDeCoが先・受給間隔ちょうど10年 → 対象外(10年以上空いたので対象外)
  const r = determineRuleApplicability(70, 60);
  check('iDeCo先・10年:対象外', r.isAdjustmentApplicable, false);
}
{
  // 退職金が先・受給間隔ちょうど19年 → 対象
  const r = determineRuleApplicability(60, 79);
  check('退職金先・19年:order', r.order, 'retirement_first');
  check('退職金先・19年:appliedRule', r.appliedRule, 'nineteen_year_rule');
  check('退職金先・19年:対象', r.isAdjustmentApplicable, true);
}
{
  // 退職金が先・受給間隔ちょうど20年 → 対象外
  const r = determineRuleApplicability(60, 80);
  check('退職金先・20年:対象外', r.isAdjustmentApplicable, false);
}
{
  // 同一年齢(受給間隔0) → 「退職金が先」側(19年ルール)の判定に含める
  const r = determineRuleApplicability(60, 60);
  check('同一年齢:order', r.order, 'same_year');
  check('同一年齢:appliedRule', r.appliedRule, 'nineteen_year_rule');
  check('同一年齢:対象', r.isAdjustmentApplicable, true);
}

console.log('\n' + '='.repeat(90));
console.log('【calculateSecondWithholdingTax】マイナス時のフロア処理');
console.log('='.repeat(90));

check('合算税額 > 1回目税額:差額をそのまま返す', calculateSecondWithholdingTax(5000, 1000), 4000);
check('合算税額 < 1回目税額:0にフロアする', calculateSecondWithholdingTax(1000, 5000), 0);
check('合算税額 = 1回目税額:0', calculateSecondWithholdingTax(3000, 3000), 0);

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementDeduction再確認】D-3最終項目:既存ロジックの再確認(新規実装ではない)');
console.log('='.repeat(90));

check('勤続20年以下:40万円×勤続年数(20年→800万円)', calcRetirementDeduction(20, false), 8_000_000);
check('勤続20年超:800万円+70万円×超過年数(25年→1,150万円)', calcRetirementDeduction(25, false), 11_500_000);
check('80万円下限(1年→80万円)', calcRetirementDeduction(1, false), 800_000);

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementIdecoTiming】調整対象ケース:退職金が先(一部重複)');
console.log('='.repeat(90));

{
  const input = {
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 2000,
    idecoAge: 65, idecoYears: 20, idecoIncomeManYen: 1500,
  };
  const result = calcRetirementIdecoTiming(input);

  check('重複期間15年・合算勤続年数40年', result.overlap.overlapYears, 15);
  check('合算勤続年数', result.overlap.combinedServiceYears, 40);
  check('調整対象', result.rule.isAdjustmentApplicable, true);
  check('combinedがnullでない', result.combined !== null, true);

  // 既存関数を直接呼び出した独立計算で、同じ結果になることを確認する(再実装なし・整合性検証)
  const expectedFirst = calcRetirementIncomeTax(2000 * 10_000, 35, false, false);
  const expectedCombined = calcRetirementIncomeTax((2000 + 1500) * 10_000, 40, false, false);
  const expectedFirstTotalTax = expectedFirst.incomeTax + expectedFirst.residentTax.total;
  const expectedCombinedTotalTax = expectedCombined.incomeTax + expectedCombined.residentTax.total;
  const expectedSecondWithholding = Math.max(0, expectedCombinedTotalTax - expectedFirstTotalTax);
  const expectedTotalNet = (2000 + 1500) * 10_000 - expectedFirstTotalTax - expectedSecondWithholding;

  check('1回目源泉徴収税額(退職金の独立計算と一致)', result.firstWithholdingTax, expectedFirstTotalTax);
  check('2回目源泉徴収税額(合算-1回目の差額)', result.secondWithholdingTax, expectedSecondWithholding);
  check('手取り合計', result.totalNetAmount, expectedTotalNet);
}

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementIdecoTiming】調整対象ケース:iDeCoが先(10年ルール・受給間隔8年)');
console.log('='.repeat(90));

{
  const input = {
    retireAge: 68, serviceYears: 10, retireIncomeManYen: 1500,
    idecoAge: 60, idecoYears: 15, idecoIncomeManYen: 1800,
  };
  const result = calcRetirementIdecoTiming(input);

  check('order', result.rule.order, 'ideco_first');
  check('appliedRule', result.rule.appliedRule, 'ten_year_rule');
  check('調整対象', result.rule.isAdjustmentApplicable, true);
  check('合算勤続年数', result.overlap.combinedServiceYears, 23);

  const expectedFirst = calcRetirementIncomeTax(1800 * 10_000, 15, false, false); // iDeCoが1回目
  const expectedCombined = calcRetirementIncomeTax((1500 + 1800) * 10_000, 23, false, false);
  const expectedFirstTotalTax = expectedFirst.incomeTax + expectedFirst.residentTax.total;
  const expectedCombinedTotalTax = expectedCombined.incomeTax + expectedCombined.residentTax.total;
  const expectedSecondWithholding = Math.max(0, expectedCombinedTotalTax - expectedFirstTotalTax);

  check('1回目源泉徴収税額(iDeCoの独立計算と一致)', result.firstWithholdingTax, expectedFirstTotalTax);
  check('2回目源泉徴収税額(合算-1回目の差額)', result.secondWithholdingTax, expectedSecondWithholding);
}

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementIdecoTiming】調整対象外ケース:受給間隔30年(独立計算)');
console.log('='.repeat(90));

{
  const input = {
    retireAge: 60, serviceYears: 20, retireIncomeManYen: 1000,
    idecoAge: 90, idecoYears: 10, idecoIncomeManYen: 1000,
  };
  const result = calcRetirementIdecoTiming(input);

  check('対象外', result.rule.isAdjustmentApplicable, false);
  check('combinedがnull', result.combined, null);

  const expectedRetirement = calcRetirementIncomeTax(1000 * 10_000, 20, false, false);
  const expectedIdeco = calcRetirementIncomeTax(1000 * 10_000, 10, false, false);
  const expectedFirstTotalTax = expectedRetirement.incomeTax + expectedRetirement.residentTax.total;
  const expectedSecondTotalTax = expectedIdeco.incomeTax + expectedIdeco.residentTax.total;

  check('1回目(退職金)源泉徴収税額 = 独立計算', result.firstWithholdingTax, expectedFirstTotalTax);
  check('2回目(iDeCo)源泉徴収税額 = 独立計算', result.secondWithholdingTax, expectedSecondTotalTax);
  check('手取り合計 = 両者の独立netAmountの和', result.totalNetAmount, expectedRetirement.netAmount + expectedIdeco.netAmount);
}

console.log('\n' + '='.repeat(90));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
