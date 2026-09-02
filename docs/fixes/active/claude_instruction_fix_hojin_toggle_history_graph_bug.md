# 実装指示：法人資産トグルON時に個人記録が消える不具合の修正

作成日：2026-09-02
種別：**実装指示**
関連：`claude_investigation_hojin_toggle_history_graph_bug.md`（本タスクの調査結果）

---

## 0. 前提（調査で確定した原因）

`includeCorporate=true`（法人資産トグルON）時に描画される以下3コンポーネントすべてが、「記録の行が存在するか」の判定を法人スナップショット配列（`snapshots`引数、hojin側）のみを土台にしている。`personalSnapshots`（個人単独の記録）は各行の金額補正にのみ使われ、行の存在自体には反映されていない。そのため法人スナップショットが0件のプロファイルでは、個人側に何件記録があっても「記録なし」表示になる。

対象3箇所：
1. `src/components/hojinAssetManagement/HojinAssetSnapshotHistory.tsx`（資産推移グラフ・記録履歴テーブル）
2. `src/components/hojinAssetManagement/HojinAssetProgressPanel.tsx`（「前回記録比」カード、53行目の`latest`）
3. `src/components/hojinAssetManagement/HojinAssetAllocationChangeTable.tsx`（資産配分変化テーブル、32〜33行目の`latest`）

---

## 1. 修正方針

「記録の行が存在するかどうか」の土台を、**法人スナップショットの日付集合と個人スナップショットの日付集合の和集合**に変更する。

- ある年月について、`personalSnapshots`または`hojinSnapshots`のどちらか（または両方）にその日付のレコードがあれば、その年月の行は「存在する」ものとして扱う
- 各行の個人側の値：その日付の`personalSnapshots`のレコードがあればそれを使う。無ければ、その日付の`hojinSnapshots`レコード内の`personalHoldings`（合算記録時に自動キャプチャされた個人資産のライブ値）を使う
- 各行の法人側の値：その日付の`hojinSnapshots`のレコードがあればそれを使う。無ければ0円として扱う
- `displayScope==='personalOnly'`の場合、法人側の値は表示に使わない（既存の`toPoint()`等の表示ロジックはそのまま流用してよい）。今回変更するのは「行が存在するかどうかの判定」のみで、表示金額の計算ロジック自体（`personalTotalForSnapshot()`等）は変更しない

## 2. 実装の進め方

- 3箇所で同じロジックがバラバラに実装されるとまた同じ種類のズレが起きるため、「和集合の日付リストを作るヘルパー関数」を1つ新設し、3箇所から共通で使うこと。配置場所（新規ファイルか、`hojinAssetManagement`配下の既存の小さいutilファイルか）はClaude Codeの判断でよいが、配置場所を完了報告に明記すること
- ヘルパー関数の入出力の形（例：日付でソート済みの統合レコード配列を返す等）は、既存の`chartPoints`/`ascending`/`descending`（`HojinAssetSnapshotHistory.tsx`）や`latest`（他2ファイル）で使いやすい形にしてよい。無理に3箇所を完全に同一のインターフェースに揃える必要はない
- 既存の表示ロジック（`toPoint()`、`personalTotalForSnapshot()`、`displayScope`による出し分け等）は変更しない。今回はあくまで「行の存在判定の土台」の修正に限定する
- `locked files`（`simulate.ts`、`analyze.ts`、`PortfolioPanel.tsx`、`simulatorStore.ts`、`profile.ts`、`blog.ts`、`blogTopics.ts`、`concerns.ts`、`ConcernCard.tsx`）は今回一切関係しないはずだが、念のため触れていないことを完了報告で確認すること

## 3. 検証すべきケース

修正後、以下の状態で実機確認すること（推測やコードレビューだけで「直った」と報告しないこと。実際にブラウザで操作し、スクリーンショットを添付すること）：

1. **今回の再現ケース**：法人保有資産0円（法人スナップショット0件）・個人記録9件のプロファイルで、法人トグルをONにする → 「資産推移」グラフ・記録履歴テーブルに個人の9件がそのまま表示されること
2. 同条件で「前回記録比」カードが「比較対象がありません」ではなく、個人記録同士の前回比較が出ること
3. 同条件で資産配分変化テーブルが非表示（null）にならず、個人分のデータで表示されること
4. **回帰確認**：法人スナップショットが実際に複数件存在するプロファイルで、法人トグルONの表示が従来通り正しいこと（法人記録がある場合の挙動を壊していないこと）
5. **回帰確認**：法人トグルOFF時（`AssetSnapshotHistory.tsx`側、今回の修正対象外）の表示が変わっていないこと

## 4. 完了報告のフォーマット

- 修正した関数名・ファイルパスを明記（行番号ではなく関数名で）
- 新設したヘルパー関数の配置場所と役割
- `full-verify.js`のPASS結果
- `tsc`のクリーン結果
- 上記3の検証ケース1〜5それぞれについて、実機スクリーンショットを添付
- コミット・プッシュは行わず、KENZOの承認を待つこと
