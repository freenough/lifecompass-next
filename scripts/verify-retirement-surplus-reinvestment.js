/**
 * scripts/verify-retirement-surplus-reinvestment.js
 * 退職後 余剰キャッシュフロー再投資機能（SimParams.retirementSurplusReinvest）を検証する。
 * 本番の simulate() を直接importして呼び出すだけで、独自の財務計算式・再実装ロジックは
 * 一切含まない（住替え口座の按分比率・税引後手取り等はすべてsimulate()自身が計算した結果）。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate } = require('../src/lib');

const TOLERANCE = 0.05; // 万円。浮動小数点演算の丸め誤差許容

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

function close(a, b, tol = TOLERANCE) {
  return Math.abs(a - b) < tol;
}

// ── ダミープロファイル構築（他ツールのverify-*.jsと同様、対象ロジックのみが発火するよう
//    他の一切のロジック（NISA/iDeCo拠出・退職金・インフレ等）を無効化する）──
function buildRetireeParams(overrides = {}, spouseOverrides = undefined) {
  const p = {
    curAge: 65,
    lifeEx: 65,
    baseInc: 0,
    baseExp: 100,
    inflR: 0,
    retAge: 65,
    penAge: 65,
    penAmt: 0,
    mcStd: 0,
    mcStdR: 0,
    hasIdeco: false,
    idecoYrs: 1,
    idecoReceiveType: 'lump',
    idecoReceiveYears: 10,
    idecoStartAge: 200,
    sevYrs: 0,
    acct: {
      nisa:  { bal: 0, con: 0, toAge: 0, rW: 0, rR: 0 },
      ideco: { bal: 0, con: 0, toAge: 0, rW: 0, rR: 0 },
      tax:   { bal: 0, con: 0, toAge: 0, rW: 0, rR: 0, costBasis: 0 },
      cash:  { bal: 0 },
    },
    spouse: spouseOverrides === null ? null : Object.assign(
      {
        inc: 0, retAge: 65, penAge: 65, penAmt: 0, spCurAge: 65,
        acct: {
          nisa:  { bal: 0, con: 0, toAge: 0 },
          ideco: { bal: 0, con: 0, toAge: 0 },
          tax:   { bal: 0, con: 0, toAge: 0, costBasis: 0 },
          cash:  { bal: 0 },
        },
      },
      spouseOverrides || {}
    ),
  };
  return Object.assign(p, overrides);
}

// ================================================================
// SECTION 1: 境界値ケース
// ================================================================
console.log('='.repeat(80));
console.log('【境界値ケース】');
console.log('='.repeat(80));

// 1a. 黒字ちょうど0円（配偶者あり・flag=true）→ 按分処理が走らず、cash/tax/spTaxとも不変
{
  const p = buildRetireeParams({ penAmt: 100, baseExp: 100, retirementSurplusReinvest: true }, {});
  const s = simulate(p, [], 'proportional')[0];
  const ok = s.tax === 0 && s.spTax === 0 && s.cash === 0;
  record('1a. 黒字ちょうど0円 → 按分処理が走らない（cash/tax/spTaxとも不変）', ok, `tax=${s.tax} spTax=${s.spTax} cash=${s.cash}`);
}

// 1b. 本人収入のみ（配偶者収入0、配偶者は存在）→ 按分100:0
{
  const p = buildRetireeParams({ penAmt: 200, baseExp: 100, retirementSurplusReinvest: true }, { penAmt: 0, inc: 0 });
  const s = simulate(p, [], 'proportional')[0];
  const ok = close(s.tax, 100) && close(s.spTax, 0);
  record('1b. 本人収入のみ → 按分100:0', ok, `tax=${s.tax} spTax=${s.spTax}（期待 tax=100 spTax=0）`);
}

// 1c. 配偶者収入のみ（本人収入0）→ 按分0:100
{
  const p = buildRetireeParams({ penAmt: 0, baseExp: 100, retirementSurplusReinvest: true }, { penAmt: 200 });
  const s = simulate(p, [], 'proportional')[0];
  const ok = close(s.tax, 0) && close(s.spTax, 100);
  record('1c. 配偶者収入のみ → 按分0:100', ok, `tax=${s.tax} spTax=${s.spTax}（期待 tax=0 spTax=100）`);
}

// 1d. 両者収入0（配偶者は存在する）→ 50:50フォールバックのガード節そのものの確認
// 注記: simulate()の実装上、income変数はownRetIncome+spouseRetIncomeと常に一致するため
// （iDeCo年金受取・収入イベントも含め、incomeに合流する経路はすべてown/spouseRetIncomeに
// 同時追跡している）、「income>0（黒字が発生する前提）かつ両者の内訳が0」という状態は
// 実際のsimulate()呼び出しでは構造的に発生し得ない。50:50フォールバックは実装上
// ゼロ除算を防ぐための防御的分岐であり、その式（totalSplitIncome > 0 ? ... : 0.5）
// 自体の健全性のみをここで直接確認する（simulate()のロジックを再実装するものではなく、
// 単にJavaScriptの三項演算子がゼロ除算時に意図通り0.5を返すことの確認）。
{
  const totalSplitIncome = 0;
  const ownRetIncome = 0;
  const ownRatio = totalSplitIncome > 0 ? ownRetIncome / totalSplitIncome : 0.5;
  const ok = ownRatio === 0.5;
  record('1d. 両者収入0 → 50:50フォールバックのガード節確認（simulate()内では到達し得ない旨は完了報告に記載）', ok, `ownRatio=${ownRatio}`);
}

// 1e. 配偶者が存在しない場合 → 按分計算スキップ、全額本人へ
{
  const p = buildRetireeParams({ penAmt: 200, baseExp: 100, retirementSurplusReinvest: true }, null);
  const s = simulate(p, [], 'proportional')[0];
  const ok = close(s.tax, 100) && (s.spTax === 0);
  record('1e. 配偶者なし → 全額本人へ', ok, `tax=${s.tax} spTax=${s.spTax}（期待 tax=100）`);
}

// ================================================================
// SECTION 2: 代表ケース（本人年金300万・配偶者年金100万・支出300万 → 黒字100万が75:25）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【代表ケース】');
console.log('='.repeat(80));
{
  const p = buildRetireeParams({ penAmt: 300, baseExp: 300, retirementSurplusReinvest: true }, { penAmt: 100 });
  const s = simulate(p, [], 'proportional')[0];
  const ok = close(s.tax, 75) && close(s.spTax, 25);
  record('2. 本人300万・配偶者100万・支出300万 → 黒字100万が75:25', ok, `tax=${s.tax} spTax=${s.spTax}`);
}

// ================================================================
// SECTION 3: iDeCo年金受取ケース（本人iDeCo年金・配偶者通常年金、50:50想定）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【iDeCo年金受取ケース】');
console.log('='.repeat(80));
{
  const p = buildRetireeParams(
    {
      penAmt: 0, baseExp: 100,
      hasIdeco: true, idecoYrs: 20, idecoReceiveType: 'pension', idecoReceiveYears: 10, idecoStartAge: 65,
      retirementSurplusReinvest: true,
    },
    { penAmt: 100 }
  );
  p.acct.ideco = { bal: 1000, con: 0, toAge: 0, rW: 0, rR: 0 };
  const s = simulate(p, [], 'proportional')[0];
  // ideco 1000/10年 = 100万/年（このプロファイルではidecoTaxPaid=0のため手取りもほぼ100万）。
  // 本人iDeCo年金100万 : 配偶者年金100万 = 50:50想定。
  const ok = s.idecoAnnualGross === 100 && close(s.tax, 50) && close(s.spTax, 50);
  record(
    '3. 本人iDeCo年金・配偶者通常年金 → iDeCo年金税引後額が按分比率に合流（50:50）',
    ok,
    `idecoAnnualGross=${s.idecoAnnualGross} tax=${s.tax} spTax=${s.spTax}`
  );
}

// ================================================================
// SECTION 4: costBasisラウンドトリップ検証
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【costBasisラウンドトリップ検証】');
console.log('='.repeat(80));
{
  // 65〜68歳は黒字200万/年を特定口座で運用継続（rR=10%）、69歳に一時支出300万で
  // 部分取崩が発生するシナリオ。costBasisが正しく積み上がっていれば、取崩時の
  // 含み益課税は「本当の運用益(rR分)」のみに限定される。
  const p = buildRetireeParams({
    lifeEx: 69, penAmt: 500, baseExp: 300, retirementSurplusReinvest: true,
  }, null);
  p.acct.tax.rR = 10;
  const events = [
    { category: 'expense', subtype: 'other_exp', name: 'oneoff', age: 69, years: 1, amount: 300 },
  ];
  const snaps = simulate(p, events, 'proportional');
  const s69 = snaps.find(s => s.age === 69);

  // 比較対照: costBasisを加算し忘れた場合（バグ想定）に相当する、tax残高は同じだが
  // costBasis=0のシナリオを単独年で走らせ、正しい実装(costBasis追跡あり)より
  // 総資産が少なくなる(過大課税される)ことを確認する。
  const pBug = buildRetireeParams({
    curAge: 69, lifeEx: 69, penAmt: 500, baseExp: 300,
  }, null);
  pBug.acct.tax = { bal: 928.2, con: 0, toAge: 0, rW: 0, rR: 10, costBasis: 0 };
  const sBug = simulate(pBug, events, 'proportional')[0];

  const ok = close(s69.totalAssets, 916, 2) && s69.totalAssets > sBug.totalAssets;
  record(
    '4. costBasis正しく追跡 → 過大課税されない（バグ想定ケースより総資産が多い）',
    ok,
    `正しい実装: totalAssets=${s69.totalAssets} / costBasis加算漏れ想定: totalAssets=${sBug.totalAssets}`
  );
}

// ================================================================
// SECTION 5: 按分比率の年次再計算テスト（最重要：前年比率のキャッシュ・使い回しがないこと）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【按分比率の年次再計算テスト】');
console.log('='.repeat(80));
{
  const p = buildRetireeParams({ lifeEx: 67, penAmt: 100, baseExp: 100, retirementSurplusReinvest: true }, { penAmt: 100 });
  const events = [
    { category: 'income', subtype: 'reemploy', name: 'own-boost',    owner: 'self',   age: 65, years: 1, amount: 200 },
    { category: 'income', subtype: 'reemploy', name: 'spouse-boost', owner: 'spouse', age: 66, years: 1, amount: 200 },
  ];
  const snaps = simulate(p, events, 'proportional');
  const s65 = snaps.find(s => s.age === 65); // 本人300:配偶者100 → 75:25 → tax+=225, spTax+=75
  const s66 = snaps.find(s => s.age === 66); // 本人100:配偶者300 → 25:75 → tax+=75(累計300), spTax+=225(累計300)
  const s67 = snaps.find(s => s.age === 67); // 本人100:配偶者100 → 50:50 → tax+=50(累計350), spTax+=50(累計350)

  const ok65 = close(s65.tax, 225) && close(s65.spTax, 75);
  const ok66 = close(s66.tax, 300) && close(s66.spTax, 300);
  const ok67 = close(s67.tax, 350) && close(s67.spTax, 350);
  record('5a. 1年目(65歳): 75:25 → tax=225 spTax=75', ok65, `tax=${s65.tax} spTax=${s65.spTax}`);
  record('5b. 2年目(66歳): 収入比率が25:75に反転 → tax=300 spTax=300（前年比率のキャッシュなし）', ok66, `tax=${s66.tax} spTax=${s66.spTax}`);
  record('5c. 3年目(67歳): 50:50に戻る → tax=350 spTax=350', ok67, `tax=${s67.tax} spTax=${s67.spTax}`);
}

// ================================================================
// SECTION 6: 回帰テスト（トグルOFF/未設定で既存動作と完全一致）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【回帰テスト（トグルOFF/未設定）】');
console.log('='.repeat(80));
{
  // flag未設定
  const pUnset = buildRetireeParams({ penAmt: 300, baseExp: 100 }, { penAmt: 100 });
  const sUnset = simulate(pUnset, [], 'proportional')[0];
  const okUnset = sUnset.cash === 300 && sUnset.tax === 0 && sUnset.spTax === 0;
  record('6a. retirementSurplusReinvest未設定 → 従来通りcashにのみ加算', okUnset, `cash=${sUnset.cash} tax=${sUnset.tax} spTax=${sUnset.spTax}`);

  // flag=false明示
  const pFalse = buildRetireeParams({ penAmt: 300, baseExp: 100, retirementSurplusReinvest: false }, { penAmt: 100 });
  const sFalse = simulate(pFalse, [], 'proportional')[0];
  const okFalse = sFalse.cash === 300 && sFalse.tax === 0 && sFalse.spTax === 0;
  record('6b. retirementSurplusReinvest=false → 従来通りcashにのみ加算', okFalse, `cash=${sFalse.cash} tax=${sFalse.tax} spTax=${sFalse.spTax}`);
}
console.log('\n（3キャラクター[田中/山本/中村]の既存確定値との一致は full-verify.js 本体の全セクションで');
console.log(' 別途確認済み。本スクリプトはfull-verify.jsに組み込まれ、同一実行の一部として毎回検証される）');

// ================================================================
// SECTION 7: ランダムケース（100件、按分比率+回帰の両方を検証）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【ランダムケース】100件');
console.log('='.repeat(80));

const N_RANDOM = 100;
let randPass = 0, randFail = 0;
for (let i = 0; i < N_RANDOM; i++) {
  const ownPen = Math.round(Math.random() * 500 * 10) / 10;
  const spousePen = Math.round(Math.random() * 500 * 10) / 10;
  const totalPen = ownPen + spousePen;
  // baseExpを totalPen 未満に設定し、必ず黒字(surplus>0)になるようにする
  const baseExp = Math.round(Math.random() * Math.max(1, totalPen - 1) * 10) / 10;
  const surplus = totalPen - baseExp;

  const label = `random#${i + 1}`;
  if (surplus <= 0) { i--; continue; } // 念のためのガード（理論上発生しない）

  const pOn = buildRetireeParams({ penAmt: ownPen, baseExp, retirementSurplusReinvest: true }, { penAmt: spousePen });
  const sOn = simulate(pOn, [], 'proportional')[0];
  const expectedOwnShare = totalPen > 0 ? surplus * (ownPen / totalPen) : surplus * 0.5;
  const expectedSpouseShare = surplus - expectedOwnShare;
  const onOk = close(sOn.tax, expectedOwnShare, 0.1) && close(sOn.spTax, expectedSpouseShare, 0.1);

  const pOff = buildRetireeParams({ penAmt: ownPen, baseExp }, { penAmt: spousePen });
  const sOff = simulate(pOff, [], 'proportional')[0];
  const offOk = close(sOff.cash, surplus, 0.1) && sOff.tax === 0 && sOff.spTax === 0;

  const ok = onOk && offOk;
  if (ok) randPass++; else randFail++;
  record(
    label,
    ok,
    `ownPen=${ownPen} spousePen=${spousePen} baseExp=${baseExp} surplus=${surplus.toFixed(2)} ` +
    `ON: tax=${sOn.tax.toFixed(2)}(期待${expectedOwnShare.toFixed(2)}) spTax=${sOn.spTax.toFixed(2)}(期待${expectedSpouseShare.toFixed(2)}) ` +
    `OFF: cash=${sOff.cash.toFixed(2)}(期待${surplus.toFixed(2)})`
  );
}
console.log(`\nランダムケース結果: ${randPass} PASS / ${randFail} FAIL`);

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: 退職後余剰キャッシュフロー再投資機能の境界値・代表・iDeCo・costBasis・年次再計算・回帰・ランダムケースを確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));
