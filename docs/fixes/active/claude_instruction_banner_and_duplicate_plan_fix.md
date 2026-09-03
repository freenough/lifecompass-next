# 実装指示：①「今すぐ記録する」バナーの日付判定修正／②計画の同名上書き確認

作成日：2026-09-03
種別：**実装指示**
関連：`claude_investigation_two_bugs_banner_and_duplicate_plan.md`（本タスクの調査結果）

---

## 1. 「今すぐ記録する」バナーの日付判定修正

### 1.0 前提（調査で確定した原因）

`isCurrentMonthRecorded()`（`src/lib/assetManagement/monthlyCheck.ts`）が「配列の最後の要素＝日付的に最新」という前提で判定している。この前提が崩れる経路が2つ確認された：

- JSONインポート時（`AssetManagementPage.tsx`の`handleImported()`）、インポート結果を`loadSnapshots()`の自己修復ソートを経由せず、そのまま`setAllSnapshots()`している
- `addSnapshot()`（`src/lib/assetManagement/storage.ts`）自体が、新規追加時に配列をソートし直していない

### 1.0.1 追加確認事項（重要）：CSVインポート経路

KENZOへの聞き取りにより、実際に踏んだ可能性が高いのは**CSVインポートで未来日付をアップロードした**ケースであることが分かった。前回の調査は`applyJsonPayload()`（JSONインポート）の経路しか確認しておらず、**CSVインポートが同じ`handleImported()`を経由しているか、別の独立した実装か**は未確認。

修正に着手する前に、まずCSVインポートの処理関数（`exportImport.ts`内、CSV用の関数を特定すること）を確認し、
- JSON側と同じ`handleImported()`を経由しているなら、1.1の修正（`handleImported()`のソート処理追加）でCSV側もまとめてカバーされる
- 別の独立した処理・別のstate更新経路であれば、そちらにも同様のソート処理を個別に追加すること

### 1.1 修正内容

- **`isCurrentMonthRecorded()`**：配列の最後の要素に依存せず、実際に配列内の最大の`date`を持つレコードを探して判定するよう修正する（`snapshots.length === 0`の早期returnはそのまま維持してよい）
- **`handleImported()`**：インポート結果を`setAllSnapshots()`に渡す前に、日付順にソートする処理を通す。既存の`loadSnapshots()`が使っている`dedupeSnapshotsByDate()`（ソート＋重複排除ロジック）をそのまま再利用できないか確認し、再利用できるならそれを使う（新しいソートロジックを作らない）
- **CSVインポート専用の経路が別途存在する場合**：1.0.1の確認結果に応じて、同様のソート処理をそちらにも追加する
- **`addSnapshot()`**：`saveSnapshots(next)`に渡す前に、`next`配列を日付順にソートする。ここも同じく`dedupeSnapshotsByDate()`の再利用を優先する

### 1.2 変更しないもの

- `loadSnapshots()`自体の自己修復ロジックは変更しない（既に正しく動いている）
- `AssetSnapshot`型・保存先のlocalStorageキーは変更しない

---

## 2. 計画の同名上書き確認

### 2.0 前提（調査で確定した事実）

`PlanManagerPanel.tsx`の`handleSave()`には、既存計画名との重複チェックが一切存在しない。一方`AssetManagerProfilePanel.tsx`の`handleSave()`に、同名時の上書き確認（`window.confirm`）のパターンが既に実装済み。

### 2.1 実装内容

`src/components/assetManagement/PlanManagerPanel.tsx`の`handleSave()`を、以下の流れに変更する（`AssetManagerProfilePanel.tsx`の既存パターンを踏襲すること。新しい確認ダイアログの様式を発明しない）：

1. `@/lib/planSnapshot/storage`から`listPlans`を新規import（既存の`savePlan`と同じモジュール）
2. 保存ボタン押下時、`listPlans(currentProfileId)`を呼び直し（マウント時にキャッシュした一覧ではなく、押下時点の最新一覧を使う。これまでの実装と同じく「保存時点で都度取得」の方針を踏襲）、入力された`name`を`.trim()`したものと**完全一致する既存計画**を`Array.find()`で探す。空文字列（未入力）の場合は重複チェックの対象外とする（`AssetManagerProfilePanel.tsx`と同じ挙動）
3. 一致する計画が見つかった場合：
   - `window.confirm()`で確認する。文言は「上書きすると、既存の計画は削除され、新しい内容に置き換わります」という趣旨が伝わればよい（`AssetManagerProfilePanel.tsx`のような詳細な件数・金額比較までは不要。計画データはグラフなので、同水準の要約は無理に作らなくてよい）
   - 確認OKの場合：`deletePlan(matched.id)`（既に`PlanComparisonSection.tsx`でimport済みの関数、同じものを`PlanManagerPanel.tsx`からもimportして使う）を呼んでから、通常通り`generatePlan()` → `savePlan()`を実行する
   - 確認キャンセルの場合：何もせず処理を中断する（フォームの入力内容は保持したままでよい）
4. 一致する計画が無い場合：これまで通り、確認なしでそのまま保存する

### 2.2 変更しないもの

- `savePlan()`・`listPlans()`・`deletePlan()`自体のロジックは変更しない（呼び出すだけ）
- `MAX_PLANS`の上限ロジックは変更しない

---

## 3. 検証すべきケース

実機で確認し、スクリーンショットを添付すること（テキストでの報告のみは不可）。

### バナー修正
1. 「今すぐ記録する」ボタンを押して当月分を記録した直後、バナーが正しく消えること（回帰確認）
2. **本命の再現ケース**：実際にCSVで未来日付のレコードをアップロードし、その後当月分を記録した状態で、バナーが正しく消えることを確認する（KENZOが実際に踏んだ操作に最も近い形で再現すること）
3. 可能であれば、JSONインポートでも同様に日付順が崩れる状況を再現し、修正後は正しく動作することを確認する

### 同名上書き確認
4. 既存の計画と同じ名前で保存しようとすると、確認ダイアログが出ること。キャンセルすると何も起きず、既存の計画がそのまま残ること
5. 確認OKにすると、古い計画が削除され、新しい内容の計画に置き換わること（一覧の件数が増えず、同名のまま中身だけ更新されること）
6. 名前を空欄のまま複数回保存しても、確認ダイアログが出ずにそのまま複数保存できること（既存の許容挙動を壊していないことの確認）
7. 異なる名前での新規保存は、これまで通り確認なしで保存できること（回帰確認）

## 4. 完了報告のフォーマット

- 修正したファイルパス・関数名を明記
- CSVインポートの経路がJSON側（`handleImported()`）と共通か別実装かの確認結果を明記
- `full-verify.js`のPASS結果
- `tsc`のクリーン結果
- locked filesを変更していないことの確認
- 上記3の検証ケース1〜7それぞれについて、実機スクリーンショットを添付
- コミット・プッシュは行わず、承認を待つこと
