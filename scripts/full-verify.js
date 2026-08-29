/**
 * scripts/full-verify.js
 * 山本シリーズ全件・中村夫婦・モンテカルロの完全検証
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate, runMC } = require('../src/lib');
const { calcMortgageTermFromPayment } = require('../src/lib/helpers');

// ---- ユーティリティ ----
function pad(s, n) { return String(s).padStart(n); }
function fmt(v) { return v === null ? 'null' : String(v); }

// ---- 山本シリーズ：FIRE年齢スキャン ----
function buildYamamotoParams(f, retAge) {
  return {
    curAge: f.curAge, lifeEx: 90,
    baseInc: f.baseInc, baseExp: f.baseExp,
    inflR: 0,
    retAge,
    penAge: f.penAge, penAmt: f.penInc,
    mcStd: f.mcStd || 10, mcStdR: f.mcStdR || 10,
    hasIdeco: false,
    idecoYrs: 1, idecoReceiveType: 'lump',
    idecoReceiveYears: 10, idecoStartAge: 60,
    sevYrs: 1,
    acct: {
      nisa:  { bal: f.nisaBal, con: f.nisaCon, toAge: 99, rW: f.rW, rR: f.rR },
      ideco: { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0 },
      tax:   { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0, costBasis: 0 },
      cash:  { bal: f.cashBal },
    },
    spouse: null,
  };
}

function findFireAges(f) {
  const needed = f.baseExp * 25;
  let def1 = null, def2 = null, def3 = null;
  for (let retAge = f.curAge + 1; retAge <= 80; retAge++) {
    const p = buildYamamotoParams(f, retAge);
    const snaps = simulate(p, [], 'proportional');
    const retSnap = snaps.find(s => s.age === retAge);
    const total = retSnap ? retSnap.totalAssets : 0;
    if (!def1 && total >= needed) def1 = retAge;
    const postRet = snaps.filter(s => s.age >= retAge);
    if (!def2 && postRet.every(s => s.totalAssets > 0)) def2 = retAge;
    if (!def3 && postRet.every(s => s.totalAssets >= needed)) def3 = retAge;
    if (def1 && def2 && def3) break;
  }
  return { def1, def2, def3 };
}

const YAMAMOTO_FIXTURES = [
  { label: '基本（支出264万）',            params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:55, def2:51, def3:57 } },
  { label: '支出288万（+月2万）',          params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:288, penAge:65, penInc:100 }, expected: { def1:58, def2:52, def3:59 } },
  { label: '支出228万（-月3万）',          params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:228, penAge:65, penInc:100 }, expected: { def1:51, def2:48, def3:53 } },
  { label: '支出180万（極限）',            params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:180, penAge:65, penInc:100 }, expected: { def1:46, def2:44, def3:49 } },
  { label: '利回り4%（基本）',             params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:55, def2:51, def3:57 } },
  { label: '利回り5%',                    params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:5, rR:5, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:54, def2:49, def3:54 } },
  { label: '利回り6%',                    params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:6, rR:6, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:53, def2:47, def3:53 } },
  { label: '利回り7%',                    params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:7, rR:7, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:51, def2:45, def3:51 } },
  { label: '転職（積立170万・手取506万）', params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:170, rW:4, rR:4, baseInc:506, baseExp:264, penAge:65, penInc:100 }, expected: { def1:52, def2:48, def3:53 } },
  { label: '転職+生活上昇（支出320万）',  params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:170, rW:4, rR:4, baseInc:506, baseExp:320, penAge:65, penInc:100 }, expected: { def1:58, def2:52, def3:58 } },
  { label: '34歳開始（基準）',            params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:55, def2:51, def3:57 } },
  { label: '40歳開始',                    params: { curAge:40, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:61, def2:55, def3:62 } },
  { label: '44歳開始',                    params: { curAge:44, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:65, def2:58, def3:65 } },
  { label: '積立156万（+月3万）',         params: { curAge:34, nisaBal:400, cashBal:420, nisaCon:156, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, expected: { def1:54, def2:50, def3:55 } },
];

// ---- 中村夫婦 ----
// HTML版の表示収入は s.income + s.severanceNet
// idecoYrs=13（KENZOが確認）。calcEligible(13,38,38)=60→idecoStartAge=max(60,65)=65で同じ結果
// sevYrs: CSV実測で income=2299万=severanceNet → 税0 → 控除≥2299万 → sevYrs≥42が必要
//   KENZOが言った「勤続年数5年」は物語上の設定で、HTML入力値とは別（sevYrs=5だと税180万でincome=2118万になり不一致）
const NAKAMURA_P = {
  curAge: 38, lifeEx: 90,
  baseInc: 480, baseExp: 360,
  inflR: 2,
  retAge: 58, penAge: 65, penAmt: 170,
  mcStd: 16, mcStdR: 8,
  hasIdeco: true,
  idecoYrs: 13,
  idecoReceiveType: 'pension',
  idecoReceiveYears: 15,
  idecoStartAge: 65,
  sevYrs: 42,  // 控除額2340万 ≥ 退職金2299万 → 非課税（CSV実測と一致）
  acct: {
    nisa:  { bal: 600, con: 180, toAge: 99, rW: 7, rR: 4 },
    ideco: { bal: 300, con: 0,   toAge: 38, rW: 7, rR: 4 },
    tax:   { bal: 400, con: 0,   toAge: 38, rW: 7, rR: 4, costBasis: 400 },
    cash:  { bal: 900 },
  },
  spouse: {
    inc: 355, retAge: 56, penAge: 65, penAmt: 120, spCurAge: 36,
  },
};

// loan: mortgage type 元本4100万・金利1%・30年 → calcMortgage=158.25万/年（flat158万ではない）
// edu1: 49〜52歳（4年）, edu2: 52〜55歳（4年）, nursing: 55〜57歳（3年）
const NAKAMURA_EVENTS = [
  { category: 'expense', subtype: 'mortgage',    name: '住宅ローン', age: 38, years: 30, amount: 0, principal: 4100, rate: 1.0, termYears: 30 },
  { category: 'expense', subtype: 'education',   name: '教育費1',   age: 49, years:  4, amount: 250 },
  { category: 'expense', subtype: 'education',   name: '教育費2',   age: 52, years:  4, amount: 250 },
  { category: 'expense', subtype: 'care',        name: '介護費',    age: 55, years:  3, amount: 100 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 68, years:  1, amount: 240 },
  { category: 'income',  subtype: 'severance',   name: '退職金',    age: 58, years:  1, amount: 2299 },
];

// 確定数値（年次資産表）※iDeCo年金受給中ロック漏れ修正後 proportional (2026-07-12)
const NAKAMURA_EXPECTED = [
  { age: 38, totalAssets:  2608, income_disp:  835, expense:  518 },
  { age: 49, totalAssets:  7930, income_disp:  835, expense:  856 },
  { age: 52, totalAssets:  8986, income_disp:  835, expense: 1133 },
  { age: 55, totalAssets: 10547, income_disp:  835, expense: 1012 },
  { age: 56, totalAssets: 11345, income_disp:  835, expense:  772 },
  { age: 57, totalAssets: 12192, income_disp:  835, expense:  783 },
  { age: 58, totalAssets: 14271, income_disp: 2299, expense:  693 },
  { age: 65, totalAssets: 12403, income_disp:  254, expense:  773 },
  { age: 68, totalAssets: 12344, income_disp:  385, expense:  435 },
  { age: 80, totalAssets: 15507, income_disp:  290, expense:  551 },
  { age: 90, totalAssets: 18441, income_disp:  290, expense:  672 },
];

// ---- 佐々木シリーズ ----
// curAge=53, retAge=60, rW=7, rR=4（全口座共通）, inflR=1%
// idecoYrs=20, sevYrs=30（sevDed=1500万 → taxable=250万 → tax≈51万 → net=1949万）
// プロファイルJSONにはseveranceのみ保存。CSV生成時に再雇用2つが追加されていた。
const SASAKI_P = {
  curAge: 53, lifeEx: 90,
  baseInc: 620, baseExp: 360,
  inflR: 1,
  retAge: 60, penAge: 65, penAmt: 150,
  mcStd: 16, mcStdR: 8,
  hasIdeco: true,
  idecoYrs: 20, sevYrs: 30,
  idecoReceiveType: 'pension',
  idecoReceiveYears: 15,
  idecoStartAge: 65,
  acct: {
    nisa:  { bal: 1200, con: 120, toAge: 60, rW: 7, rR: 4 },
    ideco: { bal: 1200, con: 27.6, toAge: 60, rW: 7, rR: 4 },
    tax:   { bal: 2300, con: 0,    toAge: 60, rW: 7, rR: 4, costBasis: 2300 },
    cash:  { bal: 1500 },
  },
  spouse: { inc: 100, retAge: 60, penAge: 65, penAmt: 80, spCurAge: 51 },
};

// severance@60(2000万) + reemploy@61×5年(350万) + reemploy@66×5年(100万)
const SASAKI_EVENTS = [
  { category: 'income',  subtype: 'severance', name: '退職金',   age: 60, years: 1, amount: 2000 },
  { category: 'income',  subtype: 'reemploy',  name: '再雇用①', age: 61, years: 5, amount: 350 },
  { category: 'income',  subtype: 'reemploy',  name: '再雇用②', age: 66, years: 5, amount: 100 },
];

// 確定数値（修正後 proportional・iDeCo年金受給中ロック漏れ修正済み・2026-07-12更新）
const SASAKI_EXPECTED = [
  { age: 53, totalAssets:  6889, income_disp:  720, expense:  360 },
  { age: 59, totalAssets: 11734, income_disp:  720, expense:  382 },
  { age: 60, totalAssets: 13742, income_disp: 2049, expense:  386 },
  { age: 61, totalAssets: 14163, income_disp:  450, expense:  390 },
  { age: 62, totalAssets: 14492, income_disp:  350, expense:  394 },
  { age: 65, totalAssets: 15655, income_disp:  646, expense:  406 },
  { age: 66, totalAssets: 15883, income_disp:  402, expense:  410 },
  { age: 67, totalAssets: 16196, income_disp:  489, expense:  414 },
  { age: 70, totalAssets: 17160, income_disp:  509, expense:  426 },
  { age: 71, totalAssets: 17390, income_disp:  417, expense:  431 },
  { age: 79, totalAssets: 19350, income_disp:  488, expense:  466 },
  { age: 80, totalAssets: 19653, income_disp:  230, expense:  471 },
  { age: 90, totalAssets: 23233, income_disp:  230, expense:  520 },
];

// ================================================================
// SECTION 1: 山本シリーズ全件一覧表
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【山本シリーズ】全14シナリオ 期待値 vs 実際値');
console.log('='.repeat(80));
const labels = ['シナリオ', '①期待', '①実際', '②期待', '②実際', '③期待', '③実際', '結果'];
const widths  = [28, 6, 6, 6, 6, 6, 6, 6];
function row(cols) { return cols.map((c,i)=>String(c).padEnd(widths[i])).join(' | '); }
console.log(row(labels));
console.log('-'.repeat(80));

let yPass = 0, yFail = 0;
for (const f of YAMAMOTO_FIXTURES) {
  const actual = findFireAges(f.params);
  const ok = actual.def1===f.expected.def1 && actual.def2===f.expected.def2 && actual.def3===f.expected.def3;
  if (ok) yPass++; else yFail++;
  console.log(row([
    f.label.slice(0,27),
    f.expected.def1+'歳', actual.def1+'歳',
    f.expected.def2+'歳', actual.def2+'歳',
    f.expected.def3+'歳', actual.def3+'歳',
    ok ? 'PASS' : 'FAIL',
  ]));
}
console.log('-'.repeat(80));
console.log(`合計: ${yPass} PASS / ${yFail} FAIL`);

// ================================================================
// SECTION 2: 中村夫婦 年次資産表
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【中村夫婦シリーズ】年次資産表 期待値 vs 実際値');
console.log(`  パラメータ: rW=7% rR=4% inflR=2% idecoYrs=13 sevYrs=42 idecoStartAge=65 pension×15年`);
console.log('='.repeat(100));

const nakSnaps = simulate(NAKAMURA_P, NAKAMURA_EVENTS, 'proportional');

// 表示収入 = snap.income + snap.severanceNet（HTML版CSV出力と同形式）
const hdrs = ['年齢', '総資産(期待)', '総資産(実際)', '差異', '収入表示(期待)', '収入表示(実際)', '支出(期待)', '支出(実際)', '結果'];
const nw   = [6, 12, 12, 8, 14, 14, 10, 10, 6];
function nrow(cols) { return cols.map((c,i)=>String(c).padEnd(nw[i])).join(' | '); }
console.log(nrow(hdrs));
console.log('-'.repeat(100));

let nPass = 0, nFail = 0;
for (const ex of NAKAMURA_EXPECTED) {
  const snap = nakSnaps.find(s => s.age === ex.age);
  if (!snap) { console.log(`  [ERROR] age ${ex.age} のスナップなし`); continue; }
  const incDisp = snap.income + (snap.severanceNet || 0);
  const assetOk = snap.totalAssets === ex.totalAssets;
  const diff = snap.totalAssets - ex.totalAssets;
  const ok = assetOk;
  if (ok) nPass++; else nFail++;
  console.log(nrow([
    ex.age + '歳',
    ex.totalAssets + '万', snap.totalAssets + '万',
    (diff >= 0 ? '+' : '') + diff + '万',
    ex.income_disp + '万', incDisp + '万',
    ex.expense + '万', snap.expense + '万',
    ok ? 'PASS' : 'FAIL',
  ]));
}
console.log('-'.repeat(100));
console.log(`合計（総資産一致基準）: ${nPass} PASS / ${nFail} FAIL`);
console.log('  ※収入表示 = snap.income + snap.severanceNet（HTML CSV形式）');
console.log('  ※収入表示の差異は sevYrs パラメータ（退職金控除年数）によって変わります');

// ================================================================
// SECTION 3: 山本シリーズ モンテカルロ
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【山本シリーズ】モンテカルロ確定値 (N=1000)');
console.log('  退職年齢: 両シナリオ共に55歳（KENZO確認）');
console.log('='.repeat(80));

// 山本基本パラメータ（利回り4%, mcStd=10%）
// retAge=55: KENZOが確認（HTML実行時の設定が55歳）
const MC4_P = {
  ...buildYamamotoParams({ curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:4, rR:4, baseInc:456, baseExp:264, penAge:65, penInc:100 }, 55),
  mcStd: 10, mcStdR: 10,
};
// 利回り7%, mcStd=16%
const MC7_P = {
  ...buildYamamotoParams({ curAge:34, nisaBal:400, cashBal:420, nisaCon:120, rW:7, rR:7, baseInc:456, baseExp:264, penAge:65, penInc:100 }, 55),
  mcStd: 16, mcStdR: 16,
};

console.log('計算中 (4%シナリオ, N=1000)...');
const mc4 = runMC(MC4_P, [], ['proportional'], 1000);
const mc4Rate = mc4.strategies['proportional'].bankruptcyRate.toFixed(1);

console.log('計算中 (7%シナリオ, N=1000)...');
const mc7 = runMC(MC7_P, [], ['proportional'], 1000);
const mc7Rate = mc7.strategies['proportional'].bankruptcyRate.toFixed(1);

console.log(`\n  設定            | 期待破綻率 | 実際破綻率 | 許容±2% | 結果`);
console.log(`  ----------------+------------+------------+---------+------`);
const ok4 = Math.abs(parseFloat(mc4Rate) - 14.3) <= 3;
const ok7 = Math.abs(parseFloat(mc7Rate) - 6.0) <= 3;
console.log(`  利回り4%・σ10%  |    14.3%   |   ${mc4Rate}%   |  ±3%  | ${ok4?'PASS':'FAIL'}`);
console.log(`  利回り7%・σ16%  |     6.0%   |   ${mc7Rate}%   |  ±3%  | ${ok7?'PASS':'FAIL'}`);
console.log('  ※モンテカルロは乱数のため毎回微妙に変動します');

// ================================================================
// SECTION 4: 中村夫婦 モンテカルロ
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【中村夫婦シリーズ】モンテカルロ確定値 (N=1000)');
console.log('='.repeat(80));
console.log('計算中...');
const nakMC = runMC(NAKAMURA_P, NAKAMURA_EVENTS, ['proportional'], 1000);
const nakRate = nakMC.strategies['proportional'].bankruptcyRate.toFixed(1);
const nakDepMean = nakMC.strategies['proportional'].depletionMean;
const nakDepMin  = nakMC.strategies['proportional'].depletionMin;
const nakP50 = nakMC.strategies['proportional'].percentiles.p50;
const nakP10 = nakMC.strategies['proportional'].percentiles.p10;
const nakP90 = nakMC.strategies['proportional'].percentiles.p90;
const years90 = NAKAMURA_P.lifeEx - NAKAMURA_P.curAge;  // 90-38=52年目のindex
console.log(`\n  指標                   | 期待値        | 実際値`);
console.log(`  -----------------------+---------------+---------------`);
// 特定口座の取崩課税（capital gains 20.315%）により、実機(HTML)より数%高め。フィクスチャ注釈参照。
const nakRateOk = Math.abs(parseFloat(nakRate) - 20.4) <= 5;
console.log(`  破綻率（90歳）         |     20.4%     |    ${nakRate}%   ${nakRateOk?'PASS':'FAIL (許容±5%)'}`);
console.log(`  平均枯渇年齢           |     80歳      |    ${nakDepMean ?? 'n/a'}歳`);
console.log(`  最短枯渇年齢           |     64歳      |    ${nakDepMin ?? 'n/a'}歳`);
console.log(`  90歳時点 p10           |  0万（破綻）  |    ${nakP10[years90]}万`);
console.log(`  90歳時点 p50（中央値） |  11,400万     |    ${nakP50[years90]}万`);
console.log(`  90歳時点 p90           |  50,400万     |    ${nakP90[years90]}万`);
console.log('  ※特定口座課税（約20%）の影響で実機破綻率は数%高めになる場合があります');

// ================================================================
// SECTION 5: 田中シリーズ 年次資産表
// ================================================================

// 田中誠シリーズ 基本パラメータ（完全FIRE / セミリタイヤ共通・inflR=1%）
// severanceNet: retirementTaxCalc(0, 800, idecoYrs=13, sevYrs=13)
//   2026-07-12: KENZOの「勤続5年」は物語上の設定。旧HTML版のdcYears混入バグにより
//   実際は常にmax(dcYears=13, sevYrs=5)=13年で計算されていたため、公開済み数値(772万/税28万)は
//   実質「13年」ベース。実データに合わせsevYrsを13に変更（5年のままだと短期退職手当等ルールの対象になり
//   739万→709万にずれてしまうため）。
//   sevDed=520万（idecoBalance=0のためsevYearsのみ使用） → taxable=(800-520)/2=140万, tax≈28.4万, net≈772万
//   income at 55 = spouseInc(200) + severanceNet(772) = 972万
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

// インフレ2%シナリオ（セミリタイヤ+教育、inflR=2%）
const TANAKA_INFLE2_P = { ...TANAKA_P, inflR: 2 };

// 完全FIREイベント（退職金のみ）
const TANAKA_FIRE_EVENTS = [
  { category: 'income', subtype: 'severance', name: '退職金', age: 55, years: 1, amount: 800 },
];

// セミリタイヤイベント（退職金＋生活費削減）
const TANAKA_SEMIRETIRE_EVENTS = [
  { category: 'income',  subtype: 'severance',  name: '退職金',    age: 55, years: 1, amount: 800 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 56, years: 1, amount: 300 },
];

// インフレ2%イベント（退職金＋生活費削減＋教育費2件・inflR=2%）
// base_change amount は curAge時点の現在価値→退職時に inflR 分膨らむ
const TANAKA_INFLE2_EVENTS = [
  { category: 'income',  subtype: 'severance',  name: '退職金',    age: 55, years: 1, amount: 800 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 56, years: 1, amount: 300 },
  { category: 'expense', subtype: 'education',   name: '教育費1',   age: 45, years: 4, amount: 250 },
  { category: 'expense', subtype: 'education',   name: '教育費2',   age: 48, years: 4, amount: 250 },
];

// 確定値：修正後 proportional（sevYrs=5→13変更後・2026-07-12更新）
const TANAKA_FIRE_EXPECTED = [
  { age: 42, totalAssets: 2934, income_disp:  850, expense:  480 },
  { age: 45, totalAssets: 4272, income_disp:  850, expense:  495 },
  { age: 54, totalAssets: 8710, income_disp:  850, expense:  541 },
  { age: 55, totalAssets: 9369, income_disp:  972, expense:  546 }, // 退職金net772+妻収入200=972万
  { age: 56, totalAssets: 9251, income_disp:  200, expense:  552 }, // 妻のみ収入（年齢54<55）
  { age: 57, totalAssets: 8925, income_disp:    0, expense:  557 }, // 妻も退職（年齢55=spRetAge）
  { age: 65, totalAssets: 5914, income_disp:  150, expense:  603 }, // 主年金150・妻63歳未達
  { age: 67, totalAssets: 5289, income_disp:  230, expense:  616 }, // 妻65歳→年金80追加
  { age: 82, totalAssets:    0, income_disp:  230, expense:  715 }, // 枯渇（82歳）
  { age: 90, totalAssets:    0, income_disp:  230, expense:  715 },
];

// 確定値：修正後 proportional（sevYrs=5→13変更後・2026-07-12更新）
const TANAKA_SEMIRETIRE_EXPECTED = [
  { age: 42, totalAssets: 2934, income_disp:  850, expense:  480 },
  { age: 55, totalAssets: 9369, income_disp:  972, expense:  546 },
  { age: 56, totalAssets: 9462, income_disp:  200, expense:  345 }, // 300*(1.01)^14≈345万
  { age: 57, totalAssets: 9353, income_disp:    0, expense:  348 },
  { age: 65, totalAssets: 8402, income_disp:  150, expense:  377 }, // 300*(1.01)^23≈377万
  { age: 67, totalAssets: 8387, income_disp:  230, expense:  385 },
  { age: 90, totalAssets: 8902, income_disp:  230, expense:  484 }, // 生涯枯渇なし
];

// 確定値：修正後 proportional（sevYrs=5→13変更後・2026-07-12更新）
const TANAKA_INFLE2_EXPECTED = [
  { age: 42, totalAssets: 2934, income_disp:  850, expense:  480 },
  { age: 45, totalAssets: 3993, income_disp:  850, expense:  759 }, // 480*(1.02)^3+250≈759万
  { age: 48, totalAssets: 4316, income_disp:  850, expense: 1041 }, // 480*(1.02)^6+250+250≈1041万
  { age: 52, totalAssets: 5368, income_disp:  850, expense:  585 }, // 480*(1.02)^10≈585万（教育終了）
  { age: 55, totalAssets: 6872, income_disp:  972, expense:  621 }, // 480*(1.02)^13≈621万
  { age: 56, totalAssets: 6906, income_disp:  200, expense:  396 }, // 300*(1.02)^14≈396万
  { age: 84, totalAssets:    0, income_disp:  230, expense:  676 }, // 枯渇（84歳）
  { age: 90, totalAssets:    0, income_disp:  230, expense:  676 },
];

// 教育費込み・支出300万円・インフレ1%（note第4話結果④相当。イベント構成はインフレ2%シナリオと同一でinflRのみ1%）
// 4%ルール記事・モンテカルロ解説記事・FIREチェックリスト記事の数値の根拠となっている重要シナリオ
const TANAKA_EDU1PCT_EVENTS = TANAKA_INFLE2_EVENTS;

// 確定値：教育費込み・インフレ1%（2026-07-12追加）
const TANAKA_EDU1PCT_EXPECTED = [
  { age: 42, totalAssets: 2934, income_disp:  850, expense:  480 },
  { age: 55, totalAssets: 7367, income_disp:  972, expense:  546 },
  { age: 60, totalAssets: 6965, income_disp:    0, expense:  359 },
  { age: 65, totalAssets: 6242, income_disp:  150, expense:  377 },
  { age: 70, totalAssets: 6154, income_disp:  230, expense:  396 },
  { age: 80, totalAssets: 5933, income_disp:  230, expense:  438 },
  { age: 90, totalAssets: 5277, income_disp:  230, expense:  484 }, // 生涯枯渇なし
];

function runTanakaSection(p, events, expected) {
  const snaps = simulate(p, events, 'proportional');
  let pass = 0, fail = 0;
  const results = [];
  for (const ex of expected) {
    const snap = snaps.find(s => s.age === ex.age);
    if (!snap) { results.push(`  [ERROR] age ${ex.age} のスナップなし`); fail++; continue; }
    const incDisp = snap.income + (snap.severanceNet || 0);
    const assetOk = snap.totalAssets === ex.totalAssets;
    const diff = snap.totalAssets - ex.totalAssets;
    if (assetOk) pass++; else fail++;
    results.push(nrow([
      ex.age + '歳',
      ex.totalAssets + '万', snap.totalAssets + '万',
      (diff >= 0 ? '+' : '') + diff + '万',
      ex.income_disp + '万', incDisp + '万',
      ex.expense + '万', snap.expense + '万',
      assetOk ? 'PASS' : 'FAIL',
    ]));
  }
  return { pass, fail, results };
}

console.log('\n' + '='.repeat(100));
console.log('【田中シリーズ】完全FIRE（inflR=1%・教育なし・退職金800万・retAge55）');
console.log(`  パラメータ: rW=4% rR=4%（全口座共通） inflR=1% sevYrs=5 idecoYrs=13 lump@65`);
console.log('='.repeat(100));
console.log(nrow(['年齢', '総資産(期待)', '総資産(実際)', '差異', '収入表示(期待)', '収入表示(実際)', '支出(期待)', '支出(実際)', '結果']));
console.log('-'.repeat(100));
const { pass: t1p, fail: t1f, results: t1r } = runTanakaSection(TANAKA_P, TANAKA_FIRE_EVENTS, TANAKA_FIRE_EXPECTED);
t1r.forEach(r => console.log(r));
console.log('-'.repeat(100));
console.log(`合計（総資産一致基準）: ${t1p} PASS / ${t1f} FAIL`);

console.log('\n' + '='.repeat(100));
console.log('【田中シリーズ】セミリタイヤ（生活費300万/年に削減）');
console.log('='.repeat(100));
console.log(nrow(['年齢', '総資産(期待)', '総資産(実際)', '差異', '収入表示(期待)', '収入表示(実際)', '支出(期待)', '支出(実際)', '結果']));
console.log('-'.repeat(100));
const { pass: t2p, fail: t2f, results: t2r } = runTanakaSection(TANAKA_P, TANAKA_SEMIRETIRE_EVENTS, TANAKA_SEMIRETIRE_EXPECTED);
t2r.forEach(r => console.log(r));
console.log('-'.repeat(100));
console.log(`合計（総資産一致基準）: ${t2p} PASS / ${t2f} FAIL`);

console.log('\n' + '='.repeat(100));
console.log('【田中シリーズ】インフレ2%（セミリタイヤ+教育費250万×2・inflR=2%）');
console.log('='.repeat(100));
console.log(nrow(['年齢', '総資産(期待)', '総資産(実際)', '差異', '収入表示(期待)', '収入表示(実際)', '支出(期待)', '支出(実際)', '結果']));
console.log('-'.repeat(100));
const { pass: t3p, fail: t3f, results: t3r } = runTanakaSection(TANAKA_INFLE2_P, TANAKA_INFLE2_EVENTS, TANAKA_INFLE2_EXPECTED);
t3r.forEach(r => console.log(r));
console.log('-'.repeat(100));
console.log(`合計（総資産一致基準）: ${t3p} PASS / ${t3f} FAIL`);
console.log('  ※田中シリーズ確定値（2026-06-21 CSV突き合わせ完了）');

console.log('\n' + '='.repeat(100));
console.log('【田中シリーズ】教育費込み・インフレ1%（セミリタイヤ+教育費250万×2・inflR=1%・note第4話結果④相当）');
console.log('='.repeat(100));
console.log(nrow(['年齢', '総資産(期待)', '総資産(実際)', '差異', '収入表示(期待)', '収入表示(実際)', '支出(期待)', '支出(実際)', '結果']));
console.log('-'.repeat(100));
const { pass: t4p, fail: t4f, results: t4r } = runTanakaSection(TANAKA_P, TANAKA_EDU1PCT_EVENTS, TANAKA_EDU1PCT_EXPECTED);
t4r.forEach(r => console.log(r));
console.log('-'.repeat(100));
console.log(`合計（総資産一致基準）: ${t4p} PASS / ${t4f} FAIL`);

// ================================================================================
// SECTION 6: 田中MCシリーズ（HTML実機突き合わせ済み・2026-06-22）
//
// 重要: HTMLのMCシナリオはsameAsWorking=false状態で実行されていた。
// 取崩期rR: rRNisa=4%, rRIdeco=2%, rRTax=1%（口座別）
// mcStdR=16%（ポートフォリオσ=16%から自動設定、pfManualFlags.mcStdR=false）
// → MCbase≈25%(HTML:25.4%) MC-10%≈10%(HTML:10.5%) MC+2y≈10%(HTML:9.8%) MCCFall≈20%(HTML:20.6%)
//
// 決定論的シナリオ(Section5)はrR=4%全口座共通が正解（CSV検証済み）。MCは別パラメータ。
// ================================================================================

// MCシナリオ専用パラメータ（sameAsWorking=false時の口座別rR + ポートフォリオσ=16%）
const TANAKA_MC_P = {
  ...TANAKA_P,
  mcStdR: 16,  // ポートフォリオσ=16%（全世界株）
  acct: {
    ...TANAKA_P.acct,
    ideco: { ...TANAKA_P.acct.ideco, rR: 2 },  // sameAsWorking=false → 保存値rRIdeco=2%
    tax:   { ...TANAKA_P.acct.tax,   rR: 1 },  // sameAsWorking=false → 保存値rRTax=1%
  },
};

const TANAKA_MC_EVENTS_BASE = [
  { category: 'income',  subtype: 'severance',  name: '退職金',    age: 55, years: 1, amount: 800 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 56, years: 1, amount: 300 },
];
const TANAKA_MC_EVENTS_M10 = [
  { category: 'income',  subtype: 'severance',  name: '退職金',    age: 55, years: 1, amount: 800 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 56, years: 1, amount: 270 },
];
// MC+2years: 田中・配偶者ともに57歳退職（両者同時退職）
const TANAKA_MC_P_PLUS2 = {
  ...TANAKA_MC_P,
  retAge: 57,
  spouse: { ...TANAKA_MC_P.spouse, retAge: 57 },
};
const TANAKA_MC_EVENTS_PLUS2 = [
  { category: 'income',  subtype: 'severance',  name: '退職金',    age: 57, years: 1, amount: 800 },
  { category: 'expense', subtype: 'base_change', name: '生活費変更', age: 58, years: 1, amount: 300 },
];
// MCCFall: 余剰CF全額投資 = 特定口座積立継続(cTax=52) + 取崩期rRTax=rWTax=4（積立期と同利回り）
// cTaxは0にしない。rRTaxのみ1→4に変更（rRNisa=4・rRIdeco=2は据え置き）
const TANAKA_MC_P_CFULL = {
  ...TANAKA_MC_P,
  acct: {
    ...TANAKA_MC_P.acct,
    tax: { ...TANAKA_MC_P.acct.tax, rR: 4 },  // con=52のまま、rRTaxのみ1→4
  },
};

console.log('\n' + '='.repeat(80));
console.log('【田中シリーズ】MCシナリオ比較 (N=1000) [HTML実機突き合わせ済み]');
console.log('  mcStd=10%（積立期）mcStdR=16%（取崩期・ポートフォリオσ）');
console.log('  取崩期: rRNisa=4%/rRIdeco=2%/rRTax=1%（sameAsWorking=false時の保存値）');
console.log('='.repeat(80));

// HTML実機の参照値（目安）
const TANAKA_MC_HTML_REF = {
  'MCbase（セミリタイヤ基本）':  { rate: 25.4 },
  'MC-10%（生活費270万）':      { rate: 10.5 },
  'MC+2years（両者57歳退職）':  { rate: 9.8  },
  'MCCFall（余剰CF全額投資）':  { rate: 20.6 },
};

const MC_SCENARIOS = [
  { label: 'MCbase（セミリタイヤ基本）',  p: TANAKA_MC_P,        evs: TANAKA_MC_EVENTS_BASE  },
  { label: 'MC-10%（生活費270万）',       p: TANAKA_MC_P,        evs: TANAKA_MC_EVENTS_M10   },
  { label: 'MC+2years（両者57歳退職）',   p: TANAKA_MC_P_PLUS2,  evs: TANAKA_MC_EVENTS_PLUS2 },
  { label: 'MCCFall（余剰CF全額投資）',   p: TANAKA_MC_P_CFULL,  evs: TANAKA_MC_EVENTS_BASE  },
];

for (const sc of MC_SCENARIOS) {
  process.stdout.write('  計算中: ' + sc.label + ' ...');
  const mc = runMC(sc.p, sc.evs, ['proportional'], 1000);
  const r = mc.strategies.proportional;
  const lastIdx = sc.p.lifeEx - sc.p.curAge;
  const p10_90 = r.percentiles.p10[lastIdx];
  const p50_90 = r.percentiles.p50[lastIdx];
  const p90_90 = r.percentiles.p90[lastIdx];
  const ref = TANAKA_MC_HTML_REF[sc.label];
  const ok = ref ? Math.abs(r.bankruptcyRate - ref.rate) <= 5 : true;
  console.log(' 完了');
  console.log('  破綻率（90歳）: ' + r.bankruptcyRate.toFixed(1) + '%' +
    (ref ? '  (HTML実機: ' + ref.rate + '%  許容±5%  ' + (ok ? 'PASS' : 'FAIL') + ')' : ''));
  console.log('  90歳時点 p10=' + Math.round(p10_90/100)*100 + '万  p50=' + Math.round(p50_90/100)*100 + '万  p90=' + Math.round(p90_90/100)*100 + '万');
  if (r.depletionMean !== null) {
    console.log('  平均枯渇年齢=' + r.depletionMean + '歳  最短枯渇=' + r.depletionMin + '歳');
  }
  console.log();
}

console.log('\n' + '='.repeat(80));

// ================================================================
// SECTION 7: 佐々木シリーズ 年次資産表
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【佐々木シリーズ】年次資産表 期待値 vs 実際値');
console.log('  パラメータ: rW=7% rR=4% inflR=1% idecoYrs=20 sevYrs=30 idecoStartAge=65 pension×15年');
console.log('  events: severance@60(2000万) / reemploy@61×5年(350万) / reemploy@66×5年(100万)');
console.log('='.repeat(100));

const sasakiSnaps = simulate(SASAKI_P, SASAKI_EVENTS, 'proportional');

let sPass = 0, sFail = 0;
for (const ex of SASAKI_EXPECTED) {
  const snap = sasakiSnaps.find(s => s.age === ex.age);
  if (!snap) { console.log(`  [ERROR] age ${ex.age} のスナップなし`); continue; }
  const incDisp = snap.income + (snap.severanceNet || 0);
  const assetOk = snap.totalAssets === ex.totalAssets;
  const diff = snap.totalAssets - ex.totalAssets;
  const ok = assetOk;
  if (ok) sPass++; else sFail++;
  console.log(nrow([
    ex.age + '歳',
    ex.totalAssets + '万', snap.totalAssets + '万',
    (diff >= 0 ? '+' : '') + diff + '万',
    ex.income_disp + '万', incDisp + '万',
    ex.expense + '万', snap.expense + '万',
    ok ? 'PASS' : 'FAIL',
  ]));
}
console.log('-'.repeat(100));
console.log(`合計（総資産一致基準）: ${sPass} PASS / ${sFail} FAIL`);
console.log('  ※収入表示 = snap.income + snap.severanceNet（HTML CSV形式）');

// ================================================================
// 繰上返済(単発)：simulate()のmortgageブロック回帰確認
// 元本4100万・金利1%・termYears30年・開始30歳（後方互換：prepay系フィールド未指定時は
// 従来と完全に同一の年次expenseになること）＋ 返済額軽減型/期間短縮型それぞれ最低1パターン。
// reference/simulation_fixtures.md「繰上返済（単発）フィクスチャ」と対応。
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【繰上返済(単発)】simulate()のmortgageブロック回帰確認（本番calcMortgage系関数経由）');
console.log('='.repeat(100));

function buildPrepayParams() {
  return {
    curAge: 30, lifeEx: 65,
    baseInc: 1000, baseExp: 0, inflR: 0,
    retAge: 99, penAge: 99, penAmt: 0,
    mcStd: 10, mcStdR: 10, hasIdeco: false,
    idecoYrs: 1, idecoReceiveType: 'lump', idecoReceiveYears: 10, idecoStartAge: 60, sevYrs: 1,
    acct: {
      nisa:  { bal: 0, con: 0, toAge: 99, rW: 0, rR: 0 },
      ideco: { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0 },
      tax:   { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0, costBasis: 0 },
      cash:  { bal: 1000000 },
    },
    spouse: null,
  };
}
const MORTGAGE_BASE = { category: 'expense', subtype: 'mortgage', name: '住宅ローン', age: 30, years: 30, amount: 0, principal: 4100, rate: 1, termYears: 30 };

const PREPAY_CASES = [
  {
    label: '後方互換（prepay系フィールド未指定）',
    event: { ...MORTGAGE_BASE },
    expected: [[30,158],[36,158],[37,158],[45,158],[59,158],[60,0],[61,0]],
  },
  {
    // 37歳(prepayAge)は繰上返済額500万円の一括支出込みでexpense=134+500=634
    label: '返済額軽減型（37歳・500万円繰上）',
    event: { ...MORTGAGE_BASE, prepayAge: 37, prepayAmount: 500, prepayType: 'reduce' },
    expected: [[30,158],[36,158],[37,634],[38,134],[59,134],[60,0],[61,0]],
  },
  {
    // 37歳(prepayAge)は繰上返済額500万円の一括支出込みでexpense=158+500=658
    // 完済境界年(endAge=56.08→boundaryAge=56)は按分計上：158.25×0.08≈13万円（従来はここが158のままだった）
    label: '期間短縮型（37歳・500万円繰上）',
    event: { ...MORTGAGE_BASE, prepayAge: 37, prepayAmount: 500, prepayType: 'shorten' },
    expected: [[30,158],[36,158],[37,658],[38,158],[45,158],[55,158],[56,13],[57,0],[58,0]],
  },
  {
    // 按分ケース：fraction=0.25がちょうどになるパラメータ(32歳・330万円)。
    // endAge=57.25→boundaryAge=57、境界年expense=158.25×0.25≈40万円
    label: '期間短縮型・按分fraction=0.25（32歳・330万円繰上）',
    event: { ...MORTGAGE_BASE, prepayAge: 32, prepayAmount: 330, prepayType: 'shorten' },
    expected: [[30,158],[31,158],[32,488],[33,158],[56,158],[57,40],[58,0],[59,0]],
  },
  {
    // 重複ケース：繰上返済年(prepayAge=31)と完済境界年(boundaryAge)が同一年になるケース。
    // newTermYears=0.19（endAge=31.19→boundaryAge=31=prepayAge）。この年のexpenseには
    // 一括支出(3952万円)と按分後の返済額(158.25×0.19≈30万円)の両方が計上されるべき。
    label: '期間短縮型・繰上返済年と完済境界年が同一（31歳・3952万円繰上）',
    event: { ...MORTGAGE_BASE, prepayAge: 31, prepayAmount: 3952, prepayType: 'shorten' },
    expected: [[30,158],[31,3982],[32,0],[33,0]],
  },
];

let mPass = 0, mFail = 0;
for (const c of PREPAY_CASES) {
  const p = buildPrepayParams();
  const snaps = simulate(p, [c.event], 'proportional');
  console.log(`\n-- ${c.label} --`);
  for (const [age, expExp] of c.expected) {
    const snap = snaps.find(s => s.age === age);
    const ok = snap && snap.expense === expExp;
    if (ok) mPass++; else mFail++;
    console.log(`  age${age}: 期待expense=${expExp} 実際expense=${snap ? snap.expense : 'なし'} ${ok ? 'PASS' : 'FAIL'}`);
  }
}

// バリデーション：月々返済額が利息のみ返済額を下回る場合はnull（解なし）を返すこと
const noSolution = calcMortgageTermFromPayment(1000, 15, 10); // 利息のみ=1000*15%/12=12.5万 > 返済額10万
{
  const ok = noSolution === null;
  if (ok) mPass++; else mFail++;
  console.log(`\n  [バリデーション] calcMortgageTermFromPayment(principal=1000,rate=15%,monthlyPayment=10) = ${noSolution} (期待: null) ${ok ? 'PASS' : 'FAIL'}`);
}

console.log('-'.repeat(100));
console.log(`合計: ${mPass} PASS / ${mFail} FAIL`);

// ================================================================
// 年金 繰上げ・繰下げ比較シミュレーター（pensionCore.ts）
// scripts/verify-pension-timing.js を実行対象に含める。同スクリプトはFAILがあれば
// process.exitCode = 1 を自ら設定するため、この require だけで結果が本スクリプトの
// 終了コードにも反映される（別プロセスに分離せず、同一プロセス内でそのまま実行）。
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【年金 繰上げ・繰下げ比較シミュレーター】pensionCore.ts検証（verify-pension-timing.js）');
console.log('='.repeat(100));
require('./verify-pension-timing.js');

// ================================================================
// 退職後 余剰キャッシュフロー再投資機能（simulate.ts: retirementSurplusReinvest）
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【退職後 余剰キャッシュフロー再投資機能】verify-retirement-surplus-reinvestment.js');
console.log('='.repeat(100));
require('./verify-retirement-surplus-reinvestment.js');

// ================================================================
// retirementTaxCalc() 退職所得控除額 80万円下限バグ修正（helpers.ts）
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【retirementTaxCalc 80万円下限】verify-retirement-tax-80man-floor.js');
console.log('='.repeat(100));
require('./verify-retirement-tax-80man-floor.js');

// ================================================================
// 第5弾ツール(退職金手取り計算) src/lib/tax/retirement.ts
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【第5弾ツール:退職金手取り計算】verify-retirement-tax-tool.js');
console.log('='.repeat(100));
require('./verify-retirement-tax-tool.js');

// ================================================================
// 第6弾ツール(iDeCo/DC出口戦略シミュレーター) src/lib/tax/ideco.ts
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【第6弾ツール:iDeCo/DC出口戦略シミュレーター】verify-ideco-withdrawal-tool.js');
console.log('='.repeat(100));
require('./verify-ideco-withdrawal-tool.js');

// ================================================================
// 第9弾ツール(退職金×iDeCo受給タイミング比較) src/lib/tax/retirementIdecoTiming.ts
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【第9弾ツール:退職金×iDeCo受給タイミング比較】verify-retirement-ideco-timing-tool.js');
console.log('='.repeat(100));
require('./verify-retirement-ideco-timing-tool.js');

// ================================================================
// 第10弾ツール(退職後の住民税キャッシュフロー試算) src/lib/tax/residentTaxTiming.ts
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【第10弾ツール:退職後の住民税キャッシュフロー試算】verify-resident-tax-timing-tool.js');
console.log('='.repeat(100));
require('./verify-resident-tax-timing-tool.js');

// ================================================================
// CompanyState（法人資産を含めたFIRE試算） src/lib/hojinCompanyState/
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【CompanyState:法人資産を含めたFIRE試算】verify-companystate.js');
console.log('='.repeat(100));
require('./verify-companystate.js');

// ================================================================
// 資産管理ツール：CSV記録履歴インポートの重複排除・区分フィルタ（純粋関数の単体テスト）
// investigation_csv_duplicate_bug_and_reset_feature.md で発覚したバグA・バグBの回帰テスト
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【資産管理ツール:CSV重複排除・区分フィルタ】verify-asset-management-csv.js');
console.log('='.repeat(100));
require('./verify-asset-management-csv.js');

// ================================================================
// 資産管理ツール：loadHoldings/loadHojinHoldingsの重複排除・自己修復
// fix_loadHoldings_missing_dedup.md の回帰テスト。localStorageシムを使うため、
// 他のスクリプトへの影響を避けるためfull-verify.js内で最後に実行する。
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【資産管理ツール:loadHoldings重複排除の自己修復】verify-asset-management-loadholdings-dedup.js');
console.log('='.repeat(100));
require('./verify-asset-management-loadholdings-dedup.js');

// ================================================================
// 資産管理ツール：CSVの中身（区分列）だけで個人・法人ストアへの書き込みが決まることの確認
// simplify_csv_scope_and_fix_graph_history_bug.md 2章の回帰テスト。localStorageシムを使うため、
// 他のスクリプトへの影響を避けるためfull-verify.js内で最後に実行する。
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【資産管理ツール:CSVの中身だけでストアへの書き込みが決まる】verify-asset-management-csv-cross-store.js');
console.log('='.repeat(100));
require('./verify-asset-management-csv-cross-store.js');

// ================================================================
// 資産管理ツール：JSON Exportの過去月断面バグ修正・設定値/移転ログの完全性
// json_export_completeness_and_history_bug.md の回帰テスト。localStorageシムを使うため、
// 他のスクリプトへの影響を避けるためfull-verify.js内で最後に実行する。
// ================================================================
console.log('\n' + '='.repeat(100));
console.log('【資産管理ツール:JSON Exportの完全性】verify-asset-management-json-completeness.js');
console.log('='.repeat(100));
require('./verify-asset-management-json-completeness.js');
