/**
 * scripts/verify-finance-core.js
 * financeCore.ts（積立額逆算エンジン）が、simulate.ts本体を「積立期のみ・他ロジックが
 * 一切発火しない条件」で動かした場合の結果と数値的に整合しているかを検証する。
 * simulate.ts/analyze.ts/types.tsは変更しない（コードを共有せず、数値を突き合わせる）。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate } = require('../src/lib');
const { calcRequiredMonthlyContribution } = require('../src/lib/financeCore');

// ── 丸め誤差の調査結果 ──
// simulate.ts(451-458行)は口座残高をMath.max(0, x)でクランプするのみでMath.round()はしない。
// Math.round()が適用されるのは snaps.push() 内の totalAssets/income/expense 等の
// 「表示用スナップショットのフィールド」のみであり(simulate.ts 470行付近)、次のイテレーションで
// 実際に使われる状態変数(nisa/ideco/tax/cash等のletローカル変数)自体は丸められない。
// そのため、financeCore.ts(丸めなしの閉じた式)とsimulate.tsの内部状態は年数によらず
// 数値的にほぼ完全一致するはずで、唯一の誤差要因は最終スナップのtotalAssetsに対する
// 1回だけのMath.round(最大0.5万円)+ 浮動小数点演算の丸め誤差(無視できるレベル)のみ。
// 誤差は年数に対して累積しないため、許容誤差は年数によらず一定値(1万円)とする。
const TOLERANCE = 1; // 万円。根拠は上記コメント参照。

// ── ダミープロファイル構築 ──
// 「積立の複利計算のみ」が発火するよう、退職・iDeCo・配偶者・イベント・収支不足による
// 按分取り崩しロジックを全て無効化する(finance_core_investigation.mdの調査結果に基づく)。
function buildDummyProfileForVerification(currentAssets, monthlyContribution, years, ratePct) {
  const curAge = 30; // 任意の固定値(ダミー。結果に影響しない)
  const retAge = curAge + years + 50; // 検証期間中に取崩期へ切り替わらないよう十分先に設定
  const lifeEx = retAge + 10; // シミュレーションがyears年分より前に終了しないよう十分先に設定
  const annualContribution = monthlyContribution * 12;
  return {
    curAge,
    lifeEx,
    // baseInc は年間積立額と厳密に一致させる(avail === totalCon)。
    // 差を大きめに取って「安全マージン」を持たせると、simulate()は毎年の余剰(avail - totalCon)を
    // cashに積み上げてしまい(simulate.ts 353行 `cash += avail - totalCon * ratio`)、
    // 年数分だけ余剰が複利なしで蓄積して結果が汚染される。avail=totalConちょうどにすることで
    // 余剰ゼロ・按分取り崩しも発生しない(ratio=1が常に成立する)状態を作る。
    baseInc: annualContribution,
    baseExp: 0,
    inflR: 0,
    retAge,
    penAge: retAge + 1,
    penAmt: 0,
    mcStd: 0,
    mcStdR: 0,
    hasIdeco: false, // iDeCo関連ロジックを無効化
    idecoYrs: 1,
    idecoReceiveType: 'lump',
    idecoReceiveYears: 10,
    idecoSplitRatio: 50,
    idecoStartAge: retAge + 100, // hasIdeco=falseでも参照されうるため、発火しない値を保険で設定
    sevYrs: 0, // 退職金ロジックを実質無効化
    acct: {
      nisa:  { bal: currentAssets, con: annualContribution, toAge: retAge, rW: ratePct, rR: ratePct },
      ideco: { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0 },
      tax:   { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0, costBasis: 0 },
      cash:  { bal: 0 },
    },
    spouse: null, // 配偶者ロジックを無効化
  };
}

// financeCore.tsの閉じた式の「順方向」(現在資産・毎月積立額・年数・利回り→n年後の資産額)。
// calcRequiredMonthlyContributionの代数的な逆関数であり、同じ年金終価の式に基づく。
// 「積立額を先に決めて、それがどの目標資産に相当するか」を求める検証用ケースを作るために使う。
function forwardFutureValue(currentAssets, monthlyContribution, years, ratePct) {
  const annualContribution = monthlyContribution * 12;
  const r = ratePct / 100;
  if (Math.abs(r) < 1e-9) return currentAssets + annualContribution * years;
  const growthFactor = Math.pow(1 + r, years);
  return currentAssets * growthFactor + (annualContribution * (growthFactor - 1)) / r;
}

// 1件のケースを検証する: financeCoreの想定目標資産(=forwardFutureValueで求めた値)を
// calcRequiredMonthlyContributionに渡し、そこで求まった積立額をsimulate()に実際に流し込んで
// years年後の資産額を実測、想定目標資産と比較する。
function runCase(label, currentAssets, monthlyContribution, years, ratePct) {
  const targetAssets = forwardFutureValue(currentAssets, monthlyContribution, years, ratePct);
  const computedMonthly = calcRequiredMonthlyContribution(currentAssets, targetAssets, years, ratePct);

  if (computedMonthly === null) {
    console.log(`[${label}] 現在資産${currentAssets}万円・積立${monthlyContribution}万円/月・利回り${ratePct}%・${years}年`);
    console.log(`  FAIL: calcRequiredMonthlyContributionがnullを返しました(years=${years}は本来>0のはず)`);
    return false;
  }

  const p = buildDummyProfileForVerification(currentAssets, computedMonthly, years, ratePct);
  const snaps = simulate(p, [], 'proportional');
  const targetAge = p.curAge + years - 1; // 年末積立方式: years回目の積立・成長後のスナップはage=curAge+years-1
  const snap = snaps.find(s => s.age === targetAge);

  console.log(`[${label}] 現在資産${currentAssets}万円・積立${monthlyContribution}万円/月・利回り${ratePct}%・${years}年`);
  if (!snap) {
    console.log(`  FAIL: simulate()のスナップにage=${targetAge}が見つかりません`);
    return false;
  }
  const diff = snap.totalAssets - targetAssets;
  const ok = Math.abs(diff) <= TOLERANCE;
  console.log(`  financeCoreの想定目標資産: ${targetAssets.toFixed(1)}万円`);
  console.log(`  simulate()実測資産(${years}年後): ${snap.totalAssets}万円`);
  console.log(`  差分: ${diff.toFixed(1)}万円 (許容誤差: ${TOLERANCE}万円) → ${ok ? 'PASS' : 'FAIL'}`);
  return ok;
}

let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, repro) {
  if (ok) pass++; else { fail++; failedCases.push({ label, repro }); }
}

// ================================================================
// SECTION 1: 境界値ケース(simulate()を介さない、calcRequiredMonthlyContribution単体の検証)
// ================================================================
console.log('='.repeat(80));
console.log('【境界値ケース】null/0の区別');
console.log('='.repeat(80));
{
  const r1 = calcRequiredMonthlyContribution(100, 1000, 0, 5);
  const ok1 = r1 === null;
  console.log(`years=0 → ${r1} (期待値: null) → ${ok1 ? 'PASS' : 'FAIL'}`);
  record('years=0 → null', ok1, 'calcRequiredMonthlyContribution(100, 1000, 0, 5)');

  const r2 = calcRequiredMonthlyContribution(100, 1000, -5, 5);
  const ok2 = r2 === null;
  console.log(`years=-5 → ${r2} (期待値: null) → ${ok2 ? 'PASS' : 'FAIL'}`);
  record('years=-5 → null', ok2, 'calcRequiredMonthlyContribution(100, 1000, -5, 5)');

  const r3 = calcRequiredMonthlyContribution(2000, 1000, 10, 5);
  const ok3 = r3 === 0;
  console.log(`currentAssets(2000) >= targetAssets(1000) → ${r3} (期待値: 0) → ${ok3 ? 'PASS' : 'FAIL'}`);
  record('既に目標達成 → 0', ok3, 'calcRequiredMonthlyContribution(2000, 1000, 10, 5)');
}

// ================================================================
// SECTION 2: 代表ケース(Product Specレンジ対応)
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【代表ケース】');
console.log('='.repeat(80));
const NAMED_CASES = [
  ['ケース1', 0,   7.2, 20, 5],
  ['ケース2', 100, 5,   15, 3],
  ['ケース3', 500, 10,  10, 7],
  ['ケース4(利回り0%)', 200, 3, 10, 0],
  ['ケース5(1年のみ)',   50, 2,  1, 4],
];
for (const [label, cur, monthly, years, rate] of NAMED_CASES) {
  const ok = runCase(label, cur, monthly, years, rate);
  record(label, ok, `runCase('${label}', ${cur}, ${monthly}, ${years}, ${rate})`);
}

// ================================================================
// SECTION 3: ランダムケース(100件)
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【ランダムケース】100件');
console.log('='.repeat(80));
const N_RANDOM = 100;
let randPass = 0, randFail = 0;
for (let i = 0; i < N_RANDOM; i++) {
  const cur = Math.round(Math.random() * 5000 * 10) / 10;       // 0〜5,000万円
  const rate = Math.round(Math.random() * 10 * 10) / 10;        // 0〜10%
  const years = 1 + Math.floor(Math.random() * 40);             // 1〜40年
  const monthly = Math.round(Math.random() * 50 * 10) / 10;     // 0〜50万円/月(目標資産を作るための仮の積立額)
  const label = `random#${i + 1}`;
  const ok = runCase(label, cur, monthly, years, rate);
  if (ok) randPass++; else randFail++;
  record(label, ok, `runCase('${label}', ${cur}, ${monthly}, ${years}, ${rate})`);
}
console.log(`\nランダムケース結果: ${randPass} PASS / ${randFail} FAIL`);

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: financeCore.tsとsimulate.tsの数値的整合性を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] 再現: ${f.repro}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));
