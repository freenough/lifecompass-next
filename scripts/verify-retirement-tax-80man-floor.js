/**
 * scripts/verify-retirement-tax-80man-floor.js
 * fix_retirement_tax_calc_80man_floor.md の回帰確認。
 * src/lib/helpers.ts の retirementTaxCalc() を直接importして検証する。
 * 独自の再実装は行わず、期待値は国税庁の規定(退職所得控除額は
 * 40万円×勤続年数、ただし勤続20年以下は最低80万円)に基づき手計算したもの。
 *
 * 実行: node scripts/verify-retirement-tax-80man-floor.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { retirementTaxCalc } = require('../src/lib/helpers');

let pass = 0, fail = 0;

function check(label, actual, expected, tolerance = 0.01) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    pass++;
    console.log(`[PASS] ${label} — actual=${actual.toFixed(4)} expected=${expected.toFixed(4)}`);
  } else {
    fail++;
    console.log(`[FAIL] ${label} — actual=${actual.toFixed(4)} expected=${expected.toFixed(4)} diff=${(actual - expected).toFixed(4)}`);
  }
}

// 期待値を国税庁の規定通りに手計算するヘルパー(独自実装ではなく、期待値算出専用)
function expectedResult(severanceAmount, idecoBalance, yrs) {
  const deduction = yrs <= 20 ? Math.max(40 * yrs, 80) : 800 + 70 * (yrs - 20);
  const total = idecoBalance + severanceAmount;
  if (total <= 0) return { idecoNet: 0, severanceNet: 0, totalTax: 0 };
  const remaining = Math.max(0, total - deduction);
  const taxable = yrs <= 5
    ? Math.min(remaining, 300) / 2 + Math.max(0, remaining - 300)
    : remaining / 2;
  const totalTax = taxable * 0.20315;
  const taxRatio = totalTax / total;
  return {
    idecoNet: Math.max(0, idecoBalance - idecoBalance * taxRatio),
    severanceNet: Math.max(0, severanceAmount - severanceAmount * taxRatio),
    totalTax,
  };
}

console.log('='.repeat(90));
console.log('境界値: 80万円下限が効くケース(勤続1〜2年)');
console.log('='.repeat(90));

for (const yrs of [1, 2]) {
  const severanceAmount = 200;
  const actual = retirementTaxCalc(0, severanceAmount, yrs, yrs);
  const expected = expectedResult(severanceAmount, 0, yrs);
  check(`勤続${yrs}年・退職金200万円 totalTax`, actual.totalTax, expected.totalTax);
  check(`勤続${yrs}年・退職金200万円 severanceNet`, actual.severanceNet, expected.severanceNet);

  // 修正前の挙動(40*yrs、下限なし)と比較する。yrs=1は40*1=40<80のため下限が効いて税額が
  // 減るはずだが、yrs=2は40*2=80で元々下限と一致するため、修正前後で変化しないのが正しい。
  const buggyDeduction = 40 * yrs;
  const buggyRemaining = Math.max(0, severanceAmount - buggyDeduction);
  const buggyTaxable = Math.min(buggyRemaining, 300) / 2 + Math.max(0, buggyRemaining - 300);
  const buggyTax = buggyTaxable * 0.20315;
  if (yrs * 40 < 80) {
    const improved = actual.totalTax < buggyTax;
    if (improved) {
      pass++;
      console.log(`[PASS] 勤続${yrs}年 修正前(下限なし)より税額が減少: 修正前${buggyTax.toFixed(4)} → 修正後${actual.totalTax.toFixed(4)}`);
    } else {
      fail++;
      console.log(`[FAIL] 勤続${yrs}年 修正前より税額が減少していない: 修正前${buggyTax.toFixed(4)} → 修正後${actual.totalTax.toFixed(4)}`);
    }
  } else {
    check(`勤続${yrs}年 40*yrsが元々80万円以上のため修正前後で変化なし`, actual.totalTax, buggyTax);
  }
}

console.log('\n' + '='.repeat(90));
console.log('回帰確認: 80万円下限にかからないケース(勤続3年以上)');
console.log('='.repeat(90));

for (const yrs of [3, 5, 10, 15, 19]) {
  const severanceAmount = 500;
  const actual = retirementTaxCalc(0, severanceAmount, yrs, yrs);
  const expected = expectedResult(severanceAmount, 0, yrs);
  check(`勤続${yrs}年・退職金500万円 totalTax(回帰なし)`, actual.totalTax, expected.totalTax);
}

console.log('\n' + '='.repeat(90));
console.log('境界値: 20年ちょうど・21年(20年超側の分岐に影響がないこと)');
console.log('='.repeat(90));

for (const yrs of [20, 21]) {
  const severanceAmount = 1000;
  const actual = retirementTaxCalc(0, severanceAmount, yrs, yrs);
  const expected = expectedResult(severanceAmount, 0, yrs);
  check(`勤続${yrs}年・退職金1000万円 totalTax`, actual.totalTax, expected.totalTax);
}

console.log('\n' + '='.repeat(90));
console.log('iDeCo+退職金 同一年受取(max(dcYears,sevYears))・下限が効くケース');
console.log('='.repeat(90));
{
  const actual = retirementTaxCalc(100, 50, 1, 2); // max(1,2)=2年 → 下限が効く
  const expected = expectedResult(50, 100, 2);
  check('iDeCo100万+退職金50万・dcYears=1/sevYears=2(max=2) totalTax', actual.totalTax, expected.totalTax);
  check('iDeCo100万+退職金50万・dcYears=1/sevYears=2(max=2) idecoNet', actual.idecoNet, expected.idecoNet);
}

console.log('\n' + '='.repeat(90));
console.log('田中誠シリーズ回帰確認(sevYrs=13、既存フィクスチャ: 退職金800万→net≈772万)');
console.log('='.repeat(90));
{
  const actual = retirementTaxCalc(0, 800, 13, 13);
  const expected = expectedResult(800, 0, 13);
  check('田中誠 sevYrs=13・退職金800万円 severanceNet', actual.severanceNet, expected.severanceNet);
  const netRounded = Math.round(actual.severanceNet);
  console.log(`  参考: severanceNet(四捨五入)=${netRounded}万円（フィクスチャ記載値772万円と比較。sevYrs=13は80万円下限の対象外のため影響なし）`);
}

console.log('\n' + '='.repeat(90));
console.log('ランダムケース(100件、勤続1〜45年・退職金0〜3000万円)');
console.log('='.repeat(90));

let randomPass = 0, randomFail = 0;
for (let i = 0; i < 100; i++) {
  const yrs = 1 + Math.floor(Math.random() * 45);
  const severanceAmount = Math.round(Math.random() * 3000 * 10) / 10;
  const actual = retirementTaxCalc(0, severanceAmount, yrs, yrs);
  const expected = expectedResult(severanceAmount, 0, yrs);
  const ok = Math.abs(actual.totalTax - expected.totalTax) <= 0.01;
  if (ok) { randomPass++; pass++; } else {
    randomFail++; fail++;
    console.log(`[FAIL] random#${i + 1} yrs=${yrs} severance=${severanceAmount} actual=${actual.totalTax} expected=${expected.totalTax}`);
  }
}
console.log(`ランダムケース結果: ${randomPass} PASS / ${randomFail} FAIL`);

console.log('\n' + '='.repeat(90));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
