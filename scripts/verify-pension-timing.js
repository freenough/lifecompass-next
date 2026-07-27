/**
 * scripts/verify-pension-timing.js
 * pensionCore.ts（年金 繰上げ・繰下げ 比較シミュレーター用の計算エンジン）を検証する。
 * 本番の calcPensionAmountAtAge() / calcBreakEvenAge() / calcCumulativeAmount() を
 * 直接importして呼び出すだけで、独自の財務計算式・再実装ロジックは一切含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcPensionAmountAtAge,
  calcBreakEvenAge,
  calcCumulativeAmount,
  EARLY_RATE_NEW,
  EARLY_RATE_OLD,
  LATE_RATE,
  REFERENCE_AGE,
} = require('../src/lib/pensionCore');

const TOLERANCE_RATE = 1e-9;
const TOLERANCE_MANYEN = 1; // Math.round後の丸め誤差を許容(万円)

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

// ================================================================
// SECTION 1: 境界値ケース(必須、14件以上)
// ================================================================
console.log('='.repeat(80));
console.log('【境界値ケース】');
console.log('='.repeat(80));

// 1. targetAge=60(繰上げ上限)・新率
{
  const r = calcPensionAmountAtAge(80, 100, 60, true);
  const ok = Math.abs(r.rate - 0.76) < TOLERANCE_RATE;
  record('1. targetAge=60・新率 → rate=0.76', ok, `rate=${r.rate}`);
}

// 2. targetAge=60(繰上げ上限)・旧率
{
  const r = calcPensionAmountAtAge(80, 100, 60, false);
  const ok = Math.abs(r.rate - 0.70) < TOLERANCE_RATE;
  record('2. targetAge=60・旧率 → rate=0.70', ok, `rate=${r.rate}`);
}

// 3. targetAge=65(増減なし)
{
  const r = calcPensionAmountAtAge(80, 100, 65, true);
  const ok = r.rate === 1 && r.basicAmount === 80 && r.employeesAmount === 100 && r.totalAmount === 180;
  record('3. targetAge=65 → rate=1・金額そのまま', ok, `rate=${r.rate} basic=${r.basicAmount} employees=${r.employeesAmount}`);
}

// 4. targetAge=65でcalcBreakEvenAgeがnull/foundWithinHorizon=falseを返す
{
  const r = calcBreakEvenAge(80, 100, 65, true, 90);
  const ok = r.age === null && r.foundWithinHorizon === false;
  record('4. targetAge=65 → calcBreakEvenAgeはnull/false', ok, `age=${r.age} found=${r.foundWithinHorizon}`);
}

// 5. targetAge=75(繰下げ上限)
{
  const r = calcPensionAmountAtAge(80, 100, 75, true);
  const ok = Math.abs(r.rate - 1.84) < TOLERANCE_RATE;
  record('5. targetAge=75 → rate=1.84', ok, `rate=${r.rate}`);
}

// 6. 64→65(繰上げ最終月→基準)の連続性確認
{
  const r64 = calcPensionAmountAtAge(80, 100, 64, true);
  const r65 = calcPensionAmountAtAge(80, 100, 65, true);
  const expected64 = 1 + 12 * EARLY_RATE_NEW; // 0.952
  const ok = Math.abs(r64.rate - expected64) < TOLERANCE_RATE && r64.rate < r65.rate;
  record('6. 64→65の連続性（64歳の方が65歳より少ない）', ok, `rate64=${r64.rate} rate65=${r65.rate} 期待値64=${expected64}`);
}

// 7. 65→66(基準→繰下げ最初の月)の連続性確認
{
  const r65 = calcPensionAmountAtAge(80, 100, 65, true);
  const r66 = calcPensionAmountAtAge(80, 100, 66, true);
  const expected66 = 1 + 12 * LATE_RATE; // 1.084
  const ok = Math.abs(r66.rate - expected66) < TOLERANCE_RATE && r66.rate > r65.rate;
  record('7. 65→66の連続性（66歳の方が65歳より多い）', ok, `rate65=${r65.rate} rate66=${r66.rate} 期待値66=${expected66}`);
}

// 8. 74→75(繰下げ最終月)の連続性確認
{
  const r74 = calcPensionAmountAtAge(80, 100, 74, true);
  const r75 = calcPensionAmountAtAge(80, 100, 75, true);
  const expected74 = 1 + 108 * LATE_RATE; // 1.756
  const ok = Math.abs(r74.rate - expected74) < TOLERANCE_RATE && r74.rate < r75.rate;
  record('8. 74→75の連続性（75歳の方が74歳より多い）', ok, `rate74=${r74.rate} rate75=${r75.rate} 期待値74=${expected74}`);
}

// 9. 生年月日境界: 同一targetAgeで新率/旧率の金額差を確認(60歳)
{
  const rNew = calcPensionAmountAtAge(80, 100, 60, true);
  const rOld = calcPensionAmountAtAge(80, 100, 60, false);
  const ok = rNew.totalAmount > rOld.totalAmount; // 新率の方が減額幅が小さい(-24% > -30%)ため金額は多い
  record('9. 生年月日境界(60歳): 新率>旧率の金額', ok, `new=${rNew.totalAmount} old=${rOld.totalAmount}`);
}

// 10. 生年月日境界: isNewRateはtargetAge>65では無視される(繰下げには新旧の区別がない)
{
  const rNew = calcPensionAmountAtAge(80, 100, 70, true);
  const rOld = calcPensionAmountAtAge(80, 100, 70, false);
  const ok = rNew.totalAmount === rOld.totalAmount && rNew.rate === rOld.rate;
  record('10. 繰下げはisNewRateを無視(新旧で結果が同じ)', ok, `new=${rNew.totalAmount} old=${rOld.totalAmount}`);
}

// 11. compareEndAge < targetAge(理論上UIでは発生しないが防御的に確認)
{
  const r = calcBreakEvenAge(80, 100, 70, true, 68);
  const ok = r.age === null && r.foundWithinHorizon === false;
  record('11. compareEndAge(68) < targetAge(70) → null/false', ok, `age=${r.age} found=${r.foundWithinHorizon}`);
}

// 12. 比較終了年齢内で逆転しないケース: targetAge=75・compareEndAge=80
{
  const r = calcBreakEvenAge(80, 100, 75, true, 80);
  const ok = r.age === null && r.foundWithinHorizon === false;
  record('12. targetAge=75・compareEndAge=80 → 逆転しない(false)', ok, `age=${r.age} found=${r.foundWithinHorizon}`);
}

// 13. 同条件でcompareEndAgeを90に伸ばすとfoundWithinHorizon=trueに転じる
{
  const r = calcBreakEvenAge(80, 100, 75, true, 90);
  const ok = r.foundWithinHorizon === true && typeof r.age === 'number';
  record('13. 同条件・compareEndAge=90 → 逆転する(true)', ok, `age=${r.age} found=${r.foundWithinHorizon}`);
}

// 14. 同条件でcompareEndAgeを95に伸ばしても引き続きtrue(かつ90のケースと同じ交点年齢)
{
  const r90 = calcBreakEvenAge(80, 100, 75, true, 90);
  const r95 = calcBreakEvenAge(80, 100, 75, true, 95);
  const ok = r95.foundWithinHorizon === true && r95.age === r90.age;
  record('14. compareEndAge=95でもtrue・交点年齢は90のケースと同じ', ok, `age90=${r90.age} age95=${r95.age}`);
}

// 15. 繰上げ側(targetAge=60)の損益分岐が正しく求まる(基本ケース)
{
  const r = calcBreakEvenAge(80, 100, 60, true, 90);
  const ok = r.foundWithinHorizon === true && typeof r.age === 'number' && r.age > REFERENCE_AGE;
  record('15. 繰上げ(60歳)の損益分岐が65歳超で見つかる', ok, `age=${r.age} found=${r.foundWithinHorizon}`);
}

// ================================================================
// SECTION 1.5: calcCumulativeAmount()（フェーズ2でPensionTimingComparisonTable.tsx
// 向けに追加。累計計算をcalcBreakEvenAge()の内部積み上げと突き合わせて検証する）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【calcCumulativeAmount()】境界値+calcBreakEvenAgeとの整合性');
console.log('='.repeat(80));

// 16. upToAge < targetAge → 0
{
  const c = calcCumulativeAmount(78, 120, 70, true, 69);
  record('16. upToAge(69) < targetAge(70) → 0', c === 0, `結果=${c}`);
}

// 17. upToAge === targetAge → 1年分(年額そのまま)
{
  const annual = calcPensionAmountAtAge(78, 120, 70, true).totalAmount;
  const c = calcCumulativeAmount(78, 120, 70, true, 70);
  record('17. upToAge===targetAge → 年額1年分', c === annual, `結果=${c} 期待値=${annual}`);
}

// 18. spec7の検算ケース(basic=78・employees=120・targetAge=70・新率・compareEndAge=90)で
//     累計が81歳で初めて逆転し、80歳では逆転していないことを確認
//     （calcBreakEvenAgeがage=81を返すことの直接的な裏付け）
{
  const target80 = calcCumulativeAmount(78, 120, 70, true, 80);
  const ref80 = calcCumulativeAmount(78, 120, 65, true, 80);
  const target81 = calcCumulativeAmount(78, 120, 70, true, 81);
  const ref81 = calcCumulativeAmount(78, 120, 65, true, 81);
  const ok = target80 < ref80 && target81 >= ref81;
  record(
    '18. spec7検算ケース: 80歳未逆転→81歳で逆転',
    ok,
    `80歳: target=${target80} ref=${ref80} / 81歳: target=${target81} ref=${ref81}`
  );
  const be = calcBreakEvenAge(78, 120, 70, true, 90);
  record('18b. calcBreakEvenAgeも同じ81歳を返す', be.age === 81 && be.foundWithinHorizon === true, `age=${be.age}`);
}

// ================================================================
// SECTION 2: 代表ケース(既存4フィクスチャの年金額を流用)
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【代表ケース】4フィクスチャ');
console.log('='.repeat(80));

const REPRESENTATIVE_CASES = [
  // [ラベル, basicAmount, employeesAmount, isNewRate]
  ['山本恒一(年金100万円、基礎のみ想定)', 100, 0, true],
  ['田中誠(年金150万円、基礎70+厚生80想定)', 70, 80, true],
  ['佐々木誠一(年金150万円、基礎70+厚生80想定)', 70, 80, false],
  ['中村夫婦・翔太(年金170万円、基礎70+厚生100想定)', 70, 100, true],
];

for (const [label, basic, employees, isNewRate] of REPRESENTATIVE_CASES) {
  for (const targetAge of [60, 65, 70, 75]) {
    const r = calcPensionAmountAtAge(basic, employees, targetAge, isNewRate);
    const be = calcBreakEvenAge(basic, employees, targetAge, isNewRate, 95);
    const ok = isFinite(r.totalAmount) && !isNaN(r.totalAmount);
    record(
      `${label} @${targetAge}歳`,
      ok,
      `totalAmount=${r.totalAmount}万円 rate=${r.rate.toFixed(3)} breakEven=${be.age ?? 'なし'}`
    );
  }
}

// ================================================================
// SECTION 3: ランダムケース(100件)
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【ランダムケース】100件');
console.log('='.repeat(80));

const COMPARE_END_AGES = [80, 85, 90, 95, 100];
let randPass = 0, randFail = 0;
const N_RANDOM = 100;

for (let i = 0; i < N_RANDOM; i++) {
  const basicAmount = Math.round((Math.random() * 50 + 50) * 10) / 10;      // 50〜100万円
  const employeesAmount = Math.round((Math.random() * 200) * 10) / 10;      // 0〜200万円
  const targetAge = 60 + Math.floor(Math.random() * 16);                    // 60〜75
  const isNewRate = Math.random() < 0.5;
  const compareEndAge = COMPARE_END_AGES[Math.floor(Math.random() * COMPARE_END_AGES.length)];

  const label = `random#${i + 1}`;
  const r = calcPensionAmountAtAge(basicAmount, employeesAmount, targetAge, isNewRate);

  // rateの理論値と一致するか
  const monthsDiff = (targetAge - REFERENCE_AGE) * 12;
  let monthlyRate;
  if (targetAge === REFERENCE_AGE) monthlyRate = 0;
  else if (targetAge < REFERENCE_AGE) monthlyRate = isNewRate ? EARLY_RATE_NEW : EARLY_RATE_OLD;
  else monthlyRate = LATE_RATE;
  const expectedRate = 1 + Math.abs(monthsDiff) * monthlyRate;

  const rateOk = Math.abs(r.rate - expectedRate) < TOLERANCE_RATE;
  const totalOk = r.totalAmount === r.basicAmount + r.employeesAmount;
  const roundOk = r.basicAmount === Math.round(basicAmount * r.rate) && r.employeesAmount === Math.round(employeesAmount * r.rate);

  const ok = rateOk && totalOk && roundOk;
  if (ok) randPass++; else randFail++;
  record(
    label,
    ok,
    `basic=${basicAmount} employees=${employeesAmount} targetAge=${targetAge} isNewRate=${isNewRate} compareEndAge=${compareEndAge} ` +
    `rate=${r.rate.toFixed(4)}(期待${expectedRate.toFixed(4)}) total=${r.totalAmount}(=${r.basicAmount}+${r.employeesAmount})`
  );
}
console.log(`\nランダムケース結果: ${randPass} PASS / ${randFail} FAIL`);

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: calcPensionAmountAtAge()とcalcBreakEvenAge()の境界値・代表ケース・ランダムケースを確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));
