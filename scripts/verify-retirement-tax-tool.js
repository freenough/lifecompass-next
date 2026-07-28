/**
 * scripts/verify-retirement-tax-tool.js
 * 第5弾ツール(退職金手取り計算)の検証スクリプト。
 * このプロジェクトにはJest/Vitest等のテストランナーが導入されていない
 * (package.jsonのdevDependencies参照)ため、既存の verify-*.js と同じ
 * 手書きPASS/FAIL集計パターンに統一する形で、引き継ぎ資料の
 * retirement.test.ts(describe/it/expect構文)の内容を移植した。
 *
 * src/lib/tax/retirement.ts（新ツール側・独立実装）と
 * src/lib/helpers.ts の retirementTaxCalc()（本体・簡易近似）を、
 * どちらも直接importして使う。独自の再実装は行わない
 * （一致検証の逆算式のみ、既知の公開formulaを単純に解いているだけ）。
 *
 * 実行: node scripts/verify-retirement-tax-tool.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcRetirementDeduction,
  calcRetirementTaxableIncome,
  calcRetirementIncomeTax,
} = require('../src/lib/tax/retirement');
const { retirementTaxCalc } = require('../src/lib/helpers');

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
console.log('【calcRetirementDeduction】');
console.log('='.repeat(90));

check('勤続20年以下:40万円×勤続年数', calcRetirementDeduction(10, false), 4_000_000);
check('勤続20年以下:80万円下限が効くケース', calcRetirementDeduction(1, false), 800_000);
check('勤続20年超:800万円+70万円×超過年数', calcRetirementDeduction(25, false), 11_500_000);
check('障害者特例:+100万円', calcRetirementDeduction(10, true), 5_000_000);

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementTaxableIncome】');
console.log('='.repeat(90));

{
  const deduction = calcRetirementDeduction(20, false); // 800万円
  const taxable = calcRetirementTaxableIncome(30_000_000, deduction, 20, false);
  check('一般退職手当等:(収入-控除)×1/2', taxable, 11_000_000);
}
{
  const deduction = calcRetirementDeduction(3, false); // 120万円(40*3=120>80)
  const taxable = calcRetirementTaxableIncome(500_000, deduction, 3, false);
  check('控除額>退職金の境界ケース:0円下限', taxable, 0);
}
{
  const deduction = calcRetirementDeduction(5, false); // 200万円
  const taxable = calcRetirementTaxableIncome(6_000_000, deduction, 5, false);
  // base=600万-200万=400万円>300万円 => 300万*1/2+(400万-300万)=150万+100万=250万円
  check('短期退職手当等:300万円超部分は1/2適用なし', taxable, 2_500_000);
}
{
  const deduction = calcRetirementDeduction(5, false); // 200万円
  const taxable = calcRetirementTaxableIncome(6_000_000, deduction, 5, true);
  // base=400万円、1/2適用なしで全額
  check('特定役員退職手当等:1/2適用なし', taxable, 4_000_000);
}
{
  const deduction = calcRetirementDeduction(10, false); // 400万円
  const taxable = calcRetirementTaxableIncome(4_012_345, deduction, 10, false);
  // base=12,345円、一般(yrs>5)なので*0.5=6,172.5円 → 1,000円未満切り捨てで6,000円
  check('1,000円未満切り捨て', taxable, 6_000);
}

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementIncomeTax】');
console.log('='.repeat(90));

{
  const result = calcRetirementIncomeTax(500_000, 3, false, false);
  check('境界ケース:課税退職所得', result.taxableIncome, 0);
  check('境界ケース:所得税', result.incomeTax, 0);
  check('境界ケース:住民税合計', result.residentTax.total, 0);
  check('境界ケース:手取り額(=収入そのまま)', result.netAmount, 500_000);
}
{
  // 一般退職手当等の標準ケース(勤続20年・退職金3,000万円)
  // 速算表: 900万円超〜1,800万円 = 33%・控除1,536,000円
  const result = calcRetirementIncomeTax(30_000_000, 20, false, false);
  check('標準ケース:payType', result.payType, 'general');
  check('標準ケース:控除額', result.deduction, 8_000_000);
  check('標準ケース:課税退職所得', result.taxableIncome, 11_000_000);
  // (1100万*0.33-153.6万)*1.021 = (363万-153.6万)*1.021 = 209.4万*1.021 = 213.7974万円
  check('標準ケース:所得税(速算表33%区分)', result.incomeTax, 2_137_974);
  check('標準ケース:市民税(100円未満切り捨て)', result.residentTax.municipal, 660_000);
  check('標準ケース:県民税(100円未満切り捨て)', result.residentTax.prefectural, 440_000);
  check('標準ケース:手取り額', result.netAmount, 30_000_000 - 2_137_974 - 1_100_000);
}
{
  const withException = calcRetirementIncomeTax(30_000_000, 20, false, true);
  const without = calcRetirementIncomeTax(30_000_000, 20, false, false);
  check('障害者特例:控除額のみ+100万円加算', withException.deduction, without.deduction + 1_000_000);
  const ok = withException.taxableIncome < without.taxableIncome;
  if (ok) { pass++; console.log(`[PASS] 障害者特例:課税退職所得が減少 — with=${withException.taxableIncome} without=${without.taxableIncome}`); }
  else { fail++; console.log(`[FAIL] 障害者特例:課税退職所得が減少していない — with=${withException.taxableIncome} without=${without.taxableIncome}`); }
}

console.log('\n' + '='.repeat(90));
console.log('【一次情報(国税庁速算表)との突合】勤続20年・退職金1,000万円');
console.log('='.repeat(90));
{
  // 控除800万円 → 課税退職所得(1000-800)/2=100万円 → 速算表195万円以下=5%・控除0円
  // (100万*0.05-0)*1.021=5.105万円 → 1円未満切り捨てで51,050円
  // 住民税: 100万*6%=6万円(100円未満切り捨てなし)、100万*4%=4万円 → 合計10万円
  const result = calcRetirementIncomeTax(10_000_000, 20, false, false);
  check('控除額(800万円)', result.deduction, 8_000_000);
  check('課税退職所得(100万円)', result.taxableIncome, 1_000_000);
  check('所得税(速算表5%区分、51,050円)', result.incomeTax, 51_050);
  check('市民税(6万円)', result.residentTax.municipal, 60_000);
  check('県民税(4万円)', result.residentTax.prefectural, 40_000);
  check('手取り額(984万8,950円)', result.netAmount, 9_848_950);
}

console.log('\n' + '='.repeat(90));
console.log('【一致検証】calcRetirementDeduction() vs 本体retirementTaxCalc()(80万円下限修正済み)');
console.log('='.repeat(90));
console.log('本体helpers.tsのretirementTaxCalc()は控除額を直接返さないため、');
console.log('勤続5年超(remaining/2の単純な式になる範囲)で、本体の実出力totalTaxから');
console.log('逆算した控除額と、新ツールのcalcRetirementDeduction()の出力を突き合わせる。');
console.log('(本体・新ツールとも実際の本番関数を呼び出しており、逆算に使うのは');
console.log('「taxable=remaining/2, totalTax=taxable*0.20315」という既知の公開式のみ)');

for (const yrs of [6, 7, 10, 13, 15, 19, 20, 21, 25, 30, 42]) {
  const severanceManYen = 5000; // 5,000万円(全yrsで控除額を上回るよう十分な額)
  const body = retirementTaxCalc(0, severanceManYen, yrs, yrs);
  const impliedRemainingManYen = (body.totalTax / 0.20315) * 2;
  const impliedDeductionManYen = severanceManYen - impliedRemainingManYen;
  const newToolDeductionManYen = calcRetirementDeduction(yrs, false) / 10_000;
  check(`勤続${yrs}年 本体逆算控除額 vs 新ツール控除額(万円)`, impliedDeductionManYen, newToolDeductionManYen, 0.01);
}

console.log('\n' + '='.repeat(90));
console.log('【整合性チェック】田中誠シリーズ(sevYrs=13・退職金800万円)— 一致は期待しない');
console.log('='.repeat(90));
{
  const bodyResult = retirementTaxCalc(0, 800, 13, 13); // 本体: 万円単位
  const toolResult = calcRetirementIncomeTax(8_000_000, 13, false, false); // 新ツール: 円単位
  const bodyNetManYen = bodyResult.severanceNet;
  const toolNetManYen = toolResult.netAmount / 10_000;
  console.log(`  本体(簡易20.315%)手取り: ${bodyNetManYen.toFixed(3)}万円（既存フィクスチャ: 約772万円）`);
  console.log(`  新ツール(正確な累進課税)手取り: ${toolNetManYen.toFixed(3)}万円`);
  console.log(`  差額: ${(toolNetManYen - bodyNetManYen).toFixed(3)}万円`);
  console.log('  → 課税退職所得100〜140万円台は速算表の最低税率(5%)区分に収まるため、');
  console.log('    本体の一律20.315%より新ツールの実効税率の方が低くなり、新ツールの');
  console.log('    手取りが本体より高く出る。これは意図的な設計差であり、一致は想定していない。');
  // 差が出ること自体を確認する(完全一致ではないことの確認)
  const differs = Math.abs(bodyNetManYen - toolNetManYen) > 1;
  if (differs) { pass++; console.log('[PASS] 本体と新ツールの手取り額が(想定通り)一致しない'); }
  else { fail++; console.log('[FAIL] 本体と新ツールの手取り額がほぼ一致してしまっている(想定外)'); }
}

console.log('\n' + '='.repeat(90));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
