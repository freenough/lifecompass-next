/**
 * scripts/housing-loan-fire-numbers.js
 * 「住宅ローンを抱えたままFIREしても大丈夫か?」記事用データ収集。
 * docs/fixes/active/housing_loan_pattern{1,2,3}_*.json を、本番simulate()/analyze()/runMC()に
 * そのまま通すだけの使い捨てスクリプト（独自の再計算ロジックは含まない）。
 * 実行: node scripts/housing-loan-fire-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const fs = require('fs');
const path = require('path');
const { simulate, runMC } = require('../src/lib');
const { analyze } = require('../src/lib/analyze');
const { profileToSimParams } = require('../src/lib/profile');
const { calcMortgage } = require('../src/lib/helpers');

const ACTIVE_DIR = path.join(__dirname, '..', 'docs', 'fixes', 'active');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'fixes', 'active', 'housing_loan_output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PATTERNS = [
  { key: 'pattern1', label: 'パターン1(賃貸継続)', file: 'housing_loan_pattern1_rent.json' },
  { key: 'pattern2', label: 'パターン2(35年ローン)', file: 'housing_loan_pattern2_35y.json' },
  { key: 'pattern3', label: 'パターン3(20年ローン)', file: 'housing_loan_pattern3_20y.json' },
];

// ---- 0. 事前チェック: activeStrategies・市場前提の一致 ----
console.log('='.repeat(90));
console.log('【事前チェック】3プロファイルのactiveStrategies・市場前提の一致確認');
console.log('='.repeat(90));
const profiles = {};
for (const pt of PATTERNS) {
  profiles[pt.key] = JSON.parse(fs.readFileSync(path.join(ACTIVE_DIR, pt.file), 'utf8'));
}
const MARKET_KEYS = ['rWNisa', 'rRNisa', 'rWIdeco', 'rRIdeco', 'rWTax', 'rRTax', 'mcStd', 'mcStdR'];
let marketMismatch = false;
for (const key of MARKET_KEYS) {
  const vals = PATTERNS.map((pt) => profiles[pt.key].params[key]);
  const uniform = vals.every((v) => v === vals[0]);
  if (!uniform) marketMismatch = true;
  console.log(`  ${key}: ${vals.join(' / ')} ${uniform ? '(一致)' : '(不一致!)'}`);
}
const stratVals = PATTERNS.map((pt) => JSON.stringify(profiles[pt.key].ui.activeStrategies));
const stratUniform = stratVals.every((v) => v === stratVals[0]);
console.log(`  activeStrategies: ${stratVals.join(' / ')} ${stratUniform ? '(一致)' : '(不一致!)'}`);
if (marketMismatch || !stratUniform) {
  console.log('\n[STOP] 市場前提またはactiveStrategiesに不一致があります。実行を中断します。');
  process.exit(1);
}
console.log('  → 全項目一致。実行を続行します。\n');

// ---- 0-1. 住宅ローン返済額のcalcMortgage検算 ----
console.log('='.repeat(90));
console.log('【妥当性チェック】JSON内mortgage.amountとcalcMortgage()の計算値を突き合わせ');
console.log('='.repeat(90));
for (const pt of PATTERNS) {
  const ev = profiles[pt.key].events.find((e) => e.subtype === 'mortgage');
  if (!ev) { console.log(`  ${pt.label}: mortgageイベントなし`); continue; }
  const calc = calcMortgage(ev.principal, ev.rate, ev.termYears);
  const match = Math.abs(calc - ev.amount) < 0.01;
  console.log(`  ${pt.label}: JSON amount=${ev.amount} / calcMortgage()=${calc} ${match ? '(一致)' : '(不一致!)'}`);
}
console.log('');

// ---- 1. 固定シナリオ + analyze() + 年次CSV出力 ----
const results = {};
for (const pt of PATTERNS) {
  const prof = profiles[pt.key];
  const p = profileToSimParams(prof);
  const snaps = simulate(p, prof.events, 'proportional');
  const a = analyze(snaps, p);
  results[pt.key] = { prof, p, snaps, a };

  // CSV出力
  const header = 'age,totalAssets,nisa,ideco,tax,cash,income,expense,cashFlow,baseExp,fireLine25x\n';
  const rows = snaps
    .map((s) => [s.age, s.totalAssets, s.nisa, s.ideco, s.tax, s.cash, s.income, s.expense, s.cashFlow, s.baseExp, Math.round(s.baseExp * 25)].join(','))
    .join('\n');
  fs.writeFileSync(path.join(OUT_DIR, `${pt.key}_35to90.csv`), header + rows + '\n');
}

console.log('='.repeat(90));
console.log('【固定シナリオ(比例取崩) + FIRE達成年齢判定】');
console.log('='.repeat(90));
for (const pt of PATTERNS) {
  const { snaps, a, p } = results[pt.key];
  const s55 = snaps.find((s) => s.age === 55);
  const s90 = snaps.find((s) => s.age === 90);
  console.log(`\n-- ${pt.label} --`);
  console.log(`  55歳時点総資産: ${s55.totalAssets}万円 (NISA${s55.nisa}+iDeco${s55.ideco}+特定${s55.tax}+現金${s55.cash})`);
  console.log(`  90歳時点総資産: ${s90.totalAssets}万円`);
  console.log(`  資産枯渇年齢(dA): ${a.dA ?? 'なし(枯渇せず)'}`);
  console.log(`  FIRE達成年齢(fA, 生活費×25を生涯下回らない基準): ${a.fA ?? '生涯未達成'}`);
  console.log(`  55歳時点のFIREライン(baseExp×25): ${Math.round(s55.baseExp * 25)}万円`);
  console.log(`  90歳時点のFIREライン(baseExp×25): ${Math.round(s90.baseExp * 25)}万円`);
  console.log(`  退職後の最低充足率(minRatio): ${a.minRatio !== null ? a.minRatio.toFixed(1) + '%' : 'n/a'} (${a.minRatioAge}歳時点が最低)`);
  console.log(`  資産ピーク: ${a.pV}万円 (${a.pA}歳時点)`);
}

// ---- 2. モンテカルロ (N=1000) ----
console.log('\n' + '='.repeat(90));
console.log('【モンテカルロ試算(N=1000)】');
console.log('='.repeat(90));
for (const pt of PATTERNS) {
  const { prof, p } = results[pt.key];
  console.log(`\n計算中: ${pt.label} ...`);
  const mc = runMC(p, prof.events, ['proportional'], 1000);
  results[pt.key].mc = mc;
  const r = mc.strategies['proportional'];
  const idx55 = 55 - p.curAge;
  const idx90 = 90 - p.curAge;
  console.log(`-- ${pt.label} (MC N=${mc.trials}) --`);
  console.log(`  資産枯渇確率: ${r.bankruptcyRate.toFixed(1)}%`);
  console.log(`  枯渇試行の平均枯渇年齢: ${r.depletionMean ?? 'n/a'}歳`);
  console.log(`  枯渇試行の最短枯渇年齢: ${r.depletionMin ?? 'n/a'}歳`);
  console.log(`  55歳時点資産分布: p10=${r.percentiles.p10[idx55]}万 / 中央値=${r.percentiles.p50[idx55]}万 / p90=${r.percentiles.p90[idx55]}万`);
  console.log(`  90歳時点資産分布: p10=${r.percentiles.p10[idx90]}万 / 中央値=${r.percentiles.p50[idx90]}万 / p90=${r.percentiles.p90[idx90]}万`);
}

// ---- 3. 比較表 ----
console.log('\n' + '='.repeat(90));
console.log('【比較表】');
console.log('='.repeat(90));
const loanInfo = {
  pattern1: '家賃180万円/年',
  pattern2: 'ローン186.31万円/年(35年)',
  pattern3: 'ローン303.53万円/年(20年)',
};
console.log('項目 | パターン1(賃貸) | パターン2(35年ローン) | パターン3(20年ローン)');
console.log('---|---|---|---');
console.log(`年間住居費/返済額 | ${loanInfo.pattern1} | ${loanInfo.pattern2} | ${loanInfo.pattern3}`);
console.log(PATTERNS.map((pt) => results[pt.key].snaps.find((s) => s.age === 55).totalAssets + '万円').join(' | ').replace(/^/, '55歳時点資産額 | '));
console.log(PATTERNS.map((pt) => results[pt.key].a.fA ?? '生涯未達成').join(' | ').replace(/^/, 'FIRE達成年齢 | '));
console.log(PATTERNS.map((pt) => {
  const s90 = results[pt.key].snaps.find((s) => s.age === 90);
  const a = results[pt.key].a;
  return a.dA ? `${a.dA}歳で枯渇` : `${s90.totalAssets}万円`;
}).join(' | ').replace(/^/, '90歳時点資産額(or枯渇年齢) | '));
console.log(PATTERNS.map((pt) => results[pt.key].mc.strategies.proportional.bankruptcyRate.toFixed(1) + '%').join(' | ').replace(/^/, 'MC枯渇確率 | '));
console.log(PATTERNS.map((pt) => {
  const r = results[pt.key].mc.strategies.proportional;
  const idx90 = 90 - results[pt.key].p.curAge;
  return `p10=${r.percentiles.p10[idx90]}/中央値=${r.percentiles.p50[idx90]}/p90=${r.percentiles.p90[idx90]}`;
}).join(' | ').replace(/^/, '90歳時点資産分布(p10/中央値/p90) | '));

console.log('\n出力CSV: ' + OUT_DIR);
console.log('\n完了');
