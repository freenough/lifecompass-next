# 実装指示：フェーズ2①最終仕上げ — 同一プロファイル再読込時の確認・保存後dirtyリセットの確認・実機検証の完了化

作成日：2026-08-29
種別：**実装（小規模修正）＋実機検証の再実施**
関連：`instruction_phase2_ui_safety_hardening.md`（本指示で最終化する）

---

## 背景

`instruction_phase2_ui_safety_hardening.md`の完了報告を実コード（`AssetManagerProfilePanel.tsx`／`companyStateStore.ts`）で精査した。1節（CompanyStateの安全策統一）・2節（上書き確認への金額表示）とも設計は正しく実装されているが、以下の1点に実装上の不具合があり、加えて実機検証が不足している。**これが最後の修正・検証で、完了後はデプロイ可能な状態とする。**

---

## 1. 不具合修正：現在アクティブなプロファイルの再読込時に確認ダイアログが出ない

**原因**

- `AssetManagerProfilePanel.tsx`の`handleLoad`（114〜122行）は`id !== currentProfileId`の場合のみ確認ダイアログを出す
- `companyStateStore.ts`の自動リセット（227〜236行の`useAssetManagerProfileStore.subscribe`）は、`currentProfileId`の値が実際に変化した場合のみ発火する
- そのため、**現在アクティブなプロファイルを未保存の変更がある状態でもう一度「読込」した場合**、確認ダイアログが出ないまま`switchProfile(id)`が呼ばれ、CompanyState側は下書きが破棄されるのかどうか保証がない不安定な状態になる

**修正内容**

- `handleLoad`のガード条件から`id !== currentProfileId`を外し、**`holdingsDirty || companyStateDirty`のみを条件にする**（同一プロファイルの再読込でも、未保存の変更があれば必ず確認する）
- `companyStateStore.ts`に、`currentProfileId`を変えずに下書きだけを破棄する新規アクション`discardDraft()`を追加する（`switchProfile`とほぼ同じだが、profileIdの変更を伴わない点が異なる。実装イメージ：`state: getCompanyState(get().currentProfileId), isDirty: false`）
- `handleLoad`内で、確認が通った（OKが押された）場合、`holdingsDirty`なら`onDiscardHoldingsDraft()`を呼ぶのと同様に、**`companyStateDirty`なら`useCompanyStateStore.getState().discardDraft()`を明示的に呼んでから**`switchProfile(id)`を呼ぶこと（`id`が現在と異なる場合は結果的にsubscribeとの二重処理になるが、冪等なので問題ない。`id`が同一の場合はこの明示呼び出しだけが下書きを破棄する唯一の経路になる）

---

## 2. 確認：保存後にdirtyフラグが正しくリセットされるか

`AssetManagementPage.tsx`側の`onOverwriteProfile`／`onCreateProfileFromCurrent`の実装（今回未提出のため未確認）について、以下を確認し、完了報告にコード抜粋を添付すること：

- 名前欄＋保存ボタンで、**現在アクティブなプロファイル自身**を上書き保存した場合（通常の「呼び出す→編集→保存」フロー）、保存完了後に`holdingsDirty`と`companyStateDirty`（`useCompanyStateStore`の`saveDraft()`または同等の処理）が両方`false`に戻り、「未保存の変更があります」表示が消えることを確認する
- もし現状リセットされていない場合は、その場で修正すること（`onOverwriteProfile`内で対象がアクティブ自身のときに`useCompanyStateStore.getState().saveDraft()`相当を呼ぶ、等）

---

## 3. 実機検証（これまで未実施だった項目を含め、スクリーンショット必須）

以下は**文章のみの報告は不可**。すべてスクリーンショットを添付すること。

1. **CompanyStateのみ編集した場合の切替確認**：保有資産は一切編集せず、法人設定（実効税率など）だけを編集（未保存）→別プロファイルへ「読込」を試み、確認ダイアログが出ることを確認
   - キャンセル：切替が起きず、法人設定の編集内容が画面に残っていること
   - OK：切替先プロファイルの保存済み法人設定が表示され、編集内容が破棄されていること
2. **【今回の修正の中心】同一プロファイルの再読込確認**：現在アクティブなプロファイルのまま、保有資産または法人設定のどちらかを編集（未保存）→一覧で**同じ（アクティブな）プロファイルの「読込」**をクリックし、確認ダイアログが出ることを確認
   - キャンセル：下書きがそのまま残ること
   - OK：下書きが破棄され、直前に保存されていた内容に戻ること
3. **保存後のdirtyリセット確認**：現在アクティブなプロファイルを編集→名前欄はそのまま（＝自分自身への上書き保存）→保存ボタンを押す→「未保存の変更があります」の表示が消えること
4. 前回実施済みの上書き確認ダイアログ（件数・金額表示、非アクティブプロファイルへの上書き）は、再実施は不要（前回の確認で十分）

---

## 4. 遵守事項

- ロックファイル（`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）への依存・変更は一切ゼロを維持すること
- シミュレーター側`ProfileDrawer.tsx`自体は変更しない
- 既存テスト（`scripts/verify-*.js`、`full-verify.js`）が全てPASSすることを維持する。1節の修正（同一プロファイル再読込時の確認・`discardDraft()`）に対する検証を追加すること
- 検証は本番相当の実データ環境を使わないこと
- **完了報告には、1節・2節の該当コード抜粋、テスト結果（PASS/FAIL件数）、および3節の3項目すべてのスクリーンショットを必ず添付すること。文章のみの報告は不可。**

---

## 5. 完了報告フォーマット

- 変更したファイル一覧
- `handleLoad`修正後のコード抜粋
- `companyStateStore.ts`の`discardDraft()`実装箇所（コード抜粋）
- `onOverwriteProfile`／`onCreateProfileFromCurrent`のdirtyリセット処理（コード抜粋。既に正しく実装されていた場合はその旨と該当箇所を報告）
- テスト結果（PASS/FAIL件数、前回の1,005件からの増分）
- 3節の3項目それぞれのスクリーンショット
