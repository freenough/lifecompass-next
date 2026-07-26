/**
 * scripts/article9-tool-numbers-v2.js
 * ブログ9記事目「新NISAは毎月いくら積み立てればいい?」用の数値算出(改訂版)。
 * 使い捨てスクリプト（full-verify.js / verify-finance-core.js の回帰フィクスチャは変更しない）。
 *
 * 題材は積立額逆算ツール(/asset-simulator/tools/monthly-investment)のデフォルト例
 * （MonthlyInvestmentTool.tsx の DEFAULT_VALUES）をそのまま使う。特定のキャラクターは使わない。
 *
 * - 1(利回り別の必要積立額): src/lib/financeCore.ts の calcRequiredMonthlyContribution() を
 *   実際に呼び出して算出（ツール自体の実出力）。
 * - 2(モンテカルロでの目標到達率): financeCore.ts には市場変動を扱う機能がないため、
 *   本番の simulate()/runMC() を直接呼び出して算出。ボラティリティは新規に考案せず、
 *   src/lib/profile.ts の ASSET_CLASSES（全世界株, LTCMA 2026）および SAMPLE_PROFILE の
 *   デフォルト値(mcStd=16, mcStdR=10)をそのまま使う。
 *
 * 実行: node scripts/article9-tool-numbers-v2.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate, runMC } = require('../src/lib');
const { calcRequiredMonthlyContribution } = require('../src/lib/financeCore');
const { SAMPLE_PROFILE, ASSET_CLASSES } = require('../src/lib/profile');
const { randNorm } = require('../src/lib/helpers');

// ================================================================
// 題材（ツールのデフォルト例。MonthlyInvestmentTool.tsx の DEFAULT_VALUES と同一）
// ================================================================
const CUR_AGE = 35;
const TARGET_AGE = 55;
const YEARS = TARGET_AGE - CUR_AGE; // 20
const CURRENT_ASSETS = 100;   // 万円
const TARGET_ASSETS = 3000;   // 万円
const RATES = [3, 5, 7];

console.log('='.repeat(90));
console.log('【題材】積立額逆算ツールのデフォルト例');
console.log('='.repeat(90));
console.log(`  現在${CUR_AGE}歳 → 目標達成${TARGET_AGE}歳（${YEARS}年間）`);
console.log(`  現在資産${CURRENT_ASSETS}万円 → 目標資産${TARGET_ASSETS}万円`);

// ================================================================
// 1. 利回り別の必要積立額（financeCore.ts の calcRequiredMonthlyContribution() を直接呼び出し）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【1】利回り別の必要積立額（financeCore.ts: calcRequiredMonthlyContribution()）');
console.log('='.repeat(90));

const requiredMonthlyByRate = {};
for (const rate of RATES) {
  const monthly = calcRequiredMonthlyContribution(CURRENT_ASSETS, TARGET_ASSETS, YEARS, rate);
  requiredMonthlyByRate[rate] = monthly;
  console.log(`  年率${rate}%: 必要積立額 ${monthly.toFixed(2)}万円/月`);
}

// ================================================================
// 2. モンテカルロでの目標到達率（想定利回り5%、本番 simulate()/runMC() を直接呼び出し）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【2】モンテカルロでの目標到達率（年率5%・本番 simulate()/runMC()）');
console.log('='.repeat(90));

// ボラティリティの出所: 新規に考案しない。
// src/lib/profile.ts の ASSET_CLASSES（LTCMA 2026）「全世界株」: mu=7.0, sigma=16.0
// および、同ファイルの SAMPLE_PROFILE.params（アプリの初回アクセス時サンプルプロファイル、
// CLAUDE.md記載のオンボーディング用デフォルト）: mcStd=16, mcStdR=10 と完全に一致する。
const worldEquity = ASSET_CLASSES.find(a => a.key === '全世界株');
console.log(`  ボラティリティの出所: src/lib/profile.ts ASSET_CLASSES「全世界株」sigma=${worldEquity.sigma} (LTCMA 2026)`);
console.log(`                        同ファイル SAMPLE_PROFILE.params.mcStd=${SAMPLE_PROFILE.params.mcStd}, mcStdR=${SAMPLE_PROFILE.params.mcStdR} と一致`);
const MC_STD = SAMPLE_PROFILE.params.mcStd;   // 16
const MC_STD_R = SAMPLE_PROFILE.params.mcStdR; // 10（今回の20年間は積立期のみのため未使用）

const monthly5 = requiredMonthlyByRate[5];
const annual5 = monthly5 * 12;

// scripts/verify-finance-core.js の buildDummyProfileForVerification() と同様の設計
// （NISA単体・他ロジック無効化）。mcStd/mcStdRのみ0ではなく実際のボラティリティを設定する。
function buildMCProfile(currentAssets, monthlyContribution, years, ratePct, mcStd, mcStdR) {
  const curAge = CUR_AGE;
  const retAge = curAge + years + 50; // 20年間は積立期のまま推移させる
  const lifeEx = retAge + 10;
  const annualContribution = monthlyContribution * 12;
  return {
    curAge,
    lifeEx,
    baseInc: annualContribution, // avail === totalCon（余剰ゼロ・按分取り崩し発生なし）
    baseExp: 0,
    inflR: 0,
    retAge,
    penAge: retAge + 1,
    penAmt: 0,
    mcStd,
    mcStdR,
    hasIdeco: false,
    idecoYrs: 1,
    idecoReceiveType: 'lump',
    idecoReceiveYears: 10,
    idecoSplitRatio: 50,
    idecoStartAge: retAge + 100,
    sevYrs: 0,
    acct: {
      nisa:  { bal: currentAssets, con: annualContribution, toAge: retAge, rW: ratePct, rR: ratePct },
      ideco: { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0 },
      tax:   { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0, costBasis: 0 },
      cash:  { bal: 0 },
    },
    spouse: null,
  };
}

const p5 = buildMCProfile(CURRENT_ASSETS, monthly5, YEARS, 5, MC_STD, MC_STD_R);

// 年末積立方式（前年末残高を1年運用後、年末に積立を加算）のため、20回目の積立・成長後の
// スナップは age = curAge + years - 1 になる（verify-finance-core.js と同じ規約。
// financeCore.tsの目標到達判定＝この年齢のスナップと突き合わせるのが正しい対応関係）。
const TARGET_SNAP_AGE = CUR_AGE + YEARS - 1; // 54

console.log(`  設定: NISA残高${CURRENT_ASSETS}万円・積立${monthly5.toFixed(2)}万円/月(年間${annual5.toFixed(2)}万円)・rW=rR=5%・mcStd=${MC_STD}`);
console.log(`  判定スナップの年齢: ${TARGET_SNAP_AGE}歳（年末積立方式の規約により、${YEARS}回目の積立完了時点）`);

console.log('  計算中 (本番runMC() N=1000)...');
const mcResult = runMC(p5, [], ['proportional'], 1000);
const strat = mcResult.strategies['proportional'];
const snapIdx = TARGET_SNAP_AGE - p5.curAge;
const p10 = strat.percentiles.p10[snapIdx];
const p50 = strat.percentiles.p50[snapIdx];
const p90 = strat.percentiles.p90[snapIdx];

console.log('  計算中 (目標到達率, N=1000, 同一のsimulate()を用いた独自試行ループ)...');
const N = 1000;
const years_sim = p5.lifeEx - p5.curAge + 1;
let achievedCount = 0;
for (let t = 0; t < N; t++) {
  const shockZ = Array.from({ length: years_sim }, () => randNorm(0, 1));
  const snaps = simulate(p5, [], 'proportional', shockZ);
  const snap = snaps.find(s => s.age === TARGET_SNAP_AGE);
  if (snap && snap.totalAssets >= TARGET_ASSETS) achievedCount++;
}
const achievedRate = (achievedCount / N) * 100;

console.log(`\n  1,000試行中、${TARGET_AGE}歳時点(スナップage=${TARGET_SNAP_AGE})で資産${TARGET_ASSETS}万円以上を維持できた試行の割合: ${achievedRate.toFixed(1)}%`);
console.log(`  資産分布（本番runMC()の戻り値、${TARGET_SNAP_AGE}歳時点）: p10=${p10}万円 / 中央値(p50)=${p50}万円 / p90=${p90}万円`);
console.log('  ※ runMC()はp10/p50/p90のみを返す設計のため、p25/p75は算出していない');

// ================================================================
// 3.（参考・任意）積立額を固定し、利回り3%/5%/7%での資産推移比較（決定論的、mcStd=0）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【3（参考）】年率5%時の必要積立額を固定した場合の、利回り3%/5%/7%での資産推移比較（決定論的）');
console.log('='.repeat(90));

const trajectoryByRate = {};
for (const rate of RATES) {
  const p = buildMCProfile(CURRENT_ASSETS, monthly5, YEARS, rate, 0, 0);
  const snaps = simulate(p, [], 'proportional');
  trajectoryByRate[rate] = snaps
    .filter(s => s.age >= CUR_AGE && s.age <= TARGET_SNAP_AGE)
    .map(s => ({ age: s.age, totalAssets: Math.round(s.totalAssets) }));
}

console.log(`  固定積立額: ${monthly5.toFixed(2)}万円/月（年間${annual5.toFixed(2)}万円）`);
for (const rate of RATES) {
  console.log(`\n  -- 年率${rate}% --`);
  for (const r of trajectoryByRate[rate]) {
    console.log(`    ${r.age}歳: ${r.totalAssets}万円`);
  }
}

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));

console.log('\n--- JSON出力（1/2/3まとめ） ---');
console.log(JSON.stringify({
  subject: { curAge: CUR_AGE, targetAge: TARGET_AGE, years: YEARS, currentAssets: CURRENT_ASSETS, targetAssets: TARGET_ASSETS },
  step1_requiredMonthlyContribution_financeCore: Object.fromEntries(
    RATES.map(r => [r, Number(requiredMonthlyByRate[r].toFixed(2))])
  ),
  step2_mc: {
    ratePct: 5,
    monthlyContribution: Number(monthly5.toFixed(2)),
    mcStdSource: 'src/lib/profile.ts ASSET_CLASSES 全世界株 sigma=16.0 (LTCMA 2026) / SAMPLE_PROFILE.params.mcStd=16',
    mcStd: MC_STD,
    trials: N,
    targetSnapAge: TARGET_SNAP_AGE,
    goalAchievedRatePct: Number(achievedRate.toFixed(1)),
    distribution: { p10, p50, p90 },
  },
  step3_trajectories_fixedContribution: trajectoryByRate,
}, null, 2));
