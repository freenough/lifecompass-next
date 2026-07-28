/**
 * scripts/blog11-pension-timing-numbers.js
 * ブログ11記事目「年金 繰上げ・繰下げ 比較シミュレーター」用の数値算出。
 * 本番関数を直接importするだけの薄いラッパー。独自の再実装・手計算は一切行わない。
 *
 * - H2-3(検証パート): src/lib/pensionCore.ts の calcPensionAmountAtAge()/calcBreakEvenAge()/
 *   calcCumulativeAmount() を、年金タイミングツール（PensionTimingTool.tsx）と同じ引数の
 *   渡し方で呼び出す。
 * - H2-5(比較グラフ): 本体シミュレーターの simulate() を、SimParamsを直接組み立てる既存の
 *   検証スクリプト（scripts/article10-tool-numbers.js等）と同じパターンで呼び出す。
 *   shockZOverridesを渡さない（デフォルトnull）ため、モンテカルロではなく決定論的な1本の
 *   パスになる（simulate.ts: `const shock = shockZOverrides ? ... : 0;`）。
 *
 * 実行: node scripts/blog11-pension-timing-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { calcPensionAmountAtAge, calcBreakEvenAge, calcCumulativeAmount } = require('../src/lib/pensionCore');
const { simulate, runMC } = require('../src/lib');
const { SAMPLE_PROFILE } = require('../src/lib/profile');

console.log('='.repeat(90));
console.log('【H2-3】年金タイミングツールでの試算（pensionCore.ts経由）');
console.log('='.repeat(90));

const BASIC = 78;
const EMPLOYEES = 120;
const IS_NEW_RATE = true;
const COMPARE_END_AGE = 90;
const AGES = [60, 65, 70, 75];

const base65 = calcPensionAmountAtAge(BASIC, EMPLOYEES, 65, IS_NEW_RATE);
console.log(`  基準(65歳)年額: ${base65.totalAmount}万円/年（内訳: 基礎${base65.basicAmount}+厚生${base65.employeesAmount}, rate=${base65.rate}）`);

const h2_3 = {};
for (const age of AGES) {
  const amt = calcPensionAmountAtAge(BASIC, EMPLOYEES, age, IS_NEW_RATE);
  const diffAmount = amt.totalAmount - base65.totalAmount;
  const diffRate = (diffAmount / base65.totalAmount) * 100;
  const cumulative90 = calcCumulativeAmount(BASIC, EMPLOYEES, age, IS_NEW_RATE, COMPARE_END_AGE);

  let breakEven = null;
  if (age !== 65) {
    breakEven = calcBreakEvenAge(BASIC, EMPLOYEES, age, IS_NEW_RATE, COMPARE_END_AGE);
  }

  h2_3[age] = {
    annualAmount: amt.totalAmount,
    rate: amt.rate,
    diffAmount,
    diffRatePct: Number(diffRate.toFixed(1)),
    breakEven,
    cumulativeAt90: cumulative90,
  };

  console.log(`\n  【${age}歳受給】`);
  console.log(`    年額: ${amt.totalAmount}万円/年（内訳: 基礎${amt.basicAmount}+厚生${amt.employeesAmount}, rate=${amt.rate}）`);
  console.log(`    65歳受給との差額: ${diffAmount >= 0 ? '+' : ''}${diffAmount}万円/年（${diffRate >= 0 ? '+' : ''}${diffRate.toFixed(1)}%）`);
  if (age === 65) {
    console.log(`    損益分岐年齢: 基準そのもののため算出対象外`);
  } else if (breakEven.foundWithinHorizon) {
    console.log(`    損益分岐年齢: ${breakEven.age}歳（65歳受給との比較, 比較終了年齢${COMPARE_END_AGE}歳以内）`);
  } else {
    console.log(`    損益分岐年齢: 比較終了年齢(${COMPARE_END_AGE}歳)内では、65歳受給との逆転は起こりません`);
  }
  console.log(`    ${COMPARE_END_AGE}歳時点累計受給額: ${cumulative90}万円`);
}

console.log('\n' + '='.repeat(90));
console.log('【H2-5】本体シミュレーターでの資産推移比較（simulate()経由・決定論的1本のパス）');
console.log('='.repeat(90));

const pensionAt60 = h2_3[60].annualAmount;
console.log(`  プロファイルBの年金受給額（H2-3の60歳受給時年額をpenAmtValへ転記）: ${pensionAt60}万円/年`);

const CUR_AGE = 60;
const LIFE_EX = 90;
// 指示書原案の生活費150万円/初期資産500万円では、Aが65歳の年金開始前に完全枯渇し、
// Bも黒字が一度も発生せずトグルの効果を示せなかった（KENZO確認済み・2026-07-28）。
// KENZOの指示により、生活費120万円/年・特定口座初期残高3,000万円に変更した。
const BASE_EXP = 120;
const TAX_BAL = 3000;
// 追記4（2026-07-28）：既定値2%だと「年金は名目固定・生活費だけ上昇」という
// 記事の主題と無関係な効果が混入するため、KENZOの指示によりinflR=0に変更した。
const INFL_R = 0;

// 【追記指示書：確認事項】前回算出でrWTax=2%/rRTax=1%になっていた理由:
// SAMPLE_PROFILE.params（src/lib/profile.ts）の既定値 `rWTax: 2, rRTax: 1`（同ファイル163行目）を
// そのまま参照していたため。これは本体シミュレーターの画面初期表示用サンプル値であり、
// システム全体で固定された値ではない（画面上でユーザーが自由に変更できる入力欄の初期値に過ぎない）。
// 追記指示書の指示により、記事用の想定利回りとして明示的に年4%（積立期・取崩期共通、
// NISA・iDeCo・特定口座すべて）を指定する。
const YIELD_PCT = 4;
console.log('\n  【確認事項】前回rWTax=2%/rRTax=1%だった理由:');
console.log(`    src/lib/profile.ts の SAMPLE_PROFILE.params 既定値 rWTax=${SAMPLE_PROFILE.params.rWTax}, rRTax=${SAMPLE_PROFILE.params.rRTax} をそのまま参照していたため。`);
console.log('    これは画面初期表示用のサンプル値であり、利回りは本来ユーザーが画面上で入力する仕様。');
console.log(`    → 今回は記事用の想定利回りとしてNISA・iDeCo・特定口座すべて年${YIELD_PCT}%（積立期・取崩期共通）を明示的に指定する。`);

console.log(`\n  共通設定: curAge=retAge=${CUR_AGE}（退職時点から起算）, lifeEx=${LIFE_EX}, baseExp=${BASE_EXP}万円/年, inflR=${INFL_R}%（既定値）, 想定利回り=${YIELD_PCT}%（NISA/iDeCo/特定口座・積立期/取崩期共通、記事用に明示指定）, 特定口座初期残高${TAX_BAL}万円のみ, NISA/iDeCo=0円, retirementSurplusReinvest=false(A)/true(B)`);
console.log(`  ※生活費120万円・特定口座${TAX_BAL}万円はKENZO確認済みの変更値（指示書原案の150万円/500万円では検証不能だったため）`);

function buildProfile({ penAge, penAmt, retirementSurplusReinvest }) {
  return {
    curAge: CUR_AGE,
    lifeEx: LIFE_EX,
    baseInc: 0,
    baseExp: BASE_EXP,
    inflR: INFL_R,
    retAge: CUR_AGE,
    penAge,
    penAmt,
    mcStd: SAMPLE_PROFILE.params.mcStd,
    mcStdR: SAMPLE_PROFILE.params.mcStdR,
    retirementSurplusReinvest,
    hasIdeco: false,
    idecoYrs: 1,
    idecoReceiveType: 'lump',
    idecoReceiveYears: 10,
    idecoSplitRatio: 50,
    idecoStartAge: CUR_AGE + 100,
    sevYrs: 0,
    acct: {
      nisa:  { bal: 0,   con: 0, toAge: CUR_AGE, rW: YIELD_PCT, rR: YIELD_PCT },
      ideco: { bal: 0,   con: 0, toAge: CUR_AGE, rW: YIELD_PCT, rR: YIELD_PCT },
      tax:   { bal: TAX_BAL, con: 0, toAge: CUR_AGE, rW: YIELD_PCT, rR: YIELD_PCT, costBasis: TAX_BAL },
      cash:  { bal: 0 },
    },
    spouse: null,
  };
}

const profileA = buildProfile({ penAge: 65, penAmt: 198, retirementSurplusReinvest: false });
const profileB = buildProfile({ penAge: 60, penAmt: pensionAt60, retirementSurplusReinvest: true });

const snapsA = simulate(profileA, [], 'proportional');
const snapsB = simulate(profileB, [], 'proportional');

console.log('\n  --- 年次総資産（グラフ用時系列データ） ---');
console.log('  年齢,プロファイルA総資産(65歳受給),プロファイルB総資産(60歳繰上げ+運用ON)');
const series = [];
for (let i = 0; i < snapsA.length; i++) {
  const age = snapsA[i].age;
  const a = snapsA[i].totalAssets;
  const b = snapsB[i].totalAssets;
  series.push({ age, totalAssetsA: a, totalAssetsB: b });
  console.log(`  ${age},${a},${b}`);
}

const finalA = snapsA[snapsA.length - 1].totalAssets;
const finalB = snapsB[snapsB.length - 1].totalAssets;
const finalDiff = finalB - finalA;
const finalDiffRate = (finalDiff / finalA) * 100;
console.log(`\n  90歳時点: A=${finalA}万円 / B=${finalB}万円 / 差額=${finalDiff >= 0 ? '+' : ''}${finalDiff}万円（${finalDiffRate >= 0 ? '+' : ''}${finalDiffRate.toFixed(1)}%）`);

console.log('\n  --- 参考: プロファイルA 60〜64歳（年金未受給期間）の収支・特定口座残高 ---');
let withdrawalDetectedA = false;
for (const s of snapsA) {
  if (s.age >= 60 && s.age <= 64) {
    const deficit = s.income - s.expense;
    if (deficit < 0) withdrawalDetectedA = true;
    console.log(`    ${s.age}歳: 収入=${s.income}万円 支出=${s.expense}万円 収支=${deficit}万円 特定口座残高=${s.tax}万円`);
  }
}
console.log(`  → 60〜64歳の間、収支が赤字（cash残高0のため特定口座からの取り崩しが発生）: ${withdrawalDetectedA ? 'はい' : 'いいえ'}`);

// ================================================================
// 追記2: プロファイルC（65歳受給・トグルON）— 要因分解用
// A・Bと条件は完全同一、年金受給開始・年金額のみAと同じ(65歳・198万円)で
// retirementSurplusReinvestのみBと同じtrueにする。
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【追記2】プロファイルC(65歳受給・トグルON)— 要因分解');
console.log('='.repeat(90));

const profileC = buildProfile({ penAge: 65, penAmt: 198, retirementSurplusReinvest: true });
const snapsC = simulate(profileC, [], 'proportional');

console.log('\n  --- 年次総資産（グラフ用時系列データ、年齢,A,B,C） ---');
const seriesABC = [];
for (let i = 0; i < snapsA.length; i++) {
  const age = snapsA[i].age;
  const a = snapsA[i].totalAssets;
  const b = snapsB[i].totalAssets;
  const c = snapsC[i].totalAssets;
  seriesABC.push({ age, totalAssetsA: a, totalAssetsB: b, totalAssetsC: c });
  console.log(`  ${age},${a},${b},${c}`);
}

const finalC = snapsC[snapsC.length - 1].totalAssets;
console.log(`\n  90歳時点: C=${finalC}万円`);

const diffSurplusOnly = finalC - finalA; // A(65,OFF) vs C(65,ON) = 黒字運用のみの効果
const diffTimingOnly  = finalB - finalC; // C(65,ON) vs B(60,ON) = 繰上げタイミングのみの効果
const diffSurplusOnlyRate = (diffSurplusOnly / finalA) * 100;
const diffTimingOnlyRate  = (diffTimingOnly / finalC) * 100;
const sumOfEffects = diffSurplusOnly + diffTimingOnly;
const actualABDiff = finalB - finalA;
const nonlinearityGap = actualABDiff - sumOfEffects;

console.log('\n  --- 要因分解（90歳時点、いずれも万円） ---');
console.log(`  A(65歳・OFF): ${finalA}万円`);
console.log(`  B(60歳・ON) : ${finalB}万円`);
console.log(`  C(65歳・ON) : ${finalC}万円`);
console.log(`  黒字運用のみの効果  [C(65,ON) - A(65,OFF)] = ${diffSurplusOnly >= 0 ? '+' : ''}${diffSurplusOnly}万円（${diffSurplusOnlyRate >= 0 ? '+' : ''}${diffSurplusOnlyRate.toFixed(1)}%）`);
console.log(`  繰上げタイミングのみの効果 [B(60,ON) - C(65,ON)] = ${diffTimingOnly >= 0 ? '+' : ''}${diffTimingOnly}万円（${diffTimingOnlyRate >= 0 ? '+' : ''}${diffTimingOnlyRate.toFixed(1)}%）`);
console.log(`  2効果の単純合計: ${sumOfEffects >= 0 ? '+' : ''}${sumOfEffects}万円`);
console.log(`  実際のA→B差額（前回報告値+873万円と比較）: ${actualABDiff >= 0 ? '+' : ''}${actualABDiff}万円`);
console.log(`  非線形性（実際の差額 - 単純合計）: ${nonlinearityGap >= 0 ? '+' : ''}${nonlinearityGap}万円${Math.abs(nonlinearityGap) < 1 ? '（実質ゼロ＝ほぼ加法的）' : '（非線形あり）'}`);

console.log('\n  --- 参考: プロファイルC 60〜64歳（年金未受給期間）の収支・特定口座残高 ---');
let withdrawalDetectedC = false;
for (const s of snapsC) {
  if (s.age >= 60 && s.age <= 64) {
    const deficit = s.income - s.expense;
    if (deficit < 0) withdrawalDetectedC = true;
    console.log(`    ${s.age}歳: 収入=${s.income}万円 支出=${s.expense}万円 収支=${deficit}万円 特定口座残高=${s.tax.toFixed(1)}万円`);
  }
}
console.log(`  → 60〜64歳の間、収支が赤字（取り崩し発生）: ${withdrawalDetectedC ? 'はい' : 'いいえ'}`);

console.log('\n  --- 参考: プロファイルCの黒字発生年齢範囲 ---');
const surplusAgesC = snapsC.filter(s => s.income - s.expense > 0).map(s => s.age);
if (surplusAgesC.length > 0) {
  console.log(`    黒字年齢: ${surplusAgesC[0]}歳〜${surplusAgesC[surplusAgesC.length - 1]}歳（${surplusAgesC.length}年間）`);
  for (const s of snapsC) {
    if (s.income - s.expense > 0) {
      console.log(`      ${s.age}歳: 収入=${s.income}万円 支出=${s.expense}万円 黒字=${s.income - s.expense}万円`);
    }
  }
} else {
  console.log('    黒字年齢: 発生なし');
}

// ================================================================
// 追記3: モンテカルロ試算（A・B・C、1,000試行）
// bankruptcyRate/percentilesは montecarlo.ts の runMC() が算出する値をそのまま使う
// （AnalysisResult型[analyze.tsの返り値]にはbankruptcyRateフィールドは存在せず、
// 実際にこの指標を算出しているのはrunMC()側のため、runMC()を直接呼び出す）。
// σは記事独自の値を設定せず、これまでのA/B/C決定論的パスと同じ
// SAMPLE_PROFILE.params.mcStd/mcStdR（シミュレーターの標準設定値）をそのまま使用する。
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【追記3】モンテカルロ試算（A・B・C、1,000試行）');
console.log('='.repeat(90));
console.log(`  σ設定: mcStd(積立期)=${SAMPLE_PROFILE.params.mcStd}%, mcStdR(取崩期)=${SAMPLE_PROFILE.params.mcStdR}%（SAMPLE_PROFILE.params既定値をそのまま使用。記事独自のσ指定なし）`);
console.log('  ※bankruptcyRateはanalyze.ts(AnalysisResult)ではなく、montecarlo.tsのrunMC()が算出する値（MCStrategyResult.bankruptcyRate）をそのまま使用');

const mcSnapIdx = LIFE_EX - CUR_AGE; // 90歳時点 = 配列末尾（30）
const mcResults = {};
for (const [label, profile, finalDeterministic] of [
  ['A', profileA, finalA],
  ['B', profileB, finalB],
  ['C', profileC, finalC],
]) {
  const mc = runMC(profile, [], ['proportional'], 1000);
  const strat = mc.strategies['proportional'];
  const p10 = strat.percentiles.p10[mcSnapIdx];
  const p50 = strat.percentiles.p50[mcSnapIdx];
  const p90 = strat.percentiles.p90[mcSnapIdx];
  const bankruptcyRate = strat.bankruptcyRate;
  const gapVsDeterministic = p50 - finalDeterministic;
  const gapVsDeterministicRate = (gapVsDeterministic / finalDeterministic) * 100;

  mcResults[label] = {
    p10, p50, p90, bankruptcyRate,
    depletionMean: strat.depletionMean, depletionMin: strat.depletionMin,
    deterministic: finalDeterministic, gapVsDeterministic, gapVsDeterministicRatePct: Number(gapVsDeterministicRate.toFixed(1)),
  };

  console.log(`\n  【プロファイル${label}】90歳時点総資産分布（N=1000, strategy=proportional）`);
  console.log(`    p10(悪いケース)=${p10}万円 / 中央値(p50)=${p50}万円 / p90(良いケース)=${p90}万円`);
  console.log(`    破綻率(bankruptcyRate)=${bankruptcyRate.toFixed(1)}%${strat.depletionMean !== null ? ` / 枯渇試行の平均枯渇年齢=${strat.depletionMean}歳 / 最短枯渇年齢=${strat.depletionMin}歳` : ' / 枯渇試行なし'}`);
  console.log(`    決定論的パス(前回報告値)=${finalDeterministic}万円 → MC中央値との乖離=${gapVsDeterministic >= 0 ? '+' : ''}${gapVsDeterministic}万円（${gapVsDeterministicRate >= 0 ? '+' : ''}${gapVsDeterministicRate.toFixed(1)}%）`);
}

console.log('\n  --- 分布幅（p90-p10、リスクの大きさの比較） ---');
for (const label of ['A', 'B', 'C']) {
  const r = mcResults[label];
  console.log(`    ${label}: p90-p10=${r.p90 - r.p10}万円`);
}

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));

console.log('\n--- JSON出力（H2-3/H2-5/追記2/追記3まとめ） ---');
console.log(JSON.stringify({
  h2_3: h2_3,
  h2_5: {
    profileB_penAmt: pensionAt60,
    finalAssets: { A: finalA, B: finalB, diff: finalDiff, diffRatePct: Number(finalDiffRate.toFixed(1)) },
    withdrawalDuringGapA: withdrawalDetectedA,
    series,
  },
  addendum2_profileC: {
    finalAssets: { A: finalA, B: finalB, C: finalC },
    decomposition: {
      surplusOnlyEffect: diffSurplusOnly,
      surplusOnlyEffectRatePct: Number(diffSurplusOnlyRate.toFixed(1)),
      timingOnlyEffect: diffTimingOnly,
      timingOnlyEffectRatePct: Number(diffTimingOnlyRate.toFixed(1)),
      sumOfEffects,
      actualABDiff,
      nonlinearityGap,
    },
    withdrawalDuringGapC: withdrawalDetectedC,
    surplusAgeRangeC: surplusAgesC.length > 0 ? { from: surplusAgesC[0], to: surplusAgesC[surplusAgesC.length - 1] } : null,
    seriesABC,
  },
  addendum3_mc: {
    sigma: { mcStd: SAMPLE_PROFILE.params.mcStd, mcStdR: SAMPLE_PROFILE.params.mcStdR },
    trials: 1000,
    results: mcResults,
  },
}, null, 2));
