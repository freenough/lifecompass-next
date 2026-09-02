# 実装指示（再設計版）：法人取崩extraEventsを永続化データから再計算する

作成日：2026-09-02
種別：**実装指示**
関連：`claude_instruction_extraEvents_toggle_implementation.md`（前回実装、ページ跨ぎで機能しない不具合が判明したため本指示で置き換え）／`claude_investigation_extraEvents_persisted_recompute.md`（本タスクの調査結果）

---

## 0. 前提（再設計の理由）

前回実装は`useSimulatorStore.getState().extraEvents`（ライブstate）に依存しており、資産管理ページとメインシミュレーターページが別ページである以上、ページ跨ぎで値が空になる不具合があった。

調査の結果、`generatePlan()`が既に`simulatorProfile`を`loadSimulatorProfiles()`（永続化データ）から読んでいるのと同じパターンで、法人側も`getCompanyStateForProfile(simulatorProfileId)`（永続化データ、`src/lib/hojinCompanyState/storageByProfile.ts`）から都度再計算すれば、ページ跨ぎに関係なく安定して動作することが確認できた。**個人側プロファイルと同じ「最後にシミュレーター画面で保存した時点」を基準にする設計に統一する**（新しい種類の不整合を持ち込むわけではない）。

---

## 1. 実装内容

### 1.1 `src/lib/planSnapshot/generatePlan.ts`

- 前回実装済みの`opts.extraEvents?: LifeEvent[]`と、そのマージロジック（`[...rawProfile.events, ...opts.extraEvents]`）はそのまま維持。変更不要
- `generatePlan()`自身は依然として`useSimulatorStore`も`useCompanyStateStore`も一切importしない（呼び出し元から配列を受け取るだけ、という設計は変えない）

### 1.2 `src/components/assetManagement/PlanManagerPanel.tsx`

**前回実装したuseSimulatorStore依存の`extraEvents`取得ロジックは削除し、以下に置き換える。**

- 新規import：
  - `getCompanyStateForProfile`（`@/lib/hojinCompanyState/storageByProfile`）
  - `simulateCorporateAssets`、`buildCorporateGeneratedEventsFromSnaps`（それぞれの定義元ファイルから、`CorporateSettingsSection.tsx`と同じimport元を確認して使うこと）
  - `profileToSimParams`（`generatePlan.ts`が既に使っているものと同じ関数。`PlanManagerPanel.tsx`側でも呼び出す必要がある）
- `useSimulatorStore`のimportは不要（前回追加していた場合は削除する）

**チェックボックスの初期値：**
- `linkedSimulatorProfileId`が確定した時点（マウント時／プロファイル切替時）で`getCompanyStateForProfile(linkedSimulatorProfileId)`を呼び、`companyState.settings.includeInPersonalSimulator`を初期チェック状態にする

**`handleSave()`内の`extraEvents`構築：**
- 保存ボタン押下時点で改めて`getCompanyStateForProfile(linkedSimulatorProfileId)`を呼び直す（マウント時の値をキャッシュしたまま使い回さない。安価な計算なので都度呼んで問題ない）
- チェックがONの場合のみ、以下の手順で`extraEvents`を構築して`generatePlan()`の`opts`に渡す：
  ```
  const companyState = getCompanyStateForProfile(linkedSimulatorProfileId);
  const p = profileToSimParams(simulatorProfile); // 既にhandleSave内で読み込み済みのsimulatorProfileを使う
  const corporateSnaps = simulateCorporateAssets(
    companyState.settings,
    p.curAge,
    p.lifeEx,
    companyState.portfolio,
    companyState.events,
    null,
  );
  const extraEvents = buildCorporateGeneratedEventsFromSnaps(
    corporateSnaps,
    companyState.settings.effectiveTaxRate,
  );
  ```
- チェックがOFFの場合は`extraEvents`を渡さない（前回実装と同じ挙動）

**UI文言：**
- チェックボックスの近くに、小さな注記を追加する：「最後にシミュレーター画面で保存した時点の法人設定を使用します」（文言はこの趣旨が伝われば多少の言い回し変更は可）

### 1.3 変更しないもの

- `PlanSnapshot`型は変更しない
- `simulate.ts`・`simulatorStore.ts`（locked files）は変更しない
- `useCompanyStateStore`・`companyStateStore.ts`・`storageByProfile.ts`側の実装は変更しない（読み出すだけ）
- `CorporateSettingsSection.tsx`は変更しない

---

## 2. 検証すべきケース

実機で確認し、スクリーンショットを添付すること（テキストでの報告のみは不可）。

1. **本命のページ跨ぎケース**：メインシミュレーターページで法人取崩トグルをONにして「保存」を押し、その後**別ページ（資産管理ページ）に遷移**してから「計画を保存」を行う。チェックボックスがデフォルトでONになり、生成される計画に法人取崩が正しく織り込まれていることを確認（前回実装ではこれが空になっていた）
2. 上記と同一条件で、ブラウザをリロードしてから資産管理ページを開いても、チェックボックスのデフォルト値・計算結果が変わらないことを確認（永続化データ基準になっていることの確認）
3. 法人取崩トグルがOFFのまま保存されたプロファイルで、チェックボックスがデフォルトでOFFになり、個人単体の計画が生成されることを確認（回帰確認）
4. トグルを切り替えただけで「保存」を押さずに資産管理ページに遷移した場合、チェックボックスの初期値が「最後に保存した時点」の値のままになる（切り替え後の値ではない）ことを確認し、スクリーンショットで実際にそうなっていることを示す
5. 法人設定が全く無い（法人保有資産0円）プロファイルでチェックをONにしても、エラーにならず個人単体と同じ結果になることを確認

## 3. 完了報告のフォーマット

- 修正したファイルパス・関数名を明記
- `full-verify.js`のPASS結果
- `tsc`のクリーン結果
- locked filesを変更していないことの確認（`git diff --stat`等）
- 上記2の検証ケース1〜5それぞれについて、実機スクリーンショットを添付
- コミット・プッシュは行わず、承認を待つこと
