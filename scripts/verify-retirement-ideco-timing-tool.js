/**
 * scripts/verify-retirement-ideco-timing-tool.js
 * 第9弾ツール(退職金×iDeCo受給タイミング比較)の検証スクリプト。
 *
 * 【2026-08-10根本修正】異なる年受給(19年ルール・10年ルール対象)の場合は、
 * 所得税法施行令第70条第1項第2号・第2項に基づく「甲(先)は税額固定・乙(後)のみ
 * 控除額を減額計算」方式を検証する(合算方式ではない)。パターンB・Cの期待値は
 * 財務省「令和7年度税制改正 所得税法等の改正」p.118-121の条文説明に基づき、
 * 指示書で手計算検証済みの値に全面差し替えた。パターンA(同一年受給・合算方式)・
 * 対象外ケースの期待値は変更なし。
 *
 * 【2026-08-10タスクF追加】重複期間が1〜2年ときわめて短いケースで、(ロ)の計算に
 * calcRetirementDeduction(80万円下限込み)をそのまま使う挙動(「40万円×年数」の単純計算
 * ではない)を意図的なものとして固定化するテストを追加した。
 *
 * 【2026-08-10タスクG追加】重複期間0年(期間が接するだけ)のケースで、減額規定
 * (施行令70条1項2号)自体を適用しない(hasOverlap=false→乙は満額控除のまま)よう修正し、
 * 0年・1年・2年・10年を1つの境界値テーブルとして整理した(1年・2年はタスクFのテストを統合)。
 *
 * src/lib/tax/retirementIdecoTiming.ts(新ツール側)と、
 * src/lib/tax/retirement.ts の calcRetirementDeduction/calcRetirementTaxableIncome/
 * calcRetirementIncomeTax(再利用元・既存実装、無変更)を直接importして使う。
 * 独自の再実装は行わない(整合性検証は既存関数を呼び出した結果同士の比較のみ)。
 *
 * 実行: node scripts/verify-retirement-ideco-timing-tool.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  determineRuleApplicability,
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

function toMan(yen) { return yen / 10_000; }

console.log('='.repeat(90));
console.log('【determineRuleApplicability】適用ルール判定の境界値(変更なし)');
console.log('='.repeat(90));

{
  const r = determineRuleApplicability(69, 60);
  check('iDeCo先・9年:order', r.order, 'ideco_first');
  check('iDeCo先・9年:appliedRule', r.appliedRule, 'ten_year_rule');
  check('iDeCo先・9年:対象', r.isAdjustmentApplicable, true);
}
{
  const r = determineRuleApplicability(70, 60);
  check('iDeCo先・10年:対象外', r.isAdjustmentApplicable, false);
}
{
  const r = determineRuleApplicability(60, 79);
  check('退職金先・19年:order', r.order, 'retirement_first');
  check('退職金先・19年:appliedRule', r.appliedRule, 'nineteen_year_rule');
  check('退職金先・19年:対象', r.isAdjustmentApplicable, true);
}
{
  const r = determineRuleApplicability(60, 80);
  check('退職金先・20年:対象外', r.isAdjustmentApplicable, false);
}
{
  const r = determineRuleApplicability(60, 60);
  check('同一年齢:order', r.order, 'same_year');
  check('同一年齢:appliedRule', r.appliedRule, 'nineteen_year_rule');
  check('同一年齢:対象', r.isAdjustmentApplicable, true);
}

console.log('\n' + '='.repeat(90));
console.log('【calcRetirementDeduction再確認】既存ロジックの再確認(新規実装ではない)');
console.log('='.repeat(90));

check('勤続20年以下:40万円×勤続年数(20年→800万円)', calcRetirementDeduction(20, false), 8_000_000);
check('勤続20年超:800万円+70万円×超過年数(25年→1,150万円)', calcRetirementDeduction(25, false), 11_500_000);
check('80万円下限(1年→80万円)', calcRetirementDeduction(1, false), 800_000);

console.log('\n' + '='.repeat(90));
console.log('【指示書テストケース①】B-2相当:みなし勤続期間の特例が適用されるケース');
console.log('='.repeat(90));
console.log('甲(先)=退職金:収入1,500万円・勤続35年・受給60歳 / 乙(後)=iDeCo:収入1,000万円・加入20年・受給70歳');

{
  const input = {
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 70, idecoYears: 20, idecoIncomeManYen: 1000,
  };
  const r = calcRetirementIdecoTiming(input);

  check('order', r.rule.order, 'retirement_first');
  check('調整対象', r.rule.isAdjustmentApplicable, true);
  check('甲の満額控除(1,850万円)', toMan(r.adjustment.deemed.fullDeduction), 1850);
  check('みなし勤続期間の特例が適用される', r.adjustment.deemed.applied, true);
  check('みなし勤続年数(30年)', r.adjustment.deemed.deemedYears, 30);
  check('甲の実開始年齢(25歳)', r.adjustment.firstStartAge, 25);
  check('甲の実効期間の終了年齢(55歳)', r.adjustment.firstEffectiveEndAge, 55);
  check('乙の実開始年齢(50歳)', r.adjustment.secondStartAge, 50);
  check('重複期間(5年、みなし調整後)', r.adjustment.overlapYears, 5);
  check('(イ)乙の満額控除(800万円)', toMan(r.adjustment.secondFullDeduction), 800);
  check('(ロ)重複期間5年分の控除額(200万円)', toMan(r.adjustment.overlapDeduction), 200);
  check('乙の控除額(600万円)', toMan(r.adjustment.secondAdjustedDeduction), 600);
  check('乙の課税退職所得(200万円)', toMan(r.secondResult.taxableIncome), 200);

  check('mode', r.mode, 'duplicate_adjustment');
  check('甲の手取り(1,500万円、変更なし)', toMan(r.firstResult.netAmount), 1500);
  check('乙の税額(所得税+復興税+住民税、約30.5万円)', toMan(r.secondResult.incomeTax + r.secondResult.residentTax.total), 30.5, 0.2);
  check('乙の手取り(約969.5万円)', toMan(r.secondResult.netAmount), 969.5, 0.2);
  check('合計手取り(約2,469〜2,470万円)', toMan(r.totalNetAmount), 2469.5, 0.5);

  // 誤った旧ロジック(合算控除2,550万円 > 合算収入2,500万円で非課税、合計2,500万円)には
  // 一致しないことを確認する(今回の修正で誤差が解消されたことの確認)
  const oldWrongTotalManYen = 2500;
  const differsFromOldWrong = Math.abs(toMan(r.totalNetAmount) - oldWrongTotalManYen) > 5;
  if (differsFromOldWrong) { pass++; console.log('[PASS] 誤った旧ロジックの値(2,500万円)とは一致しない(修正確認)'); }
  else { fail++; console.log('[FAIL] 誤った旧ロジックの値(2,500万円)に近すぎる(修正されていない疑い)'); }
}

console.log('\n' + '='.repeat(90));
console.log('【指示書テストケース②】C-1相当:みなし勤続期間の特例が適用されないケース');
console.log('='.repeat(90));
console.log('甲(先)=iDeCo:収入1,000万円・加入20年・受給60歳 / 乙(後)=退職金:収入1,500万円・勤続35年・受給61歳');

{
  const input = {
    retireAge: 61, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 60, idecoYears: 20, idecoIncomeManYen: 1000,
  };
  const r = calcRetirementIdecoTiming(input);

  check('order', r.rule.order, 'ideco_first');
  check('appliedRule', r.rule.appliedRule, 'ten_year_rule');
  check('調整対象', r.rule.isAdjustmentApplicable, true);
  check('甲の満額控除(800万円)', toMan(r.adjustment.deemed.fullDeduction), 800);
  check('みなし勤続期間の特例は適用されない', r.adjustment.deemed.applied, false);
  check('甲の実開始年齢(40歳)', r.adjustment.firstStartAge, 40);
  check('甲の実効期間の終了年齢(60歳、実際の期間そのまま)', r.adjustment.firstEffectiveEndAge, 60);
  check('乙の実開始年齢(26歳)', r.adjustment.secondStartAge, 26);
  check('重複期間(20年)', r.adjustment.overlapYears, 20);
  check('(イ)乙の満額控除(1,850万円)', toMan(r.adjustment.secondFullDeduction), 1850);
  check('(ロ)重複期間20年分の控除額(800万円、40万円×20)', toMan(r.adjustment.overlapDeduction), 800);
  check('乙の控除額(1,050万円)', toMan(r.adjustment.secondAdjustedDeduction), 1050);
  check('乙の課税退職所得(225万円)', toMan(r.secondResult.taxableIncome), 225);

  check('mode', r.mode, 'duplicate_adjustment');
  check('甲の手取り(約985万円、変更なし)', toMan(r.firstResult.netAmount), 985, 0.2);
  check('乙の税額(所得税等+住民税、約35.5万円)', toMan(r.secondResult.incomeTax + r.secondResult.residentTax.total), 35.5, 0.2);
  check('乙の手取り(約1,464.5万円)', toMan(r.secondResult.netAmount), 1464.5, 0.2);
  check('合計手取り(約2,449〜2,450万円)', toMan(r.totalNetAmount), 2449.5, 0.5);

  // 旧ロジック(2,444万円)とは一致しない点に注意(指示書に明記の通り、近いが別値)
  const oldLogicManYen = 2444;
  const differsFromOldLogic = Math.abs(toMan(r.totalNetAmount) - oldLogicManYen) > 3;
  if (differsFromOldLogic) { pass++; console.log('[PASS] 旧ロジックの値(2,444万円)とは一致しない(近いが別値であることの確認)'); }
  else { fail++; console.log('[FAIL] 旧ロジックの値(2,444万円)と一致してしまっている(修正されていない疑い)'); }
}

console.log('\n' + '='.repeat(90));
console.log('【タスクF/G】重複期間の境界値テーブル(0年・1年・2年・10年)');
console.log('='.repeat(90));
console.log('hasOverlap(「重複している場合」に該当するかの判定)と、重複期間の実長さの計算は');
console.log('別ステップに分離している。期間が接するだけ(0年)の場合はhasOverlap=falseとなり、');
console.log('減額規定(施行令70条1項2号)自体を適用しない(乙は満額控除のまま)。実際に重複が');
console.log('存在する(1年以上)場合は、calcRetirementDeduction(80万円下限込み)をそのまま使う');
console.log('(施行令70条2項「同項の規定を適用して」の解釈。40万円×年数の単純計算ではない)。');

{
  // 重複期間0年(タスクGの核心):B-3相当(退職金60歳1,500万円・iDeCo75歳1,000万円)。
  // 甲のみなし調整後の実効期間終了(55歳)と乙の実期間開始(55歳)がちょうど一致し、
  // 期間が接するだけで実質的な重複がない。hasOverlap=falseとなり、減額規定自体を
  // 適用しない(乙は満額控除800万円のまま)のが正しい(2026-08-10修正前は、この0年を
  // calcRetirementDeduction(0)に渡してしまい、80万円下限が誤って適用されていた)。
  const input = {
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 75, idecoYears: 20, idecoIncomeManYen: 1000,
  };
  const r = calcRetirementIdecoTiming(input);
  check('甲の実効期間終了(55歳、みなし調整後)', r.adjustment.firstEffectiveEndAge, 55);
  check('乙の実期間開始(55歳)', r.adjustment.secondStartAge, 55);
  check('hasOverlap=false(期間が接するだけ)', r.adjustment.hasOverlap, false);
  check('重複期間(0年)', r.adjustment.overlapYears, 0);
  check('(ロ)=0円(減額規定を適用しない)', r.adjustment.overlapDeduction, 0);
  check('乙の控除額=満額のまま(800万円)', toMan(r.adjustment.secondAdjustedDeduction), 800);
  check('乙の課税退職所得(100万円)', toMan(r.secondResult.taxableIncome), 100);
  check('合計手取り(約2,484.89万円)', toMan(r.totalNetAmount), 2484.89, 0.05);

  // 修正前の値(誤り、乙控除720万円・合計手取り2,478.85万円)とは一致しないことを確認
  const oldWrongManYen = 2478.85;
  const differsFromOldWrong = Math.abs(toMan(r.totalNetAmount) - oldWrongManYen) > 1;
  if (differsFromOldWrong) { pass++; console.log('[PASS] 修正前の誤った値(2,478.85万円)とは一致しない(修正確認)'); }
  else { fail++; console.log('[FAIL] 修正前の誤った値(2,478.85万円)に近すぎる(修正されていない疑い)'); }

  // 参考検算:重複が実質ゼロなら、対象内(このケース)と対象外(B-4)はほぼ一致するはず
  const b4 = calcRetirementIdecoTiming({
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 80, idecoYears: 20, idecoIncomeManYen: 1000,
  });
  check('B-4(対象外)とほぼ一致する(検算)', toMan(r.totalNetAmount), toMan(b4.totalNetAmount), 0.05);
}
{
  // 重複期間1年:naive計算(40万円×1年=40万円)とは異なり、80万円下限が適用されて
  // (ロ)=80万円になることを確認する(下限が明確に効くケース。タスクFより)。
  // 甲=退職金・60歳・勤続30年・収入2000万円(満額控除1500万円以上のためみなし特例は非適用)、
  // 乙=iDeCo・65歳・加入6年(甲の実効期間[30,60]と乙の実期間[59,65]の重複=1年)。
  const input = {
    retireAge: 60, serviceYears: 30, retireIncomeManYen: 2000,
    idecoAge: 65, idecoYears: 6, idecoIncomeManYen: 500,
  };
  const r = calcRetirementIdecoTiming(input);
  check('みなし特例は非適用(収入が満額控除以上)', r.adjustment.deemed.applied, false);
  check('hasOverlap=true', r.adjustment.hasOverlap, true);
  check('重複期間(1年)', r.adjustment.overlapYears, 1);
  check('(ロ)重複期間1年分の控除額(80万円下限が適用される。naive計算の40万円ではない)', toMan(r.adjustment.overlapDeduction), 80);
  check('(イ)乙の満額控除(240万円、6年×40万円)', toMan(r.adjustment.secondFullDeduction), 240);
  check('乙の控除額(160万円 = 240万円-80万円)', toMan(r.adjustment.secondAdjustedDeduction), 160);
}
{
  // 重複期間2年:40万円×2年=80万円となり、80万円下限と偶然一致する境界ケース
  // (下限の有無で結果は変わらないが、指示書の「1年・2年程度」の網羅のため含める。タスクFより)。
  const input = {
    retireAge: 60, serviceYears: 30, retireIncomeManYen: 2000,
    idecoAge: 65, idecoYears: 7, idecoIncomeManYen: 500,
  };
  const r = calcRetirementIdecoTiming(input);
  check('hasOverlap=true', r.adjustment.hasOverlap, true);
  check('重複期間(2年)', r.adjustment.overlapYears, 2);
  check('(ロ)重複期間2年分の控除額(80万円、40万円×2年と下限が一致する境界ケース)', toMan(r.adjustment.overlapDeduction), 80);
}
{
  // 重複期間10年:下限に触れない通常計算(B-1相当:退職金60歳1,500万円・iDeCo65歳1,000万円)。
  const input = {
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 65, idecoYears: 20, idecoIncomeManYen: 1000,
  };
  const r = calcRetirementIdecoTiming(input);
  check('hasOverlap=true', r.adjustment.hasOverlap, true);
  check('重複期間(10年)', r.adjustment.overlapYears, 10);
  check('(ロ)重複期間10年分の控除額(400万円、下限に触れない通常計算)', toMan(r.adjustment.overlapDeduction), 400);
}
{
  // 期間が完全に離れている(接触もしない)ケース:hasOverlapが正しくfalseになることを確認。
  // 甲=退職金・60歳・勤続10年(実期間[50,60])、乙=iDeCo・75歳・加入5年(実期間[70,75])。
  // 期間の間に10年の空白があり、境界が接する0年ケースとは異なる「明確な分離」であることを確認する。
  const input = {
    retireAge: 60, serviceYears: 10, retireIncomeManYen: 1000,
    idecoAge: 75, idecoYears: 5, idecoIncomeManYen: 500,
  };
  const r = calcRetirementIdecoTiming(input);
  check('order', r.rule.order, 'retirement_first');
  check('調整対象(受給間隔15年<=19年)', r.rule.isAdjustmentApplicable, true);
  check('みなし特例は非適用', r.adjustment.deemed.applied, false);
  check('hasOverlap=false(完全に離れている)', r.adjustment.hasOverlap, false);
  check('重複期間(0年)', r.adjustment.overlapYears, 0);
  check('乙自身の満額控除(200万円、5年×40万円)', toMan(r.adjustment.secondFullDeduction), 200);
  check('乙の控除額=満額のまま(200万円、減額なし)', toMan(r.adjustment.secondAdjustedDeduction), 200);
}

console.log('\n' + '='.repeat(90));
console.log('【指示書テストケース③】B-4相当:調整対象外(変更なしの確認)');
console.log('='.repeat(90));

{
  const input = {
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 80, idecoYears: 20, idecoIncomeManYen: 1000,
  };
  const r = calcRetirementIdecoTiming(input);

  check('対象外', r.rule.isAdjustmentApplicable, false);
  check('mode', r.mode, 'independent');
  check('adjustmentがnull', r.adjustment, null);

  const expectedRetirement = calcRetirementIncomeTax(1500 * 10_000, 35, false, false);
  const expectedIdeco = calcRetirementIncomeTax(1000 * 10_000, 20, false, false);

  check('退職金手取り(独立計算と一致)', r.firstResult.netAmount, expectedRetirement.netAmount);
  check('iDeCo手取り(独立計算と一致)', r.secondResult.netAmount, expectedIdeco.netAmount);
  check('合計手取り(1,500万円+985万円=2,485万円)', toMan(r.totalNetAmount), 2485, 0.2);
}

console.log('\n' + '='.repeat(90));
console.log('【パターンA】同一年受給(受給間隔0)は合算方式のまま(法30条5項、本修正の対象外)');
console.log('='.repeat(90));
console.log('※同一年受給は施行令70条(甲固定・乙減額)ではなく、既存のcalcIdecoLumpSumTax()');
console.log('  (ideco.ts、第6弾ツールで既に確立済み)による合算方式を使う。収入合算・');
console.log('  勤続年数は長い方(max)を採用して1本で計算する。');

{
  const input = {
    retireAge: 60, serviceYears: 35, retireIncomeManYen: 1500,
    idecoAge: 60, idecoYears: 20, idecoIncomeManYen: 1000,
  };
  const r = calcRetirementIdecoTiming(input);
  check('order', r.rule.order, 'same_year');
  check('mode', r.mode, 'combined');
  check('adjustmentはnull(施行令70条は不使用)', r.adjustment, null);
  check('firstResult/secondResultはnull(甲乙の区別なし)', r.firstResult, null);

  // 既存のcalcIdecoLumpSumTax()を直接呼び出した結果と一致することを確認する(整合性検証のみ)
  const expected = calcRetirementIncomeTax((1000 + 1500) * 10_000, Math.max(20, 35), false, false);
  check('合算方式の手取りがcalcIdecoLumpSumTax相当の独立計算と一致', r.combinedResult.netAmount, expected.netAmount);
  check('合計手取り = combinedResult.netAmount', r.totalNetAmount, r.combinedResult.netAmount);
  console.log(`  参考:合計手取り=${toMan(r.totalNetAmount).toFixed(2)}万円(合算勤続年数=max(35,20)=35年)`);
}

console.log('\n' + '='.repeat(90));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(90));

if (fail > 0) process.exitCode = 1;
