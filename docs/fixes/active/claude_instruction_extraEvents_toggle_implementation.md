# 実装指示：予実比較「計画を保存」への法人取崩（extraEvents）トグル追加

作成日：2026-09-02
種別：**実装指示**
関連：`claude_investigation_extraEvents_toggle_prereq.md`（本タスクの調査結果）／`NEXT_CHAT_PROMPT_phase2_yojitsu_v2.md`（2.2）

---

## 0. 前提（調査で確定した事実）

- `generatePlan()`の呼び出し元は本番コード上`src/components/assetManagement/PlanManagerPanel.tsx`の`handleSave()`（35〜58行目）1箇所のみ
- 法人取崩の`extraEvents`は`src/store/simulatorStore.ts`の`extraEvents: LifeEvent[]`に保持されている。ON/OFFの実体は`useCompanyStateStore`（`src/lib/hojinCompanyState/companyStateStore.ts`）の`settings.includeInPersonalSimulator`
- トグルOFF時は`setExtraEvents([])`が即座に呼ばれるため、`useSimulatorStore.getState().extraEvents`は常に信頼できる現在値
- `profile.events`と`extraEvents`の単純配列結合（`[...profile.events, ...extraEvents]`）は、`simulatorStore.ts`の`runAll()`・`buildCombinedSimulationInput()`で既に同一パターンが本番稼働中であり、`simulate()`側も結合順に依存しないことを確認済み

---

## 1. 実装内容

### 1.1 `src/lib/planSnapshot/generatePlan.ts`

- `generatePlan()`の`opts`型に`extraEvents?: LifeEvent[]`を追加
- 関数内部で、個人イベント（`rawProfile.events`）と`opts.extraEvents`を以下のパターンでマージしてから`simulate()`/`generateMcPercentiles()`に渡す（`runAll()`と同一パターンを踏襲すること）：
  ```
  const evs = opts.extraEvents && opts.extraEvents.length > 0
    ? [...rawProfile.events, ...opts.extraEvents]
    : rawProfile.events;
  ```
- 既存の「`useSimulatorStore`を一切importしない」という設計意図（ファイル冒頭コメント）は維持する。今回追加するのは呼び出し元から渡された配列を受け取るだけで、この関数自身がstoreを参照するわけではない

### 1.2 `src/components/assetManagement/PlanManagerPanel.tsx`

- 保存フォーム（`name`入力のあたり）に、「法人取崩を織り込む」チェックボックスを新設する
- チェックボックスの初期値：フォームを開いた時点で`useCompanyStateStore`から`settings.includeInPersonalSimulator`を読み、その値を初期チェック状態にする（以後はユーザーが保存前に自由に変更できる、通常のcontrolled checkbox）
- `useSimulatorStore`の新規import（現状未import）が必要
- `handleSave()`内で、チェックがONの場合のみ`extraEvents: useSimulatorStore.getState().extraEvents`（保存ボタン押下時点のライブ値）を`generatePlan()`の`opts`に含めて渡す。OFFの場合は`extraEvents`を渡さない（`undefined`のまま、`generatePlan.ts`側のデフォルト挙動＝個人単体に委ねる）
- 法人設定が無いプロファイルでチェックをONにした場合の特別なハンドリング（無効化・非表示等）は不要。`extraEvents`が空配列であれば実質的に個人単体と同じ結果になるだけなので、UIとしては常にチェックボックスを表示してよい

### 1.3 変更しないもの

- `PlanSnapshot`型（`src/lib/planSnapshot/types.ts`）は変更しない。法人関連フィールドは追加しない
- `simulate.ts`（locked file）は変更しない
- `simulatorStore.ts`（locked file）は変更しない。今回は既存の`extraEvents`を読むだけで、書き込み・構造変更は行わない
- `useCompanyStateStore`側の実装は変更しない。既存の`settings.includeInPersonalSimulator`を読むだけ

---

## 2. 検証すべきケース

実機で確認し、スクリーンショットを添付すること（テキストでの報告のみは不可）。

1. 法人取崩トグルがONの状態（メインシミュレーター側で法人込みの`combined`表示になっている状態）で、資産管理ツールから「計画を保存」を行い、チェックボックスがデフォルトでONになっていることを確認
2. その状態のまま保存し、「予実比較」の計画カーブが、法人取崩を織り込んだ形（法人資産取り崩し分だけ個人カーブが上振れる）になっていることを確認。可能であれば、同一プロファイル・同一設定でチェックOFFのまま保存した計画と並べて、2本のカーブに差が出ることを比較確認する
3. 法人取崩トグルがOFFの状態で保存した場合、チェックボックスがデフォルトでOFFになっており、生成される計画がV1までと同じ（個人単体）カーブになることを確認（回帰確認）
4. 法人設定が全く無い（法人保有資産0円）プロファイルでチェックをONにして保存しても、エラーにならず個人単体と同じ結果になることを確認

## 3. 完了報告のフォーマット

- 修正したファイルパス・関数名を明記
- `full-verify.js`のPASS結果
- `tsc`のクリーン結果
- locked filesを変更していないことの確認（`git diff --stat`等）
- 上記2の検証ケース1〜4それぞれについて、実機スクリーンショットを添付
- コミット・プッシュは行わず、承認を待つこと
