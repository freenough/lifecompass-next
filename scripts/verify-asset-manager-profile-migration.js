/**
 * scripts/verify-asset-manager-profile-migration.js
 * instruction_phase2_profile_foundation.md の回帰テスト。
 *   3章：ensureAssetManagerMigrated()の冪等性（2回連続実行で結果が変わらない）・
 *        自己修復方式（部分的に完了した状態からの再実行）
 *   3節（実装時発見）：dedupeSnapshotsByDate・addSnapshotの(date, profileId)複合キー化
 *        （複数プロファイルが同月に記録を持っても互いのデータが消えないこと）
 *   6章：profileStore（作成・切替・削除カスケード・0件防止）
 *
 * instruction_phase2_companystate_rearchitecture.md（1節）により、CompanyStateは
 * 資産管理ツールプロファイル単位ではなくシミュレータープロファイル単位（companyStateByProfile）
 * へ移行した。これに伴い、旧・資産管理ツールプロファイル単位のCompanyState永続化
 * （hojinCompanyState/storage.tsのgetCompanyState/saveCompanyState/deleteCompanyState、
 * isCompanyStateSettings/isCompanyStateMapによる新旧形式判定、companyStateStore.tsの
 * isDirty/saveDraft/discardDraft/switchProfile・useAssetManagerProfileStoreへの自動追従）は
 * すべて撤去された。これらを検証していた旧SECTION 1・5・6・8、およびSECTION 2内の
 * hojinCompanyState旧形式マップ変換テストは、対象の実装ごと削除した
 * （新しいCompanyStateByProfile関連の回帰テストはscripts/verify-companystate-rearchitecture.jsへ）。
 *
 * 本番のensureAssetManagerMigrated/profileStore/addSnapshot/loadSnapshots/
 * summarizeProfileHoldingsを直接importして呼び出すだけで、独自の再実装は含まない。
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

// ================================================================
// SECTION 1: ensureAssetManagerMigrated の冪等性・自己修復
// ================================================================
console.log('='.repeat(80));
console.log('【ensureAssetManagerMigrated：冪等性・自己修復（3節）】');
console.log('='.repeat(80));

{
  store = {};
  const { ensureAssetManagerMigrated } = require('../src/lib/assetManagement/profileMigration');
  const { loadProfiles, loadCurrentProfileId, loadMigrationVersion, DEFAULT_PROFILE_ID } = require('../src/lib/assetManagement/profileStorage');

  ensureAssetManagerMigrated();
  const s1 = { profiles: loadProfiles(), currentProfileId: loadCurrentProfileId(), version: loadMigrationVersion() };
  ensureAssetManagerMigrated();
  const s2 = { profiles: loadProfiles(), currentProfileId: loadCurrentProfileId(), version: loadMigrationVersion() };

  record('1. 空の状態から実行：デフォルトプロファイル(id=\'default\')が作成される',
    s1.profiles.length === 1 && s1.profiles[0].id === DEFAULT_PROFILE_ID, JSON.stringify(s1.profiles));
  record('2. currentProfileIdがdefaultに設定される', s1.currentProfileId === DEFAULT_PROFILE_ID);
  record('3. 2回連続実行しても結果が変わらない（冪等）', JSON.stringify(s1) === JSON.stringify(s2), JSON.stringify(s2));
}

{
  // 「デフォルトプロファイル作成は成功したが、直後にタブが閉じられた」を想定した部分完了状態
  // からの再実行（3節の要件：単純な「空なら実行」ではなく不足分だけ補完する）。
  store = {};
  const { saveProfiles, DEFAULT_PROFILE_ID } = require('../src/lib/assetManagement/profileStorage');
  saveProfiles([{ id: DEFAULT_PROFILE_ID, name: 'デフォルト', birthDate: null, linkedSimulatorProfileId: null }]);
  // currentProfileId・migrationVersionは未設定のまま（部分完了を模擬）。

  const { ensureAssetManagerMigrated } = require('../src/lib/assetManagement/profileMigration');
  const { loadProfiles, loadCurrentProfileId, loadMigrationVersion } = require('../src/lib/assetManagement/profileStorage');
  ensureAssetManagerMigrated();

  record('4. 部分完了状態（プロファイルのみ存在）から再実行：プロファイルが重複作成されない',
    loadProfiles().length === 1, JSON.stringify(loadProfiles()));
  record('5. currentProfileIdが正しく補完される', loadCurrentProfileId() === DEFAULT_PROFILE_ID);
  record('6. migrationVersionが正しく更新される', loadMigrationVersion() >= 1);
}

// ================================================================
// SECTION 2: 複数プロファイル同月データの共存（実装時発見・composite key化の回帰テスト）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【dedupeSnapshotsByDate・addSnapshot：(date, profileId)複合キー化】');
console.log('='.repeat(80));

{
  store = {};
  const { addSnapshot, loadSnapshots } = require('../src/lib/assetManagement/storage');

  const r1 = addSnapshot([{ id: 'a', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 100, updatedAt: '', profileId: 'profileA' }], 'profileA');
  const r2 = addSnapshot([{ id: 'b', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 200, updatedAt: '', profileId: 'profileB' }], 'profileB');

  record('7. 2つのプロファイルが同月に記録しても、両方のスナップショットが残る（date一致だけで上書きされない）',
    r2.snapshots.length === 2 && r2.snapshots.some((s) => s.profileId === 'profileA') && r2.snapshots.some((s) => s.profileId === 'profileB'),
    JSON.stringify(r2.snapshots));

  // 読み込みのたび（自己修復パス）に消えないことも確認。
  const reloaded = loadSnapshots();
  record('8. loadSnapshots()を再度呼んでも両プロファイルの記録が消えない（自己修復ロジックの複合キー化）',
    reloaded.length === 2, JSON.stringify(reloaded));

  // 同一プロファイルが同月に2回記録した場合は、従来通り上書き（1件のまま）。
  const r3 = addSnapshot([{ id: 'a2', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 150, updatedAt: '', profileId: 'profileA' }], 'profileA');
  const profileASnaps = r3.snapshots.filter((s) => s.profileId === 'profileA');
  record('9. 同一プロファイルが同月に2回記録した場合は従来通り1件に上書きされる',
    profileASnaps.length === 1 && profileASnaps[0].totalAmount === 150, JSON.stringify(profileASnaps));
}

// ================================================================
// SECTION 3: profileStore（作成・切替・削除カスケード・0件防止）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【profileStore：作成・切替・削除カスケード】');
console.log('='.repeat(80));

{
  store = {}; // クリーンな状態でストアを初期化する（ensureAssetManagerMigratedがdefaultを作る）

  // profileStore.tsはZustandのcreate()をモジュール評価時に1回だけ実行し、その時点の
  // localStorageを読んでシングルトンの初期状態を確定させる。full-verify.js経由で実行すると、
  // 先に走る別スクリプトがrequireキャッシュに乗せてしまっている可能性があるため、
  // このセクションの直前でrequireキャッシュを明示的に破棄し、現在のシム状態から
  // 改めて初期化させる。
  delete require.cache[require.resolve('../src/lib/assetManagement/profileStore')];

  const { useAssetManagerProfileStore } = require('../src/lib/assetManagement/profileStore');
  const { saveHoldings, loadHoldings } = require('../src/lib/assetManagement/storage');

  const before = useAssetManagerProfileStore.getState().profiles.length;
  record('10. 初期状態：デフォルトプロファイル1件のみ存在する', before === 1, JSON.stringify(useAssetManagerProfileStore.getState().profiles));

  const profileA = useAssetManagerProfileStore.getState().createProfile({ name: 'プロファイルA' });
  const profileB = useAssetManagerProfileStore.getState().createProfile({ name: 'プロファイルB', linkedSimulatorProfileId: 123 });
  record('11. createProfileでUUID形式のidが発行される（\'default\'ではない）',
    profileA.id !== 'default' && profileB.id !== 'default' && profileA.id !== profileB.id, `A=${profileA.id}, B=${profileB.id}`);
  record('12. プロファイル数が3件になる（デフォルト＋A＋B）', useAssetManagerProfileStore.getState().profiles.length === 3);

  useAssetManagerProfileStore.getState().switchProfile(profileA.id);
  record('13. switchProfileでcurrentProfileIdが切り替わる', useAssetManagerProfileStore.getState().currentProfileId === profileA.id);

  // プロファイルAに保有資産を追加してからカスケード削除を確認する。
  saveHoldings([
    ...loadHoldings(),
    { id: 'holdA', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 500, updatedAt: '', profileId: profileA.id },
  ]);
  useAssetManagerProfileStore.getState().deleteProfile(profileA.id);
  const afterDelete = useAssetManagerProfileStore.getState();
  record('14. deleteProfile：プロファイルが一覧から消える', !afterDelete.profiles.some((p) => p.id === profileA.id));
  record('15. deleteProfile：カスケード削除で該当プロファイルの保有資産も消える', !loadHoldings().some((h) => h.profileId === profileA.id));
  record('16. deleteProfile：選択中プロファイルが削除された場合、残存プロファイルの先頭に切り替わる',
    afterDelete.currentProfileId === afterDelete.profiles[0].id, `currentProfileId=${afterDelete.currentProfileId}, remaining[0]=${afterDelete.profiles[0].id}`);

  // 残り2件（デフォルト＋B）からもう1件削除して1件だけにし、そこから削除しようとしてもno-opであることを確認。
  const remainingId = afterDelete.profiles.find((p) => p.id !== 'default' && p.id !== profileB.id)?.id
    ?? afterDelete.profiles.find((p) => p.id !== profileB.id).id;
  useAssetManagerProfileStore.getState().deleteProfile(remainingId);
  const oneLeft = useAssetManagerProfileStore.getState().profiles;
  record('17. 残り1件の状態を作る', oneLeft.length === 1, JSON.stringify(oneLeft));
  useAssetManagerProfileStore.getState().deleteProfile(oneLeft[0].id);
  record('18. 残り1件からの削除はno-op（0件にはならない）', useAssetManagerProfileStore.getState().profiles.length === 1);
}

// ================================================================
// SECTION 4: summarizeProfileHoldings（instruction_phase2_ui_safety_hardening.md 2節）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【summarizeProfileHoldings：上書き確認ダイアログ用の件数・合計金額集計】');
console.log('='.repeat(80));

{
  const { summarizeProfileHoldings } = require('../src/lib/assetManagement/profileSummary');

  const holdings = [
    { id: 'a', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 100, updatedAt: '', profileId: 'p1' },
    { id: 'b', owner: 'personal', accountCategory: 'NISA', assetClass: '全世界株', amount: 250, updatedAt: '', profileId: 'p1' },
    { id: 'c', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 999, updatedAt: '', profileId: 'p2' },
  ];
  const hojinHoldings = [
    { id: 'd', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 500, updatedAt: '', profileId: 'p1' },
  ];

  const p1 = summarizeProfileHoldings(holdings, hojinHoldings, 'p1');
  record('19. 個人2件＋法人1件＝合計3件、金額合計100+250+500=850', p1.count === 3 && p1.totalAmount === 850, JSON.stringify(p1));

  const p2 = summarizeProfileHoldings(holdings, hojinHoldings, 'p2');
  record('20. 個人1件のみ（法人保有なし）＝合計1件、金額999', p2.count === 1 && p2.totalAmount === 999, JSON.stringify(p2));

  const p3 = summarizeProfileHoldings(holdings, hojinHoldings, 'nonexistent-profile');
  record('21. 該当プロファイルの保有資産が無い場合は0件・0円', p3.count === 0 && p3.totalAmount === 0, JSON.stringify(p3));
}

// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: プロファイル基盤・移行処理を確認しました。');
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
