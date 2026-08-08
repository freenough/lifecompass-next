/**
 * scripts/sequence-risk-tanaka-numbers.js
 *
 * [注記・2026-08-08] このスクリプトは現在使用していない。田中さんプロファイルは
 * pfManualFlagsで全資産クラス手動固定のため、確定済みのASSET_CLASSES新前提値
 * (全世界株σ:16.0%→18.89%等、implementation_asset_class_ltcma_update.md)を
 * 反映できないことが判明したため。記事用の数値は scripts/sequence-risk-orcan-model-numbers.js
 * （記事専用の単純化した「検証用モデル」）に置き換えた。削除はせず、前回の検証結果として
 * このまま保持する。
 *
 * ブログ記事(仮:退職直後の暴落=シークエンスオブリターンズリスクの検証)用の数値算出。
 * 使い捨てスクリプト（full-verify.js の回帰フィクスチャは変更しない）。
 *
 * 田中さんプロファイルは scripts/full-verify.js の TANAKA_MC_P / TANAKA_MC_EVENTS_BASE
 * （「MCbase（セミリタイヤ基本）」シナリオ、HTML実機突き合わせ済み・破綻率25.4%の根拠）と
 * 完全に同一のものをそのままコピーして使用する。パラメータ変更は一切していない。
 *
 * 実現方法：simulate(p, evs, strategy, shockZOverrides) の既存の第4引数（ロックファイル
 * 変更不要の拡張ポイント）に、年次ループの「退職1年目」に相当するインデックスだけ固定値、
 * それ以外はランダムなZスコア配列を渡す。乱数生成は src/lib/helpers.ts の randNorm() を
 * そのままrequireして呼び出しており、独自の再実装は一切行っていない。
 * percentile算出（pct関数）は src/lib/montecarlo.ts の pct() と同一の線形補間式をそのまま
 * 踏襲している（article9-tool-numbers-v2.js と同じ規約）。財務計算式の再実装ではなく、
 * 汎用的な統計処理（順位補間）のためコピーしている。
 *
 * シナリオ設計：
 *   A. 基準       - 全年ランダム（通常のモンテカルロと同じ）
 *   B. 中程度の下落 - 退職1年目のZスコアのみ -2 に固定、他はランダム
 *   C. 深刻な下落   - 退職1年目のZスコアのみ -3 に固定、他はランダム
 *
 * 実行: node scripts/sequence-risk-tanaka-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate } = require('../src/lib');
const { randNorm } = require('../src/lib/helpers');

// ================================================================
// 田中さんプロファイル（scripts/full-verify.js の TANAKA_P / TANAKA_MC_P / TANAKA_MC_EVENTS_BASE
// と完全に同一。コピー元: full-verify.js 319-338行目・492-505行目）
// ================================================================
const TANAKA_P = {
  curAge: 42, lifeEx: 90,
  baseInc: 650, baseExp: 480,
  inflR: 1,
  retAge: 55, penAge: 65, penAmt: 150,
  mcStd: 10, mcStdR: 8,
  hasIdeco: true,
  idecoYrs: 13,
  idecoReceiveType: 'lump',
  idecoReceiveYears: 10,
  idecoStartAge: 65,
  sevYrs: 13,
  acct: {
    nisa:  { bal: 700, con: 120,  toAge: 99, rW: 4, rR: 4 },
    ideco: { bal: 350, con: 27.6, toAge: 99, rW: 4, rR: 4 },
    tax:   { bal: 550, con: 52,   toAge: 99, rW: 4, rR: 4, costBasis: 550 },
    cash:  { bal: 900 },
  },
  spouse: { inc: 200, retAge: 55, penAge: 65, penAmt: 80, spCurAge: 40 },
};

// MCシナリオ専用パラメータ（sameAsWorking=false時の口座別rR + ポートフォリオσ=16%）
const TANAKA_MC_P = {
  ...TANAKA_P,
  mcStdR: 16,
  acct: {
    ...TANAKA_P.acct,
    ideco: { ...TANAKA_P.acct.ideco, rR: 2 },
    tax:   { ...TANAKA_P.acct.tax,   rR: 1 },
  },
};

const TANAKA_MC_EVENTS_BASE = [
  { category: 'income',  subtype: 'severance',  name: '退職金',    age: 55, years: 1, amount: 800 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 56, years: 1, amount: 300 },
];

// ================================================================
// 「退職1年目」の年次インデックス確認
// ================================================================
const YEARS_SIM = TANAKA_MC_P.lifeEx - TANAKA_MC_P.curAge + 1; // 49
const RET_YR_IDX = TANAKA_MC_P.retAge - TANAKA_MC_P.curAge;    // 13 (age=55)
const PRE_RET_YR_IDX = RET_YR_IDX - 1;                          // 12 (age=54, 積立最終年)

console.log('='.repeat(90));
console.log('【前提確認】退職1年目の年次インデックス');
console.log('='.repeat(90));
console.log(`  curAge=${TANAKA_MC_P.curAge}, retAge=${TANAKA_MC_P.retAge} → 退職1年目 = 年次インデックス${RET_YR_IDX}（age=${TANAKA_MC_P.curAge + RET_YR_IDX}）`);
console.log(`  シミュレーション年数(YEARS_SIM)=${YEARS_SIM}, 積立最終年インデックス=${PRE_RET_YR_IDX}（age=${TANAKA_MC_P.curAge + PRE_RET_YR_IDX}）`);
console.log(`  取崩期σ(mcStdR)=${TANAKA_MC_P.mcStdR}%（sameAsWorking=false時の保存値、口座別動的モードは未設定のため全期間静的）`);

// montecarlo.ts の pct() と同一の線形補間パーセンタイル（汎用統計処理のため踏襲）
function pct(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

// ================================================================
// N=1,000試行のシナリオ実行（A/B/C共通ロジック）
// fixedZ: null=完全ランダム(A), 数値=退職1年目のZスコアをこの値に固定(B/C)
// ================================================================
function runScenario(fixedZ, N = 1000) {
  const allTotals = Array.from({ length: YEARS_SIM }, () => []);
  let bankruptCount = 0;
  const depletionAges = [];
  const preRetBalances = []; // 積立最終年(age54)の運用資産残高(nisa+ideco+tax、本人+配偶者)
  const shockDollars = [];   // 退職1年目ショックの実際のドル換算下落幅（B/Cのみ）

  for (let t = 0; t < N; t++) {
    const shockZ = Array.from({ length: YEARS_SIM }, (_, i) =>
      (fixedZ !== null && i === RET_YR_IDX) ? fixedZ : randNorm(0, 1)
    );
    const snaps = simulate(TANAKA_MC_P, TANAKA_MC_EVENTS_BASE, 'proportional', shockZ);

    let bankrupt = false, depAge = null;
    snaps.forEach((s, i) => {
      allTotals[i].push(s.totalAssets);
      if (s.totalAssets === 0 && !bankrupt) { bankrupt = true; depAge = s.age; }
    });
    if (bankrupt) { bankruptCount++; if (depAge !== null) depletionAges.push(depAge); }

    const preSnap = snaps[PRE_RET_YR_IDX];
    const investedBase = preSnap.nisa + preSnap.ideco + preSnap.tax + preSnap.spNisa + preSnap.spIdeco + preSnap.spTax;
    preRetBalances.push(investedBase);
    if (fixedZ !== null) {
      const shockPct = Math.max(-50, Math.min(50, fixedZ * TANAKA_MC_P.mcStdR));
      shockDollars.push(investedBase * shockPct / 100);
    }
  }

  const percentiles = { p10: [], p50: [], p90: [] };
  allTotals.forEach(arr => {
    percentiles.p10.push(Math.round(pct(arr, 0.1)));
    percentiles.p50.push(Math.round(pct(arr, 0.5)));
    percentiles.p90.push(Math.round(pct(arr, 0.9)));
  });

  let depletionMean = null, depletionMin = null;
  if (depletionAges.length > 0) {
    depletionMean = Math.round(depletionAges.reduce((a, b) => a + b, 0) / depletionAges.length);
    depletionMin  = Math.min(...depletionAges);
  }

  return {
    bankruptcyRate: bankruptCount / N * 100,
    depletionMean, depletionMin,
    percentiles,
    preRetBalanceMean: Math.round(preRetBalances.reduce((a, b) => a + b, 0) / preRetBalances.length),
    shockDollars,
  };
}

console.log('\n' + '='.repeat(90));
console.log('【N=1,000試行】シナリオA/B/C比較（田中さんプロファイル、MCbase相当イベント）');
console.log('='.repeat(90));

console.log('  計算中: A. 基準（通常のモンテカルロ、全年ランダム）...');
const resA = runScenario(null);
console.log('  計算中: B. 中程度の下落（退職1年目のみZ=-2に固定）...');
const resB = runScenario(-2);
console.log('  計算中: C. 深刻な下落（退職1年目のみZ=-3に固定）...');
const resC = runScenario(-3);

const lastIdx = YEARS_SIM - 1; // age=90
const printSummary = (label, res) => {
  console.log(`\n  --- ${label} ---`);
  console.log(`  破綻確率: ${res.bankruptcyRate.toFixed(1)}%`);
  if (res.depletionMean !== null) {
    console.log(`  資産寿命: 平均枯渇年齢=${res.depletionMean}歳 最短枯渇年齢=${res.depletionMin}歳`);
  } else {
    console.log('  資産寿命: 破綻試行なし');
  }
  console.log(`  90歳(最終年)時点: p10=${res.percentiles.p10[lastIdx]}万円 p50=${res.percentiles.p50[lastIdx]}万円 p90=${res.percentiles.p90[lastIdx]}万円`);
  // 参考: 主要年齢での中央値推移
  const ages = [55, 65, 80, 90];
  const line = ages.map(age => {
    const idx = age - TANAKA_MC_P.curAge;
    return `${age}歳=${res.percentiles.p50[idx]}万円`;
  }).join(' / ');
  console.log(`  中央値(p50)推移: ${line}`);
};

printSummary('A. 基準（通常のモンテカルロ）', resA);
printSummary('B. 中程度の下落（退職1年目 Z=-2）', resB);
printSummary('C. 深刻な下落（退職1年目 Z=-3）', resC);

console.log('\n' + '='.repeat(90));
console.log('【A比較】BおよびCがAに対してどれだけ悪化したか');
console.log('='.repeat(90));
console.log(`  B - A: 破綻確率 ${(resB.bankruptcyRate - resA.bankruptcyRate) >= 0 ? '+' : ''}${(resB.bankruptcyRate - resA.bankruptcyRate).toFixed(1)}pt` +
  `　90歳p50差 ${resB.percentiles.p50[lastIdx] - resA.percentiles.p50[lastIdx]}万円` +
  `　90歳p10差 ${resB.percentiles.p10[lastIdx] - resA.percentiles.p10[lastIdx]}万円`);
console.log(`  C - A: 破綻確率 ${(resC.bankruptcyRate - resA.bankruptcyRate) >= 0 ? '+' : ''}${(resC.bankruptcyRate - resA.bankruptcyRate).toFixed(1)}pt` +
  `　90歳p50差 ${resC.percentiles.p50[lastIdx] - resA.percentiles.p50[lastIdx]}万円` +
  `　90歳p10差 ${resC.percentiles.p10[lastIdx] - resA.percentiles.p10[lastIdx]}万円`);

// ================================================================
// 退職1年目時点での実際の資産減少額・減少率（円ベース）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【退職1年目の実際の資産下落幅】動的σ適用後のドル換算下落幅');
console.log('='.repeat(90));
console.log('  下落率(%)は Z × mcStdR(=16) で一意に決まる（このプロファイルは口座別動的σ未設定の');
console.log('  ため静的モード。simulate.ts:106-120のshock計算式そのまま）。下落額(万円)は退職前年');
console.log('  (age54)の運用資産残高（NISA+iDeCo+特定口座）に依存するため、積立期の乱数次第で');
console.log('  試行ごとにばらつく。以下はN=1,000試行の実測値。');

function reportShock(label, res, fixedZ) {
  const shockPct = Math.max(-50, Math.min(50, fixedZ * TANAKA_MC_P.mcStdR));
  const arr = res.shockDollars;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sorted = [...arr].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log(`\n  --- ${label} (Z=${fixedZ}) ---`);
  console.log(`  下落率: ${shockPct.toFixed(1)}%（一定・Zスコア固定のため試行間で不変）`);
  console.log(`  age54運用資産残高の平均(1,000試行): ${res.preRetBalanceMean}万円`);
  console.log(`  下落額（円ベース）: 平均${Math.round(mean)}万円 / 中央値${Math.round(median)}万円 / 最小${Math.round(Math.min(...arr))}万円 / 最大${Math.round(Math.max(...arr))}万円`);
}
reportShock('B. 中程度の下落', resB, -2);
reportShock('C. 深刻な下落', resC, -3);

// ------------------------------------------------------------------
// 補足：積立期も含め全期間ショックゼロ（決定論的）の「典型的な」積立終了時点の残高を基準にした
// クリーンな下落額の単一デモ（試行間ノイズを含まない、記事での説明用の一例）
// ------------------------------------------------------------------
console.log('\n  [補足・単一デモ] 積立期ショックゼロ(決定論的)で積立を終えた場合の、退職1年目下落額の例:');
const zeroShockArr = Array.from({ length: YEARS_SIM }, () => 0);
const baselineSnaps = simulate(TANAKA_MC_P, TANAKA_MC_EVENTS_BASE, 'proportional', zeroShockArr);
const baselinePre = baselineSnaps[PRE_RET_YR_IDX];
const baselineInvested = baselinePre.nisa + baselinePre.ideco + baselinePre.tax + baselinePre.spNisa + baselinePre.spIdeco + baselinePre.spTax;
console.log(`  積立終了時点(age54)の運用資産残高: ${Math.round(baselineInvested)}万円`);
for (const [label, z] of [['B (Z=-2)', -2], ['C (Z=-3)', -3]]) {
  const shockPct = Math.max(-50, Math.min(50, z * TANAKA_MC_P.mcStdR));
  const shockYen = baselineInvested * shockPct / 100;
  console.log(`  ${label}: 下落率${shockPct.toFixed(1)}% → 下落額 約${Math.round(shockYen)}万円`);
}

console.log('\n' + '='.repeat(90));
console.log('【乱数について】');
console.log('='.repeat(90));
console.log('  randNorm()はMath.random()ベースで非シード。実行のたびに1,000試行の統計値は');
console.log('  微妙に変動する（full-verify.js等の既存モンテカルロフィクスチャと同様の性質）。');
console.log('  本スクリプトも同様に非シードで実行した。');
