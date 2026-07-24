/**
 * scripts/nakamura-rebuild.js
 * 中村夫婦シリーズ：口座分割版プロファイルからNOTE第2〜10話 + ブログ用シナリオA/B/Cの数値を再出力する。
 * 使い捨てスクリプト（full-verify.js の回帰フィクスチャは変更しない）。
 * 実行: node scripts/nakamura-rebuild.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const fs = require('fs');
const path = require('path');
const { simulate, runMC } = require('../src/lib');
const { profileToSimParams } = require('../src/lib/profile');
const { calcMortgage } = require('../src/lib/helpers');

const PROFILE_PATH = path.join(__dirname, '..', 'docs', 'fixes', 'active', 'lifecompass_中村夫婦①_split.json');
const baseProfile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));

// ---- ユーティリティ ----
function clone(o) { return JSON.parse(JSON.stringify(o)); }

function buildProfile(overrides, eventFilter) {
  const prof = clone(baseProfile);
  Object.assign(prof.params, overrides || {});
  if (eventFilter) prof.events = baseProfile.events.filter(eventFilter);
  return prof;
}

function incDisp(s) {
  return s.income + (s.severanceNet || 0) + (s.spSeveranceNet || 0);
}

function printFixedTable(label, snaps, ages) {
  console.log(`\n-- ${label} --`);
  const hdr = ['年齢', '総資産', '収入表示', '支出'];
  const w = [6, 10, 10, 8];
  const row = cols => cols.map((c, i) => String(c).padEnd(w[i])).join(' | ');
  console.log(row(hdr));
  console.log('-'.repeat(40));
  for (const age of ages) {
    const s = snaps.find(x => x.age === age);
    if (!s) { console.log(`  [ERROR] age ${age} のスナップなし`); continue; }
    console.log(row([age + '歳', s.totalAssets + '万', incDisp(s) + '万', s.expense + '万']));
  }
}

function printMC(label, mcResult, ages, curAge) {
  const r = mcResult.strategies['proportional'];
  console.log(`\n-- ${label} (MC N=${mcResult.trials}) --`);
  console.log(`  破綻率: ${r.bankruptcyRate.toFixed(1)}%  平均枯渇年齢: ${r.depletionMean ?? 'n/a'}歳  最短枯渇年齢: ${r.depletionMin ?? 'n/a'}歳`);
  for (const age of ages) {
    const i = age - curAge;
    console.log(`  ${age}歳時点  p10=${r.percentiles.p10[i]}万  中央値=${r.percentiles.p50[i]}万  p90=${r.percentiles.p90[i]}万`);
  }
}

function nisaPrincipalCheck(label, snaps, prof) {
  const years = snaps.filter(s => s.nisaActive).length;
  const total = prof.params.bNisa + prof.params.cNisa * years;
  const over = total > 1800;
  console.log(`  [NISA元本チェック] ${label}: 積立年数=${years}年 → 累計元本=${total}万円 ${over ? '(1,800万円超過!)' : '(1,800万円以内)'}`);
}

// イベントsubtypeフィルタ
const isEdu = ev => ev.subtype === 'education';
const isMortgage = ev => ev.subtype === 'mortgage';
const isCare = ev => ev.subtype === 'care';
const isSeverance = ev => ev.subtype === 'severance';
const isBaseChange = ev => ev.subtype === 'base_change';

const SPOUSE_PART_TIME = { category: 'income', subtype: 'reemploy', name: '美咲パート', age: 56, years: 9, amount: 120 };

console.log('='.repeat(90));
console.log('【事前チェック】口座分割版の初期残高合計（分割前2,200万円との比較）');
console.log('='.repeat(90));
{
  const p = baseProfile.params;
  const mainSum = p.bNisa + p.bIdeco + p.bTax + p.bCash;
  const spSum = p.spNisaBal + p.spIdecoBal + p.spTaxBal + p.spCashBal;
  const total = mainSum + spSum;
  console.log(`  翔太: ${mainSum}万 (NISA${p.bNisa}+iDeco${p.bIdeco}+特定${p.bTax}+現金${p.bCash})`);
  console.log(`  美咲: ${spSum}万 (NISA${p.spNisaBal}+iDeco${p.spIdecoBal}+特定${p.spTaxBal}+現金${p.spCashBal})`);
  console.log(`  合計: ${total}万円 ${total === 2200 ? '(OK: 分割前と一致)' : '(NG: 分割前2,200万円と不一致)'}`);
}

// ================================================================
// 第4話: calcMortgage確認（30年 vs 20年）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第4話】住宅ローン30年 vs 20年 年間返済額');
console.log('='.repeat(90));
const pay30 = calcMortgage(4100, 1, 30);
const pay20 = calcMortgage(4100, 1, 20);
console.log(`  4A(30年): 元本4100万・金利1% → 年間返済額 ${pay30}万円/年 (age38〜67)`);
console.log(`  4B(20年): 元本4100万・金利1% → 年間返済額 ${pay20}万円/年 (age38〜57)`);

const mortgage30 = { category: 'expense', subtype: 'mortgage', name: '住宅ローン(30年)', age: 38, years: 30, amount: pay30, principal: 4100, rate: 1, termYears: 30 };
const mortgage20 = { category: 'expense', subtype: 'mortgage', name: '住宅ローン(20年)', age: 38, years: 20, amount: pay20, principal: 4100, rate: 1, termYears: 20 };

// ================================================================
// 第2話
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第2話】イベントなし・spRetAge=65');
console.log('='.repeat(90));
{
  const prof = buildProfile({ spRetAge: 65 }, () => false);
  const p = profileToSimParams(prof);
  const snaps = simulate(p, prof.events, 'proportional');
  printFixedTable('第2話', snaps, [58]);
}

// ================================================================
// 第3話
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第3話】+教育費・spRetAge=65');
console.log('='.repeat(90));
{
  const prof = buildProfile({ spRetAge: 65 }, isEdu);
  const p = profileToSimParams(prof);
  const snaps = simulate(p, prof.events, 'proportional');
  printFixedTable('第3話', snaps, [49, 52, 58]);
}

// ================================================================
// 第4話A/B
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第4話】+住宅ローン(30年 vs 20年比較)・spRetAge=65');
console.log('='.repeat(90));
{
  const prof4A = buildProfile({ spRetAge: 65 }, isEdu);
  prof4A.events.push(mortgage30);
  const p4A = profileToSimParams(prof4A);
  const snaps4A = simulate(p4A, prof4A.events, 'proportional');
  printFixedTable('第4話A(30年ローン)', snaps4A, [58]);

  const prof4B = buildProfile({ spRetAge: 65 }, isEdu);
  prof4B.events.push(mortgage20);
  const p4B = profileToSimParams(prof4B);
  const snaps4B = simulate(p4B, prof4B.events, 'proportional');
  printFixedTable('第4話B(20年ローン)', snaps4B, [58]);
}

// ================================================================
// 第5話
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第5話】美咲の退職年齢変更(65→56)・90歳枯渇なし確認');
console.log('='.repeat(90));
{
  const prof = buildProfile({ spRetAge: 56 }, isEdu);
  prof.events.push(mortgage30);
  const p = profileToSimParams(prof);
  const snaps = simulate(p, prof.events, 'proportional');
  printFixedTable('第5話', snaps, [90]);
  const s90 = snaps.find(s => s.age === 90);
  console.log(`  枯渇判定: ${s90.totalAssets > 0 ? 'OK(枯渇なし)' : 'NG(枯渇)'}`);
}

// ================================================================
// 第6話 A/B/C
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第6話】A/B/Cパターン比較（教育費+ローンのみ）・spRetAge=56');
console.log('='.repeat(90));
{
  const prof6A = buildProfile({ spRetAge: 56 }, isEdu);
  prof6A.events.push(mortgage30);
  const p6A = profileToSimParams(prof6A);
  const snaps6A = simulate(p6A, prof6A.events, 'proportional');
  printFixedTable('第6話A(retAge58/spRetAge56)', snaps6A, [58, 90]);

  const prof6B = buildProfile({ spRetAge: 56, retAge: 60, cNisaTo: 60, cIdecoTo: 60, cTaxTo: 60 }, isEdu);
  prof6B.events.push(mortgage30);
  const p6B = profileToSimParams(prof6B);
  const snaps6B = simulate(p6B, prof6B.events, 'proportional');
  printFixedTable('第6話B(retAge60/翔太2年延長)', snaps6B, [58, 90]);

  const prof6C = buildProfile({ spRetAge: 56 }, isEdu);
  prof6C.events.push(mortgage30, SPOUSE_PART_TIME);
  const p6C = profileToSimParams(prof6C);
  const snaps6C = simulate(p6C, prof6C.events, 'proportional');
  printFixedTable('第6話C(美咲パート56〜64歳120万/年)', snaps6C, [58, 90]);
}

// ================================================================
// 第7話
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第7話】+介護費(55〜57歳・100万/年)・Aパターンのみ');
console.log('='.repeat(90));
const prof7 = buildProfile({ spRetAge: 56 }, isEdu);
prof7.events.push(mortgage30, { category: 'expense', subtype: 'care', name: '介護費', age: 55, years: 3, amount: 100 });
{
  const p7 = profileToSimParams(prof7);
  const snaps7 = simulate(p7, prof7.events, 'proportional');
  printFixedTable('第7話', snaps7, [58]);
}

// ================================================================
// 第8話
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第8話】固定計算+MC（退職金・生活費見直しはまだ）');
console.log('='.repeat(90));
{
  const p8 = profileToSimParams(prof7); // イベント構成は第7話と同一
  const snaps8 = simulate(p8, prof7.events, 'proportional');
  printFixedTable('第8話(固定)', snaps8, [58]);
  console.log('計算中 (MC N=1000)...');
  const mc8 = runMC(p8, prof7.events, ['proportional'], 1000);
  printMC('第8話', mc8, [90], p8.curAge);
}

// ================================================================
// 第9話 ステップ1/2
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第9話】+退職金 → +68歳生活費見直し(2段階)');
console.log('='.repeat(90));
// baseProfile.events(添付JSON全イベント)を直接フィルタして組み立てる。
// 手組みのイベントを再構築しない（第9話ステップ2 = シナリオA = 第10話 と
// 完全に同一のオブジェクトになることを構造的に保証するため）。
const prof9_1 = buildProfile({ spRetAge: 56 }, ev => ev.subtype !== 'base_change');
{
  const p9_1 = profileToSimParams(prof9_1);
  console.log('計算中 (ステップ1 MC N=1000)...');
  const mc9_1 = runMC(p9_1, prof9_1.events, ['proportional'], 1000);
  printMC('第9話ステップ1(退職金追加)', mc9_1, [90], p9_1.curAge);
}

// ================================================================
// 第10話 = ブログ シナリオA = 第9話ステップ2
// 3者ともイベント構成・パラメータが完全に同一（教育費×2＋住宅ローン30年＋介護費＋
// 退職金×2＋68歳生活費見直し＝添付JSON全イベント、そのまま）なので、
// MC（乱数を使う）は1回だけ実行してその結果を3箇所で使い回す。
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【第10話 = ブログ シナリオA = 第9話ステップ2】最終確定（添付JSON全イベント・MC共有）');
console.log('='.repeat(90));
const profA = clone(baseProfile);
const pA = profileToSimParams(profA);
const snapsA = simulate(pA, profA.events, 'proportional');
printFixedTable('シナリオA(固定)', snapsA, [38, 49, 52, 55, 56, 58, 65, 68, 80, 90]);
nisaPrincipalCheck('シナリオA', snapsA, profA);
console.log('計算中 (シナリオA/第9話ステップ2/第10話 共有MC N=1000)...');
const mcA = runMC(pA, profA.events, ['proportional'], 1000);
printMC('シナリオA(=第10話=第9話ステップ2)', mcA, [90], pA.curAge);

// ================================================================
// ブログ シナリオB（翔太2年延長）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【ブログ シナリオB】翔太2年延長（retAge58→60）');
console.log('='.repeat(90));
const profB = clone(baseProfile);
Object.assign(profB.params, { retAge: 60, cNisaTo: 60, cIdecoTo: 60, cTaxTo: 60 });
{
  const sev = profB.events.find(ev => ev.subtype === 'severance' && ev.owner !== 'spouse');
  sev.age = 60;
}
const pB = profileToSimParams(profB);
const snapsB = simulate(pB, profB.events, 'proportional');
printFixedTable('シナリオB(固定)', snapsB, [58, 60, 65, 68, 80, 90]);
nisaPrincipalCheck('シナリオB', snapsB, profB);
console.log('計算中 (シナリオB MC N=1000)...');
const mcB = runMC(pB, profB.events, ['proportional'], 1000);
printMC('シナリオB', mcB, [90], pB.curAge);

// ================================================================
// ブログ シナリオC（美咲パート継続）
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【ブログ シナリオC】美咲パート継続（56〜64歳120万/年）');
console.log('='.repeat(90));
const profC = clone(baseProfile);
profC.events.push(SPOUSE_PART_TIME);
const pC = profileToSimParams(profC);
const snapsC = simulate(pC, profC.events, 'proportional');
printFixedTable('シナリオC(固定)', snapsC, [38, 49, 52, 55, 56, 58, 65, 68, 80, 90]);
nisaPrincipalCheck('シナリオC', snapsC, profC);
console.log('計算中 (シナリオC MC N=1000)...');
const mcC = runMC(pC, profC.events, ['proportional'], 1000);
printMC('シナリオC', mcC, [90], pC.curAge);

// ================================================================
// 比較表
// ================================================================
console.log('\n' + '='.repeat(90));
console.log('【比較表 A/B/C】');
console.log('='.repeat(90));
const a58 = snapsA.find(s => s.age === 58).totalAssets;
const a90 = snapsA.find(s => s.age === 90).totalAssets;
const b58 = snapsB.find(s => s.age === 58).totalAssets;
const b90 = snapsB.find(s => s.age === 90).totalAssets;
const c58 = snapsC.find(s => s.age === 58).totalAssets;
const c90 = snapsC.find(s => s.age === 90).totalAssets;
const idx90 = 90 - pA.curAge;
console.log(`  58歳時点資産(固定)   | A:${a58}万 | B:${b58}万 | C:${c58}万`);
console.log(`  90歳時点資産(固定)   | A:${a90}万 | B:${b90}万 | C:${c90}万`);
console.log(`  MC破綻率(90歳)       | A:${mcA.strategies.proportional.bankruptcyRate.toFixed(1)}% | B:${mcB.strategies.proportional.bankruptcyRate.toFixed(1)}% | C:${mcC.strategies.proportional.bankruptcyRate.toFixed(1)}%`);
console.log(`  90歳中央値(MC)       | A:${mcA.strategies.proportional.percentiles.p50[idx90]}万 | B:${mcB.strategies.proportional.percentiles.p50[idx90]}万 | C:${mcC.strategies.proportional.percentiles.p50[idx90]}万`);

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));
