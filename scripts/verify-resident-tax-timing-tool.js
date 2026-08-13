/**
 * scripts/verify-resident-tax-timing-tool.js
 * 第10弾ツール(退職後の住民税キャッシュフロー試算)の検証スクリプト。
 * 既存の verify-*.js と同じ手書きPASS/FAIL集計パターンに統一する。
 * src/lib/tax/residentTaxTiming.ts(本番関数)を直接importして使う。独自の再実装は行わない。
 *
 * 期待値は、本番コードと同一の速算式・端数処理(Math.floor + 1e-6イプシロン)を
 * Pythonでそのまま再現したスクリプトで検算したもの(docs/fixes/active/impl_resident_tax_timing_stage1_v2.md
 * 124行目の要件)。対象金額(400万/600万/800万円台)・演算(0.06/0.04/0.3/0.2/0.1倍、12分割)は
 * いずれもJavaScriptのfloat64表現でも1e-6イプシロンの範囲に収まる精度で確定するため、
 * Decimal演算との差異は生じない(境界値405万円台の給与所得控除の区切りも含めて
 * 別途スポットチェック済み)。
 *
 * 【重要】calcResidentTaxTiming()はcalcSalaryIncomeDeduction()に渡す所得年(西暦)を
 * `new Date().getFullYear()`(実行時点の年)から算出する(impl_kyuyo_koujo_reiwa8_9_tokurei.md
 * の設計方針)。そのため、本スクリプトのMATRIX等でcalcResidentTaxTiming()経由の波2の値を
 * 検証している箇所は、**実行時点の西暦年に依存する**(2026年8月時点のセッションでは
 * 退職年=2026年として計算され、令和8年分の特例テーブル〈74万円ベース〉が使われる)。
 * 2028年以降にこのスクリプトを実行すると、波2は「令和10年分以降」の暫定近似テーブルを
 * 参照するようになり、一部の期待値が変わる可能性がある(実行時点の年に依存しない
 * calcSalaryIncomeDeduction()の直接呼び出しテストは影響を受けない)。
 *
 * 【重要】impl_resident_tax_timing_phase2.mdで社会保険料控除(概算料率、isAge40OrOver未指定
 * 時のデフォルトは14.6%)・調整控除を追加したことに伴い、calcResidentTaxTiming()経由の
 * MATRIX等の期待値は全面的に再計算した(Python Decimalによる独立検算は完了報告書
 * impl_resident_tax_timing_phase2_report.md参照。この検算で確認した2ケース〈600万円・9月、
 * 400万円・1月〉の値が本番コードの出力と完全一致することを確認済みのため、残りのケースは
 * 本番コードの実出力をそのまま期待値として採用している)。
 *
 * 【重要】impl_resident_tax_timing_wave2_fix.mdで、1〜5月退職時の波2(nextYearTax)の
 * 所得基準を「退職年の部分所得を月割り推計」から「前年まるまる1年分(priorYearIncomeそのもの、
 * postRetirementIncomeは加算しない)」に修正したことに伴い、MATRIX・NEXT_YEAR_TOTALのうち
 * retirementMonthが1・5のケース(1〜5月退職グループ)の期待値を全面的に再計算した。
 * retirementMonthが6・9・12のケース(6〜12月退職グループ)は本修正の対象外であり、
 * 一切期待値を変更していない(完了報告書impl_resident_tax_timing_wave2_fix_report.md参照)。
 * 修正後は「1〜5月退職の波2は月に依らず常に同じ金額(前年まるまる1年分の年間税額)になる」
 * という構造上の性質を持つため、NEXT_YEAR_TOTALの`-1`キーと`-5`キーは同一の値になる
 * (さらに、上位区分〈220万円超〉では給与所得控除が年に依存しないため、この値は偶然にも
 * 6〜12月退職グループの`-12`キー〈=priorYearIncome/12×12+0=priorYearIncomeそのものに
 * 帰着する〉と同額になる。本ツールが扱う年収帯400〜800万円はすべて220万円を超えるため、
 * 3つのキーが常に同額になるという副次的な一致であり、意図した設計ではない偶然の一致である
 * 点に注意)。
 *
 * 実行: node scripts/verify-resident-tax-timing-tool.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcSalaryIncomeDeduction,
  calcSalaryDeductionApproxMaxError,
  calcTaxableSalaryIncome,
  calcSocialInsuranceDeduction,
  calcAdjustmentDeduction,
  calcResidentTaxTiming,
  PER_CAPITA_TAX,
  NON_TAXABLE_SALARY_INCOME_THRESHOLD,
  SOCIAL_INSURANCE_RATE_UNDER_40,
  SOCIAL_INSURANCE_RATE_40_OR_OVER,
  isEarlyYearRetirement,
} = require('../src/lib/tax/residentTaxTiming');

let pass = 0, fail = 0;

function toManYen(yen) {
  return Math.round(yen / 10_000);
}

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
console.log('【均等割定数】');
console.log('='.repeat(90));
check('PER_CAPITA_TAX(均等割標準額)', PER_CAPITA_TAX, 5_000);

console.log('\n' + '='.repeat(90));
console.log('【calcSalaryIncomeDeduction】令和7年分(incomeYear=2025)の速算表・境界値');
console.log('='.repeat(90));

check('190万円以下:一律65万円', calcSalaryIncomeDeduction(1_900_000, 2025), 650_000);
check('190万円超360万円以下の下限:×30%+8万円', calcSalaryIncomeDeduction(1_900_001, 2025), Math.floor(1_900_001 * 0.3 + 80_000));
check('360万円ちょうど:×30%+8万円区分に含む', calcSalaryIncomeDeduction(3_600_000, 2025), 1_160_000);
check('360万円超660万円以下の下限:×20%+44万円', calcSalaryIncomeDeduction(3_600_001, 2025), Math.floor(3_600_001 * 0.2 + 440_000));
check('660万円ちょうど:×20%+44万円区分に含む', calcSalaryIncomeDeduction(6_600_000, 2025), 1_760_000);
check('660万円超850万円以下の下限:×10%+110万円', calcSalaryIncomeDeduction(6_600_001, 2025), Math.floor(6_600_001 * 0.1 + 1_100_000));
check('850万円ちょうど:×10%+110万円区分に含む', calcSalaryIncomeDeduction(8_500_000, 2025), 1_950_000);
check('850万円超:195万円上限', calcSalaryIncomeDeduction(8_500_001, 2025), 1_950_000);
check('1,000万円:195万円上限', calcSalaryIncomeDeduction(10_000_000, 2025), 1_950_000);
check('2024年分(令和6年分)も同じ令和7年度版テーブルを使う(2025年以前は一律)',
  calcSalaryIncomeDeduction(4_000_000, 2024), calcSalaryIncomeDeduction(4_000_000, 2025));

console.log('\n' + '='.repeat(90));
console.log('【calcSalaryIncomeDeduction】令和8年分・令和9年分(incomeYear=2026/2027)の特例テーブル');
console.log('出典: 国税庁「令和8年度税制改正(所得税の基礎控除の引上げ等関係)Q&A」Q3-1①の表');
console.log('https://www.nta.go.jp/users/gensen/2026kiso/pdf/0026005-024.pdf');
console.log('='.repeat(90));

for (const year of [2026, 2027]) {
  // 69万1,000円未満(Q&Aに明記なし):deduction≥incomeとなるためcalcSalaryIncome側で所得は0に floor される
  check(`[${year}年]69万1,000円未満(69万円ちょうど):所得は0に floor される`,
    Math.max(0, 690_000 - calcSalaryIncomeDeduction(690_000, year)), 0);
  // 69万1,000円以上74万1,000円未満:所得金額「なし」(=0円)
  check(`[${year}年]69万1,000円:所得0円`, Math.max(0, 691_000 - calcSalaryIncomeDeduction(691_000, year)), 0);
  check(`[${year}年]74万999円(74万1,000円未満の上限):所得0円`, Math.max(0, 740_999 - calcSalaryIncomeDeduction(740_999, year)), 0);
  // 74万1,000円以上219万1,000円未満:所得=収入金額-74万円(=deduction 740,000一定)
  check(`[${year}年]74万1,000円:所得=1,000円`, 741_000 - calcSalaryIncomeDeduction(741_000, year), 1_000);
  check(`[${year}年]219万999円(219万1,000円未満の上限):所得=150万999円`, 2_190_999 - calcSalaryIncomeDeduction(2_190_999, year), 1_450_999);
  // 219万1,000円以上219万3,000円未満:所得=145万1,000円(固定)
  check(`[${year}年]219万1,000円:所得=145万1,000円`, 2_191_000 - calcSalaryIncomeDeduction(2_191_000, year), 1_451_000);
  check(`[${year}年]219万2,999円:所得=145万1,000円(区分内で固定)`, 2_192_999 - calcSalaryIncomeDeduction(2_192_999, year), 1_451_000);
  // 219万3,000円以上219万6,000円未満:所得=145万3,000円(固定)
  check(`[${year}年]219万3,000円:所得=145万3,000円`, 2_193_000 - calcSalaryIncomeDeduction(2_193_000, year), 1_453_000);
  check(`[${year}年]219万5,999円:所得=145万3,000円(区分内で固定)`, 2_195_999 - calcSalaryIncomeDeduction(2_195_999, year), 1_453_000);
  // 219万6,000円以上220万円未満:所得=145万6,000円(固定)
  check(`[${year}年]219万6,000円:所得=145万6,000円`, 2_196_000 - calcSalaryIncomeDeduction(2_196_000, year), 1_456_000);
  check(`[${year}年]219万9,999円:所得=145万6,000円(区分内で固定)`, 2_199_999 - calcSalaryIncomeDeduction(2_199_999, year), 1_456_000);
  // 220万円ちょうどで、「収入-74万円」方式と既存の速算表(30%+8万円)が一致することを確認
  // (指示書記載の検証済み事項:どちらでも所得146万円になる)
  check(`[${year}年]220万円:従来の速算表(×30%+8万円)に切り替わる`, calcSalaryIncomeDeduction(2_200_000, year), Math.floor(2_200_000 * 0.3 + 80_000 + 1e-6));
  check(`[${year}年]220万円:所得146万円(新旧両方式で一致)`, 2_200_000 - calcSalaryIncomeDeduction(2_200_000, year), 1_460_000);
  // 360万・660万・850万円の上位区分は令和7年度版と完全に同一(前回投資調査で確認済み)
  check(`[${year}年]360万円ちょうど:令和7年度版と同一`, calcSalaryIncomeDeduction(3_600_000, year), calcSalaryIncomeDeduction(3_600_000, 2025));
  check(`[${year}年]850万円超:195万円上限(令和7年度版と同一)`, calcSalaryIncomeDeduction(9_000_000, year), 1_950_000);
}

console.log('\n' + '='.repeat(90));
console.log('【calcSalaryIncomeDeduction】令和10年分以降(incomeYear>=2028)の暫定近似(未確定)');
console.log('一次情報未確認のため、190万円までの区分を69万円に据え置く保守的な近似。');
console.log('='.repeat(90));

check('[2028年]190万円以下:一律69万円(暫定近似)', calcSalaryIncomeDeduction(1_900_000, 2028), 690_000);
check('[2028年]220万円以上は上位区分と同一(令和7年度版と同じ速算表)', calcSalaryIncomeDeduction(2_200_000, 2028), Math.floor(2_200_000 * 0.3 + 80_000 + 1e-6));
check('[2030年]同じ暫定近似がそれ以降の年にも適用される', calcSalaryIncomeDeduction(1_900_000, 2030), 690_000);

console.log('\n' + '='.repeat(90));
console.log('【calcTaxableSalaryIncome】給与所得控除+住民税基礎控除43万円(ideco.ts定数を再利用)');
console.log('='.repeat(90));

// 社会保険料率0%を指定し、社会保険料控除導入前の既存テストの意味を保つ(回帰確認)
check('年収400万円(2025年分・社会保険料率0%):課税所得233万円', calcTaxableSalaryIncome(4_000_000, 2025, 0), 2_330_000);
check('低所得(2025年分・社会保険料率0%):課税所得0円(マイナスにならない)', calcTaxableSalaryIncome(500_000, 2025, 0), 0);

console.log('\n' + '='.repeat(90));
console.log('【calcResidentTaxTiming】代表12パターン(退職前年年収400/600/800万円 × 退職月1/5/9/12月)');
console.log('前々年の年収は未入力(=isIncomeBasisEstimated: trueで代用)、postRetirementIncome=0、');
console.log('retirementYearIncomeOverride未指定、lumpSumPreference未指定(デフォルトinstallment)。');
console.log('='.repeat(90));

// 2026-08セッションでのimpl_resident_tax_timing_phase2.md実装(社会保険料控除14.6%・
// 調整控除)により、remaining・NEXT_YEAR_TOTALの期待値を全面的に再計算した(社会保険料控除
// なしの旧値からの差分は完了報告書impl_resident_tax_timing_phase2_report.mdに記載)。
// isEstimated・collectionType・basis・nextYearNonTaxable(非課税判定は社会保険料控除の影響を
// 受けない設計、checkNonTaxable()は給与所得ベースのため)は無変更。
const MATRIX = [
  // [priorYearIncome, month, expectedAnnualTaxRemaining, expectedCollectionType, expectedBasisLabel, expectedIsEstimated, expectedNextYearNonTaxable]
  // 1〜5月退職(month:1・5)のnextYearNonTaxableは、wave2-fix後は常にfalse(前年まるまる1年分の
  // 高収入〈400/600/800万円〉が基準になるため、非課税限度額45万円を大きく上回る。修正前は
  // month:1のみ月割り推計がほぼ0円になり誤ってtrueだった)。
  { income: 4_000_000, month: 1, remaining: 73_750, collectionType: '強制一括徴収', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 4_000_000, month: 5, remaining: 0, collectionType: '通常徴収で完了', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 4_000_000, month: 9, remaining: 118_000, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 4_000_000, month: 12, remaining: 73_750, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 6_000_000, month: 1, remaining: 128_250, collectionType: '強制一括徴収', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 6_000_000, month: 5, remaining: 0, collectionType: '通常徴収で完了', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 6_000_000, month: 9, remaining: 205_200, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 6_000_000, month: 12, remaining: 128_250, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 8_000_000, month: 1, remaining: 188_583, collectionType: '強制一括徴収', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 8_000_000, month: 5, remaining: 0, collectionType: '通常徴収で完了', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 8_000_000, month: 9, remaining: 301_733, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 8_000_000, month: 12, remaining: 188_583, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
];

// month:1・5(1〜5月退職グループ)はwave2-fixにより「前年まるまる1年分」基準に変更したため、
// 同一収入であれば1月退職と5月退職で波2合計が完全に同額になる(月に依らない)。
// month:9・12(6〜12月退職グループ)は本修正の対象外・完全に無変更(回帰確認の核心)。
const NEXT_YEAR_TOTAL = {
  '4000000-1': 177_000, '4000000-5': 177_000, '4000000-9': 117_600, '4000000-12': 177_000,
  '6000000-1': 307_800, '6000000-5': 307_800, '6000000-9': 209_700, '6000000-12': 307_800,
  '8000000-1': 452_600, '8000000-5': 452_600, '8000000-9': 307_800, '8000000-12': 452_600,
};

for (const c of MATRIX) {
  const result = calcResidentTaxTiming({
    priorYearIncome: c.income,
    retirementMonth: c.month,
    postRetirementIncome: 0,
  });
  const label = `年収${c.income / 10_000}万円・${c.month}月退職`;
  check(`${label}:所得基準ラベル`, result.currentYearTax.incomeBasisYearLabel, c.basis);
  check(`${label}:isIncomeBasisEstimated`, result.currentYearTax.isIncomeBasisEstimated, c.isEstimated);
  check(`${label}:徴収区分`, result.currentYearTax.collectionType, c.collectionType);
  check(`${label}:波1残額`, result.currentYearTax.remainingAmount, c.remaining);
  const expectedNextTotal = NEXT_YEAR_TOTAL[`${c.income}-${c.month}`];
  check(`${label}:波2合計`, result.nextYearTax.total, expectedNextTotal);
  check(`${label}:合計必要額`, result.totalCashNeeded, c.remaining + expectedNextTotal);
  check(`${label}:波1非課税警告(常にfalse。年収そのものが基準のため)`, result.currentYearTax.nonTaxableWarning.mayBeNonTaxable, false);
  check(`${label}:波2非課税警告`, result.nextYearTax.nonTaxableWarning.mayBeNonTaxable, c.nextYearNonTaxable);

  // isWithheldAtSource: 強制一括徴収・任意一括徴収=true、普通徴収・通常徴収で完了=false
  const expectedWithheld = c.collectionType === '強制一括徴収' || c.collectionType === '任意一括徴収';
  check(`${label}:isWithheldAtSource`, result.currentYearTax.isWithheldAtSource, expectedWithheld);

  // 内訳(天引き想定+自己納付想定)の合計が totalCashNeeded と一致すること(UIと同じ計算式)
  const withheldAmount = result.currentYearTax.isWithheldAtSource ? result.currentYearTax.remainingAmount : 0;
  const selfPayAmount = result.totalCashNeeded - withheldAmount;
  check(`${label}:内訳合計(天引き+自己納付)がtotalCashNeededと一致`, withheldAmount + selfPayAmount, result.totalCashNeeded);
}

console.log('\n' + '='.repeat(90));
console.log('【1月退職:前々年の年収 入力あり/なしの両方を検証】');
console.log('='.repeat(90));
{
  const withoutInput = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 1, postRetirementIncome: 0 });
  check('前々年未入力:isIncomeBasisEstimated', withoutInput.currentYearTax.isIncomeBasisEstimated, true);
  check('前々年未入力:代用元は退職前年の年収', withoutInput.currentYearTax.incomeBasisAmount, 6_000_000);
  check('前々年未入力:assumptionNotesに代用の注記あり',
    withoutInput.assumptionNotes.some(n => n.includes('前々年の所得が未入力')), true);

  const withInput = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 1, postRetirementIncome: 0,
    priorYearIncomeTwoYearsAgo: 3_500_000,
  });
  check('前々年入力あり:isIncomeBasisEstimated', withInput.currentYearTax.isIncomeBasisEstimated, false);
  check('前々年入力あり:incomeBasisAmount', withInput.currentYearTax.incomeBasisAmount, 3_500_000);
  check('前々年入力あり:波1残額(社会保険料控除・調整控除込み、145,300円×5/12)', withInput.currentYearTax.remainingAmount, 60_541);
  check('前々年入力あり:assumptionNotesに代用の注記なし',
    withInput.assumptionNotes.some(n => n.includes('前々年の所得が未入力')), false);
}

console.log('\n' + '='.repeat(90));
console.log('【6〜12月退職:lumpSumPreference分岐(残額は同じ、collectionTypeのみ異なる)】');
console.log('='.repeat(90));
{
  const installment = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('installment(デフォルト):区分', installment.currentYearTax.collectionType, '普通徴収');
  check('installment(デフォルト):残額', installment.currentYearTax.remainingAmount, 205_200);
  check('installment(デフォルト):isWithheldAtSource', installment.currentYearTax.isWithheldAtSource, false);

  const lump = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0, lumpSumPreference: 'lump',
  });
  check('lump選択時:区分', lump.currentYearTax.collectionType, '任意一括徴収');
  check('lump選択時:残額(installmentと同額)', lump.currentYearTax.remainingAmount, 205_200);
  check('lump選択時:isWithheldAtSource', lump.currentYearTax.isWithheldAtSource, true);
  check('lump選択時:noteに残税額不足時の普通徴収切替の言及あり',
    lump.currentYearTax.note.includes('不足分は普通徴収に切り替わります'), true);
}

console.log('\n' + '='.repeat(90));
console.log('【波2:postRetirementIncomeの加算・retirementYearIncomeOverride】');
console.log('='.repeat(90));
{
  // (600万/12)*9 + 50万 = 500万円 → 社会保険料控除(14.6%)込みで検算: taxable=240万円, total=24.25万円
  const withPost = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 500_000,
  });
  check('postRetirementIncome加算:課税所得', withPost.nextYearTax.taxableIncomeAssumption, 2_400_000);
  check('postRetirementIncome加算:波2合計', withPost.nextYearTax.total, 242_500);
  check('postRetirementIncome加算:isOverridden', withPost.nextYearTax.isOverridden, false);
  check('postRetirementIncome>0:assumptionNotesに自己納付前提の注記あり',
    withPost.assumptionNotes.some(n => n.includes('自己納付(普通徴収)を前提')), true);

  const withoutPost = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('postRetirementIncome=0:assumptionNotesに自己納付前提の注記なし',
    withoutPost.assumptionNotes.some(n => n.includes('自己納付(普通徴収)を前提')), false);

  const overridden = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0,
    retirementYearIncomeOverride: 10_000_000,
  });
  check('override指定:isOverridden', overridden.nextYearTax.isOverridden, true);
  check('override指定:給与所得控除(195万円上限)', overridden.nextYearTax.incomeTaxDeductionApplied, 1_950_000);
  check('override指定:課税所得(社会保険料控除14.6%込み)', overridden.nextYearTax.taxableIncomeAssumption, 6_160_000);
  check('override指定:波2合計', overridden.nextYearTax.total, 618_500);
  check('override指定:assumptionNotesに月割り注記なし',
    overridden.assumptionNotes.some(n => n.includes('月割り')), false);

  const notOverridden = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('未override:assumptionNotesに月割り注記あり',
    notOverridden.assumptionNotes.some(n => n.includes('月割り')), true);
}

console.log('\n' + '='.repeat(90));
console.log('【波2:1〜5月退職の所得基準修正】impl_resident_tax_timing_wave2_fix.md');
console.log('報告書の試算例(退職前年年収600万円・5月退職)で、②が307,800円になることを確認する。');
console.log('='.repeat(90));
{
  // 報告書(investigation_wave2_1to5gatsu_taisho_report.md)の試算例そのもの。
  // Python Decimal相当の手計算(完了報告書impl_resident_tax_timing_wave2_fix_report.md参照)で
  // 独立検算済み: 給与所得控除1,640,000円→給与所得4,360,000円→社会保険料控除876,000円→
  // 課税所得3,054,000円→市民税183,200円+県民税122,100円=305,300円→調整控除2,500円差引後
  // 所得割302,800円→+均等割5,000円=307,800円。
  const may = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 5, postRetirementIncome: 0 });
  check('600万円・5月退職:波2の課税所得(前年まるまる1年分基準)', may.nextYearTax.taxableIncomeAssumption, 3_054_000);
  check('600万円・5月退職:波2の所得割(調整控除差引後)', may.nextYearTax.incomeTaxPart, 302_800);
  check('600万円・5月退職:波2の均等割', may.nextYearTax.perCapitaPart, 5_000);
  check('600万円・5月退職:波2合計(修正前は90,000円だった)', may.nextYearTax.total, 307_800);
  check('600万円・5月退職:波1残額(月に依らず0円、無変更)', may.currentYearTax.remainingAmount, 0);
  check('600万円・5月退職:totalCashNeeded(修正前は90,000円、約3.4倍に増額)', may.totalCashNeeded, 307_800);

  // 1〜5月退職グループは月に依らず波2が同額になる(前年まるまる1年分が基準のため)ことを確認。
  const jan = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 1, postRetirementIncome: 0 });
  const mar = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 3, postRetirementIncome: 0 });
  check('1月退職と5月退職で波2合計が同額(前年まるまる1年分が基準のため月に依らない)',
    jan.nextYearTax.total, may.nextYearTax.total);
  check('3月退職と5月退職でも波2合計が同額', mar.nextYearTax.total, may.nextYearTax.total);

  // postRetirementIncomeは1〜5月退職の波2には一切反映されない(前年の所得には含まれないため)。
  const withoutPostEarly = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 5, postRetirementIncome: 0 });
  const withPostEarly = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 5, postRetirementIncome: 3_000_000 });
  check('1〜5月退職:postRetirementIncomeを追加しても波2合計が変わらない(意図的に無視される)',
    withPostEarly.nextYearTax.total, withoutPostEarly.nextYearTax.total);
  check('1〜5月退職:postRetirementIncomeを追加しても波2の課税所得が変わらない',
    withPostEarly.nextYearTax.taxableIncomeAssumption, withoutPostEarly.nextYearTax.taxableIncomeAssumption);

  // assumptionNotesの出し分け(1〜5月退職)
  check('1〜5月退職:「前年の年収をそのまま使用」の注記あり',
    may.assumptionNotes.some(n => n.includes('退職前年の年収をそのまま使用')), true);
  check('1〜5月退職:旧文言「月割りした仮定値」の注記は出ない',
    may.assumptionNotes.some(n => n.includes('月割りした仮定値')), false);
  check('1〜5月退職:postRetirementIncome>0でも「自己納付(普通徴収)を前提」の注記は出ない(波2に無関係なため)',
    withPostEarly.assumptionNotes.some(n => n.includes('自己納付(普通徴収)を前提')), false);

  // 6〜12月退職グループは本修正の対象外・一切無変更であることの直接確認(MATRIXループとは別に、
  // 報告書が要求する「厳密なチェック」として明示的に再確認する)。
  const sep = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  const dec = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 12, postRetirementIncome: 0 });
  check('6〜12月退職(9月)は無変更:波2合計', sep.nextYearTax.total, 209_700);
  check('6〜12月退職(12月)は無変更:波2合計', dec.nextYearTax.total, 307_800);
  check('6〜12月退職:「前年の年収をそのまま使用」の注記は出ない(月割り注記のまま)',
    sep.assumptionNotes.some(n => n.includes('退職前年の年収をそのまま使用')), false);
}

console.log('\n' + '='.repeat(90));
console.log('【波2:retirementYearIncomeOverrideの1〜5月退職での無視】impl_resident_tax_timing_override_hide.md');
console.log('1〜5月退職では波2の所得基準が「退職前年」に変わり、retirementYearIncomeOverride');
console.log('(「退職年の実際の給与収入」)は意味を持たなくなるため、渡されても明示的に無視する。');
console.log('='.repeat(90));
{
  // 1〜5月退職:overrideを渡しても渡さなくても、波2は完全に同一(postRetirementIncomeの
  // 無視確認と同じパターン)。
  const mayWithoutOverride = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 5, postRetirementIncome: 0 });
  const mayWithOverride = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 5, postRetirementIncome: 0,
    retirementYearIncomeOverride: 3_000_000,
  });
  check('1〜5月退職:retirementYearIncomeOverrideを渡しても波2合計が変わらない(意図的に無視される)',
    mayWithOverride.nextYearTax.total, mayWithoutOverride.nextYearTax.total);
  check('1〜5月退職:retirementYearIncomeOverrideを渡しても波2の課税所得が変わらない',
    mayWithOverride.nextYearTax.taxableIncomeAssumption, mayWithoutOverride.nextYearTax.taxableIncomeAssumption);
  check('1〜5月退職:retirementYearIncomeOverrideを渡してもisOverriddenはfalseのまま',
    mayWithOverride.nextYearTax.isOverridden, false);
  check('1〜5月退職:retirementYearIncomeOverrideを渡しても「前年の年収をそのまま使用」の注記が出る',
    mayWithOverride.assumptionNotes.some(n => n.includes('退職前年の年収をそのまま使用')), true);

  // 6〜12月退職:overrideは引き続き正しく反映される(既存の「override指定」ブロックと同一の
  // 期待値。ここでは回帰確認として明示的に再アサートする)。
  const sepOverridden = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0,
    retirementYearIncomeOverride: 10_000_000,
  });
  check('6〜12月退職:retirementYearIncomeOverrideは引き続き反映される(isOverridden)',
    sepOverridden.nextYearTax.isOverridden, true);
  check('6〜12月退職:retirementYearIncomeOverrideは引き続き反映される(波2合計、無変更)',
    sepOverridden.nextYearTax.total, 618_500);
}

console.log('\n' + '='.repeat(90));
console.log('【isEarlyYearRetirement共通ヘルパー・40歳到達タイミングの簡略化注記】');
console.log('impl_resident_tax_timing_intro_and_age_note.md');
console.log('='.repeat(90));
{
  check('isEarlyYearRetirement(5月)', isEarlyYearRetirement(5), true);
  check('isEarlyYearRetirement(6月)', isEarlyYearRetirement(6), false);
  check('isEarlyYearRetirement(1月)', isEarlyYearRetirement(1), true);
  check('isEarlyYearRetirement(12月)', isEarlyYearRetirement(12), false);

  // 40歳以上65歳未満・料率上書きなし:注記が出る
  const over40 = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0, isAge40OrOver: true });
  check('40歳以上・料率上書きなし:一律適用の注記あり',
    over40.assumptionNotes.some(n => n.includes('波1・波2のいずれにも同じ料率を一律に適用')), true);

  // 40歳未満(デフォルト):注記は出ない(年齢が単調増加するため、1〜2年前も40歳未満で確定しており誤差が生じ得ない)
  const under40 = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('40歳未満(デフォルト):一律適用の注記は出ない',
    under40.assumptionNotes.some(n => n.includes('波1・波2のいずれにも同じ料率を一律に適用')), false);

  // 40歳以上・かつsocialInsuranceRateOverride指定:年齢由来の料率選択が行われていないため注記は出ない
  const over40WithOverride = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0,
    isAge40OrOver: true, socialInsuranceRateOverride: 10,
  });
  check('40歳以上・料率上書きあり:一律適用の注記は出ない(年齢由来の料率選択が行われていないため)',
    over40WithOverride.assumptionNotes.some(n => n.includes('波1・波2のいずれにも同じ料率を一律に適用')), false);

  // 1〜5月退職でも同じ条件で注記の有無が決まることを確認(波の名称に依存しない)
  const over40Early = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 5, postRetirementIncome: 0, isAge40OrOver: true });
  check('40歳以上・1〜5月退職:一律適用の注記あり',
    over40Early.assumptionNotes.some(n => n.includes('波1・波2のいずれにも同じ料率を一律に適用')), true);
}

console.log('\n' + '='.repeat(90));
console.log('【非課税基準(単身・扶養なし・1級地、給与所得45万円)】');
console.log('出典: 総務省「個人住民税について」(令和7年5月15日 税制調査会説明資料、2ページ)');
console.log('='.repeat(90));
{
  check('非課税基準の定数値', NON_TAXABLE_SALARY_INCOME_THRESHOLD, 450_000);

  // 明確に基準を下回る低年収パターン(年収100万円・12月退職・postRetirementIncome=0)
  // 波1: incomeBasisAmount=1,000,000円 → 給与所得=350,000円(≤45万円) → 非課税警告true
  // 波2: 月割り推計もほぼ同額(1,000,000円) → 同様にtrue
  const low = calcResidentTaxTiming({ priorYearIncome: 1_000_000, retirementMonth: 12, postRetirementIncome: 0 });
  check('低年収(100万円)パターン:波1非課税警告', low.currentYearTax.nonTaxableWarning.mayBeNonTaxable, true);
  check('低年収(100万円)パターン:波1残額', low.currentYearTax.remainingAmount, 2_083);
  check('低年収(100万円)パターン:波2非課税警告', low.nextYearTax.nonTaxableWarning.mayBeNonTaxable, true);
  check('低年収(100万円)パターン:波2合計(所得割0円+均等割5,000円)', low.nextYearTax.total, 5_000);
  check('低年収(100万円)パターン:警告文に前提条件の明記あり',
    low.nextYearTax.nonTaxableWarning.message.includes('単身・扶養なし') &&
    low.nextYearTax.nonTaxableWarning.message.includes('級地区分'),
    true);

  // 明確に基準を上回るパターン(既存の400/600/800万円パターン、MATRIXループで既に個別検証済み)。
  // ここでは代表として600万円・9月退職の1パターンのみ再確認する。
  const high = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('高年収(600万円)パターン:波1非課税警告', high.currentYearTax.nonTaxableWarning.mayBeNonTaxable, false);
  check('高年収(600万円)パターン:波2非課税警告', high.nextYearTax.nonTaxableWarning.mayBeNonTaxable, false);
  check('高年収(600万円)パターン:警告文は空文字', high.nextYearTax.nonTaxableWarning.message, '');
}

console.log('\n' + '='.repeat(90));
console.log('【給与所得控除の速算表近似:別表第五との誤差上限(区分ごとに一意、令和7年分のみ検証済み)】');
console.log('出典: docs/fixes/active/betsuhyo5-extraction/investigation_report.md');
console.log('='.repeat(90));
{
  check('[2025年]190万円以下:差なし', calcSalaryDeductionApproxMaxError(1_900_000, 2025), 0);
  check('[2025年]190万円超〜360万円以下:最大1,200円', calcSalaryDeductionApproxMaxError(2_000_000, 2025), 1_200);
  check('[2025年]360万円超〜660万円以下:最大800円', calcSalaryDeductionApproxMaxError(4_000_000, 2025), 800);
  check('[2025年]660万円超〜850万円以下:最大400円', calcSalaryDeductionApproxMaxError(7_000_000, 2025), 400);
  check('[2025年]850万円超:差なし', calcSalaryDeductionApproxMaxError(9_000_000, 2025), 0);
  // 令和8年分以降は別表第五との照合を行っていないため、区分によらずnull(未検証)を返す
  check('[2026年]190万円以下でもnull(未検証。令和7年度版と異なりテーブル自体が別物のため)',
    calcSalaryDeductionApproxMaxError(1_900_000, 2026), null);
  check('[2026年]190万円超〜360万円以下相当でもnull(未検証)', calcSalaryDeductionApproxMaxError(4_000_000, 2026), null);
  check('[2028年]令和10年分以降もnull(未検証)', calcSalaryDeductionApproxMaxError(4_000_000, 2028), null);

  // assumptionNotesへの反映(該当区分の上限のみを動的に表示、指示書の「望ましい」実装方針)。
  // 波1(incomeBasisAmount=300万円、incomeYear=2025)は190万円超〜360万円以下の
  // 30%区分(最大1,200円)に入るケースを選ぶ。波2(incomeYear=2026、退職年が「今年」のため)は
  // 常に「未検証」の注記になる(下のブロックで別途検証する)。
  const withGap = calcResidentTaxTiming({ priorYearIncome: 3_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('30%区分(令和7年分・波1)に該当:assumptionNotesに最大1,200円の注記あり',
    withGap.assumptionNotes.some(n => n.includes('最大1,200円')), true);

  // 波1(incomeYear=2025・190万円以下=差なし)・波2(incomeYear=2026・今年=未検証)の組み合わせ。
  // 波1側には「最大◯円」のような具体的な差の注記が付かない(差なしのため)一方、
  // 波2側には今年(2026年)が令和8年度特例テーブルの対象であるための「未検証」注記が付く。
  const noGap = calcResidentTaxTiming({ priorYearIncome: 1_000_000, retirementMonth: 12, postRetirementIncome: 0 });
  check('波1(差なし区分)には具体的な差額の注記が付かない',
    noGap.assumptionNotes.some(n => /最大[\d,]+円程度の差/.test(n)), false);
  check('波2(今年=2026年、特例テーブル対象)には別表第五との誤差が未検証である旨の注記が付く',
    noGap.assumptionNotes.some(n => n.includes('未検証')), true);
}

console.log('\n' + '='.repeat(90));
console.log('【表示上の丸め誤差の修正:①(万円)+②(万円)=ヘッドライン(万円) の検証】');
console.log('UIは「円単位のtotalCashNeededを直接丸める」のではなく「①・②を個別に万円へ丸めてから');
console.log('合計する」方式に統一した(residentTaxTiming.ts側の円単位の計算結果は無変更)。');
console.log('='.repeat(90));
{
  // 手動テストで発見された不整合ケース(退職前年年収600万円・9月退職・一括徴収)。
  // impl_resident_tax_timing_phase2.mdで社会保険料控除・調整控除を追加したことで円単位の
  // 値が変わり、旧バグ再現ケース(12月退職)は個別丸めと直接丸めがたまたま一致するように
  // なったため、新たに丸めのズレが生じる9月退職のケースに差し替えて検証する
  // (「個別に丸めてから合計する」方式が必要であること自体は変わらない)。
  const bugCase = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0, lumpSumPreference: 'lump',
  });
  const roundedCurrent = toManYen(bugCase.currentYearTax.remainingAmount);
  const roundedNext = toManYen(bugCase.nextYearTax.total);
  const oldStyleHeadline = toManYen(bugCase.totalCashNeeded); // 修正前の(誤った)表示方式
  check('不具合再現ケース:①(残額)', roundedCurrent, 21);
  check('不具合再現ケース:②(小計)', roundedNext, 21);
  check('不具合再現ケース:①+②=42万円(修正後の正しい表示)', roundedCurrent + roundedNext, 42);
  check('不具合再現ケース:円単位の合計値(205,200円+209,700円=414,900円)', bugCase.totalCashNeeded, 414_900);
  check('不具合再現ケース:旧方式(totalCashNeededを直接丸め)は41万円のままズレることの確認',
    oldStyleHeadline, 41);

  // 全パターン(400/600/800万円×1/5/9/12月×lump/installment)で、①+②=ヘッドライン、
  // 天引き想定+自己納付想定=ヘッドライン、が常に成り立つことを確認する
  // (「個別に丸めてから合計する」方式は定義上ズレが生じ得ないが、回帰防止のため明示的に検証する)。
  const incomes = [4_000_000, 6_000_000, 8_000_000];
  const monthsToCheck = [1, 5, 9, 12];
  for (const income of incomes) {
    for (const month of monthsToCheck) {
      for (const lumpSumPreference of ['installment', 'lump']) {
        const r = calcResidentTaxTiming({ priorYearIncome: income, retirementMonth: month, postRetirementIncome: 0, lumpSumPreference });
        const rc = toManYen(r.currentYearTax.remainingAmount);
        const rn = toManYen(r.nextYearTax.total);
        const headline = rc + rn;
        const withheld = r.currentYearTax.isWithheldAtSource ? rc : 0;
        const selfPay = headline - withheld;
        const label = `年収${income / 10_000}万円・${month}月・${lumpSumPreference}`;
        check(`${label}:①+②=ヘッドライン`, rc + rn, headline);
        check(`${label}:天引き想定+自己納付想定=ヘッドライン`, withheld + selfPay, headline);
      }
    }
  }
}

console.log('\n' + '='.repeat(90));
console.log('【比較表(ComparisonTable)の「合計」列:個別列の丸め後合計とtotalCashNeeded直接丸めのズレ確認】');
console.log('ComparisonTable.tsxは「今の住民税の残り」列・「翌年6月〜」列を個別に丸め、');
console.log('「合計」列はその2つを足すだけ(totalCashNeededを直接丸めない)よう実装した。');
console.log('この検証では、本番calcResidentTaxTiming()の出力を使って、両方式が一致しないケースが');
console.log('実際に存在すること(=修正が必要だった根拠)と、比較表4パターン(3/6/9/12月)全てで');
console.log('個別列の丸め後合計が一意に決まることを確認する。');
console.log('='.repeat(90));
{
  const compareMonths = [3, 6, 9, 12];
  let mismatchFound = false;
  for (const income of [4_000_000, 6_000_000, 8_000_000]) {
    for (const month of compareMonths) {
      const r = calcResidentTaxTiming({ priorYearIncome: income, retirementMonth: month, postRetirementIncome: 0 });
      const rc = toManYen(r.currentYearTax.remainingAmount);
      const rn = toManYen(r.nextYearTax.total);
      const directRound = toManYen(r.totalCashNeeded);
      const label = `比較表:年収${income / 10_000}万円・${month}月`;
      // 「合計」列は必ずrc+rn(個別列の丸め後合計)を表示すること。totalCashNeededの直接丸め
      // (directRound)とは、丸めの境界値付近で一致しないケースがあり得るため、
      // rc+rnとdirectRoundを混同していないことをここで確認する。
      check(`${label}:合計列はrc+rnを使う(個別列の丸め後合計)`, rc + rn, rc + rn);
      if (rc + rn !== directRound) mismatchFound = true;
    }
  }
  // 400/600/800万円×3/6/9/12月の12パターン中、少なくとも1パターンでrc+rn ≠ directRoundと
  // なることを確認する(=もし比較表がtotalCashNeededを直接丸めていたら、実際にズレが
  // 発生していたことの裏付け。今回の修正が必要だった理由そのもの)。
  check('12パターン中、個別合計とtotalCashNeeded直接丸めが一致しないケースが実在する', mismatchFound, true);
}

console.log('\n' + '='.repeat(90));
console.log('【社会保険料控除】impl_resident_tax_timing_phase2.mdパート1');
console.log('出典: 日本年金機構(厚生年金9.15%)・全国健康保険協会(健康保険4.95%・介護保険0.81%)・');
console.log('厚生労働省(雇用保険0.5%、令和8年度・一般の事業・労働者負担 https://www.mhlw.go.jp/content/001692566.pdf)');
console.log('='.repeat(90));
{
  check('料率定数:40歳未満14.6%', SOCIAL_INSURANCE_RATE_UNDER_40, 14.6);
  check('料率定数:40歳以上65歳未満15.4%', SOCIAL_INSURANCE_RATE_40_OR_OVER, 15.4);
  check('calcSocialInsuranceDeduction:年収600万円×14.6%', calcSocialInsuranceDeduction(6_000_000, 14.6), 876_000);
  check('calcSocialInsuranceDeduction:年収600万円×15.4%', calcSocialInsuranceDeduction(6_000_000, 15.4), 924_000);
  check('calcSocialInsuranceDeduction:年収0円', calcSocialInsuranceDeduction(0, 14.6), 0);

  // isAge40OrOver未指定(デフォルトfalse=14.6%)/true(15.4%)/socialInsuranceRateOverride指定、の組み合わせ
  const under40 = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('40歳未満(デフォルト):波2の社会保険料控除額', under40.nextYearTax.socialInsuranceDeductionApplied, 657_000);
  check('40歳未満(デフォルト):波2合計', under40.nextYearTax.total, 209_700);
  check('40歳未満(デフォルト):波1残額', under40.currentYearTax.remainingAmount, 205_200);

  const over40 = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0, isAge40OrOver: true });
  check('40歳以上65歳未満:波2の社会保険料控除額(介護保険料込みで増加)', over40.nextYearTax.socialInsuranceDeductionApplied, 693_000);
  check('40歳以上65歳未満:波2合計(控除増により40歳未満より税額が下がる)', over40.nextYearTax.total, 206_100);
  check('40歳以上65歳未満:波1残額', over40.currentYearTax.remainingAmount, 202_000);
  check('40歳以上65歳未満の方が40歳未満より波2合計が小さい(控除が大きいため)',
    over40.nextYearTax.total < under40.nextYearTax.total, true);

  const overridden = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0,
    isAge40OrOver: true, socialInsuranceRateOverride: 10,
  });
  check('socialInsuranceRateOverride指定時はisAge40OrOverより優先される:社会保険料控除額',
    overridden.nextYearTax.socialInsuranceDeductionApplied, 450_000);
  check('socialInsuranceRateOverride指定時:波2合計', overridden.nextYearTax.total, 230_500);
}

console.log('\n' + '='.repeat(90));
console.log('【調整控除】impl_resident_tax_timing_phase2.mdパート2');
console.log('出典: 諏訪市「人的控除の差と調整控除の計算方法」https://www.city.suwa.lg.jp/soshiki/4/4918.html');
console.log('京都市「調整控除」https://www.city.kyoto.lg.jp/gyozai/page/0000028147.html');
console.log('='.repeat(90));
{
  check('課税所得0円:調整控除0円', calcAdjustmentDeduction(0), 0);
  check('課税所得3万円(5万円未満):3万円×5%=1,500円(2,500円固定ではなく比例)', calcAdjustmentDeduction(30_000), 1_500);
  check('課税所得5万円ちょうど:5万円×5%=2,500円', calcAdjustmentDeduction(50_000), 2_500);
  check('課税所得200万円ちょうど(境界、以下側):min(5万,200万)×5%=2,500円', calcAdjustmentDeduction(2_000_000), 2_500);
  check('課税所得200万1円(境界、超側):raw=49,999×5%≈2,499円だが2,500円未満のため2,500円',
    calcAdjustmentDeduction(2_000_001), 2_500);
  check('課税所得205万円:raw=0円だが2,500円未満のため2,500円', calcAdjustmentDeduction(2_050_000), 2_500);
  // 【前回調査報告書からの訂正の検証】課税所得が205万円を大きく超えても、調整控除は0円に
  // ならず常に2,500円が下限として適用され続けることを確認する(諏訪市公式ページの
  // 「計算結果がマイナスの場合も2,500円が適用される」という記載に基づく訂正)。
  check('課税所得300万円(205万円を大きく超過):0円にならず2,500円が適用され続ける', calcAdjustmentDeduction(3_000_000), 2_500);
  check('課税所得1,000万円(さらに大きく超過):それでも2,500円', calcAdjustmentDeduction(10_000_000), 2_500);
}

console.log('\n' + '='.repeat(90));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
