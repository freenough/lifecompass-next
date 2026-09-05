# 実装指示：予実比較機能 V1（個人のみ・計画保存＋比較表示）

作成日：2026-08-31
種別：**実装（新規機能）**
関連：`NEXT_CHAT_PROMPT_phase2_yojitsu.md`（引き継ぎ）／`claude_investigation_phase2_yojitsu_snapshot.md`／`claude_investigation_phase2_yojitsu_simulate_breakdown.md`／`claude_investigation_phase2_yojitsu_axis_consistency.md`（3件の調査、いずれも実装なし・読み取りのみで完了済み）

---

## 0. 背景・スコープの確定

一連の調査・設計協議の結果、以下が確定している。

- **V1の対象は「個人のみ」パターンに限定する**（法人取崩を含むパターンは将来のV2として今回は完全に対象外。法人関連の型・保存対象には一切含めない）
- 計画（シミュレーション結果）を保存し、資産管理ツール側の実績（記録済みスナップショット）と重ねて表示する
- 固定モード・MCモード**両方**を計画として保存し、比較ビューで切替表示できるようにする（2.2確定）
- 比較の粒度は**総資産額のみ**。ただし将来（口座別内訳）拡張時に型の作り直しが発生しないよう、データスキーマには`byAccount`用のフィールドをあらかじめ用意しておく（v1では常に`null`のまま、UIにも出さない）
- 保存先は、個人・法人を分けず**資産管理ツール側の1つのプロファイル**に統一（2.3確定）。V1は法人を扱わないため実質的には個人プロファイルへの保存のみ
- 複数の計画を時系列で保存・管理できるようにする（一覧・命名・削除。2.4確定）
- 実績側は月次の点でしかないため、比較表示には**その実績が何年何月時点の記録か**を明示する

---

## 1. 計画データの型定義

新規ファイル `src/lib/planSnapshot/types.ts` に以下を定義する（ロックファイルには追加しない、独立した新規モジュール）。

```typescript
export interface PlanCurvePoint {
  age: number;
  totalAssets: number; // YearSnapのtotalAssetsをそのまま使う（personalOnly、口座別合算済みの値）
}

export interface PlanPercentilePoint {
  age: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface PlanSnapshot {
  id: string;                 // 新規発行（crypto.randomUUID()等、既存コードの採番方式に合わせる）
  profileId: string;          // 保存先の資産管理ツールプロファイルid
  simulatorProfileId: number; // 生成元のシミュレータープロファイルid（useSimulatorStore.currentProfileId）
  strategy: string;           // WithdrawalStrategy（取崩戦略）、生成時点の設定を記録
  name: string;                // ユーザー命名。未入力時のデフォルトは "計画 YYYY-MM-DD"
  createdAt: string;           // ISO日時
  savedAtAge: number;          // 生成時点の年齢（実績との年月変換に使う）
  savedAtYearMonth: string;    // 生成時点の年月（"YYYY-MM"）。savedAtAgeと組み合わせて任意の年齢→年月を逆算する基準点にする
  fixed: {
    curve: PlanCurvePoint[];
    byAccount: null;           // 将来拡張用の予約フィールド。v1では常にnull
  };
  mc: {
    percentiles: PlanPercentilePoint[];
    byAccount: null;           // 将来拡張用の予約フィールド。v1では常にnull
  } | null;                    // MC実行に失敗した場合等はnullを許容
}
```

---

## 2. 計画生成ロジック（simulate()/analyze()/MCの呼び出し）

新規ファイル `src/lib/planSnapshot/generatePlan.ts` を作成する。

**呼び出し方針（調査済みの先例に従う）**

- `simulate()`・`analyze()`は直接importしてよい（`simulatorStore.ts`・`hojinCompanyState/mc.ts`と同じ先例）
- `montecarlo.ts`（`runMC()`）は**直接importしない**。`hojinCompanyState/mc.ts`と同じ方針で、パーセンタイル集計ロジック（試行ループ→`simulate()`を複数回呼びp10/p50/p90を算出する部分）をこのファイル内に複製すること。既存の`montecarlo.ts`の集計ロジックを読み、同等の処理を独立実装する
- 入力は`profile.ts`の`profileToSimParams(profile: ProfileV3): SimParams`を経由して作る（新しい変換ロジックを作らない）

**【重要】V1は個人のみを強制すること**

現在のプロファイルでCompanyState連携（法人取崩トグル）がONになっていても、計画生成時は**必ずOFF相当（法人由来の`extraEvents`を一切含まない状態）でシミュレーションを実行すること**。トグルの現在値を見て分岐するのではなく、計画生成の入力を組み立てる際に法人由来のイベントを明示的に除外する実装にすること（該当ロジックは`simulatorStore.ts`のcombined計算部分を読み、「法人由来のextraEvents」がどこで注入されているかを特定した上で、それを含まない形でSimParams/LifeEvent[]を組み立てること）。

**関数シグネチャ（例）**

```typescript
export function generatePlan(
  profile: ProfileV3,
  opts: { profileId: string; simulatorProfileId: number; name?: string }
): PlanSnapshot
```

内部で固定モードのcurve（`YearSnap[]`から`age`・`totalAssets`だけ抽出）とMCモードのpercentiles（複製した集計ロジックの出力を`age`付きに整形）の両方を生成し、`PlanSnapshot`として返す。

---

## 3. 保存・管理（storage）

新規ファイル `src/lib/planSnapshot/storage.ts` を作成する。既存の`AssetSnapshot`用storage（`assetManagement/storage.ts`）の設計パターン（キー設計・上限管理）を踏襲すること。

- 関数：`listPlans(profileId: string): PlanSnapshot[]` / `savePlan(plan: PlanSnapshot): void` / `deletePlan(planId: string): void` / `renamePlan(planId: string, name: string): void` / `getLatestPlan(profileId: string): PlanSnapshot | null`
- 保存件数の上限：1プロファイルあたり最大20件（上限到達時は最も古い計画から削除。`AssetSnapshot`の`MAX_SNAPSHOTS`と同じ考え方で`MAX_PLANS`定数を`config.ts`相当の場所に追加してよい）
- localStorageのキー名は既存の命名規則（`lifeCompassAssetSnapshots`等）に合わせること

---

## 4. UI：計画の保存操作

**設置場所**：資産管理ツール画面（`AssetManagementPage.tsx`）側に設置する。シミュレーター画面は変更しない。

- 現在アクティブな資産管理ツールプロファイルに`linkedSimulatorProfileId`（`claude_instruction_phase2_profile_linking.md`で実装済みのプロファイル連携機能）が設定されている場合のみ、「計画を保存」ボタンを有効化する
- 未連携の場合はボタンを無効化し、「シミュレータープロファイルと連携すると計画を保存できます」等、連携を促す注記を表示する（新規の連携UIは作らない。既存の連携機能を使うよう案内するのみ）
- ボタン押下時：連携された`simulatorProfileId`のプロファイル設定を読み込み、`generatePlan()`を呼び出し、結果を現在の資産管理ツールプロファイルの`profileId`に紐づけて`savePlan()`する
- 保存時に名前を入力できるようにする（未入力時はデフォルト名を使う）

---

## 5. UI：予実比較ビュー

**設置場所**：資産管理ツール画面に新規セクションとして追加する（既存の「資産推移」セクションの近辺）。

**表示内容**

- 折れ線グラフ：
  - 計画（固定モード）のcurveを連続した線で表示
  - 計画（MCモード）のpercentilesをp10-p90のバンドとして重ねて表示できる切替（固定/MC切替、2.2確定）
  - 実績（`AssetSnapshot`のtotalAmount推移）を点または線で重ねる。個人のみのデータを使うこと（`displayScope`は無視し、常に個人のみで比較する。合算表示は今回対象外）
  - 各実績点には「何年何月時点の記録か」を明示するラベル・ツールチップ等を付ける
- 計画の年齢軸と実績の年月軸を揃えるため、`savedAtAge`/`savedAtYearMonth`を基準にして、計画側の各`age`をカレンダー年月に変換して横軸を揃えること
- 比較対象の計画を選択するセレクター（デフォルトは`getLatestPlan()`で取得する最新の計画）
- 計画の一覧・命名変更・削除UI（既存のプロファイル管理モーダルと同様のパターンで実装してよい）

---

## 6. 遵守事項

- ロックファイル（`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）への変更は一切ゼロ。`simulate.ts`/`analyze.ts`は直接importしてよいが、`montecarlo.ts`は直接importせず集計ロジックを複製すること
- `ProfileDrawer.tsx`・`simulatorStore.ts`（シミュレーター本体）は一切変更しない。計画生成の入力は、既存プロファイルの保存済み設定を読み取って組み立てるのみで、シミュレーター画面のフローには影響を与えないこと
- 法人（CompanyState、hojin関連）のデータ・ロジックは、今回の計画データ・比較ビューに一切含めないこと（型にもUIにも出さない）
- 既存テスト（`full-verify.js`等）が全てPASSすることを維持し、新機能に対するテストを追加すること
- 検証は本番相当の実データ環境を使わないこと
- 完了報告には必ず実際のコード抜粋・テスト結果・実機確認結果（スクリーンショット）を添付すること（推測や文章のみの報告は不可）

---

## 7. 完了報告フォーマット

- 変更・新規作成したファイル一覧
- `PlanSnapshot`型定義、`generatePlan()`の実装（特に「法人由来のextraEventsを除外している」部分と「montecarlo.tsを直接importせず集計ロジックを複製した」部分）の該当コード抜粋
- storage実装（`MAX_PLANS`上限含む）の該当コード抜粋
- テスト結果（PASS/FAIL件数、`full-verify.js`の`[PASS]`表記と表形式PASSを分けて数え重複がないか確認したもの）
- 実機ブラウザでの動作確認（スクリーンショット必須）：
  1. シミュレータープロファイルと連携済みの資産管理ツールプロファイルで「計画を保存」を実行し、計画が保存されること
  2. 未連携のプロファイルではボタンが無効化され、案内文が表示されること
  3. 予実比較ビューに、計画の固定モードカーブと実績の点（年月ラベル付き）が正しく重なって表示されること
  4. MCモードのバンド表示への切替が機能すること
  5. 計画を複数回保存し、一覧・命名変更・削除・比較対象の選択が機能すること
  6. 法人設定を持つプロファイルで計画を保存しても、法人分の値が一切計画データ・比較表示に混入しないこと
