# 調査依頼：予実比較「計画を保存」フローへのextraEvents（法人取崩）トグル追加 前提調査

作成日：2026-09-02
種別：**調査のみ（実装は行わない）**
関連：`claude_investigation_phase2_yojitsu_v2_prereq.md`（1.1で`generatePlan.ts`の現状を確認済み）／`NEXT_CHAT_PROMPT_phase2_yojitsu_v2.md`（2.2）

---

## 0. 前提

前回の調査で、`generatePlan()`（`src/lib/planSnapshot/generatePlan.ts`）は`useSimulatorStore`を一切importせず、`profile.events`（永続化された個人イベントのみ）だけを`simulate()`に渡す設計であることが確認済み。これはこのファイル単体の設計として意図的なもの。

今回追加したいのは、**呼び出し元（UIコンポーネント）が、現在の法人取崩トグルの状態を`useSimulatorStore`から読み取り、`generatePlan()`に明示的に渡す**という構成。この構成を正しく設計するために、以下を確認してほしい。

---

## 1. 調査してほしいこと

### 1.1 `generatePlan()`の呼び出し元

- `generatePlan(`で全文検索し、実際に呼び出している箇所（コンポーネント名・ファイルパス）をすべて列挙する
- 「計画を保存」ボタンに対応するUIコンポーネントを特定し、現在どういう引数（`opts`）を渡しているか実コードを引用する
- そのコンポーネントは現在`useSimulatorStore`をimportしているか（既にimport済みなら追加の依存追加は不要、していなければ新規importが必要になる）

### 1.2 既存の法人取崩トグル（`extraEvents`）の型・保持場所

- メインシミュレーターの`combined`表示で使われている「法人取崩トグルON時に個人カーブへ織り込まれる`extraEvents`」が、`useSimulatorStore`（`src/lib/simulatorStore.ts`）上でどのフィールド名・どの型で保持されているか実コードを引用する
- そのフィールドの型が`LifeEvent[]`と互換性があるか（`generatePlan.ts`が現在`profile.events`として渡している型と同じ配列要素型かどうか）を確認する
- このトグルのON/OFF状態自体を保持しているフィールド（例：boolean）があれば、そのフィールド名も報告する
- 法人取崩トグルがOFFのときに、このフィールドの値がどうなるか（空配列か、undefinedか、無関係な値を含んだままか）を確認する

### 1.3 `simulate()`側のイベントマージの安全性

- `simulate()`（locked file）が受け取る`events`引数について、個人の`profile.events`と法人由来の`extraEvents`を単純に配列結合（`[...profile.events, ...extraEvents]`）した場合に、重複・競合・順序依存などの問題が起きないか、`simulate()`の該当箇所を読んで確認する（`simulate.ts`は変更しない。読むだけ）
- `generateMcPercentiles()`（`generatePlan.ts`内の補助関数）についても同様に、結合後の`evs`をそのまま渡して問題ないか確認する

---

## 2. 報告フォーマット

- ファイルパス・関数名・関連コードを引用
- 1.1〜1.3それぞれについて、確認できた事実を明記
- 不明瞭な場合は推測で埋めず、その旨を報告する

## 3. やらないこと

- `generatePlan()`のシグネチャ変更
- UIへのトグル追加
- 既存ファイルの変更（locked files含む）

以上は、本調査結果をもとにこのチャットで設計を確定させたうえで、別途の実装指示書で依頼する。
