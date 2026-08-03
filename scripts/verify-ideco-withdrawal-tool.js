/**
 * scripts/verify-ideco-withdrawal-tool.js
 * 第6弾ツール(iDeCo/DC出口戦略シミュレーター)の検証スクリプト。
 * src/lib/tax/ideco.ts・src/lib/tax/retirement.ts を直接importして使う。
 * 独自の再実装は行わない(期待値は国税庁一次情報の速算表・計算式を手計算したもの)。
 *
 * 実行: node scripts/verify-ideco-withdrawal-tool.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcPublicPensionDeduction,
  calcPublicPensionTaxableIncome,
  calcComprehensiveIncomeTax,
  calcIdecoLumpSumTax,
  calcMixedPattern,
  calcLumpSumPattern,
  calcPensionPattern,
} = require('../src/lib/tax/ideco');
const { calcRetirementIncomeTax } = require('../src/lib/tax/retirement');

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
console.log('【calcPublicPensionDeduction】速算表境界値(65歳以上/未満)');
console.log('='.repeat(90));

// 65歳以上
check('65歳以上・330万円未満(300万円)→定額110万円', calcPublicPensionDeduction(3_000_000, 65), 1_100_000);
check('65歳以上・境界330万円ちょうど→25%+27.5万円区分', calcPublicPensionDeduction(3_300_000, 65), 1_100_000);
check('65歳以上・境界410万円ちょうど→15%+68.5万円区分', calcPublicPensionDeduction(4_100_000, 65), 1_300_000);
check('65歳以上・境界770万円ちょうど→5%+145.5万円区分', calcPublicPensionDeduction(7_700_000, 65), 1_840_000);
check('65歳以上・境界1,000万円ちょうど→定額195.5万円', calcPublicPensionDeduction(10_000_000, 65), 1_955_000);
check('65歳以上・1,000万円超(1,200万円)→定額195.5万円', calcPublicPensionDeduction(12_000_000, 65), 1_955_000);

// 65歳未満
check('65歳未満・130万円未満(100万円)→定額60万円', calcPublicPensionDeduction(1_000_000, 64), 600_000);
check('65歳未満・境界130万円ちょうど→25%+27.5万円区分', calcPublicPensionDeduction(1_300_000, 64), 600_000);
check('65歳未満・境界410万円ちょうど(65歳以上と共通式)', calcPublicPensionDeduction(4_100_000, 64), 1_300_000);
check('65歳未満・境界770万円ちょうど(65歳以上と共通式)', calcPublicPensionDeduction(7_700_000, 64), 1_840_000);
check('65歳未満・境界1,000万円ちょうど(65歳以上と共通式)', calcPublicPensionDeduction(10_000_000, 64), 1_955_000);

console.log('\n' + '='.repeat(90));
console.log('【calcIdecoLumpSumTax】DC一時金単体との一致・max()条件分岐');
console.log('='.repeat(90));

{
  // 退職金額0円のとき、DC一時金単体の退職所得税と一致すること
  const wrapped = calcIdecoLumpSumTax(8_000_000, 0, 15, 25);
  const direct = calcRetirementIncomeTax(8_000_000, 15, false, false);
  check('severance=0のとき、直接calcRetirementIncomeTax()と一致(netAmount)', wrapped.netAmount, direct.netAmount);
  check('severance=0のとき、勤続年数はidecoYrsのみ使用(sevYrs=25は混入しない)', wrapped.netAmount, 7_848_950);
}
{
  // idecoLump=0・severance>0のとき、勤続年数はsevYrsのみ使用(idecoYrsは混入しない)
  const result = calcIdecoLumpSumTax(0, 5_000_000, 30, 10);
  check('idecoLump=0のとき、勤続年数はsevYrsのみ使用(idecoYrs=30は混入しない)', result.netAmount, 4_924_475);
  // 混入していた場合(max(30,10)=30)は控除1,500万円>収入500万円で税額0になってしまうため、
  // 税額が発生していること自体がバグ修正の確認になる
  const buggyWouldBe = calcRetirementIncomeTax(5_000_000, 30, false, false).netAmount;
  const notBuggy = result.netAmount !== buggyWouldBe;
  if (notBuggy) { pass++; console.log(`[PASS] idecoYrs混入時の誤った結果(${buggyWouldBe})とは異なる`); }
  else { fail++; console.log(`[FAIL] idecoYrs混入時の誤った結果と一致してしまっている`); }
}
{
  // 両方0円のとき、税額発生なし
  const result = calcIdecoLumpSumTax(0, 0, 20, 20);
  check('idecoLump=0・severance=0のとき netAmount=0', result.netAmount, 0);
  check('idecoLump=0・severance=0のとき incomeTax=0', result.incomeTax, 0);
}
{
  // idecoLump>0・severance>0(同一年同時受給)のときのみmax()適用
  const result = calcIdecoLumpSumTax(10_000_000, 5_000_000, 10, 25);
  const direct = calcRetirementIncomeTax(15_000_000, 25, false, false); // max(10,25)=25
  check('両方>0のときはmax(idecoYrs,sevYrs)を適用', result.netAmount, direct.netAmount);
}

console.log('\n' + '='.repeat(90));
console.log('【3パターン比較】代表ケース(iDeCo残高2,000万円・加入20年・65歳受取・公的年金150万円・受給期間10年)');
console.log('='.repeat(90));

const baseInput = {
  idecoBalance: 20_000_000,
  idecoYrs: 20,
  receiveAge: 65,
  publicPensionAnnual: 1_500_000,
  otherIncome: 0,
  severance: 0,
  sevYrs: 0,
  annuityYears: 10,
};

const lump = calcLumpSumPattern(baseInput);
const pension = calcPensionPattern(baseInput);
const mixed50 = calcMixedPattern(baseInput, 50);

check('一時金パターン grossIncome', lump.grossIncome, 35_000_000);
check('一時金パターン totalTax', lump.totalTax, 1_388_722);
check('一時金パターン netAmount', lump.netAmount, 33_611_278);

check('年金パターン grossIncome', pension.grossIncome, 35_000_000);
check('年金パターン totalTax', pension.totalTax, 2_670_430);
check('年金パターン netAmount', pension.netAmount, 32_329_570);

check('併用50%パターン grossIncome', mixed50.grossIncome, 35_000_000);
check('併用50%パターン totalTax', mixed50.totalTax, 1_386_510);
check('併用50%パターン netAmount', mixed50.netAmount, 33_613_490);

// grossIncomeは受取方法に関わらず一定であるべき(不変条件)
check('3パターンのgrossIncomeが一致(不変条件)', lump.grossIncome === pension.grossIncome && pension.grossIncome === mixed50.grossIncome ? 1 : 0, 1);

console.log('\n' + '='.repeat(90));
console.log('【境界一致性】併用パターンの一時金割合0%/100%が単体パターンと一致すること');
console.log('='.repeat(90));

const mixed100 = calcMixedPattern(baseInput, 100);
const mixed0 = calcMixedPattern(baseInput, 0);
check('併用100% netAmount = 一時金パターン netAmount', mixed100.netAmount, lump.netAmount);
check('併用100% totalTax = 一時金パターン totalTax', mixed100.totalTax, lump.totalTax);
check('併用0% netAmount = 年金パターン netAmount', mixed0.netAmount, pension.netAmount);
check('併用0% totalTax = 年金パターン totalTax', mixed0.totalTax, pension.totalTax);

console.log('\n' + '='.repeat(90));
console.log('【annuityYears共通期間での合計手取り】一時金パターンへの公的年金積み上げ確認');
console.log('='.repeat(90));
{
  // 一時金パターンの内訳(1年分)から、annuityYears倍した値が正しくgrossIncome/netAmountに
  // 反映されていることを確認する(単年スナップショットではなく、比較期間全体の合計であること)
  const perYearPensionNet = lump.pension && lump.comprehensive
    ? (baseInput.publicPensionAnnual + 0) - lump.comprehensive.totalTax
    : null;
  const expectedPensionNetTotal = perYearPensionNet * baseInput.annuityYears;
  const expectedLumpNetTotal = lump.lumpSum.netAmount + expectedPensionNetTotal;
  check('一時金パターンnetAmount = 一時金の手取り + annuityYears年分の公的年金手取り', lump.netAmount, expectedLumpNetTotal);

  // annuityYearsを5年→20年に変えると、年金積み上げ分だけnetAmountが変化することを確認
  const input20y = { ...baseInput, annuityYears: 20 };
  const lump20y = calcLumpSumPattern(input20y);
  const diff = lump20y.netAmount - lump.netAmount;
  const expectedDiff = perYearPensionNet * (20 - 10);
  check('annuityYearsを10→20年に変更すると差分が公的年金10年分の手取りと一致', diff, expectedDiff);
}

console.log('\n' + '='.repeat(90));
console.log('【idecoOnly*(iDeCo単体・比例配分方式)】主比較カード再設計(案A・2026-08-03)の回帰確認');
console.log('='.repeat(90));
{
  // 一時金パターン(ratio=100)は公的年金の寄与がゼロのはず(idecoAnnual=0のため)
  check('一時金パターン idecoOnlyNetAmount = lumpSum.netAmount(公的年金の寄与ゼロ)', lump.idecoOnlyNetAmount, lump.lumpSum.netAmount);
  check('一時金パターン idecoOnlyTax = lumpSum.incomeTax + lumpSum.residentTax.total', lump.idecoOnlyTax, lump.lumpSum.incomeTax + lump.lumpSum.residentTax.total);
}
{
  // 今回の不具合そのものの回帰確認:annuityYearsを10→20に変えても、
  // 一時金パターンのidecoOnlyNetAmountは変化しないはず(旧netAmountは変化していた=既存テスト参照)
  const input20y = { ...baseInput, annuityYears: 20 };
  const lump20y = calcLumpSumPattern(input20y);
  check('一時金パターン idecoOnlyNetAmount はannuityYears 10→20で不変(修正の核心)', lump20y.idecoOnlyNetAmount, lump.idecoOnlyNetAmount);
}
{
  // 公的年金が0円のとき、iDeCo単体と合算値は一致するはず(按分の分母がiDeCoのみになるため)
  const inputNoPublicPension = { ...baseInput, publicPensionAnnual: 0 };
  const pensionNoPublic = calcPensionPattern(inputNoPublicPension);
  check('公的年金0円のとき、年金パターンのidecoOnlyNetAmount = netAmount', pensionNoPublic.idecoOnlyNetAmount, pensionNoPublic.netAmount);
  check('公的年金0円のとき、年金パターンのidecoOnlyTax = totalTax', pensionNoPublic.idecoOnlyTax, pensionNoPublic.totalTax);
}
{
  // iDeCo残高・公的年金ともに0円の境界ケース:0除算にならず、実効税率はnull(「—」表示用)
  const inputAllZero = { ...baseInput, idecoBalance: 0, publicPensionAnnual: 0 };
  const pensionAllZero = calcPensionPattern(inputAllZero);
  check('iDeCo・公的年金ともに0円のとき idecoOnlyNetAmount = 0', pensionAllZero.idecoOnlyNetAmount, 0);
  check('iDeCo・公的年金ともに0円のとき idecoOnlyEffectiveTaxRate = null(0除算回避)', pensionAllZero.idecoOnlyEffectiveTaxRate, null);
}
{
  // 併用パターンの境界一致性(既存のnetAmount境界一致性テストと同じ考え方をidecoOnly*にも適用)
  check('併用100% idecoOnlyNetAmount = 一時金パターン idecoOnlyNetAmount', mixed100.idecoOnlyNetAmount, lump.idecoOnlyNetAmount);
  check('併用0% idecoOnlyNetAmount = 年金パターン idecoOnlyNetAmount', mixed0.idecoOnlyNetAmount, pension.idecoOnlyNetAmount);
}

console.log('\n' + '='.repeat(90));
console.log('【calcComprehensiveIncomeTax】基礎控除の段階・住民税基礎控除の別枠確認');
console.log('='.repeat(90));
{
  const result = calcComprehensiveIncomeTax(400_000, 0);
  check('総所得132万円以下→所得税基礎控除95万円', result.basicDeduction, 950_000);
}
{
  const result = calcComprehensiveIncomeTax(2_350_000, 0);
  check('総所得132万円超336万円以下→所得税基礎控除88万円', result.basicDeduction, 880_000);
}
{
  // 所得税の基礎控除と住民税の基礎控除(43万円固定)が別テーブルであることの確認
  // (総所得235万円: 所得税基礎控除88万円だが、住民税用課税所得は235万円-43万円で計算される)
  const result = calcComprehensiveIncomeTax(2_350_000, 0);
  const expectedResidentTaxable = 2_350_000 - 430_000;
  const expectedResidentTax = Math.floor((expectedResidentTaxable * 0.06) / 100 + 1e-6) * 100
    + Math.floor((expectedResidentTaxable * 0.04) / 100 + 1e-6) * 100;
  check('住民税は所得税と別の基礎控除43万円を使う(所得税基礎控除88万円をそのまま流用しない)', result.residentTax.total, expectedResidentTax);
}

console.log('\n' + '='.repeat(90));
console.log('【リファクタリング後の第5弾ツール回帰確認】verify-retirement-tax-tool.js');
console.log('='.repeat(90));
require('./verify-retirement-tax-tool.js');

console.log('\n' + '='.repeat(90));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
