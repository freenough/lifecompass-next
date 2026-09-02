/**
 * scripts/verify-plan-snapshot.js
 * claude_instruction_phase2_yojitsu_v1_plan_and_compare.md の回帰テスト。
 *   generatePlan()：固定モードcurveがsimulate()の直接呼び出しと一致すること、MCモードの
 *     percentiles（p10<=p50<=p90）、profile.eventsのみに依存すること（hojinCompanyState非依存）
 *   storage.ts：listPlans/savePlan/getLatestPlan/renamePlan/deletePlan、MAX_PLANS上限のprofileId単位分離
 *   alignment.ts：ageToYearMonthの年またぎ変換
 *
 * planSnapshot/*.tsは全て相対importのみで書かれているため、@/エイリアス解決のモンキーパッチは不要。
 * 本番のgeneratePlan/simulate/storage関数を直接importして呼び出すだけで、独自の再実装は含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

let store = {};
global.window = global.window || {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};

let pass = 0, fail = 0;
const failedCases = [];
function record(label, ok, detail) {
  if (ok) { pass++; } else { fail++; failedCases.push({ label, detail }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const { simulate } = require('../src/lib/simulate');
const { runMC } = require('../src/lib/montecarlo');
const { profileToSimParams, SAMPLE_PROFILE } = require('../src/lib/profile');
const { generatePlan, generateMcPercentiles, normalizeSimulatorProfile } = require('../src/lib/planSnapshot/generatePlan');
const { listPlans, savePlan, getLatestPlan, renamePlan, deletePlan } = require('../src/lib/planSnapshot/storage');
const { MAX_PLANS } = require('../src/lib/planSnapshot/config');
const { ageToYearMonth } = require('../src/lib/planSnapshot/alignment');

console.log('='.repeat(80));
console.log('【generatePlan：固定モード】');
console.log('='.repeat(80));
{
  const profile = { ...SAMPLE_PROFILE, id: 9001, name: 'テストA' };
  const plan = generatePlan(profile, { profileId: 'p-1', simulatorProfileId: 9001, trials: 20 });

  const p = profileToSimParams(profile);
  const strategy = profile.ui.activeStrategies[0] || 'proportional';
  const expectedSnaps = simulate(p, profile.events, strategy);

  record('1. curve.length がsimulate()結果と一致', plan.fixed.curve.length === expectedSnaps.length);
  const allMatch = plan.fixed.curve.every((pt, i) => pt.age === expectedSnaps[i].age && pt.totalAssets === expectedSnaps[i].totalAssets);
  record('2. curveの各点（age・totalAssets）がsimulate()直接呼び出しと完全一致', allMatch);
  record('3. strategyがprofile.ui.activeStrategies[0]と一致', plan.strategy === strategy);
  record('4. idがcrypto.randomUUID形式（36文字・ハイフン4箇所）', typeof plan.id === 'string' && plan.id.length === 36 && plan.id.split('-').length === 5);
  record('5. fixed.byAccountは常にnull', plan.fixed.byAccount === null);
  record('6. name未指定時はデフォルト名（"計画 "で始まる）', plan.name.startsWith('計画 '));

  const named = generatePlan(profile, { profileId: 'p-1', simulatorProfileId: 9001, name: '  第一回  ', trials: 5 });
  record('7. name指定時はtrim済みの値を使う', named.name === '第一回');
}

console.log('='.repeat(80));
console.log('【generatePlan：MCモード】');
console.log('='.repeat(80));
{
  const profile = { ...SAMPLE_PROFILE, id: 9002, name: 'テストB' };
  const plan = generatePlan(profile, { profileId: 'p-1', simulatorProfileId: 9002, trials: 50 });
  const p = profileToSimParams(profile);
  const years = p.lifeEx - p.curAge + 1;

  record('1. mcが生成される', plan.mc !== null);
  if (plan.mc) {
    record('2. percentiles.lengthが年数と一致', plan.mc.percentiles.length === years);
    const ordered = plan.mc.percentiles.every((pt) => pt.p10 <= pt.p50 && pt.p50 <= pt.p90);
    record('3. 各年でp10<=p50<=p90', ordered);
    record('4. mc.byAccountは常にnull', plan.mc.byAccount === null);
    record('5. 最初の点のageがcurAgeと一致', plan.mc.percentiles[0].age === p.curAge);
  }
}

console.log('='.repeat(80));
console.log('【generateMcPercentiles と montecarlo.ts runMC() の数値的同等性】');
console.log('='.repeat(80));
{
  // montecarlo.tsを直接importせず複製したパーセンタイル集計ロジック（generateMcPercentiles）が、
  // 本家runMC()と数値的に同一の結果を返すことを直接確認する。同じshockOverrides（trialReturns、
  // number[][]、[試行番号][年インデックス]）を両者に渡し、乱数生成そのものを比較対象から排除した
  // うえで、集計ロジック（pct()の補間方法・Math.round()の丸め方）だけの一致を見る。
  const profile = { ...SAMPLE_PROFILE, id: 9010, name: 'テストMC同等性' };
  const p = profileToSimParams(profile);
  const years = p.lifeEx - p.curAge + 1;
  const trials = 40;
  const shockOverrides = Array.from({ length: trials }, () =>
    Array.from({ length: years }, () => (Math.random() - 0.5) * 4)
  );

  for (const strategy of ['proportional', 'cash_first', 'taxable_first']) {
    const mcResult = runMC(p, profile.events, [strategy], trials, shockOverrides);
    const strategyResult = mcResult.strategies[strategy];
    const mine = generateMcPercentiles(p, profile.events, strategy, trials, shockOverrides);

    record(`1. [${strategy}] percentiles.lengthが一致`, mine.length === strategyResult.percentiles.p10.length);
    record(`2. [${strategy}] p10が全年でrunMC()と完全一致`, mine.every((pt, i) => pt.p10 === strategyResult.percentiles.p10[i]));
    record(`3. [${strategy}] p50が全年でrunMC()と完全一致`, mine.every((pt, i) => pt.p50 === strategyResult.percentiles.p50[i]));
    record(`4. [${strategy}] p90が全年でrunMC()と完全一致`, mine.every((pt, i) => pt.p90 === strategyResult.percentiles.p90[i]));
  }

  // 破綻ケース（枯渇して総資産が早期に0へ張り付く）でも一致することを確認する
  // （枯渇後は複数試行の値が同じ0に収束するため、補間の丸め誤差が出やすいケースを別途検証）。
  const bp = { ...p, baseExp: p.baseInc * 3 };
  const bankruptShocks = Array.from({ length: trials }, () => Array.from({ length: years }, () => -3));
  const bMc = runMC(bp, profile.events, ['proportional'], trials, bankruptShocks);
  const bMine = generateMcPercentiles(bp, profile.events, 'proportional', trials, bankruptShocks);
  record('5. 破綻シナリオでもp10/p50/p90が全年でrunMC()と完全一致',
    bMine.every((pt, i) =>
      pt.p10 === bMc.strategies.proportional.percentiles.p10[i] &&
      pt.p50 === bMc.strategies.proportional.percentiles.p50[i] &&
      pt.p90 === bMc.strategies.proportional.percentiles.p90[i]
    ));
}

console.log('='.repeat(80));
console.log('【generatePlan：profile.eventsのみに依存・法人非依存】');
console.log('='.repeat(80));
{
  const base = { ...SAMPLE_PROFILE, id: 9003, name: 'テストC', events: [] };
  const withEvent = {
    ...base,
    events: [{ category: 'income', subtype: 'other_inc', name: 'テスト収入', age: base.params.curAge + 1, years: 1, amount: 9999 }],
  };
  const planBase = generatePlan(base, { profileId: 'p-2', simulatorProfileId: 9003, trials: 5 });
  const planWithEvent = generatePlan(withEvent, { profileId: 'p-2', simulatorProfileId: 9003, trials: 5 });
  const differs = JSON.stringify(planBase.fixed.curve) !== JSON.stringify(planWithEvent.fixed.curve);
  record('1. profile.eventsを変えるとcurveが変わる（=profile.eventsに依存している）', differs);

  // コメント文（先例の説明等）には'hojinCompanyState'等の文字列が正当に登場しうるため、実際の
  // import文の行だけを対象に「importしていない」ことを確認する（コメント全文への単純な文字列
  // 検索だと、この禁止事項自体を説明するコメントに誤反応する）。
  const fs = require('fs');
  const generatePlanSrc = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'lib', 'planSnapshot', 'generatePlan.ts'), 'utf8');
  const importLines = generatePlanSrc.split('\n').filter((line) => /^\s*import\b/.test(line));
  record('2. import文にhojinCompanyStateが一切現れない', !importLines.some((l) => l.includes('hojinCompanyState')));
  record('3. import文にuseSimulatorStoreが一切現れない', !importLines.some((l) => l.includes('useSimulatorStore')));
  record('4. import文にmontecarlo（大小問わず）が一切現れない', !importLines.some((l) => /montecarlo/i.test(l)));
}

console.log('='.repeat(80));
console.log('【normalizeSimulatorProfile / generatePlan：欠損フィールドを持つプロファイルの回帰確認】');
console.log('='.repeat(80));
{
  // claude_instruction_phase2_yojitsu_polish.md 0節：「1 error」トーストの原因確認・修正。
  // loadProfiles()（src/lib/storage.ts）はlocalStorageの生データをそのまま返し、
  // simulatorStore.tsのloadInitialProfile()と異なりSAMPLE_PROFILEでの欠損補完を行わない。
  // params.pfManualFlagsが欠けたプロファイル（JSONインポート等で実際に起こりうる状態）を
  // 直接generatePlan()に渡すと、修正前はgetEffectiveMcStd()内でTypeErrorになっていた。
  const incompleteProfile = {
    id: 9020,
    name: '欠損フィールドテスト',
    version: 3,
    savedAt: new Date().toISOString(),
    // params.pfManualFlagsを意図的に欠落させる（実際にNext.jsのUnhandled Runtime Errorで
    // 再現した"Cannot read properties of undefined (reading 'mcStd')"の直接の原因）。
    params: { curAge: 40, lifeEx: 85, baseInc: 400, baseExp: 250 },
    portfolio: {},
    events: [],
    ui: { activeStrategies: ['proportional'], activeScenarios: [], cmpMode: 'strategy', currentMode: 'fixed', balSync: {} },
  };

  let threw = false;
  let plan = null;
  try {
    plan = generatePlan(incompleteProfile, { profileId: 'p-normalize', simulatorProfileId: 9020, trials: 5 });
  } catch {
    threw = true;
  }
  record('1. params.pfManualFlagsが欠けたプロファイルでもgeneratePlan()が例外を投げない', !threw);
  record('2. 欠損プロファイルでも意図した年齢(curAge=40)から計画が生成される', !!plan && plan.fixed.curve[0]?.age === 40);

  const normalized = normalizeSimulatorProfile(incompleteProfile);
  record('3. normalizeSimulatorProfileがSAMPLE_PROFILE.params.pfManualFlagsで欠損を補完する', normalized.params.pfManualFlags != null);
  record('4. normalizeSimulatorProfileは元のparams値（curAge=40）を上書きしない（補完のみで既存値を優先）', normalized.params.curAge === 40);
}

console.log('='.repeat(80));
console.log('【storage：listPlans/savePlan/getLatestPlan/renamePlan/deletePlan】');
console.log('='.repeat(80));
{
  global.localStorage.clear();
  const mk = (profileId, idx) => ({
    id: `id-${profileId}-${idx}`,
    profileId,
    simulatorProfileId: 1,
    strategy: 'proportional',
    name: `計画${idx}`,
    createdAt: new Date(2020, 0, idx).toISOString(),
    savedAtAge: 35,
    savedAtYearMonth: '2026-08',
    fixed: { curve: [], byAccount: null },
    mc: null,
  });

  savePlan(mk('prof-A', 1));
  savePlan(mk('prof-A', 2));
  savePlan(mk('prof-B', 1));

  record('1. listPlansはprofileIdで絞り込む', listPlans('prof-A').length === 2 && listPlans('prof-B').length === 1);
  record('2. getLatestPlanはcreatedAt最新を返す', getLatestPlan('prof-A').name === '計画2');

  renamePlan('id-prof-A-1', '改名後');
  record('3. renamePlanは対象idのみ改名する', listPlans('prof-A').find((p) => p.id === 'id-prof-A-1').name === '改名後');

  deletePlan('id-prof-A-1');
  record('4. deletePlanは対象idのみ削除する', listPlans('prof-A').length === 1 && listPlans('prof-B').length === 1);

  global.localStorage.clear();
  for (let i = 1; i <= MAX_PLANS + 5; i++) savePlan(mk('prof-cap', i));
  savePlan(mk('prof-other', 1));
  const capped = listPlans('prof-cap');
  record('5. MAX_PLANS超過時は対象profileId内の最古から削除される', capped.length === MAX_PLANS && capped[0].name === `計画${5 + 1}`);
  record('6. 他profileIdの計画は上限判定・削除の影響を受けない', listPlans('prof-other').length === 1);
}

console.log('='.repeat(80));
console.log('【alignment：ageToYearMonth】');
console.log('='.repeat(80));
{
  const plan = { savedAtAge: 35, savedAtYearMonth: '2026-08' };
  record('1. age===savedAtAgeでsavedAtYearMonthそのまま', ageToYearMonth(plan, 35) === '2026-08');
  record('2. 年をまたぐ加算（+2年）', ageToYearMonth(plan, 37) === '2028-08');
  record('3. 過去方向（-3年）', ageToYearMonth(plan, 32) === '2023-08');

  const planNov = { savedAtAge: 40, savedAtYearMonth: '2026-11' };
  record('4. 月は常にsavedAtYearMonthの月のまま', ageToYearMonth(planNov, 42) === '2028-11');
}

console.log('='.repeat(80));
console.log(`結果: PASS=${pass} FAIL=${fail}`);
if (fail > 0) {
  console.log('--- FAILED CASES ---');
  failedCases.forEach((c) => console.log(`  - ${c.label}${c.detail ? ' — ' + c.detail : ''}`));
  process.exitCode = 1;
}
