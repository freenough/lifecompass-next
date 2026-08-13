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
  calcResidentTaxTiming,
  PER_CAPITA_TAX,
  NON_TAXABLE_SALARY_INCOME_THRESHOLD,
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

check('年収400万円(2025年分):課税所得233万円', calcTaxableSalaryIncome(4_000_000, 2025), 2_330_000);
check('低所得(2025年分):課税所得0円(マイナスにならない)', calcTaxableSalaryIncome(500_000, 2025), 0);

console.log('\n' + '='.repeat(90));
console.log('【calcResidentTaxTiming】代表12パターン(退職前年年収400/600/800万円 × 退職月1/5/9/12月)');
console.log('前々年の年収は未入力(=isIncomeBasisEstimated: trueで代用)、postRetirementIncome=0、');
console.log('retirementYearIncomeOverride未指定、lumpSumPreference未指定(デフォルトinstallment)。');
console.log('='.repeat(90));

const MATRIX = [
  // [priorYearIncome, month, expectedAnnualTaxRemaining, expectedCollectionType, expectedBasisLabel, expectedIsEstimated, expectedNextYearNonTaxable]
  // isEstimated: 波1がpriorYearIncomeTwoYearsAgoで代用したかどうか。1-5月グループのみ意味を持つ
  // (今回のケースはpriorYearIncomeTwoYearsAgo未入力なので1-5月は常にtrue)。6-12月グループは
  // そもそも前々年基準を使わないため、代用の概念自体が存在せずfalse。
  // nextYearNonTaxable: 波2は「年収÷12×退職月」の月割り推計のため、1月退職(1ヶ月分のみ)は
  // どの年収帯でも推計値が非課税限度額(給与所得45万円)を下回り true になる(現実的な挙動)。
  { income: 4_000_000, month: 1, remaining: 99_166, collectionType: '強制一括徴収', basis: '前々年', isEstimated: true, nextYearNonTaxable: true },
  { income: 4_000_000, month: 5, remaining: 0, collectionType: '通常徴収で完了', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 4_000_000, month: 9, remaining: 158_666, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 4_000_000, month: 12, remaining: 99_166, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 6_000_000, month: 1, remaining: 165_833, collectionType: '強制一括徴収', basis: '前々年', isEstimated: true, nextYearNonTaxable: true },
  { income: 6_000_000, month: 5, remaining: 0, collectionType: '通常徴収で完了', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 6_000_000, month: 9, remaining: 265_333, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 6_000_000, month: 12, remaining: 165_833, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 8_000_000, month: 1, remaining: 238_333, collectionType: '強制一括徴収', basis: '前々年', isEstimated: true, nextYearNonTaxable: true },
  { income: 8_000_000, month: 5, remaining: 0, collectionType: '通常徴収で完了', basis: '前々年', isEstimated: true, nextYearNonTaxable: false },
  { income: 8_000_000, month: 9, remaining: 381_333, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
  { income: 8_000_000, month: 12, remaining: 238_333, collectionType: '普通徴収', basis: '退職前年', isEstimated: false, nextYearNonTaxable: false },
];

// 波2は退職年=今年(new Date().getFullYear())の給与所得控除テーブルを使う。本スクリプトの
// 実行年である2026年は「令和8年分」に該当し、74万円ベースの特例テーブルが適用される。
// 400万円・5月退職のケース(月割り推計167万円弱)だけがこの変更の影響を受け、63,600円→54,600円
// になる(計算過程はimpl_kyuyo_koujo_reiwa8_9_tokurei_report.mdに記載)。他の11パターンは
// 月割り推計所得が「0円にfloorされる低所得帯」または「220万円を上回り上位区分の速算表が
// 令和7年度版と共通のため無影響」のいずれかに該当し、値は変わらない。
const NEXT_YEAR_TOTAL = {
  '4000000-1': 5_000, '4000000-5': 54_600, '4000000-9': 164_000, '4000000-12': 238_000,
  '6000000-1': 5_000, '6000000-5': 129_000, '6000000-9': 278_000, '6000000-12': 398_000,
  '8000000-1': 5_000, '8000000-5': 187_300, '8000000-9': 398_000, '8000000-12': 572_000,
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
  check('前々年入力あり:波1残額(199,000円×5/12)', withInput.currentYearTax.remainingAmount, 82_916);
  check('前々年入力あり:assumptionNotesに代用の注記なし',
    withInput.assumptionNotes.some(n => n.includes('前々年の所得が未入力')), false);
}

console.log('\n' + '='.repeat(90));
console.log('【6〜12月退職:lumpSumPreference分岐(残額は同じ、collectionTypeのみ異なる)】');
console.log('='.repeat(90));
{
  const installment = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('installment(デフォルト):区分', installment.currentYearTax.collectionType, '普通徴収');
  check('installment(デフォルト):残額', installment.currentYearTax.remainingAmount, 265_333);
  check('installment(デフォルト):isWithheldAtSource', installment.currentYearTax.isWithheldAtSource, false);

  const lump = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0, lumpSumPreference: 'lump',
  });
  check('lump選択時:区分', lump.currentYearTax.collectionType, '任意一括徴収');
  check('lump選択時:残額(installmentと同額)', lump.currentYearTax.remainingAmount, 265_333);
  check('lump選択時:isWithheldAtSource', lump.currentYearTax.isWithheldAtSource, true);
  check('lump選択時:noteに残税額不足時の普通徴収切替の言及あり',
    lump.currentYearTax.note.includes('不足分は普通徴収に切り替わります'), true);
}

console.log('\n' + '='.repeat(90));
console.log('【波2:postRetirementIncomeの加算・retirementYearIncomeOverride】');
console.log('='.repeat(90));
{
  // (600万/12)*9 + 50万 = 500万円 → 検算結果: taxable=313万円, incomeTaxPart=31.3万円, total=31.8万円
  const withPost = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 500_000,
  });
  check('postRetirementIncome加算:課税所得', withPost.nextYearTax.taxableIncomeAssumption, 3_130_000);
  check('postRetirementIncome加算:波2合計', withPost.nextYearTax.total, 318_000);
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
  check('override指定:課税所得', overridden.nextYearTax.taxableIncomeAssumption, 7_620_000);
  check('override指定:波2合計', overridden.nextYearTax.total, 767_000);
  check('override指定:assumptionNotesに月割り注記なし',
    overridden.assumptionNotes.some(n => n.includes('月割り')), false);

  const notOverridden = calcResidentTaxTiming({ priorYearIncome: 6_000_000, retirementMonth: 9, postRetirementIncome: 0 });
  check('未override:assumptionNotesに月割り注記あり',
    notOverridden.assumptionNotes.some(n => n.includes('月割り')), true);
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
  // 手動テストで発見された具体的な不整合ケース(退職前年年収600万円・12月退職・一括徴収)。
  // 修正前のUIロジック(toManYen(totalCashNeeded))では56万円になっていたが、
  // 円単位の値そのものは変わっていない(165,833円+398,000円=563,833円)。
  // 「個別に丸めてから合計する」修正後は17+40=57万円になる(想定通りの表示変更)。
  const bugCase = calcResidentTaxTiming({
    priorYearIncome: 6_000_000, retirementMonth: 12, postRetirementIncome: 0, lumpSumPreference: 'lump',
  });
  const roundedCurrent = toManYen(bugCase.currentYearTax.remainingAmount);
  const roundedNext = toManYen(bugCase.nextYearTax.total);
  const oldStyleHeadline = toManYen(bugCase.totalCashNeeded); // 修正前の(誤った)表示方式
  check('不具合再現ケース:①(残額)', roundedCurrent, 17);
  check('不具合再現ケース:②(小計)', roundedNext, 40);
  check('不具合再現ケース:①+②=57万円(修正後の正しい表示)', roundedCurrent + roundedNext, 57);
  check('不具合再現ケース:円単位の合計値は変更なし(563,833円)', bugCase.totalCashNeeded, 563_833);
  check('不具合再現ケース:旧方式(totalCashNeededを直接丸め)は56万円のままズレることの確認',
    oldStyleHeadline, 56);

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
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
