/**
 * scripts/verify-companystate.js
 * CompanyState（法人資産を含めたFIRE試算、docs/fixes/active/2026-08-20_companystate-final-implementation.md）
 * の回帰確認。独自の再実装は行わず、src/lib/hojinCompanyState/配下の本番関数を直接importして検証する。
 *
 * 実行: node scripts/verify-companystate.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcMu, calcPortfolioMetrics, getEffectivePhaseMetrics, getEffectiveRetirementMu, getEffectiveRetirementSigma,
} = require('../src/lib/hojinCompanyState/portfolioMath');
const { simulateCorporateAssets } = require('../src/lib/hojinCompanyState/corporateGrowth');
const {
  buildCombinedSimulationInput, buildCorporateGeneratedEvents, buildCorporateGeneratedEventsFromSnaps,
} = require('../src/lib/hojinCompanyState/buildCombinedSimulationInput');
const { runCombinedSimulation, runCombinedMcForStrategy } = require('../src/lib/hojinCompanyState/mc');
const { useCompanyStateStore } = require('../src/lib/hojinCompanyState/companyStateStore');

let pass = 0, fail = 0;

function check(label, actual, expected, tolerance = 0.01) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    pass++;
    console.log(`[PASS] ${label} — actual=${actual} expected=${expected}`);
  } else {
    fail++;
    console.log(`[FAIL] ${label} — actual=${actual} expected=${expected} diff=${(actual - expected)}`);
  }
}

function checkEq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`[PASS] ${label}`);
  } else {
    fail++;
    console.log(`[FAIL] ${label} — actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
  }
}

function checkTrue(label, cond) {
  if (cond) { pass++; console.log(`[PASS] ${label}`); }
  else { fail++; console.log(`[FAIL] ${label}`); }
}

console.log('='.repeat(100));
console.log('portfolioMath.ts — calcMu/calcPortfolioMetrics（単一ポートフォリオ、LTCMA相関行列込み、変更なし）');
console.log('='.repeat(100));

{
  const { mu, sigma } = calcPortfolioMetrics([{ assetClass: '全世界株', pct: 100 }]);
  check('全世界株100% mu', mu, 6.83);
  check('全世界株100% sigma', sigma, 18.89);
}
{
  const rows = [{ assetClass: '全世界株', pct: 60 }, { assetClass: '日本債券', pct: 40 }];
  check('全世界株60%+日本債券40% mu', calcMu(rows), 4.954);
  check('全世界株60%+日本債券40% sigma', calcPortfolioMetrics(rows).sigma, 11.4993, 0.01);
}

console.log('\n' + '='.repeat(100));
console.log('portfolioMath.ts — getEffectivePhaseMetrics（μ・σ手入力トグルは独立フラグ、2026-08-21最終チェックリスト3番）');
console.log('='.repeat(100));

{
  // useManualMu/useManualSigma=false（未設定）: 資産クラス％配分から自動算出
  const auto = getEffectivePhaseMetrics({ rows: [{ assetClass: '全世界株', pct: 100 }] });
  check('未設定: 自動算出値を使う(mu)', auto.mu, 6.83);
  check('未設定: 自動算出値を使う(sigma)', auto.sigma, 18.89);
}
{
  // useManualMu/useManualSigma=true: rowsに何が入っていても手入力値を使う
  const manual = getEffectivePhaseMetrics({
    rows: [{ assetClass: '全世界株', pct: 100 }],
    useManualMu: true, manualMu: 3.3, useManualSigma: true, manualSigma: 12.5,
  });
  check('useManualMu/Sigma=true: 手入力値を使う(mu)', manual.mu, 3.3);
  check('useManualMu/Sigma=true: 手入力値を使う(sigma)', manual.sigma, 12.5);
}
{
  // useManualMu/useManualSigma=trueだがmanualMu/manualSigma未設定: 0にフォールバック（例外を投げない）
  const fallback = getEffectivePhaseMetrics({ rows: [{ assetClass: '全世界株', pct: 100 }], useManualMu: true, useManualSigma: true });
  check('値未設定: 0にフォールバック(mu)', fallback.mu, 0);
  check('値未設定: 0にフォールバック(sigma)', fallback.sigma, 0);
}
{
  // μ・σが独立に手入力/自動を切り替えられること（個人側pfManualFlags['rWNisa']/['mcStd']が
  // 完全に独立しているのと同じ設計）。μだけ手入力・σは自動のまま、という混在を確認する。
  const mixed = getEffectivePhaseMetrics({
    rows: [{ assetClass: '全世界株', pct: 100 }], useManualMu: true, manualMu: 3.3,
  });
  check('μのみ手入力・σは自動のまま(mu)', mixed.mu, 3.3);
  check('μのみ手入力・σは自動のまま(sigma)', mixed.sigma, 18.89);
}

console.log('\n' + '='.repeat(100));
console.log('portfolioMath.ts — getEffectiveRetirementMu/Sigma（rateSameAsWorking/sigmaSameAsWorkingは独立トグル）');
console.log('='.repeat(100));

{
  // 個人側profile.tsのgetEffectiveRR/getEffectiveMcStdRと同じ設計：％配分の同期
  // (retirementSameAsWorking)・利回りの同期(rateSameAsWorking)・標準偏差の同期
  // (sigmaSameAsWorking)は完全に独立した3つのトグル。
  // rateSameAsWorking=false・sigmaSameAsWorking=trueの混在（利回りだけ独立値、標準偏差は同期）
  const portfolio = {
    current: { rows: [] },
    working: { rows: [{ assetClass: '全世界株', pct: 100 }] }, // mu=6.83, sigma=18.89
    retirement: { rows: [], useManualMu: true, manualMu: 2.5 },
    retirementSameAsWorking: false,
    rateSameAsWorking: false,
    sigmaSameAsWorking: true,
  };
  const workingMu = 6.83, workingSigma = 18.89;
  check('rateSameAsWorking=false: 取崩期自身の手入力μ(2.5%)を使う', getEffectiveRetirementMu(portfolio, workingMu), 2.5);
  check('sigmaSameAsWorking=true: 積立期の実効σ(18.89%)をそのまま使う', getEffectiveRetirementSigma(portfolio, workingSigma), 18.89);
}
{
  // rateSameAsWorking=trueのときは取崩期自身の手入力フラグを一切見ない
  // （個人側「rateSameAsWorkingがONの場合、取崩期の実効利回りは積立期の値をそのままコピーする」と同じ）
  const portfolio = {
    current: { rows: [] },
    working: { rows: [] },
    retirement: { rows: [], useManualMu: true, manualMu: 99 }, // rateSameAsWorking=trueなら無視されるはず
    retirementSameAsWorking: false,
    rateSameAsWorking: true,
    sigmaSameAsWorking: false,
  };
  check('rateSameAsWorking=true: 取崩期自身の手入力値(99%)は無視し積立期の値を使う', getEffectiveRetirementMu(portfolio, 7), 7);
}

console.log('\n' + '='.repeat(100));
console.log('corporateGrowth.ts — simulateCorporateAssets（投資分/現金分の分離・retirementAge・不足時補填）');
console.log('='.repeat(100));

{
  // 手計算（最終版指示書3.2節の算出順序）:
  // settings: investedBalance=1000, cashBalance=500, retirementAge=41
  // working PF: 全世界株100%(mu=6.83) / retirement PF: 日本債券100%(mu=2.14)
  // events: business_profit@40(3年・100万), withdrawal@41(1年・50万)
  // age40(working, Z=0): invested=1000*1.0683=1068.3 / cash=500+100=600
  // age41(retirement):   invested=1068.3*1.0214=1091.16162 / cash=600+100-50=650
  // age42(retirement):   invested=1091.16162*1.0214=1114.5124787 / cash=650+100=750
  const settings = { effectiveTaxRate: 0, investedBalance: 1000, cashBalance: 500, retirementAge: 41, includeInPersonalSimulator: true };
  const portfolio = {
    current: { rows: [] },
    working: { rows: [{ assetClass: '全世界株', pct: 100 }] },
    retirement: { rows: [{ assetClass: '日本債券', pct: 100 }] },
    retirementSameAsWorking: false,
  };
  const events = [
    { id: 'p1', kind: 'business_profit', label: '', startAge: 40, years: 3, amount: 100 },
    { id: 'w1', kind: 'withdrawal',      label: '', startAge: 41, years: 1, amount: 50 },
  ];
  const snaps = simulateCorporateAssets(settings, 40, 42, portfolio, events, null);
  check('age40 investedBalance', snaps.find(s => s.age === 40).investedBalance, 1068, 0.5);
  check('age40 cashBalance',     snaps.find(s => s.age === 40).cashBalance, 600, 0.5);
  check('age41 investedBalance', snaps.find(s => s.age === 41).investedBalance, 1091, 0.5);
  check('age41 cashBalance',     snaps.find(s => s.age === 41).cashBalance, 650, 0.5);
  check('age42 investedBalance', snaps.find(s => s.age === 42).investedBalance, 1115, 0.5);
  check('age42 cashBalance',     snaps.find(s => s.age === 42).cashBalance, 750, 0.5);
  check('age42 total = invested+cash', snaps.find(s => s.age === 42).total, 1115 + 750, 0.5);
}

{
  // 現金不足時はinvestedBalanceから補填し、0円が下限（エラーを出さない）
  const settings = { effectiveTaxRate: 0, investedBalance: 100, cashBalance: 10, retirementAge: 60, includeInPersonalSimulator: true };
  const portfolio = { current: { rows: [] }, working: { rows: [] }, retirement: { rows: [] }, retirementSameAsWorking: true };
  const events = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 1, amount: 50 }];
  // mu=0(空PF)のため投資分は成長せずそのまま100 → cash: 10-50=-40 → 補填: invested=100-40=60, cash=0
  const snaps = simulateCorporateAssets(settings, 50, 50, portfolio, events, null);
  check('現金不足時 investedBalance(補填後)', snaps[0].investedBalance, 60, 0.5);
  check('現金不足時 cashBalance(下限0円)', snaps[0].cashBalance, 0, 0.5);
}

{
  // 2026-08-23バグ修正の回帰テスト：残高（現金+投資）を上回る取崩要求は「その時点の残高まで」に
  // 制限され、超過分は切り捨てられる（エラーは出さない）。かつ残高自体は0円を下限に張り付く
  // （マイナスにならない）。
  const settings = { effectiveTaxRate: 0, investedBalance: 30, cashBalance: 20, retirementAge: 60, includeInPersonalSimulator: true };
  const portfolio = { current: { rows: [] }, working: { rows: [] }, retirement: { rows: [] }, retirementSameAsWorking: true, rateSameAsWorking: true, sigmaSameAsWorking: true };
  // 残高合計50円に対し、要求額200円の取崩イベント（mu=0のPFのため投資分は成長しない）
  const events = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 3, amount: 200 }];
  const snaps = simulateCorporateAssets(settings, 50, 52, portfolio, events, null);
  check('残高不足の取崩: 1年目に実際に取り崩されるのは残高上限の50円まで(要求額200円ではない)', snaps[0].withdrawal, 50, 0.5);
  check('残高不足の取崩: 1年目のinvestedBalanceは0円が下限', snaps[0].investedBalance, 0, 0.5);
  check('残高不足の取崩: 1年目のcashBalanceは0円が下限', snaps[0].cashBalance, 0, 0.5);
  check('残高不足の取崩: 2年目は残高が既に0円のため実際の取崩額も0円', snaps[1].withdrawal, 0, 0.5);
  check('残高不足の取崩: 3年目も同様に0円', snaps[2].withdrawal, 0, 0.5);
  checkTrue('残高不足の取崩: 全年でinvestedBalance/cashBalance/totalが負にならない', snaps.every(s => s.investedBalance >= 0 && s.cashBalance >= 0 && s.total >= 0));
}

{
  // 残高が「取崩期間の途中」で枯渇するケース：前半年は要求額どおり取り崩せるが、
  // 枯渇後の年は0円（または残額のみ）に減額される。
  const settings = { effectiveTaxRate: 0, investedBalance: 0, cashBalance: 150, retirementAge: 60, includeInPersonalSimulator: true };
  const portfolio = { current: { rows: [] }, working: { rows: [] }, retirement: { rows: [] }, retirementSameAsWorking: true, rateSameAsWorking: true, sigmaSameAsWorking: true };
  const events = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 4, amount: 50 }];
  const snaps = simulateCorporateAssets(settings, 50, 53, portfolio, events, null);
  check('途中枯渇: 1年目(残高150→100)は要求額どおり50円取り崩せる', snaps[0].withdrawal, 50, 0.5);
  check('途中枯渇: 2年目(残高100→50)も要求額どおり50円', snaps[1].withdrawal, 50, 0.5);
  check('途中枯渇: 3年目(残高50→0)も要求額どおり50円(ちょうど使い切る)', snaps[2].withdrawal, 50, 0.5);
  check('途中枯渇: 4年目は残高が既に0円のため実際の取崩額は0円(要求額50円は無視される)', snaps[3].withdrawal, 0, 0.5);
}

{
  // simulateCorporateAssets自体がuseManualMuを実際に反映していることをend-to-endで確認する
  // （portfolioMath.tsの単体テストとは別に、corporateGrowth.ts側の配線も確認）。
  // working: 手入力mu=10%・rows(全世界株100%=mu6.83%)は無視されるはず
  const settings = { effectiveTaxRate: 0, investedBalance: 1000, cashBalance: 0, retirementAge: 100, includeInPersonalSimulator: true };
  const portfolio = {
    current: { rows: [] },
    working: { rows: [{ assetClass: '全世界株', pct: 100 }], useManualMu: true, manualMu: 10 },
    retirement: { rows: [] },
    retirementSameAsWorking: true, rateSameAsWorking: true, sigmaSameAsWorking: true,
  };
  // retirementAge=100のため生涯working PFのまま。Z=0でmu=10%固定なら1年目は1000*1.10=1100
  const snaps = simulateCorporateAssets(settings, 40, 40, portfolio, [], null);
  check('working.useManualMu=true: rowsのmu(6.83%)ではなくmanualMu(10%)が使われる', snaps[0].investedBalance, 1100, 0.5);
}

{
  // 「利回りは積立期と同じ」ON時、積立期がuseManualMuならその手入力値がそのままコピーされる
  // （個人側SimulatorForm.tsxのrateSameAsWorking/getEffectiveRRと同じ考え方）。
  const settings = { effectiveTaxRate: 0, investedBalance: 1000, cashBalance: 0, retirementAge: 40, includeInPersonalSimulator: true };
  const portfolio = {
    current: { rows: [] },
    working: { rows: [], useManualMu: true, manualMu: 8 },
    retirement: { rows: [{ assetClass: '全世界株', pct: 100 }] }, // rateSameAsWorking=trueなら無視されるはず
    retirementSameAsWorking: true, rateSameAsWorking: true, sigmaSameAsWorking: true,
  };
  const snaps = simulateCorporateAssets(settings, 40, 40, portfolio, [], null);
  check('rateSameAsWorking=true: 積立期の手入力値(8%)がそのままコピーされる', snaps[0].investedBalance, 1080, 0.5);
}

{
  // rateSameAsWorking=falseかつsigmaSameAsWorking=trueの混在をsimulateCorporateAssetsの
  // 実際の成長計算でend-to-end確認する（μは取崩期自身の値、σは積立期の値をミラー）。
  // working: rows=全世界株100%(mu=6.83, sigma=18.89) / retirement: 手入力mu=2%（独立値）
  // retirementAge=40のため1年目からretirement扱い。mu=2%固定・shock=0なら1000*1.02=1020。
  const settings = { effectiveTaxRate: 0, investedBalance: 1000, cashBalance: 0, retirementAge: 40, includeInPersonalSimulator: true };
  const portfolio = {
    current: { rows: [] },
    working: { rows: [{ assetClass: '全世界株', pct: 100 }] },
    retirement: { rows: [], useManualMu: true, manualMu: 2 },
    retirementSameAsWorking: false, rateSameAsWorking: false, sigmaSameAsWorking: true,
  };
  const snaps = simulateCorporateAssets(settings, 40, 40, portfolio, [], null);
  check('rateSameAsWorking=false: 取崩期自身の手入力μ(2%)が使われる(σは同期でも計算結果には影響しない)', snaps[0].investedBalance, 1020, 0.5);
}

console.log('\n' + '='.repeat(100));
console.log('buildCombinedSimulationInput.ts — 取崩→個人化変換（税引き後other_incイベント生成）');
console.log('='.repeat(100));

{
  // buildCorporateGeneratedEvents/buildCombinedSimulationInput（要求額をそのまま使う静的変換、
  // 現在は本番コードから直接は呼ばれていないが関数自体・テストは維持）は変更なし。
  const corporateEvents = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 5, amount: 200 }];
  checkEq('buildCorporateGeneratedEvents: 単一withdrawal→単一other_inc', buildCorporateGeneratedEvents(corporateEvents, 25), [
    { category: 'income', subtype: 'other_inc', name: '法人取崩（自動生成）', age: 50, years: 5, amount: 150 },
  ]);
  const personalEvents = [{ category: 'income', subtype: 'sidejob', name: '副業', age: 45, years: 2, amount: 30 }];
  checkEq('buildCombinedSimulationInput: 個人側イベント+法人生成イベントの結合', buildCombinedSimulationInput(personalEvents, corporateEvents, 25), [
    { category: 'income', subtype: 'sidejob', name: '副業', age: 45, years: 2, amount: 30 },
    { category: 'income', subtype: 'other_inc', name: '法人取崩（自動生成）', age: 50, years: 5, amount: 150 },
  ]);
}

{
  // 2026-08-23新規：buildCorporateGeneratedEventsFromSnaps（実際のシミュレーション結果ベース）。
  // 残高不足で減額された年のsnap.withdrawalが正しく個人側イベントに反映されることを確認する
  // （snap.withdrawal=0の年はイベント自体を生成しない＝個人側への収入注入が止まる）。
  const corporateSnaps = [
    { age: 50, investedBalance: 100, cashBalance: 0, total: 100, businessProfit: 0, withdrawal: 50 },
    { age: 51, investedBalance: 50, cashBalance: 0, total: 50, businessProfit: 0, withdrawal: 50 },
    { age: 52, investedBalance: 0, cashBalance: 0, total: 0, businessProfit: 0, withdrawal: 0 }, // 枯渇後：実際の取崩は0
    { age: 53, investedBalance: 0, cashBalance: 0, total: 0, businessProfit: 0, withdrawal: 0 },
  ];
  checkEq(
    'buildCorporateGeneratedEventsFromSnaps: 枯渇後(withdrawal=0)の年はイベントに含まれない',
    buildCorporateGeneratedEventsFromSnaps(corporateSnaps, 25),
    [{ category: 'income', subtype: 'other_inc', name: '法人取崩（自動生成）', age: 50, years: 2, amount: 37.5 }],
  );
}

console.log('\n' + '='.repeat(100));
console.log('mc.ts — runCombinedSimulation（固定計算モード）: simulate()/analyze()への実際の接続確認');
console.log('='.repeat(100));

const P = {
  curAge: 45, lifeEx: 60,
  baseInc: 500, baseExp: 300,
  inflR: 0,
  retAge: 65, penAge: 65, penAmt: 0,
  mcStd: 10, mcStdR: 10,
  hasIdeco: false,
  idecoYrs: 1, idecoReceiveType: 'lump',
  idecoReceiveYears: 10, idecoStartAge: 60,
  sevYrs: 1,
  acct: {
    nisa:  { bal: 0, con: 0, toAge: 99, rW: 0, rR: 0 },
    ideco: { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0 },
    tax:   { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0, costBasis: 0 },
    cash:  { bal: 1000 },
  },
  spouse: null,
};
const EMPTY_CORP_SETTINGS = { effectiveTaxRate: 0, investedBalance: 0, cashBalance: 0, retirementAge: 65, includeInPersonalSimulator: true };
const EMPTY_CORP_PORTFOLIO = {
  current: { rows: [] }, working: { rows: [] }, retirement: { rows: [] },
  retirementSameAsWorking: true, rateSameAsWorking: true, sigmaSameAsWorking: true,
};

{
  // 指示書7章由来の手動シナリオ: 法人取崩200万円/年・実効税率25% → 個人年次収入+150万円
  // （法人残高を十分に用意し、要求額どおり全額取り崩せるケース。2026-08-23：取崩の実額
  // キャップ機能追加に伴い、残高0円のEMPTY_CORP_SETTINGSのままでは要求額どおりに取り崩せなく
  // なった＝このテストの前提が崩れたため、残高を用意する形に修正した）。
  const corporateEvents = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 5, amount: 200 }];
  const corporateSettings = { ...EMPTY_CORP_SETTINGS, effectiveTaxRate: 25, investedBalance: 2000 };
  const baseline = runCombinedSimulation(P, [], 'proportional', EMPTY_CORP_SETTINGS, EMPTY_CORP_PORTFOLIO, [], 'fixed');
  const combined = runCombinedSimulation(P, [], 'proportional', corporateSettings, EMPTY_CORP_PORTFOLIO, corporateEvents, 'fixed');

  const baseAt50 = baseline.personalSnaps.find(s => s.age === 50).income;
  const combAt50 = combined.personalSnaps.find(s => s.age === 50).income;
  check('固定計算: age50 income diff = 法人取崩200万×(1-25%)=150万', combAt50 - baseAt50, 150);

  const baseAt49 = baseline.personalSnaps.find(s => s.age === 49).income;
  const combAt49 = combined.personalSnaps.find(s => s.age === 49).income;
  check('固定計算: 取崩期間外(age49)は差分なし', combAt49 - baseAt49, 0);

  checkTrue('固定計算: corporateSnapsがcurAge〜lifeExの全年齢ぶん返る', combined.corporateSnaps.length === P.lifeEx - P.curAge + 1);
}

{
  // 2026-08-23バグ修正の統合テスト（指示書1番の確認事項4）：法人残高が0円で頭打ちになった年
  // 以降、個人側への収入注入が正しく止まることを固定計算モードでend-to-end確認する。
  // 法人残高100円・要求額200円/年の取崩を3年設定 → 1年目のみ実際に取り崩せる(100円)。
  const corporateEvents = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 3, amount: 200 }];
  const corporateSettings = { ...EMPTY_CORP_SETTINGS, effectiveTaxRate: 0, investedBalance: 100 };
  const baseline = runCombinedSimulation(P, [], 'proportional', EMPTY_CORP_SETTINGS, EMPTY_CORP_PORTFOLIO, [], 'fixed');
  const combined = runCombinedSimulation(P, [], 'proportional', corporateSettings, EMPTY_CORP_PORTFOLIO, corporateEvents, 'fixed');

  const diffAt50 = combined.personalSnaps.find(s => s.age === 50).income - baseline.personalSnaps.find(s => s.age === 50).income;
  const diffAt51 = combined.personalSnaps.find(s => s.age === 51).income - baseline.personalSnaps.find(s => s.age === 51).income;
  const diffAt52 = combined.personalSnaps.find(s => s.age === 52).income - baseline.personalSnaps.find(s => s.age === 52).income;
  check('枯渇後の収入停止(1年目): 法人残高100円が全額取り崩され個人収入+100円', diffAt50, 100);
  check('枯渇後の収入停止(2年目): 法人残高は既に0円のため個人収入への注入は0円(要求額200円は無視)', diffAt51, 0);
  check('枯渇後の収入停止(3年目): 同様に0円のまま', diffAt52, 0);
}

console.log('\n' + '='.repeat(100));
console.log('mc.ts — runCombinedSimulation（MCモード）: zMatrix長の妥当性・NaN汚染がないことの確認');
console.log('='.repeat(100));

{
  // 調査(2026-08-20 mc-ui-investigation)で判明した「shockZOverridesの配列長が対象年数と
  // 一致しないとNaNが静かに伝播する」リスクへの対策確認。zMatrix自体はmc.ts内部の値のため
  // 直接は参照できないが、配列長が誤っていれば必ずpersonalOnly/combinedの percentiles に
  // NaNが混入するため、全パーセンタイル値が有限数であることを間接的な妥当性確認とする。
  const corporateEvents = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 5, amount: 200 }];
  const corporateSettings = { ...EMPTY_CORP_SETTINGS, effectiveTaxRate: 25 };
  const portfolio = { current: { rows: [] }, working: { rows: [{ assetClass: '全世界株', pct: 100 }] }, retirement: { rows: [{ assetClass: '日本債券', pct: 100 }] }, retirementSameAsWorking: false };
  const result = runCombinedSimulation(P, [], 'proportional', corporateSettings, portfolio, corporateEvents, 'mc', 50);

  const STRATEGIES = ['proportional', 'cash_first', 'taxable_first'];
  const years = P.lifeEx - P.curAge + 1;

  const allValues = [];
  for (const st of STRATEGIES) {
    checkTrue(`MC: personalOnly.${st}.percentiles.p50の長さが対象年数と一致`, result.personalOnly[st].percentiles.p50.length === years);
    checkTrue(`MC: combined.${st}.percentiles.p50の長さが対象年数と一致`, result.combined[st].percentiles.p50.length === years);
    allValues.push(
      ...result.personalOnly[st].percentiles.p10, ...result.personalOnly[st].percentiles.p50, ...result.personalOnly[st].percentiles.p90,
      ...result.combined[st].percentiles.p10, ...result.combined[st].percentiles.p50, ...result.combined[st].percentiles.p90,
    );
    checkTrue(`MC: personalOnly.${st}.bankruptcyRateが有限数`, Number.isFinite(result.personalOnly[st].bankruptcyRate));
    checkTrue(`MC: combined.${st}.bankruptcyRateが有限数`, Number.isFinite(result.combined[st].bankruptcyRate));
  }
  checkTrue('MC: 全戦略・全パーセンタイル値が有限数（NaN汚染なし＝zMatrix長が正しい証跡）', allValues.every(v => Number.isFinite(v)));
  checkTrue('MC: trials=50が反映される', result.trials === 50);
}

console.log('\n' + '='.repeat(100));
console.log('mc.ts — MCモードは3戦略それぞれ独立に計算する（複製による誤表示の回帰確認）');
console.log('='.repeat(100));

{
  // NISA・特定口座(含み益あり)・現金の3口座を持たせ、退職後の取崩順序（比例/現金優先/課税優先）で
  // 税負担のタイミングが変わる条件を作る。全試行が枯渇しきる極端な設定は避け（p50最終値が
  // どの戦略も0円に張り付いて差が見えなくなるため）、退職10年後时点のp50・破綻率で
  // 3戦略が実装上も独立に計算されていること（1戦略の複製でないこと）を確認する。
  const P2 = {
    ...P,
    retAge: 50, curAge: 40, lifeEx: 90,
    baseInc: 500, baseExp: 350,
    acct: {
      nisa:  { bal: 2000, con: 100, toAge: 50, rW: 5, rR: 3 },
      ideco: { bal: 0, con: 0, toAge: 50, rW: 0, rR: 0 },
      tax:   { bal: 1000, con: 0, toAge: 50, rW: 5, rR: 3, costBasis: 200 },
      cash:  { bal: 500 },
    },
  };
  const result = runCombinedSimulation(P2, [], 'proportional', EMPTY_CORP_SETTINGS, EMPTY_CORP_PORTFOLIO, [], 'mc', 300);
  const idx10y = 10 + (P2.retAge - P2.curAge); // 退職10年後(age=60)のインデックス
  const p50At = st => result.personalOnly[st].percentiles.p50[idx10y];
  const brOf = st => result.personalOnly[st].bankruptcyRate;
  const allP50Same = p50At('proportional') === p50At('cash_first') && p50At('cash_first') === p50At('taxable_first');
  const allBrSame = brOf('proportional') === brOf('cash_first') && brOf('cash_first') === brOf('taxable_first');
  checkTrue(
    '3戦略の値が単純複製ではない(age60時点p50または破綻率のいずれかで戦略間差がある)',
    !allP50Same || !allBrSame,
  );
  console.log(`  参考値(age60 p50): proportional=${p50At('proportional')} / cash_first=${p50At('cash_first')} / taxable_first=${p50At('taxable_first')}`);
  console.log(`  参考値(破綻率%): proportional=${brOf('proportional').toFixed(1)} / cash_first=${brOf('cash_first').toFixed(1)} / taxable_first=${brOf('taxable_first').toFixed(1)}`);
}

console.log('\n' + '='.repeat(100));
console.log('mc.ts — runCombinedMcForStrategy（ImpactTable.tsx向け軽量・単一戦略版）');
console.log('='.repeat(100));

{
  // 3戦略版と同じ試行ロジック（runMcTrialsForStrategies）を共有しているため、形・妥当性を確認する。
  const corporateEvents = [{ id: 'w1', kind: 'withdrawal', label: '', startAge: 50, years: 5, amount: 200 }];
  const corporateSettings = { ...EMPTY_CORP_SETTINGS, effectiveTaxRate: 25 };
  const portfolio = { current: { rows: [] }, working: { rows: [{ assetClass: '全世界株', pct: 100 }] }, retirement: { rows: [{ assetClass: '日本債券', pct: 100 }] }, retirementSameAsWorking: false };
  const single = runCombinedMcForStrategy(P, [], 'proportional', corporateSettings, portfolio, corporateEvents, 100);

  checkTrue('単一戦略版: trials=100が反映される', single.trials === 100);
  const years = P.lifeEx - P.curAge + 1;
  checkTrue('単一戦略版: personalOnly.percentiles.p50の長さが対象年数と一致', single.personalOnly.percentiles.p50.length === years);
  checkTrue('単一戦略版: combined.percentiles.p50の長さが対象年数と一致', single.combined.percentiles.p50.length === years);
  const allValues = [
    ...single.personalOnly.percentiles.p10, ...single.personalOnly.percentiles.p50, ...single.personalOnly.percentiles.p90,
    ...single.combined.percentiles.p10, ...single.combined.percentiles.p50, ...single.combined.percentiles.p90,
  ];
  checkTrue('単一戦略版: 全パーセンタイル値が有限数（NaN汚染なし）', allValues.every(v => Number.isFinite(v)));
  checkTrue('単一戦略版: personalOnly.bankruptcyRateが有限数', Number.isFinite(single.personalOnly.bankruptcyRate));
  checkTrue('単一戦略版: combined.bankruptcyRateが有限数', Number.isFinite(single.combined.bankruptcyRate));
  // 戻り値の形が{trials, personalOnly:{...}, combined:{...}}のフラットな1戦略ぶんであること
  // （3戦略版のRecord<WithdrawalStrategy,...>形式と混同していないか）
  checkTrue('単一戦略版: personalOnlyが戦略名キーを持たない単一オブジェクト形式', typeof single.personalOnly.bankruptcyRate === 'number');
}

console.log('\n' + '='.repeat(100));
console.log('mc.ts — 法人に取崩イベントがない場合、合算破綻率は厳密に0%になる（丸めではない）');
console.log('='.repeat(100));

{
  // 2026-08-22調査: 法人資産に取崩イベントが1件もない場合、法人残高は複利で増える一方
  // （支出で削られることがない）ため、個人が枯渇した試行でも法人残高は0にならず、
  // 「個人+法人が同時に0円」という合算破綻条件を満たす試行が実質発生しない。
  // これはバグではなく、法人側に取崩を設定していない入力に対する計算上正しい結果であることを
  // 回帰テストとして固定する（trials=1000で厳密に0/1000=0.0%になることを確認）。
  const corporateSettings = { ...EMPTY_CORP_SETTINGS, investedBalance: 1000, retirementAge: 65 };
  const portfolio = { current: { rows: [] }, working: { rows: [{ assetClass: '全世界株', pct: 100 }] }, retirement: { rows: [{ assetClass: '日本債券', pct: 100 }] }, retirementSameAsWorking: false };
  const noWithdrawalEvents = [];
  const result = runCombinedSimulation(P, [], 'proportional', corporateSettings, portfolio, noWithdrawalEvents, 'mc', 1000);
  checkTrue(
    '法人取崩イベント0件・法人資産十分な場合、個人が枯渇してもcombined破綻率は厳密に0',
    result.combined.proportional.bankruptcyRate === 0,
  );
}

console.log('\n' + '='.repeat(100));
console.log('ImpactTable.tsx向け — personalOnly側は法人取崩イベント0件でも施策間で有意に異なる');
console.log('='.repeat(100));

{
  // UI仕上げ指示書4章の再検証：ImpactTable.tsxの「破綻率変化」主表示をpersonalOnly側に
  // 修正した後も、以前combined側で見られた「3施策すべて+0.0%」現象がpersonalOnly側でも
  // 起きないかを確認する。法人取崩イベント0件（combinedは前述の通り常に0%になる条件）でも、
  // personalOnly側は個人の支出・積立変更の影響をそのまま受けるため、有意に異なる値になるはず。
  //
  // 注：ここでは上記で使っている共通のP（curAge45〜lifeEx60、retAge65）は使わない。
  // Pは生涯ずっと退職前（curAge<retAge）のまま終わるプロファイルのため、資産変動がある
  // 口座残高が常に0でMC自体が完全に決定論的になり、破綻率が0%/100%で固定されてしまい
  // 「支出10%削減」の効果を検証する題材として不適切なため、実際に取崩期に入るプロファイルを
  // 別途用意する。
  const P3 = {
    curAge: 35, lifeEx: 90, baseInc: 500, baseExp: 300, inflR: 2,
    retAge: 60, penAge: 65, penAmt: 150, mcStd: 16, mcStdR: 10,
    hasIdeco: false, idecoYrs: 0, idecoReceiveType: 'lump', idecoReceiveYears: 10, idecoStartAge: 60, idecoSplitRatio: 50,
    sevYrs: 20,
    acct: {
      nisa:  { bal: 200, con: 72, toAge: 60, rW: 7, rR: 4 },
      ideco: { bal: 0, con: 0, toAge: 60, rW: 4, rR: 2 },
      tax:   { bal: 0, con: 0, toAge: 60, rW: 2, rR: 1, costBasis: 0 },
      cash:  { bal: 300 },
    },
    spouse: null,
  };
  const corporateSettings = { ...EMPTY_CORP_SETTINGS, investedBalance: 1000, retirementAge: 65 };
  const corporatePortfolio = { current: { rows: [] }, working: { rows: [] }, retirement: { rows: [] }, retirementSameAsWorking: true };
  const noWithdrawalEvents = [];

  const base = runCombinedMcForStrategy(P3, [], 'proportional', corporateSettings, corporatePortfolio, noWithdrawalEvents, 500);
  const pExpCut = { ...P3, baseExp: P3.baseExp * 0.9 };
  const altExpCut = runCombinedMcForStrategy(pExpCut, [], 'proportional', corporateSettings, corporatePortfolio, noWithdrawalEvents, 500);

  const personalDelta = altExpCut.personalOnly.bankruptcyRate - base.personalOnly.bankruptcyRate;
  const combinedDelta = altExpCut.combined.bankruptcyRate - base.combined.bankruptcyRate;
  checkTrue(
    'personalOnly側: 支出10%削減で破綻率変化が有意に非ゼロ(combined側は0%のままでも)',
    Math.abs(personalDelta) >= 1,
  );
  checkTrue('combined側: 法人取崩イベント0件のためこちらは0%のまま(参考、非回帰)', combinedDelta === 0);
  console.log(`  参考値: personalOnly Δ=${personalDelta.toFixed(1)}% / combined Δ=${combinedDelta.toFixed(1)}%`);
}

console.log('\n' + '='.repeat(100));
console.log('companyStateStore.ts — copyCurrentToWorking/setRateSameAsWorking/setSigmaSameAsWorking（2026-08-21最終チェックリスト2・3番）');
console.log('='.repeat(100));

{
  // 2番：①→②の比率コピーは％配分(rows)のみを対象とし、working側の既存の手入力設定
  // （useManualMu/manualMu等）を書き換えないこと（個人側simulatorStore.tsのcopyCurrentToWorkingと同じ設計）。
  const store = useCompanyStateStore.getState();
  store.setPortfolioPhaseManual('working', { useManualMu: true, manualMu: 12.3 });
  store.updatePortfolioPhase('current', [{ assetClass: '日本債券', pct: 100 }]);
  store.copyCurrentToWorking();
  const working = useCompanyStateStore.getState().state.portfolio.working;
  checkEq('copyCurrentToWorking: ①のrowsがコピーされる', working.rows, [{ assetClass: '日本債券', pct: 100 }]);
  checkTrue('copyCurrentToWorking: working既存のuseManualMuが保持される(書き換わらない)', working.useManualMu === true);
  check('copyCurrentToWorking: working既存のmanualMuが保持される(書き換わらない)', working.manualMu, 12.3);
}

{
  // 3番：setRateSameAsWorking(false)は、その時点の積立期の実効μを取崩期側にシードしてから
  // 手動モードに切り替える（個人側setRateSameAsWorkingと同じ「値が飛ばないようにする」UX）。
  const store = useCompanyStateStore.getState();
  store.updatePortfolioPhase('working', [{ assetClass: '全世界株', pct: 100 }]); // mu=6.83（手入力OFFに戻す）
  store.setPortfolioPhaseManual('working', { useManualMu: false });
  store.setRateSameAsWorking(false);
  const afterOff = useCompanyStateStore.getState().state.portfolio;
  checkTrue('setRateSameAsWorking(false): rateSameAsWorkingがfalseになる', afterOff.rateSameAsWorking === false);
  checkTrue('setRateSameAsWorking(false): 取崩期がuseManualMu=trueにシードされる', afterOff.retirement.useManualMu === true);
  check('setRateSameAsWorking(false): 取崩期のmanualMuに積立期の実効値(6.83)がシードされる', afterOff.retirement.manualMu, 6.83);

  store.setRateSameAsWorking(true);
  checkTrue('setRateSameAsWorking(true): rateSameAsWorkingがtrueに戻る', useCompanyStateStore.getState().state.portfolio.rateSameAsWorking === true);
}

{
  // sigmaSameAsWorkingも同様（σ版）。
  const store = useCompanyStateStore.getState();
  store.setSigmaSameAsWorking(false);
  const afterOff = useCompanyStateStore.getState().state.portfolio;
  checkTrue('setSigmaSameAsWorking(false): sigmaSameAsWorkingがfalseになる', afterOff.sigmaSameAsWorking === false);
  checkTrue('setSigmaSameAsWorking(false): 取崩期がuseManualSigma=trueにシードされる', afterOff.retirement.useManualSigma === true);
  check('setSigmaSameAsWorking(false): 取崩期のmanualSigmaに積立期の実効値(18.89)がシードされる', afterOff.retirement.manualSigma, 18.89, 0.01);
}

console.log('\n' + '='.repeat(100));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
console.log('='.repeat(100));

if (fail > 0) process.exitCode = 1;
