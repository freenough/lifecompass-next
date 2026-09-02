/**
 * scripts/verify-profile-link-ui.js
 * claude_instruction_phase2_yojitsu_link_ui.md の回帰テスト。
 *   useAssetManagerProfileStoreのlinkSimulatorProfile/unlinkSimulatorProfile（既存アクション、
 *   今回初めてテストカバレッジを追加）。UIコンポーネント（ProfileLinkControl）自体は
 *   実機ブラウザ確認で担保し、ここではUIが呼び出すストアの契約を直接検証する。
 *
 * 本番のuseAssetManagerProfileStoreを直接importして呼び出すだけで、独自の再実装は含まない。
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

const { useAssetManagerProfileStore } = require('../src/lib/assetManagement/profileStore');

console.log('='.repeat(80));
console.log('【linkSimulatorProfile / unlinkSimulatorProfile】');
console.log('='.repeat(80));
{
  global.localStorage.clear();
  const created = useAssetManagerProfileStore.getState().createProfile({ name: 'テストA', birthDate: null, linkedSimulatorProfileId: null });
  record('1. createProfile直後はlinkedSimulatorProfileIdがnull', created.linkedSimulatorProfileId === null);

  useAssetManagerProfileStore.getState().linkSimulatorProfile(created.id, 12345);
  const afterLink = useAssetManagerProfileStore.getState().profiles.find((p) => p.id === created.id);
  record('2. linkSimulatorProfile後、storeのlinkedSimulatorProfileIdが更新される', afterLink.linkedSimulatorProfileId === 12345);

  const persisted = JSON.parse(global.localStorage.getItem('assetManagerProfiles')).find((p) => p.id === created.id);
  record('3. linkSimulatorProfileの結果がlocalStorageにも永続化される', persisted.linkedSimulatorProfileId === 12345);

  useAssetManagerProfileStore.getState().unlinkSimulatorProfile(created.id);
  const afterUnlink = useAssetManagerProfileStore.getState().profiles.find((p) => p.id === created.id);
  record('4. unlinkSimulatorProfile後、linkedSimulatorProfileIdがnullに戻る（既存ボタンの回帰確認）', afterUnlink.linkedSimulatorProfileId === null);

  // claude_instruction_phase2_yojitsu_polish.md 1節：unlinkSimulatorProfile自体は「リンク切れ」か
  // 「正常な連携」かを一切区別しない（引数のidに対して常に同じ処理をするだけ）ことを明示的に確認する。
  // 従来のバグは「解除ボタンをUI側でリンク切れ時にしか出していなかった」だけで、ストアの挙動自体は
  // 元から正しかった（AssetManagerProfilePanel.tsxのボタン表示条件の修正のみで対応できた理由）。
  const linkedAgain = useAssetManagerProfileStore.getState().createProfile({ name: 'テストD', birthDate: null, linkedSimulatorProfileId: null });
  useAssetManagerProfileStore.getState().linkSimulatorProfile(linkedAgain.id, 42); // 42は正常な（=壊れていない想定の）連携先id
  useAssetManagerProfileStore.getState().unlinkSimulatorProfile(linkedAgain.id);
  const afterValidUnlink = useAssetManagerProfileStore.getState().profiles.find((p) => p.id === linkedAgain.id);
  record('5. 正常な連携（リンク切れではない）状態からもunlinkSimulatorProfileで解除できる', afterValidUnlink.linkedSimulatorProfileId === null);

  // 指示書3節：重複チェックは行わない仕様（1つのシミュレータープロファイルに複数の資産管理ツール
  // プロファイルがリンクされる状態を許容する）ことの確認。
  const createdB = useAssetManagerProfileStore.getState().createProfile({ name: 'テストB', birthDate: null, linkedSimulatorProfileId: null });
  useAssetManagerProfileStore.getState().linkSimulatorProfile(created.id, 999);
  useAssetManagerProfileStore.getState().linkSimulatorProfile(createdB.id, 999);
  const both = useAssetManagerProfileStore.getState().profiles;
  const bothLinked = both.find((p) => p.id === created.id).linkedSimulatorProfileId === 999
    && both.find((p) => p.id === createdB.id).linkedSimulatorProfileId === 999;
  record('6. 同一シミュレータープロファイルへ複数の資産管理ツールプロファイルがリンク可能（重複チェックなし、仕様通り）', bothLinked);

  // 他プロファイルの状態に影響しないこと
  const createdC = useAssetManagerProfileStore.getState().createProfile({ name: 'テストC', birthDate: null, linkedSimulatorProfileId: null });
  useAssetManagerProfileStore.getState().linkSimulatorProfile(created.id, 111);
  const cUnaffected = useAssetManagerProfileStore.getState().profiles.find((p) => p.id === createdC.id).linkedSimulatorProfileId === null;
  record('7. あるプロファイルのlinkSimulatorProfileが他プロファイルに影響しない', cUnaffected);
}

console.log('='.repeat(80));
console.log(`結果: PASS=${pass} FAIL=${fail}`);
if (fail > 0) {
  console.log('--- FAILED CASES ---');
  failedCases.forEach((c) => console.log(`  - ${c.label}${c.detail ? ' — ' + c.detail : ''}`));
  process.exitCode = 1;
}
