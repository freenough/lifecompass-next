/**
 * scripts/article10-tool-numbers.js
 * ブログ10記事目「新NISA、今のペースで積み立てたら何歳で3,000万円に届く?」用の数値算出。
 * 本番関数を直接importするだけの薄いラッパー。独自の財務計算式・再実装ロジックは一切含まない。
 *
 * フィクスチャ（指示書指定）: 現在35歳・現在資産100万円・毎月積立6.89万円・目標資産3,000万円・
 * 想定利回り3%/5%/7%（メイン5%）。9記事目（積立額逆算ツールのデフォルト例、35歳→100万円→
 * 3,000万円）の「年率5%時の必要積立額=6.89万円/月」の結果をそのまま前提として使っている。
 *
 * - タスク1・2: src/lib/financeCore.ts の calcAchievementAge() を、fire-ageツール
 *   （FireAgeTool.tsx / FireAgeResult.tsx / FireAgeSensitivityTable.tsx）と同じ引数の渡し方・
 *   同じfloor丸め処理で呼び出す。
 * - タスク3: 本番 simulate()/runMC() を、9記事目(article9-tool-numbers-v2.js)と同一の
 *   プロファイル構築パターン・同一のボラティリティ出所(SAMPLE_PROFILE.params.mcStd=16、
 *   src/lib/profile.ts ASSET_CLASSES「全世界株」sigma=16.0由来)で呼び出す。
 *
 * 実行: node scripts/article10-tool-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate, runMC } = require('../src/lib');
const { calcAchievementAge } = require('../src/lib/financeCore');
const { SAMPLE_PROFILE } = require('../src/lib/profile');
const { randNorm } = require('../src/lib/helpers');

// ================================================================
// フィクスチャ
// ================================================================
const CUR_AGE = 35;
const CURRENT_ASSETS = 100;      // 万円
const MONTHLY_CONTRIBUTION = 6.89; // 万円/月（9記事目の年率5%時必要積立額をそのまま使用）
const TARGET_ASSETS = 3000;      // 万円
const RATES = [3, 5, 7];

console.log('='.repeat(90));
console.log('【フィクスチャ】');
console.log('='.repeat(90));
console.log(`  現在${CUR_AGE}歳・現在資産${CURRENT_ASSETS}万円・毎月積立${MONTHLY_CONTRIBUTION}万円・目標資産${TARGET_ASSETS}万円`);

// ================================================================
// タスク1: メイン結果（到達年齢・5%運用）
// fire-ageツールの実装（FireAgeTool.tsx → FireAgeResult.tsx）と同じ呼び出し方・floor処理。
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【タスク1】メイン結果（financeCore.ts: calcAchievementAge(), annualRatePct=5）');
console.log('='.repeat(90));

const mainRaw = calcAchievementAge(CUR_AGE, CURRENT_ASSETS, TARGET_ASSETS, MONTHLY_CONTRIBUTION, 5);
if (mainRaw === null || mainRaw === 0) {
  console.log(`  異常値: calcAchievementAgeが${mainRaw}を返しました（フィクスチャの想定外）`);
  process.exit(1);
}
// FireAgeResult.tsx と同一のfloor処理: 四捨五入ではなくfloorで整数化する。
const mainAchievedAge = Math.floor(mainRaw);
const mainYearsUntil = mainAchievedAge - CUR_AGE;
console.log(`  calcAchievementAge()生値: ${mainRaw}`);
console.log(`  到達年齢(floor後): ${mainAchievedAge}歳`);
console.log(`  到達までの年数: ${mainYearsUntil}年`);

// ================================================================
// タスク2: 感度テーブル（3% / 5% / 7%、毎月積立額は固定）
// FireAgeSensitivityTable.tsx と同一の呼び出しパターン。
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【タスク2】感度テーブル（毎月積立額固定・利回り3種）');
console.log('='.repeat(90));

const sensitivity = {};
for (const rate of RATES) {
  const raw = calcAchievementAge(CUR_AGE, CURRENT_ASSETS, TARGET_ASSETS, MONTHLY_CONTRIBUTION, rate);
  const achievedAge = raw === null ? null : (raw === 0 ? 0 : Math.floor(raw));
  const yearsUntil = (achievedAge === null || achievedAge === 0) ? null : achievedAge - CUR_AGE;
  sensitivity[rate] = { achievedAge, yearsUntil };
  console.log(`  年率${rate}%: 到達年齢=${achievedAge}歳 到達までの年数=${yearsUntil}年`);
}

// ================================================================
// タスク3: モンテカルロでの到達確率・分布（5%運用、9記事目と同一のパラメータ設定）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【タスク3】モンテカルロ（年率5%・9記事目と同一のプロファイル構築パターン）');
console.log('='.repeat(90));

const MC_STD = SAMPLE_PROFILE.params.mcStd;   // 16（src/lib/profile.ts ASSET_CLASSES「全世界株」sigma=16.0と一致）
const MC_STD_R = SAMPLE_PROFILE.params.mcStdR; // 10（積立期のみのため未使用）
console.log(`  ボラティリティの出所: src/lib/profile.ts SAMPLE_PROFILE.params.mcStd=${MC_STD}（9記事目と同一）`);

// 9記事目 scripts/article9-tool-numbers-v2.js の buildMCProfile() と同一のプロファイル構築。
function buildMCProfile(currentAssets, monthlyContribution, years, ratePct, mcStd, mcStdR) {
  const curAge = CUR_AGE;
  const retAge = curAge + years + 50; // 積立期のまま推移させる
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

const years = mainYearsUntil; // タスク1の結果と同じ「◯年」を使う（9記事目はYEARS=20固定だったが、
                               // ここではタスク1のcalcAchievementAge()結果からそのまま導出する）
const p = buildMCProfile(CURRENT_ASSETS, MONTHLY_CONTRIBUTION, years, 5, MC_STD, MC_STD_R);

// 年末積立方式（前年末残高を1年運用後、年末に積立を加算）のため、N回目の積立完了時点のスナップは
// age = curAge + years - 1 になる（verify-finance-core.js・9記事目スクリプトと同じ規約）。
const TARGET_SNAP_AGE = CUR_AGE + years - 1;
console.log(`  設定: NISA残高${CURRENT_ASSETS}万円・積立${MONTHLY_CONTRIBUTION}万円/月・rW=rR=5%・mcStd=${MC_STD}`);
console.log(`  判定スナップの年齢: ${TARGET_SNAP_AGE}歳（到達年齢${mainAchievedAge}歳の${years}回目積立完了時点）`);

// 目標到達率と資産分布(p10/p50/p90)を同一の1,000試行から算出する（9記事目と同じ理由：
// runMC()呼び出しと別ループでは異なる乱数列になり数字同士が対応しなくなるため）。
console.log('  計算中 (目標到達率＋資産分布, N=1000, simulate()を用いた単一の試行ループ)...');
const N = 1000;
const yearsSim = p.lifeEx - p.curAge + 1;
const snapIdx = TARGET_SNAP_AGE - p.curAge;
const totalsAtTarget = [];
let achievedCount = 0;
for (let t = 0; t < N; t++) {
  const shockZ = Array.from({ length: yearsSim }, () => randNorm(0, 1));
  const snaps = simulate(p, [], 'proportional', shockZ);
  const snap = snaps[snapIdx];
  totalsAtTarget.push(snap.totalAssets);
  if (snap.totalAssets >= TARGET_ASSETS) achievedCount++;
}
const achievedRate = (achievedCount / N) * 100;

// montecarlo.ts の pct() と同一の線形補間パーセンタイル（汎用統計処理。財務計算式ではない）
function pct(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const p10 = Math.round(pct(totalsAtTarget, 0.1));
const p25 = Math.round(pct(totalsAtTarget, 0.25));
const p50 = Math.round(pct(totalsAtTarget, 0.5));
const p75 = Math.round(pct(totalsAtTarget, 0.75));
const p90 = Math.round(pct(totalsAtTarget, 0.9));

console.log(`\n  1,000試行中、${mainAchievedAge}歳時点(スナップage=${TARGET_SNAP_AGE})で資産${TARGET_ASSETS}万円以上を維持できた試行の割合: ${achievedRate.toFixed(1)}%`);
console.log(`  資産分布（同一の1,000試行、${TARGET_SNAP_AGE}歳時点）:`);
console.log(`    p10=${p10}万円 / p25=${p25}万円 / 中央値(p50)=${p50}万円 / p75=${p75}万円 / p90=${p90}万円`);

// 独立クロスチェック: 本番runMC()を別途1,000試行で呼び出し、統計的な近さを確認する
// （9記事目と同じ検証パターン。別乱数列のため完全一致は期待しない）。
console.log('\n  [クロスチェック] 本番runMC()を独立した別の1,000試行で実行し、統計的な近さを確認...');
const mcCheck = runMC(p, [], ['proportional'], 1000);
const stratCheck = mcCheck.strategies['proportional'];
console.log(`  runMC()独立試行: p10=${stratCheck.percentiles.p10[snapIdx]}万円 / p50=${stratCheck.percentiles.p50[snapIdx]}万円 / p90=${stratCheck.percentiles.p90[snapIdx]}万円`);

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));

console.log('\n--- JSON出力（タスク1/2/3まとめ） ---');
console.log(JSON.stringify({
  fixture: { curAge: CUR_AGE, currentAssets: CURRENT_ASSETS, monthlyContribution: MONTHLY_CONTRIBUTION, targetAssets: TARGET_ASSETS },
  task1_main: { achievedAge: mainAchievedAge, yearsUntil: mainYearsUntil, rawValue: mainRaw },
  task2_sensitivity: sensitivity,
  task3_mc: {
    ratePct: 5,
    mcStd: MC_STD,
    trials: N,
    targetSnapAge: TARGET_SNAP_AGE,
    achievedRatePct: Number(achievedRate.toFixed(1)),
    distribution: { p10, p25, p50, p75, p90 },
  },
}, null, 2));
