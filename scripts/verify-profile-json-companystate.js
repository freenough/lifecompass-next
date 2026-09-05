/**
 * scripts/verify-profile-json-companystate.js
 * instruction_json_export_import_companystate.md の回帰テスト。
 *
 * 本番のexportProfileToJson/importProfileFromJson（src/lib/storage.ts）・
 * getCompanyStateForProfile/saveCompanyStateForProfile（hojinCompanyState/storageByProfile.ts）・
 * EMPTY_COMPANY_STATE（hojinCompanyState/types.ts）をそのまま呼び出すだけで、
 * 独自の再実装は含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

const path = require('path');
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return originalResolveFilename.call(this, request, ...rest);
};

let store = {};
global.window = global.window || {};
global.window.confirm = () => true;
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

const { exportProfileToJson, importProfileFromJson } = require('../src/lib/storage');
const { getCompanyStateForProfile, saveCompanyStateForProfile } = require('../src/lib/hojinCompanyState/storageByProfile');
const { EMPTY_COMPANY_STATE } = require('../src/lib/hojinCompanyState/types');
const { SAMPLE_PROFILE } = require('../src/lib/profile');

function makeProfile(id, name) {
  return { ...SAMPLE_PROFILE, id, name };
}

// ================================================================
// SECTION 1: エクスポート側（companyStateが空でない場合／空の場合）
// ================================================================
console.log('='.repeat(80));
console.log('【exportProfileToJson】');
console.log('='.repeat(80));

{
  store = {};
  const profileA = makeProfile(3001, 'エクスポートA');
  saveCompanyStateForProfile(3001, {
    ...EMPTY_COMPANY_STATE,
    settings: { ...EMPTY_COMPANY_STATE.settings, effectiveTaxRate: 40, investedBalance: 111, cashBalance: 222 },
  });

  const json = exportProfileToJson(profileA);
  const parsed = JSON.parse(json);
  record('1. 法人設定が存在する場合：companyStateフィールドが含まれる', parsed.companyState !== undefined, json.slice(0, 80));
  record('2. companyState.settings.effectiveTaxRate=40が正しく含まれる',
    parsed.companyState && parsed.companyState.settings.effectiveTaxRate === 40);
  record('3. companyState.settings.investedBalance=111／cashBalance=222',
    parsed.companyState.settings.investedBalance === 111 && parsed.companyState.settings.cashBalance === 222);
  record('4. profile本体のフィールド（id/name）もそのまま含まれる',
    parsed.id === 3001 && parsed.name === 'エクスポートA');

  const profileB = makeProfile(3002, 'エクスポートB（法人設定なし）');
  const jsonEmpty = exportProfileToJson(profileB);
  const parsedEmpty = JSON.parse(jsonEmpty);
  record('5. 法人設定が空（EMPTY_COMPANY_STATE相当）の場合：companyStateフィールドを含まない',
    parsedEmpty.companyState === undefined, jsonEmpty.slice(0, 80));
}

// ================================================================
// SECTION 2: インポート側（新形式・往復確認）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【importProfileFromJson：新形式の往復確認】');
console.log('='.repeat(80));

{
  store = {};
  const profileA = makeProfile(4001, 'プロファイルA');
  saveCompanyStateForProfile(4001, {
    ...EMPTY_COMPANY_STATE,
    settings: { ...EMPTY_COMPANY_STATE.settings, effectiveTaxRate: 33, investedBalance: 500, cashBalance: 600 },
  });
  const json = exportProfileToJson(profileA);

  // 「Aをエクスポート→Bとして名前を変えてインポート→新規プロファイルとして法人設定込みで
  // 正しく作成される」パターン（3節の確認事項）：JSON文字列上のid/nameを新しい値に差し替えてから
  // インポートする（ProfileDrawer.tsxのJSONインポートは常にJSON内のidをそのまま使うため）。
  const renamed = { ...JSON.parse(json), id: 4002, name: 'プロファイルB（Aから複製）' };
  const importedB = importProfileFromJson(JSON.stringify(renamed));

  record('6. インポート結果のprofileにcompanyStateフィールドが含まれない（loadProfile()にそのまま渡せる形）',
    importedB.companyState === undefined);
  record('7. インポート結果のid/nameが新しい値になっている', importedB.id === 4002 && importedB.name === 'プロファイルB（Aから複製）');
  record('8. 新ID(4002)のcompanyStateByProfileに、Aの法人設定がそのまま複製されている',
    getCompanyStateForProfile(4002).settings.effectiveTaxRate === 33 &&
    getCompanyStateForProfile(4002).settings.investedBalance === 500 &&
    getCompanyStateForProfile(4002).settings.cashBalance === 600,
    JSON.stringify(getCompanyStateForProfile(4002).settings));
  record('9. 元のプロファイルA(4001)の法人設定は変化していない',
    getCompanyStateForProfile(4001).settings.effectiveTaxRate === 33);
}

// ================================================================
// SECTION 3: 旧形式JSON（companyStateフィールドなし）の非破壊性
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【importProfileFromJson：旧形式JSON（companyStateフィールドなし）の非破壊性】');
console.log('='.repeat(80));

{
  store = {};
  // 取り込み先ID(5001)に、あらかじめ既存の法人設定を用意しておく。
  saveCompanyStateForProfile(5001, {
    ...EMPTY_COMPANY_STATE,
    settings: { ...EMPTY_COMPANY_STATE.settings, effectiveTaxRate: 77, investedBalance: 999 },
  });

  // 本改修前のエクスポート形式を模擬：companyStateフィールドを含まない素のProfileV3 JSON。
  const oldFormatJson = JSON.stringify(makeProfile(5001, '旧形式バックアップ'));
  const imported = importProfileFromJson(oldFormatJson);

  record('10. 旧形式JSONのインポートはエラーにならない（importProfileFromJsonが例外を投げない）', imported.id === 5001);
  record('11. 旧形式JSONインポート後も、取り込み先(5001)の既存法人設定が一切変更されていない',
    getCompanyStateForProfile(5001).settings.effectiveTaxRate === 77 &&
    getCompanyStateForProfile(5001).settings.investedBalance === 999,
    JSON.stringify(getCompanyStateForProfile(5001).settings));
}

// ================================================================
// SECTION 4: companyState: null の明示的リセット
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【importProfileFromJson：companyState: null の明示的リセット】');
console.log('='.repeat(80));

{
  store = {};
  saveCompanyStateForProfile(6001, {
    ...EMPTY_COMPANY_STATE,
    settings: { ...EMPTY_COMPANY_STATE.settings, effectiveTaxRate: 55, investedBalance: 321 },
  });

  const jsonWithNull = JSON.stringify({ ...makeProfile(6001, 'null明示'), companyState: null });
  importProfileFromJson(jsonWithNull);

  record('12. companyState:null をインポートすると、既存の法人設定がEMPTY_COMPANY_STATEにリセットされる',
    JSON.stringify(getCompanyStateForProfile(6001)) === JSON.stringify(EMPTY_COMPANY_STATE),
    JSON.stringify(getCompanyStateForProfile(6001).settings));
}

// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: プロファイルJSONエクスポート/インポートへのCompanyState統合を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));

delete global.window;
delete global.localStorage;
Module._resolveFilename = originalResolveFilename;
