/**
 * scripts/verify-companystate-rearchitecture.js
 * instruction_phase2_companystate_rearchitecture.md の回帰テスト。
 *   1節：companyStateByProfile（シミュレータープロファイルidキー）・loadProfile/saveProfileへの
 *        相乗り・プロファイル間の独立性
 *   4節：①現在PFのamount合計からinvestedBalanceを自動算出
 *   5節：importFromAssetManagement(profileId)の明示引数化、importFromAssetManagementPersonalの
 *        マッピングルール
 *   6節：ASSET_CLASSES/ASSET_CORR（不動産・暗号資産）の追加値、getCryptoManualWarnings・
 *        getCorporateCryptoWarningsの検出条件
 *
 * 本番のuseSimulatorStore/saveProfile/useCompanyStateStore/importFromAssetManagement/
 * importFromAssetManagementPersonal/getCryptoManualWarnings/getCorporateCryptoWarningsを
 * 直接importして呼び出すだけで、独自の再実装は含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

// simulatorStore.ts等が`@/lib`のようなパスエイリアスでimportしているため（Next.js/webpackは
// 解決するが、素のts-node+requireでは解決できない）、tsconfig-pathsを新規依存として追加せず、
// `@/`→`src/`への最小限のrequireフックだけをここで登録する。
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

const { useSimulatorStore } = require('../src/store/simulatorStore');
const { saveProfile } = require('../src/lib/storage');
const { useCompanyStateStore } = require('../src/lib/hojinCompanyState/companyStateStore');
const { getCompanyStateForProfile } = require('../src/lib/hojinCompanyState/storageByProfile');
const { getCorporateCryptoWarnings } = require('../src/lib/hojinCompanyState/portfolioMath');
const { importFromAssetManagement } = require('../src/lib/hojinCompanyState/importFromAssetManagement');
const { importFromAssetManagementPersonal } = require('../src/lib/importFromAssetManagementPersonal');
const { ASSET_CLASSES, ASSET_CORR, getCryptoManualWarnings, SAMPLE_PROFILE } = require('../src/lib/profile');
const { ASSET_CLASSES: TOOL_ASSET_CLASSES } = require('../src/lib/assetManagement/categories');

function makeProfile(id, name) {
  return { ...SAMPLE_PROFILE, id, name };
}

// ================================================================
// SECTION 1: companyStateByProfile（キー管理・loadProfile/saveProfileへの相乗り・独立性）
// ================================================================
console.log('='.repeat(80));
console.log('【companyStateByProfile：シミュレータープロファイル単位のキー管理】');
console.log('='.repeat(80));

{
  useSimulatorStore.getState().loadProfile(makeProfile(1001, 'プロファイルA'));
  record('1. loadProfile後：companyStateStoreのcurrentProfileIdがプロファイルAのidになる',
    useCompanyStateStore.getState().currentProfileId === 1001);
  record('2. 未保存のプロファイルはEMPTY_COMPANY_STATE相当（実効税率25）で初期化される',
    useCompanyStateStore.getState().state.settings.effectiveTaxRate === 25);

  useCompanyStateStore.getState().setEffectiveTaxRate(30);
  saveProfile(makeProfile(1001, 'プロファイルA'));
  record('3. saveProfile後：companyStateByProfileにプロファイルAの値(30)が永続化される',
    getCompanyStateForProfile(1001).settings.effectiveTaxRate === 30);

  useSimulatorStore.getState().loadProfile(makeProfile(1002, 'プロファイルB'));
  record('4. 別プロファイルBへ切替：companyStateStoreもEMPTY（Aの30が漏れない）',
    useCompanyStateStore.getState().state.settings.effectiveTaxRate === 25);

  useCompanyStateStore.getState().setEffectiveTaxRate(50);
  saveProfile(makeProfile(1002, 'プロファイルB'));
  record('5. saveProfile後：Bの値(50)が永続化される', getCompanyStateForProfile(1002).settings.effectiveTaxRate === 50);

  useSimulatorStore.getState().loadProfile(makeProfile(1001, 'プロファイルA'));
  record('6. Aへ戻ると、保存済みのA用の実効税率(30)がそのまま保持されている（Bの50に上書きされていない）',
    useCompanyStateStore.getState().state.settings.effectiveTaxRate === 30);

  useSimulatorStore.getState().loadProfile(makeProfile(1002, 'プロファイルB'));
  record('7. Bの保存済み実効税率(50)も保持されている', useCompanyStateStore.getState().state.settings.effectiveTaxRate === 50);
}

// ================================================================
// SECTION 2: saveProfile（新規id・上書きid）でのCompanyState永続化
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【saveProfile：新規保存でメモリ上の下書きが新IDにそのままコピーされる】');
console.log('='.repeat(80));

{
  // Section 1末尾の状態を引き継ぐ：currentProfileId=1002(B)・実効税率50（保存済み）。
  // Bを未保存のまま編集（別名保存の下書きを模擬）。
  useCompanyStateStore.getState().setEffectiveTaxRate(99);
  record('8. 別名保存前：companyStateStoreはメモリ上で99に編集されている（まだ未保存）',
    useCompanyStateStore.getState().state.settings.effectiveTaxRate === 99);

  // 新しいid(1003)へ「別名で保存」：ProfileDrawer.tsxのhandleSaveと同じく、
  // 新規idを確定したprofileオブジェクトをそのままsaveProfile()へ渡す（loadProfileは呼ばない）。
  saveProfile(makeProfile(1003, 'プロファイルC'));
  record('9. 別名保存後：新ID(1003)に、その時点でメモリ上にあった値(99)がそのままコピーされる',
    getCompanyStateForProfile(1003).settings.effectiveTaxRate === 99,
    `stored=${getCompanyStateForProfile(1003).settings.effectiveTaxRate}`);
  record('10. 別名保存後：元のプロファイルB(1002)の保存済み値(50)は変化していない',
    getCompanyStateForProfile(1002).settings.effectiveTaxRate === 50);
  record('11. 別名保存後：simulatorStoreのcurrentProfileIdも新ID(1003)に切り替わっている',
    useSimulatorStore.getState().currentProfileId === 1003);
}

// ================================================================
// SECTION 3: ①現在PFのamount合計からinvestedBalanceを自動算出
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【updatePortfolioPhase：①現在PFのamount合計からinvestedBalanceを自動算出】');
console.log('='.repeat(80));

{
  useCompanyStateStore.getState().updatePortfolioPhase('current', [
    { assetClass: '全世界株', pct: 0, amount: 100 },
    { assetClass: '現金', pct: 0, amount: 50 },
  ]);
  record('12. ①現在PFの行を更新：investedBalanceが行のamount合計(150)に自動算出される',
    useCompanyStateStore.getState().state.settings.investedBalance === 150,
    `investedBalance=${useCompanyStateStore.getState().state.settings.investedBalance}`);

  // ②積立期はpctのみのためinvestedBalanceに影響しないことを確認。
  useCompanyStateStore.getState().updatePortfolioPhase('working', [{ assetClass: '全世界株', pct: 100 }]);
  record('13. ②積立期の行を更新してもinvestedBalanceは変化しない（①現在PFのみ対象）',
    useCompanyStateStore.getState().state.settings.investedBalance === 150);
}

// ================================================================
// SECTION 4: importFromAssetManagement(profileId)の明示引数化
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【importFromAssetManagement：明示的なprofileId引数（暗黙のcurrentProfileId参照なし）】');
console.log('='.repeat(80));

{
  const { saveHojinHoldings } = require('../src/lib/hojinAssetManagement/storage');
  const { useAssetManagerProfileStore } = require('../src/lib/assetManagement/profileStore');

  saveHojinHoldings([
    { id: 'h1', owner: 'corporate', accountCategory: '法人証券口座', assetClass: '全世界株', amount: 300, updatedAt: '', profileId: 'profX' },
    { id: 'h2', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 100, updatedAt: '', profileId: 'profX' },
    { id: 'h3', owner: 'corporate', accountCategory: '法人証券口座', assetClass: '日本株', amount: 999, updatedAt: '', profileId: 'profY' },
  ]);

  // 資産管理ツール側の「今アクティブな」プロファイルはprofYにしておき、それでも引数profXの
  // 結果が返ることを確認する（暗黙参照が残っていないことの直接的な検証）。
  const anyOtherId = useAssetManagerProfileStore.getState().profiles[0]?.id;
  if (anyOtherId) useAssetManagerProfileStore.getState().switchProfile(anyOtherId);

  const resultX = importFromAssetManagement('profX');
  record('14. importFromAssetManagement(\'profX\')：investedBalance=300（profXの法人証券口座のみ）',
    resultX.investedBalance === 300, JSON.stringify(resultX));
  record('15. cashBalance=100（profXの法人預金のみ）', resultX.cashBalance === 100);
  record('16. rowsにamountフィールドが含まれる（④節：金額表示UI用）',
    resultX.rows.length === 1 && resultX.rows[0].amount === 300, JSON.stringify(resultX.rows));

  const resultY = importFromAssetManagement('profY');
  record('17. importFromAssetManagement(\'profY\')：日本株999が反映される（profXの値と混ざらない）',
    resultY.investedBalance === 999);
}

// ================================================================
// SECTION 5: importFromAssetManagementPersonal のマッピングルール（5.2節）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【importFromAssetManagementPersonal：owner×accountCategoryのマッピング】');
console.log('='.repeat(80));

{
  const { saveHoldings } = require('../src/lib/assetManagement/storage');
  saveHoldings([
    { id: 'p1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 100, updatedAt: '', profileId: 'personalProf' },
    { id: 'p2', owner: 'personal_spouse', accountCategory: '現金', assetClass: '現金', amount: 50, updatedAt: '', profileId: 'personalProf' },
    { id: 'p3', owner: 'personal', accountCategory: 'NISA', assetClass: '全世界株', amount: 200, updatedAt: '', profileId: 'personalProf' },
    { id: 'p4', owner: 'personal_spouse', accountCategory: 'NISA', assetClass: '先進国株', amount: 80, updatedAt: '', profileId: 'personalProf' },
    { id: 'p5', owner: 'personal', accountCategory: 'iDeCo', assetClass: '日本株', amount: 120, updatedAt: '', profileId: 'personalProf' },
    { id: 'p6', owner: 'personal_spouse', accountCategory: 'iDeCo', assetClass: '日本株', amount: 60, updatedAt: '', profileId: 'personalProf' },
    { id: 'p7', owner: 'personal', accountCategory: '特定口座', assetClass: 'ゴールド', amount: 40, updatedAt: '', profileId: 'personalProf' },
    { id: 'p8', owner: 'personal', accountCategory: 'その他', assetClass: '不動産', amount: 500, updatedAt: '', profileId: 'personalProf' },
    { id: 'p9', owner: 'personal_spouse', accountCategory: '特定口座', assetClass: 'ゴールド', amount: 20, updatedAt: '', profileId: 'personalProf' },
    { id: 'p10', owner: 'personal_spouse', accountCategory: 'その他', assetClass: '暗号資産', amount: 30, updatedAt: '', profileId: 'personalProf' },
    // 別プロファイル分（混ざらないことの確認用）。
    { id: 'q1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 99999, updatedAt: '', profileId: 'otherProf' },
  ]);

  const r = importFromAssetManagementPersonal('personalProf');
  record('18. 現金（本人）→bCash=100', r.bCash === 100);
  record('19. 現金（配偶者）→spCashBal=50', r.spCashBal === 50);
  record('20. NISA（本人）→nisa=[{全世界株,200}]', r.nisa.length === 1 && r.nisa[0].amount === 200 && r.nisa[0].assetClass === '全世界株');
  record('21. NISA（配偶者）→spNisa=[{先進国株,80}]', r.spNisa.length === 1 && r.spNisa[0].amount === 80);
  record('22. iDeCo（本人）→ideco=[{日本株,120}]', r.ideco.length === 1 && r.ideco[0].amount === 120);
  record('23. iDeCo（配偶者）→spIdeco=[{日本株,60}]', r.spIdeco.length === 1 && r.spIdeco[0].amount === 60);
  record('24. 特定口座（本人）＋その他（本人）→taxに合算（ゴールド40＋不動産500）',
    r.tax.length === 2 && r.tax.reduce((s, x) => s + x.amount, 0) === 540, JSON.stringify(r.tax));
  record('25. 特定口座（配偶者）＋その他（配偶者）→spTaxに合算（ゴールド20＋暗号資産30）',
    r.spTax.length === 2 && r.spTax.reduce((s, x) => s + x.amount, 0) === 50, JSON.stringify(r.spTax));
  record('26. 別プロファイル(otherProf)の保有資産は混ざらない（bCashは100のまま、99999を含まない）',
    r.bCash === 100);
}

// ================================================================
// SECTION 6: ASSET_CLASSES/ASSET_CORR（不動産・暗号資産）の追加値
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【ASSET_CLASSES/ASSET_CORR：不動産・暗号資産の追加値】');
console.log('='.repeat(80));

{
  const fudousan = ASSET_CLASSES.find(a => a.key === '不動産');
  record('27. profile.ts ASSET_CLASSES：不動産のmu=4.5/sigma=16.2/group=reit_jp',
    fudousan && fudousan.mu === 4.5 && fudousan.sigma === 16.2 && fudousan.group === 'reit_jp', JSON.stringify(fudousan));

  const crypto = ASSET_CLASSES.find(a => a.key === '暗号資産');
  record('28. profile.ts ASSET_CLASSES：暗号資産のmu=0/sigma=0/group=crypto（ダミー値）',
    crypto && crypto.mu === 0 && crypto.sigma === 0 && crypto.group === 'crypto', JSON.stringify(crypto));

  record('29. profile.ts ASSET_CORR：crypto行が追加されている（stock相関0.3）',
    ASSET_CORR.crypto && ASSET_CORR.crypto.stock === 0.3);
  record('30. profile.ts ASSET_CORR：既存グループ側にもcrypto列が対称に追加されている（stock→crypto=0.3）',
    ASSET_CORR.stock.crypto === 0.3);

  const toolFudousan = TOOL_ASSET_CLASSES.find(a => a.key === '不動産');
  record('31. assetManagement/categories.ts：不動産のmu/sigma/groupがprofile.tsと同値に補完されている',
    toolFudousan && toolFudousan.mu === 4.5 && toolFudousan.sigma === 16.2 && toolFudousan.group === 'reit_jp', JSON.stringify(toolFudousan));
  const toolCrypto = TOOL_ASSET_CLASSES.find(a => a.key === '暗号資産');
  record('32. assetManagement/categories.ts：暗号資産はgroup=cryptoのみ補完（mu/sigmaは未設定のまま）',
    toolCrypto && toolCrypto.group === 'crypto' && toolCrypto.mu === undefined && toolCrypto.sigma === undefined, JSON.stringify(toolCrypto));
}

// ================================================================
// SECTION 7: 暗号資産の手動入力誘導バリデーション（個人側・法人側）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【getCryptoManualWarnings（個人側）／getCorporateCryptoWarnings（法人側）】');
console.log('='.repeat(80));

{
  const base = makeProfile(2001, 'crypto-test');
  const withCrypto = {
    ...base,
    portfolio: {
      ...base.portfolio,
      working: { ...base.portfolio.working, nisa: [{ assetClass: '暗号資産', pct: 100 }] },
    },
    params: { ...base.params, bNisa: 100, pfManualFlags: { ...base.params.pfManualFlags, rWNisa: false } },
  };
  const warningsAuto = getCryptoManualWarnings(withCrypto);
  record('33. 個人側：NISA（積立期）に暗号資産を含み自動モードのまま→警告が出る',
    warningsAuto.some(w => w.includes('NISA（積立期）')), JSON.stringify(warningsAuto));

  const withCryptoManual = {
    ...withCrypto,
    params: { ...withCrypto.params, pfManualFlags: { ...withCrypto.params.pfManualFlags, rWNisa: true } },
  };
  const warningsManual = getCryptoManualWarnings(withCryptoManual);
  record('34. 個人側：同じ口座を手動入力に切り替えると警告が消える', warningsManual.length === 0, JSON.stringify(warningsManual));
}

{
  const { EMPTY_COMPANY_STATE } = require('../src/lib/hojinCompanyState/types');
  const stateWithCrypto = {
    ...EMPTY_COMPANY_STATE,
    portfolio: {
      ...EMPTY_COMPANY_STATE.portfolio,
      working: { ...EMPTY_COMPANY_STATE.portfolio.working, rows: [{ assetClass: '暗号資産', pct: 100 }] },
    },
  };
  const corpWarningsAuto = getCorporateCryptoWarnings(stateWithCrypto.portfolio);
  record('35. 法人側：②積立期に暗号資産を含み自動モードのまま→警告が出る',
    corpWarningsAuto.some(w => w.includes('②積立期')), JSON.stringify(corpWarningsAuto));

  const stateManual = {
    ...stateWithCrypto,
    portfolio: {
      ...stateWithCrypto.portfolio,
      working: { ...stateWithCrypto.portfolio.working, useManualMu: true, useManualSigma: true },
    },
  };
  const corpWarningsManual = getCorporateCryptoWarnings(stateManual.portfolio);
  record('36. 法人側：手動入力（μ・σとも）に切り替えると警告が消える', corpWarningsManual.length === 0, JSON.stringify(corpWarningsManual));
}

// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: CompanyStateの再設計（シミュレータープロファイル単位への移行）を確認しました。');
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
