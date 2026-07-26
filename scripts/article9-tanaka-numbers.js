/**
 * scripts/article9-tanaka-numbers.js
 * ブログ9記事目「新NISAは毎月いくら積み立てればいい?」用の数値算出。
 * 使い捨てスクリプト（full-verify.js の回帰フィクスチャは変更しない）。
 * 田中さんの既存フィクスチャ（TANAKA_P・TANAKA_FIRE_EVENTS、full-verify.js と同一）をベースに、
 * NISA口座の想定利回り(rW/rR)とNISA口座の年間積立額(acct.nisa.con)のみを変数として動かし、
 * 本番の simulate() / analyze() / runMC() を直接呼び出して算出する。独自の財務計算式は含まない。
 * 実行: node scripts/article9-tanaka-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate, analyze, runMC } = require('../src/lib');
const { randNorm } = require('../src/lib/helpers');

function clone(o) { return JSON.parse(JSON.stringify(o)); }

// ================================================================
// 田中さん既存フィクスチャ（scripts/full-verify.js の TANAKA_P / TANAKA_FIRE_EVENTS と同一。
// 一切変更しない。動かすのは acct.nisa.rW/rR と acct.nisa.con のみ）
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

const TANAKA_FIRE_EVENTS = [
  { category: 'income', subtype: 'severance', name: '退職金', age: 55, years: 1, amount: 800 },
];

const TARGET_AGE = TANAKA_P.retAge; // 55歳（既存フィクスチャのretAge = FIRE想定年齢）
const YEARS = TARGET_AGE - TANAKA_P.curAge; // 13年

// ================================================================
// STEP 1: 目標の確認（既存フィクスチャの baseExp をベースに、55歳時点の
// インフレ調整済み支出×25 を目標資産額とする。simulate() が実際に返す
// 55歳時点の snap.baseExp をそのまま使う＝独立計算しない）
// ================================================================
console.log('='.repeat(90));
console.log('【STEP1】田中さんフィクスチャの基本パラメータ・目標の確認');
console.log('='.repeat(90));

const baselineSnaps = simulate(TANAKA_P, TANAKA_FIRE_EVENTS, 'proportional');
const targetSnap = baselineSnaps.find(s => s.age === TARGET_AGE);
const targetAssets = Math.round(targetSnap.baseExp * 25);

console.log(`  現在年齢: ${TANAKA_P.curAge}歳`);
console.log(`  現在のNISA口座残高: ${TANAKA_P.acct.nisa.bal}万円`);
console.log(`  想定FIRE達成年齢: ${TARGET_AGE}歳（${YEARS}年後、既存フィクスチャのretAge）`);
console.log(`  ${TARGET_AGE}歳時点の年間支出（インフレ${TANAKA_P.inflR}%調整済み・simulate()実測）: ${targetSnap.baseExp}万円`);
console.log(`  目標資産額（年間支出×25）: ${targetAssets}万円`);
console.log(`  （参考）現行の月10万円積立・rW=rR=4%での${TARGET_AGE}歳時点総資産: ${targetSnap.totalAssets}万円（目標に対し${targetAssets - targetSnap.totalAssets}万円不足）`);

// ================================================================
// STEP 2: 利回り別の必要積立額（NISA口座のrW/rRとconのみ変数化し、二分探索）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【STEP2】利回り別・目標資産到達に必要なNISA毎月積立額（二分探索・simulate()実行）');
console.log('='.repeat(90));

function totalAssetsAtTargetAge(rate, annualCon) {
  const p = clone(TANAKA_P);
  p.acct.nisa.rW = rate;
  p.acct.nisa.rR = rate;
  p.acct.nisa.con = annualCon;
  const snaps = simulate(p, TANAKA_FIRE_EVENTS, 'proportional');
  return snaps.find(s => s.age === TARGET_AGE).totalAssets;
}

// 必要積立額（年間・万円）を二分探索で求める。誤差0.1万円/年程度まで収束させる。
function findRequiredAnnualCon(rate) {
  let lo = 0, hi = 3000; // 年間0〜3000万円の範囲で探索（十分に広い上限）
  // 上限で届かない場合は上限を報告用に返す（田中さんのケースでは発生しない想定）
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const result = totalAssetsAtTargetAge(rate, mid);
    if (result >= targetAssets) hi = mid; else lo = mid;
    if (hi - lo < 0.1) break;
  }
  return hi;
}

const RATES = [3, 5, 7];
const requiredAnnualByRate = {};
for (const rate of RATES) {
  const annualCon = findRequiredAnnualCon(rate);
  requiredAnnualByRate[rate] = annualCon;
  const monthlyCon = annualCon / 12;
  const check = totalAssetsAtTargetAge(rate, annualCon);
  console.log(`  年率${rate}%: 必要積立額 ${monthlyCon.toFixed(2)}万円/月（年間${annualCon.toFixed(2)}万円） → ${TARGET_AGE}歳時点総資産 ${Math.round(check)}万円（目標${targetAssets}万円）`);
}

// ================================================================
// STEP 3: モンテカルロでの目標到達率（年率5%時の必要積立額を実際に設定して1,000試行）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【STEP3】モンテカルロでの目標到達率・破綻確率（年率5%・必要積立額を実際に設定, N=1000）');
console.log('='.repeat(90));

const p5 = clone(TANAKA_P);
p5.acct.nisa.rW = 5;
p5.acct.nisa.rR = 5;
p5.acct.nisa.con = requiredAnnualByRate[5];

console.log(`  設定: NISA rW=rR=5%, NISA積立額=${(p5.acct.nisa.con / 12).toFixed(2)}万円/月（年間${p5.acct.nisa.con.toFixed(2)}万円）`);
console.log('  計算中 (本番runMC() N=1000)...');

// (a) 本番runMC()をそのまま呼び出し、既存KPI定義の破綻確率を取得する
const mcResult = runMC(p5, TANAKA_FIRE_EVENTS, ['proportional'], 1000);
const bankruptcyRate = mcResult.strategies['proportional'].bankruptcyRate;

// (b) 「生涯資産が枯渇せず目標を達成できた試行の割合」は runMC() の戻り値に含まれないため、
//     runMC()と同じ方式（randNorm由来のZスコア列 → simulate()）で独自に1,000試行を回し、
//     各試行のsnapsを本番analyze()に通してfA（③安心＝生涯を通じて年間支出×25を下回らない、
//     の定義に基づく達成年齢）が非nullかどうかで判定する。計算エンジン自体は必ず本番の
//     simulate()/analyze()を呼び出しており、独自の財務計算式は一切含まない。
console.log('  計算中 (analyze()ベースの目標到達率, N=1000)...');
const N = 1000;
const years = p5.lifeEx - p5.curAge + 1;
let achievedCount = 0;
for (let t = 0; t < N; t++) {
  const shockZ = Array.from({ length: years }, () => randNorm(0, 1));
  const snaps = simulate(p5, TANAKA_FIRE_EVENTS, 'proportional', shockZ);
  const result = analyze(snaps, p5);
  if (result.fA !== null) achievedCount++;
}
const achievedRate = (achievedCount / N) * 100;

console.log(`  1,000試行中、生涯資産が枯渇せず目標(年間支出×25)を達成できた試行の割合: ${achievedRate.toFixed(1)}%`);
console.log(`  破綻確率（既存KPI定義・本番runMC()の戻り値そのまま）: ${bankruptcyRate.toFixed(1)}%`);

// ================================================================
// STEP 4（参考・任意）: 年率5%時の必要積立額を固定し、利回り3%/5%/7%での資産推移を比較
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【STEP4（参考）】年率5%時の必要積立額(NISA)を固定した場合の、利回り3%/5%/7%での資産推移比較');
console.log('='.repeat(90));

const fixedAnnualCon = requiredAnnualByRate[5];
const trajectoryByRate = {};
for (const rate of RATES) {
  const p = clone(TANAKA_P);
  p.acct.nisa.rW = rate;
  p.acct.nisa.rR = rate;
  p.acct.nisa.con = fixedAnnualCon;
  const snaps = simulate(p, TANAKA_FIRE_EVENTS, 'proportional');
  trajectoryByRate[rate] = snaps
    .filter(s => s.age >= TANAKA_P.curAge && s.age <= TARGET_AGE)
    .map(s => ({ age: s.age, totalAssets: Math.round(s.totalAssets) }));
}

console.log(`  固定積立額: ${(fixedAnnualCon / 12).toFixed(2)}万円/月（年間${fixedAnnualCon.toFixed(2)}万円）`);
for (const rate of RATES) {
  console.log(`\n  -- 年率${rate}% --`);
  const rows = trajectoryByRate[rate].filter(r => [42, 45, 48, 51, 54, 55].includes(r.age) || r.age === TANAKA_P.curAge || r.age === TARGET_AGE);
  for (const r of rows) {
    console.log(`    ${r.age}歳: ${r.totalAssets}万円`);
  }
}

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));

// JSON形式でも出力（記事執筆・グラフ用に貼り付けやすいように）
console.log('\n--- JSON出力（STEP2/3/4まとめ） ---');
console.log(JSON.stringify({
  step1: {
    curAge: TANAKA_P.curAge,
    currentNisaBal: TANAKA_P.acct.nisa.bal,
    targetAge: TARGET_AGE,
    years: YEARS,
    targetAgeBaseExp: targetSnap.baseExp,
    targetAssets,
  },
  step2_requiredMonthlyContribution: Object.fromEntries(
    RATES.map(r => [r, Number((requiredAnnualByRate[r] / 12).toFixed(2))])
  ),
  step3_mc: {
    ratePct: 5,
    monthlyContribution: Number((p5.acct.nisa.con / 12).toFixed(2)),
    trials: N,
    goalAchievedRatePct: Number(achievedRate.toFixed(1)),
    bankruptcyRatePct: Number(bankruptcyRate.toFixed(1)),
  },
  step4_trajectories: trajectoryByRate,
}, null, 2));
