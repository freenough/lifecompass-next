/**
 * scripts/sequence-risk-orcan-model-numbers.js
 * ブログ記事(仮:退職直後の暴落=シークエンスオブリターンズリスクの検証)用の数値算出・v2。
 * 使い捨てスクリプト（full-verify.js の回帰フィクスチャは変更しない）。
 *
 * scripts/sequence-risk-tanaka-numbers.js（田中さんプロファイル）の後継。田中さんは
 * pfManualFlagsで全資産クラス手動固定のため、確定済みのASSET_CLASSES新前提値
 * (全世界株σ:16.0%→18.89%等)を反映できないことが判明したため、この記事専用の
 * 単純化した「検証用モデル」に置き換えた。実在の家計を模したものではなく、退職直後の
 * 暴落タイミングという1変数だけを見るための実験的な設定である（記事側でその旨を明示する
 * 前提）。
 *
 * 検証用モデルの条件(プランニングチャットで確定済み):
 *   [2026-08-08改訂] 初期資産4,000万円(取崩率5.0%)→5,000万円(取崩率4.0%)に変更。
 *   基準シナリオの破綻率が59.5%と高く出たため(investigation_mc_bankruptcy_rate_check.md
 *   でバグではなく「実効成長率と取崩率が拮抗する際どいパラメータ」が原因と判明)、
 *   読者に馴染みのある「4%ルール」に合わせる狙い。他のパラメータは変更していない。
 *   - 退職年齢60歳、シミュレーション期間60歳〜95歳
 *   - 初期資産5,000万円、全額を全世界株式(オルカン相当)で運用、単一口座
 *     （NISA口座に寄せ、iDeCo/特定口座/現金は0円。税金・受給制限等の余計な
 *     副作用を避けるため。NISA/iDeCo/特定の区別を問わない単純化モデルのため
 *     NISAを採用した）
 *   - 年間取崩額200万円(年金等の収入は考慮しない)。今日的価値の200万円として
 *     baseExpに設定し、他キャラクターと同じくinflRで名目額を膨らませる
 *   - 取崩期の期待利回りμ=6.83%・σ=18.89%（先日確定した全世界株LTCMA新前提値、
 *     ASSET_CLASSESの自動計算は経由せず、SimParamsに直接リテラル値として設定。
 *     full-verify.js等の既存スクリプトと同じ「SimParamsを直接組み立てる」規約）
 *   - インフレ率2%（既存記事(繰上返済記事等)の標準値、
 *     docs/fixes/done/housing_loan_pattern*.json 等のinflR:2を踏襲）
 *   - シミュレーション開始(60歳)と同時に取崩期が始まる設定のため、
 *     シミュレーション1年目(年次インデックス0)=退職1年目=取崩期の1年目
 *
 * 実現方法：simulate(p, evs, strategy, shockZOverrides) の既存の第4引数（ロックファイル
 * 変更不要の拡張ポイント）に、年次インデックス0だけ固定値、それ以外はランダムなZスコア
 * 配列を渡す。乱数生成は src/lib/helpers.ts の randNorm() をそのままrequireして呼び出して
 * おり、独自の再実装は一切行っていない。percentile算出（pct関数）は src/lib/montecarlo.ts
 * の pct() と同一の線形補間式をそのまま踏襲している（前回・article9-tool-numbers-v2.js と
 * 同じ規約）。財務計算式の再実装ではなく、汎用的な統計処理（順位補間）のためコピーしている。
 *
 * シナリオ設計（前回と同じ）：
 *   A. 基準       - 全年ランダム（通常のモンテカルロと同じ）
 *   B. 中程度の下落 - 退職1年目(年次インデックス0)のZスコアのみ -2 に固定、他はランダム
 *   C. 深刻な下落   - 退職1年目(年次インデックス0)のZスコアのみ -3 に固定、他はランダム
 *
 * 実行: node scripts/sequence-risk-orcan-model-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate } = require('../src/lib');
const { randNorm } = require('../src/lib/helpers');

// ================================================================
// 検証用モデル（SimParamsを直接組み立てる。full-verify.js等の既存スクリプトと同じ規約）
// ================================================================
const MODEL_P = {
  curAge: 60,
  lifeEx: 95,
  baseInc: 0,          // 年金等の収入は考慮しない
  baseExp: 200,        // 年間取崩額200万円(現在価値、inflRで名目額を膨らませる)
  inflR: 2,             // 既存記事(繰上返済記事等)の標準値
  retAge: 60,           // シミュレーション開始と同時に取崩期が始まる
  penAge: 200,          // 到達させない(年金なし)
  penAmt: 0,
  mcStd: 18.89,          // 積立期は存在しないため未使用。retirement側と揃えておく
  mcStdR: 18.89,         // 全世界株LTCMA新前提値のσ（ASSET_CLASSES経由せずリテラル指定）
  hasIdeco: false,
  idecoYrs: 1,
  idecoReceiveType: 'lump',
  idecoReceiveYears: 10,
  idecoSplitRatio: 50,
  idecoStartAge: 200,   // 到達させない
  sevYrs: 0,
  acct: {
    nisa:  { bal: 6000, con: 0, toAge: 60, rW: 6.83, rR: 6.83 }, // 全世界株LTCMA新前提値のμ
    ideco: { bal: 0,    con: 0, toAge: 60, rW: 0,    rR: 0 },
    tax:   { bal: 0,    con: 0, toAge: 60, rW: 0,    rR: 0, costBasis: 0 },
    cash:  { bal: 0 },
  },
  spouse: null,
};
const MODEL_EVENTS = []; // 年金等の収入・イベントは考慮しない

// ================================================================
// 「退職1年目」の年次インデックス確認
// ================================================================
const YEARS_SIM = MODEL_P.lifeEx - MODEL_P.curAge + 1; // 36 (60〜95歳)
const RET_YR_IDX = MODEL_P.retAge - MODEL_P.curAge;     // 0 (退職と同時に開始)

console.log('='.repeat(90));
console.log('【前提確認】検証用モデルの年次インデックス');
console.log('='.repeat(90));
console.log(`  curAge=${MODEL_P.curAge}, retAge=${MODEL_P.retAge} → 退職1年目 = 年次インデックス${RET_YR_IDX}（age=${MODEL_P.curAge + RET_YR_IDX}）`);
console.log(`  シミュレーション年数(YEARS_SIM)=${YEARS_SIM}（age ${MODEL_P.curAge}〜${MODEL_P.lifeEx}）`);
console.log(`  取崩期σ(mcStdR)=${MODEL_P.mcStdR}%・μ(rR)=${MODEL_P.acct.nisa.rR}%（口座別動的モード未設定のため全期間静的）`);
console.log(`  取崩率: ${MODEL_P.baseExp}万円 / ${MODEL_P.acct.nisa.bal}万円 = ${(MODEL_P.baseExp / MODEL_P.acct.nisa.bal * 100).toFixed(1)}%`);

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
  const preShockBalances = []; // 退職1年目の期首残高(=初期資産そのもの、常に4,000万円)
  const shockDollars = [];     // 退職1年目ショックの実際のドル換算下落幅（B/Cのみ）

  for (let t = 0; t < N; t++) {
    const shockZ = Array.from({ length: YEARS_SIM }, (_, i) =>
      (fixedZ !== null && i === RET_YR_IDX) ? fixedZ : randNorm(0, 1)
    );
    const snaps = simulate(MODEL_P, MODEL_EVENTS, 'proportional', shockZ);

    let bankrupt = false, depAge = null;
    snaps.forEach((s, i) => {
      allTotals[i].push(s.totalAssets);
      if (s.totalAssets === 0 && !bankrupt) { bankrupt = true; depAge = s.age; }
    });
    if (bankrupt) { bankruptCount++; if (depAge !== null) depletionAges.push(depAge); }

    // 退職1年目(インデックス0)の期首残高は常に初期資産(4,000万円)そのもの
    // （積立期が存在せず、退職前の年に乱数の影響を受ける余地がないため）。
    const investedBase = MODEL_P.acct.nisa.bal;
    preShockBalances.push(investedBase);
    if (fixedZ !== null) {
      const shockPct = Math.max(-50, Math.min(50, fixedZ * MODEL_P.mcStdR));
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
    preShockBalanceMean: Math.round(preShockBalances.reduce((a, b) => a + b, 0) / preShockBalances.length),
    shockDollars,
  };
}

function runOnePass(passLabel) {
  console.log('\n' + '='.repeat(90));
  console.log(`【N=1,000試行】シナリオA/B/C比較（検証用モデル） - ${passLabel}`);
  console.log('='.repeat(90));

  console.log('  計算中: A. 基準（通常のモンテカルロ、全年ランダム）...');
  const resA = runScenario(null);
  console.log('  計算中: B. 中程度の下落（退職1年目のみZ=-2に固定）...');
  const resB = runScenario(-2);
  console.log('  計算中: C. 深刻な下落（退職1年目のみZ=-3に固定）...');
  const resC = runScenario(-3);

  const lastIdx = YEARS_SIM - 1; // age=95
  const printSummary = (label, res) => {
    console.log(`\n  --- ${label} ---`);
    console.log(`  破綻確率: ${res.bankruptcyRate.toFixed(1)}%`);
    if (res.depletionMean !== null) {
      console.log(`  資産寿命: 平均枯渇年齢=${res.depletionMean}歳 最短枯渇年齢=${res.depletionMin}歳`);
    } else {
      console.log('  資産寿命: 破綻試行なし');
    }
    console.log(`  95歳(最終年)時点: p10=${res.percentiles.p10[lastIdx]}万円 p50=${res.percentiles.p50[lastIdx]}万円 p90=${res.percentiles.p90[lastIdx]}万円`);
    const ages = [60, 70, 80, 95];
    const line = ages.map(age => {
      const idx = age - MODEL_P.curAge;
      return `${age}歳=${res.percentiles.p50[idx]}万円`;
    }).join(' / ');
    console.log(`  中央値(p50)推移: ${line}`);
  };

  printSummary('A. 基準（通常のモンテカルロ）', resA);
  printSummary('B. 中程度の下落（退職1年目 Z=-2）', resB);
  printSummary('C. 深刻な下落（退職1年目 Z=-3）', resC);

  console.log('\n  --- A比較 ---');
  console.log(`  B - A: 破綻確率 ${(resB.bankruptcyRate - resA.bankruptcyRate) >= 0 ? '+' : ''}${(resB.bankruptcyRate - resA.bankruptcyRate).toFixed(1)}pt` +
    `　95歳p50差 ${resB.percentiles.p50[lastIdx] - resA.percentiles.p50[lastIdx]}万円` +
    `　95歳p10差 ${resB.percentiles.p10[lastIdx] - resA.percentiles.p10[lastIdx]}万円`);
  console.log(`  C - A: 破綻確率 ${(resC.bankruptcyRate - resA.bankruptcyRate) >= 0 ? '+' : ''}${(resC.bankruptcyRate - resA.bankruptcyRate).toFixed(1)}pt` +
    `　95歳p50差 ${resC.percentiles.p50[lastIdx] - resA.percentiles.p50[lastIdx]}万円` +
    `　95歳p10差 ${resC.percentiles.p10[lastIdx] - resA.percentiles.p10[lastIdx]}万円`);

  console.log('\n  --- 退職1年目の実際の資産下落幅（動的σ適用後のドル換算下落幅） ---');
  console.log('  このモデルは積立期が存在せず(retAge=curAge=60)、退職前に乱数の影響を受ける年が');
  console.log(`  ないため、退職1年目の期首残高は常に初期資産${MODEL_P.acct.nisa.bal}万円で固定。したがって下落率・`);
  console.log('  下落額は共に試行間で完全に一定になる（前回の田中さんモデルは下落率のみ一定・');
  console.log('  下落額は積立期の乱数次第でばらついたが、今回は両方一定という違いがある）。');
  function reportShock(label, res, fixedZ) {
    const shockPct = Math.max(-50, Math.min(50, fixedZ * MODEL_P.mcStdR));
    const arr = res.shockDollars;
    const allSame = arr.every(v => v === arr[0]);
    console.log(`  ${label} (Z=${fixedZ}): 下落率=${shockPct.toFixed(1)}% 下落額=${Math.round(arr[0])}万円` +
      `（1,000試行全て同一値: ${allSame ? 'はい' : 'いいえ(想定外)'}）`);
  }
  reportShock('B. 中程度の下落', resB, -2);
  reportShock('C. 深刻な下落', resC, -3);

  return { resA, resB, resC };
}

const pass1 = runOnePass('1回目');
const pass2 = runOnePass('2回目（非シード乱数の安定性確認）');

console.log('\n' + '='.repeat(90));
console.log('【安定性確認】1回目 vs 2回目');
console.log('='.repeat(90));
const lastIdx = YEARS_SIM - 1;
for (const [label, r1, r2] of [
  ['A', pass1.resA, pass2.resA],
  ['B', pass1.resB, pass2.resB],
  ['C', pass1.resC, pass2.resC],
]) {
  console.log(`  ${label}: 破綻確率 1回目=${r1.bankruptcyRate.toFixed(1)}% / 2回目=${r2.bankruptcyRate.toFixed(1)}%` +
    `　95歳p50 1回目=${r1.percentiles.p50[lastIdx]}万円 / 2回目=${r2.percentiles.p50[lastIdx]}万円`);
}

console.log('\n' + '='.repeat(90));
console.log('【乱数について】');
console.log('='.repeat(90));
console.log('  randNorm()はMath.random()ベースで非シード。上記の2回分の実行はいずれも');
console.log('  非シードで行った（シード固定は行っていない）。');
