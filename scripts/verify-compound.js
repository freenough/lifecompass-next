/**
 * scripts/verify-compound.js
 * financeCore.ts の calcFutureValue()（積立(複利)計算機・第3弾ツール向けの順算関数）を検証する。
 * 主な検証方法は「逆方向の往復整合性チェック」: calcFutureValue()で求めた将来価値を、
 * 第1弾 calcRequiredMonthlyContribution() に目標資産として入力し直し、元の毎月積立額に
 * 近似するかを確認する（3ツール間の数値的一貫性を担保するため）。
 * 独自の財務計算式は使わず、financeCore.tsの関数のみを直接importして呼び出す。
 *
 * 参照予定だった Product Spec (product_spec_compound_interest_tool.md) はリポジトリ内に
 * 見つからなかったため、実装指示書（implementation_instruction_compound_interest_phase1.md）
 * に明記された検証カテゴリ（境界値・代表ケース・ランダム100件・逆方向往復整合性チェック）と、
 * 第1弾(verify-finance-core.js)・第2弾(verify-fire-age.js)と同水準の網羅性・PASS基準に
 * 基づいて構成した。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { calcFutureValue, calcRequiredMonthlyContribution } = require('../src/lib/financeCore');

const TOLERANCE_MANYEN = 0.1; // 万円。往復整合性チェックの許容誤差（第2弾のTOLERANCE_YEARSに準じ、小さめに設定）

let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, detail) {
  if (ok) {
    pass++;
  } else {
    fail++;
    failedCases.push({ label, detail });
  }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

// calcFutureValue()で求めた将来価値を、calcRequiredMonthlyContribution()に目標資産として
// 入力し直し、元の毎月積立額に近似するかを確認する（逆方向の往復整合性チェック）。
// monthly<=0 や years<=0 など calcRequiredMonthlyContribution() 側の前提が崩れるケースでは
// 呼ばない（呼び出し側で個別に判定する）。
function roundTripCheck(label, currentAssets, monthlyContribution, years, ratePct) {
  const fv = calcFutureValue(currentAssets, monthlyContribution, years, ratePct);
  const backMonthly = calcRequiredMonthlyContribution(currentAssets, fv, years, ratePct);
  const ok = backMonthly !== null && Math.abs(backMonthly - monthlyContribution) < TOLERANCE_MANYEN;
  record(
    label,
    ok,
    `FV=${fv.toFixed(2)}万円 → 逆算積立額=${backMonthly === null ? 'null' : backMonthly.toFixed(2)}万円 (元の積立額=${monthlyContribution}万円)`
  );
}

// ================================================================
// SECTION 1: 境界値ケース（8件、個別に明示）
// ================================================================
console.log('='.repeat(80));
console.log('【境界値ケース】8件');
console.log('='.repeat(80));

// 1. 現在資産0円
{
  const fv = calcFutureValue(0, 10, 10, 5);
  // 手計算: 年金終価の式 FV = 0*(1.05)^10 + 120*((1.05)^10-1)/0.05
  const annualContribution = 10 * 12;
  const r = 0.05;
  const expected = annualContribution * (Math.pow(1 + r, 10) - 1) / r;
  const ok = Math.abs(fv - expected) < TOLERANCE_MANYEN;
  record('1. 現在資産0円', ok, `結果=${fv.toFixed(2)}万円 期待値=${expected.toFixed(2)}万円`);
  roundTripCheck('1. 現在資産0円（往復整合性）', 0, 10, 10, 5);
}

// 2. 積立期間1年
{
  const fv = calcFutureValue(500, 10, 1, 5);
  const expected = 500 * 1.05 + 10 * 12; // 1年運用後+年末積立1回
  const ok = Math.abs(fv - expected) < TOLERANCE_MANYEN;
  record('2. 積立期間1年', ok, `結果=${fv.toFixed(2)}万円 期待値=${expected.toFixed(2)}万円`);
  roundTripCheck('2. 積立期間1年（往復整合性）', 500, 10, 1, 5);
}

// 3. 利回り0%
{
  const fv = calcFutureValue(500, 10, 10, 0);
  const expected = 500 + 10 * 12 * 10; // 複利なし・単純合算
  const ok = Math.abs(fv - expected) < TOLERANCE_MANYEN;
  record('3. 利回り0%', ok, `結果=${fv.toFixed(2)}万円 期待値=${expected.toFixed(2)}万円`);
  roundTripCheck('3. 利回り0%（往復整合性）', 500, 10, 10, 0);
}

// 4. 積立0円（資産成長のみ）
{
  const fv = calcFutureValue(1000, 0, 10, 5);
  const expected = 1000 * Math.pow(1.05, 10);
  const ok = Math.abs(fv - expected) < TOLERANCE_MANYEN;
  record('4. 積立0円（資産成長のみ）', ok, `結果=${fv.toFixed(2)}万円 期待値=${expected.toFixed(2)}万円`);
  // 積立0円だと calcRequiredMonthlyContribution の往復は「必要積立額0万円」を期待する
  // 特殊ケースになるため、往復整合性チェックは通常のroundTripCheckで確認できる
  // （目標資産=現在資産のFVなので、積立0円が唯一の解として戻ってくるはず）。
  roundTripCheck('4. 積立0円（往復整合性）', 1000, 0, 10, 5);
}

// 5. 現在資産0円かつ積立0円 → 常に0
{
  const fv = calcFutureValue(0, 0, 10, 5);
  const ok = fv === 0;
  record('5. 現在資産0円・積立0円 → 0', ok, `結果=${fv}`);
}

// 6. 超長期（60年）
{
  const fv = calcFutureValue(100, 5, 60, 5);
  const ok = isFinite(fv) && !isNaN(fv) && fv > 0;
  record('6. 超長期（60年） → 発散・NaNなし', ok, `結果=${fv.toFixed(2)}万円`);
  roundTripCheck('6. 超長期（60年、往復整合性）', 100, 5, 60, 5);
}

// 7. 超高利回り（20%）
{
  const fv = calcFutureValue(100, 5, 20, 20);
  const ok = isFinite(fv) && !isNaN(fv) && fv > 0;
  record('7. 超高利回り（20%） → 発散・NaNなし', ok, `結果=${fv.toFixed(2)}万円`);
  roundTripCheck('7. 超高利回り（20%、往復整合性）', 100, 5, 20, 20);
}

// 8. years=0 → currentAssetsそのまま
{
  const fv = calcFutureValue(777, 10, 0, 5);
  const ok = fv === 777;
  record('8. years=0 → currentAssetsそのまま', ok, `結果=${fv}`);
}

// ================================================================
// SECTION 2: 代表ケース（山本・中村・田中・佐々木、既存4フィクスチャの積立条件を流用）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【代表ケース】4フィクスチャ × 往復整合性');
console.log('='.repeat(80));

const REPRESENTATIVE_CASES = [
  // [ラベル, currentAssets(合算・万円), monthlyContribution(万円/月, 実際のNISA積立額), years, rate(%)]
  ['山本(NISA400+現金420=820万・積立10万/月・4%・21年)',    820,  10, 21, 4],
  ['中村夫婦(合算2200万・積立15万/月・7%・20年)',            2200, 15, 20, 7],
  ['田中(合算2500万・積立10万/月・4%・13年)',                2500, 10, 13, 4],
  ['佐々木(合算6200万・積立10万/月・7%・7年)',               6200, 10,  7, 7],
];

for (const [label, currentAssets, monthly, years, rate] of REPRESENTATIVE_CASES) {
  const fv = calcFutureValue(currentAssets, monthly, years, rate);
  console.log(`  ${label}: ${years}年後の将来評価額 = ${fv.toFixed(2)}万円`);
  roundTripCheck(label, currentAssets, monthly, years, rate);
}

// ================================================================
// SECTION 3: ランダムケース（100件、往復整合性）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【ランダムケース】100件（往復整合性）');
console.log('='.repeat(80));

const N_RANDOM = 100;
let randPass = 0, randFail = 0;
for (let i = 0; i < N_RANDOM; i++) {
  const currentAssets = Math.round(Math.random() * 5000 * 10) / 10; // 0〜5,000万円
  const monthly = Math.round((Math.random() * 49 + 1) * 10) / 10;   // 1〜50万円/月（0円は境界値ケース4で別途確認済み）
  const years = 1 + Math.floor(Math.random() * 45);                 // 1〜45年
  const rate = Math.round(Math.random() * 12 * 10) / 10;            // 0〜12%

  const label = `random#${i + 1}`;
  const fv = calcFutureValue(currentAssets, monthly, years, rate);
  const backMonthly = calcRequiredMonthlyContribution(currentAssets, fv, years, rate);
  const ok = backMonthly !== null && Math.abs(backMonthly - monthly) < TOLERANCE_MANYEN;
  if (ok) randPass++; else randFail++;
  record(
    label,
    ok,
    `cur=${currentAssets} monthly=${monthly} years=${years} rate=${rate}% FV=${fv.toFixed(2)} 逆算積立額=${backMonthly === null ? 'null' : backMonthly.toFixed(2)}`
  );
}
console.log(`\nランダムケース結果: ${randPass} PASS / ${randFail} FAIL`);

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: calcFutureValue()の境界値・代表ケース・往復整合性を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));
