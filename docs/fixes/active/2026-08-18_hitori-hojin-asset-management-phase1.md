# 実装指示書：Hitori-Hojin 法人資産管理ツール Phase1

作成日：2026-08-18
対象リポジトリ：`lifecompass-next`
ステータス：実装指示（Stage 3設計確定を踏まえて作成）

---

## 0. 事前調査（実装着手前に必ず実施・報告すること）

以下2点は、このチャットの議論だけでは正確な値を確認できていない。**実装前に調査し、結果を報告してから該当箇所の実装を進めること。**

### 0.1 個人側`owner`フィールドの実際の挙動確認

`src/lib/assetManagement/types.ts`（および`AssetHoldingCard.tsx`等の実装）を確認し、以下を報告すること：

- `owner`フィールドの型に`'corporate'`が含まれているか
- 含まれている場合、実際にPhase1のUI（個人資産管理ツール `/asset-simulator/assets`）で選択肢として表示されているか

**確認事項の背景**：個人側ツールは個人資産のみを扱う設計であるべきで、法人保有分の入力は今回新規に作る法人ツール側で行う。もし個人側UIに`corporate`が選択肢として実際に露出している場合、個人側の修正（選択肢除外）が必要になる可能性がある。ただし個人側ツール本体の修正は本指示書のスコープ外であり、露出が確認された場合は実装を進めず、まず報告すること。

### 0.2 スナップショット保存上限件数の確認

`src/lib/assetManagement/storage.ts` および `monthlyCheck.ts` を確認し、現在の資産推移スナップショットの保存上限件数（何件、または何か月分か）を報告すること。KENZOの記憶では「2年分（24か月分）」で確定していたはずだが、この指示書作成時点では裏付けが取れていない。

**この結果は以下に影響する**：
- 法人側スナップショットの保存上限も同じ値に揃える（本指示書ではこの値を採用する）
- 個人資産パネルの「インポート」機能で過去分をどこまで遡って取り込むかの仕様（後述6.3）

---

## 1. 全体方針・スコープ

- 本指示は法人資産管理ツール（新規）の実装。配置先URLは `freenough.com/hitori-hojin/assets`（内部実体は`/asset-simulator/hitori-hojin/assets`、既存hitori-hojinの`basePath`/rewriteパターンに準拠）
- **Phase1のスコープは「見える化」まで**。実際にシミュレーター（`simulate.ts`）に法人資産を流し込む機能は含まない。これは`CompanyState`実装後のPhase2/3として明確に切り離す
- ロックファイル（`simulate.ts` / `analyze.ts` / `PortfolioPanel.tsx` / `simulatorStore.ts` / `profile.ts`、および個人資産管理ツールの実装ファイル群）には一切触れない
- 個人資産管理ツール本体（`src/lib/assetManagement/*`、`src/components/assetManagement/*`）は**参照して実装の下敷きにする**（型定義・UI構造・計算ロジックのパターンを踏襲）が、**import禁止・複製方針**を徹底する（hitori-hojin全体の既存ルールと同じ）

---

## 1.5 実装方針：個人側資産管理ツールを参照した構成流用

**本ツールは、画面構成・UIパターン・計算ロジックの型を個人資産管理ツール（Phase1実装済み）からそのまま流用する。**新規に画面設計を考える必要はなく、「個人側の対応するファイルを読み、法人向けに値・カテゴリだけを差し替えて複製する」という進め方を徹底すること。

着手前に、以下の対応表にある個人側ファイルを実装順にすべて読み、構造（Propsの形、状態管理の仕方、コンポーネント分割の粒度）を把握してから、対応する法人側ファイルを作成すること。

| 個人側ファイル（参照元） | 法人側ファイル（複製先） | 差分・注意点 |
|---|---|---|
| `src/lib/assetManagement/types.ts` | `src/lib/hojjinAssetManagement/types.ts` | カテゴリ値・`HojinAssetHolding`/`HojinCopiedPersonalHolding`/`HojinAssetSnapshot`型に変更（3章参照） |
| `src/lib/assetManagement/categories.ts` | `src/lib/hojinAssetManagement/categories.ts` | カテゴリ×資産クラスの許可リストを4章の法人カテゴリに置き換え |
| `src/lib/assetManagement/storage.ts` | `src/lib/hojinAssetManagement/storage.ts` | localStorageキー名を法人専用に変更。上限件数ロジックはそのまま踏襲（0.2の調査結果の値を使用） |
| `src/lib/assetManagement/monthlyCheck.ts` | `src/lib/hojinAssetManagement/monthlyCheck.ts` | 月次判定ロジックをそのまま複製 |
| `src/lib/assetManagement/exportImport.ts` | `src/lib/hojinAssetManagement/exportImport.ts` | 「法人のみ／合算」トグル分岐を追加する以外は同じ構造 |
| `src/lib/assetManagement/classColors.ts` | `src/lib/hojinAssetManagement/classColors.ts` | 配色ルールはそのまま複製（新色を追加しない） |
| `src/components/assetManagement/AssetManagementPage.tsx` | `src/components/hojinAssetManagement/HojinAssetManagementPage.tsx` | 全体レイアウト（左：入力／右：推移・進捗・内訳）を踏襲。個人資産パネルの分だけ左カラムの構成要素が増える |
| `src/components/assetManagement/AssetHoldingCard.tsx` | `src/components/hojinAssetManagement/HojinAssetHoldingCard.tsx` | 法人カテゴリ用に複製。同じコンポーネントを個人資産パネル用にも複製利用（`PersonalAssetPanel.tsx`側で個人カテゴリ版として再利用） |
| `src/components/assetManagement/AssetAllocationChart.tsx` | `src/components/hojinAssetManagement/HojinAssetAllocationChart.tsx` | Recharts・`ssr: false`動的importパターンをそのまま踏襲。合算データを渡す点のみ差分 |
| `src/components/assetManagement/AssetProgressPanel.tsx` | `src/components/hojinAssetManagement/HojinAssetProgressPanel.tsx` | カード3枚構成を踏襲＋個人化想定比率スライダー・積み上げバーを追加 |
| `src/components/assetManagement/AssetAllocationChangeTable.tsx` | `src/components/hojinAssetManagement/HojinAssetAllocationChangeTable.tsx` | そのまま複製、合算データを渡す |
| `src/components/assetManagement/AssetSnapshotHistory.tsx` | `src/components/hojinAssetManagement/HojinAssetSnapshotHistory.tsx` | そのまま複製 |
| `src/components/assetManagement/AssetExportImportControls.tsx` | `src/components/hojinAssetManagement/HojinAssetExportImportControls.tsx` | 「法人のみ／合算」トグルUIを追加 |
| `src/components/assetManagement/MonthlyRecordBanner.tsx` | （同名で複製、変更なし想定） | 文言のみ「法人資産」等に調整 |
| `src/app/assets/page.tsx` | `src/app/hitori-hojin/assets/page.tsx` | ルーティングのみ差分 |

上記にない新規要素（`PersonalAssetPanel.tsx`＝個人資産パネル、`PersonalizationRatioSlider.tsx`＝個人化想定比率スライダー）は個人側に対応物がないため、本指示書5章・7章の記述に従って新規実装する。

**この対応表と異なる構造で実装したほうが明らかに合理的だと判断した場合は、独断で進めず理由とともに報告すること。**

---

## 2. 命名・配置規則（既存hitori-hojinルールに準拠）

- ディレクトリ・ルート・URL slug：kebab-case
- `.ts`ライブラリファイル：camelCase（例：`hojinAssetManagement.ts`、`hojinAssetCategories.ts`）
- `.tsx`コンポーネント：PascalCase（例：`HojinAssetManagementPage.tsx`）
- 配置例：
  ```
  src/lib/hojinAssetManagement/
    types.ts, categories.ts, storage.ts, monthlyCheck.ts, exportImport.ts, classColors.ts, routes.ts
  src/components/hojinAssetManagement/
    HojinAssetManagementPage.tsx, HojinAssetHoldingCard.tsx, PersonalAssetPanel.tsx,
    HojinAssetAllocationChart.tsx, HojinAssetProgressPanel.tsx, HojinAssetAllocationChangeTable.tsx,
    HojinAssetSnapshotHistory.tsx, HojinAssetExportImportControls.tsx, PersonalizationRatioSlider.tsx
  src/app/hitori-hojin/assets/page.tsx
  ```
  （ファイル名・分割単位は実装しやすい形で調整してよいが、個人側の既存ファイル構成との対応関係が分かるようにすること）

---

## 3. データ型

### 3.1 法人保有資産

```typescript
interface HojinAssetHolding {
  id: string;
  accountCategory: '法人預金' | '法人証券口座' | '保険積立金' | '貸付金・仮払金' | 'その他法人資産';
  assetClass: string;   // 個人側ASSET_CLASSESを複製 + '不動産'（個人側と同じ複製元を再利用）
  amount: number;        // 万円
  updatedAt: string;
}
```

### 3.2 個人資産パネル用（法人ツール内の独立コピー）

個人側`AssetHolding`型と同じ構造で複製する（`owner: 'personal' | 'personal_spouse'`、`accountCategory`は個人側確定分類：現金/NISA/iDeCo/特定口座/その他）。**`corporate`は選択肢に含めない**（0.1の調査結果にかかわらず、本ツールの個人資産パネルでは不要）。

```typescript
interface HojinCopiedPersonalHolding {
  id: string;
  owner: 'personal' | 'personal_spouse';
  accountCategory: string; // '現金' | 'NISA' | 'iDeCo' | '特定口座' | 'その他'
  assetClass: string;
  amount: number;
  updatedAt: string;
}
```

### 3.3 スナップショット

```typescript
interface HojinAssetSnapshot {
  date: string; // 'YYYY-MM'
  hojinHoldings: HojinAssetHolding[];
  personalHoldings: HojinCopiedPersonalHolding[];
  personalLastUpdatedAt: string; // 個人資産パネルの最終更新日時（インポートまたは手動編集）
  totalHojinAmount: number;
  totalPersonalAmount: number;
}
```

---

## 4. 法人保有資産カテゴリ（確定）

| カテゴリ | 資産クラス選択 | 備考 |
|---|---|---|
| 法人預金 | なし（固定で「現金」扱い） | 個人側「現金」と同じ入力パターン（金額のみ） |
| 法人証券口座 | あり（複製ASSET_CLASSESから選択） | 個人側「NISA」「特定口座」と同じ入力パターン |
| 保険積立金 | なし（固定で「保険」扱い） | 解約返戻金ベースの金額のみ入力 |
| 貸付金・仮払金 | なし（固定で「現金」扱い） | Phase1では単純化。将来的に区分が必要になれば再検討 |
| その他法人資産 | あり（不動産/暗号資産/保険/その他 に限定） | 個人側「その他」カテゴリと同じ許可リストパターン |

---

## 5. 個人資産パネル（新規・編集可能）

- 個人資産管理ツール本体の入力UI（`AssetHoldingCard.tsx`等）と同じ構造・カテゴリ（現金/NISA/iDeCo/特定口座/その他）を複製し、法人ツール画面内に独立したパネルとして設置
- 保存先は法人ツール専用のlocalStorageキー（例：`hojinCopiedPersonalHoldings`）。個人ツール本体のキー（`lifeCompassAssetHoldings`等）とは完全に別。**個人ツール本体への書き戻しは一切行わない**
- **インポートは必須ではない**。このパネルへの直接入力のみでツールの利用を開始できる
- 「個人データをインポート」ボタン：個人ツール側の最新の保有資産データを取得し、このパネルの内容を一括上書きする。押下時に確認ダイアログを表示すること（例：「個人資産のデータを上書きします。このパネルで編集した内容は失われます。よろしいですか？」）
- インポート元データの取得方法：個人ツール側のlocalStorage（`lifeCompassAssetHoldings`）を直接読み取る想定。実装時、実際のキー名・データ構造を個人ツールの実装ファイルで確認すること

---

## 6. 資産推移・スナップショット

### 6.1 記録操作

法人ツール上の「記録する」ボタン押下時、その時点の「法人保有資産」と「個人資産パネル」の両方をまとめて1つの`HojinAssetSnapshot`として保存する（個人ツール本体のスナップショット機構とは別）。

### 6.2 保存上限

0.2の調査結果で確認した値を採用する。個人側と同じ上限件数に揃える。

### 6.3 表示トグル（「法人のみ／合算」共通トグル）

以下3ブロックに共通のトグルを1つ設置し、連動して切り替える：

1. 資産推移グラフ・記録履歴一覧
2. 資産配分の変化テーブル（前回比）
3. FIRE進捗ブロックの「前回記録比」カード

- デフォルトは「合算」
- 合算表示時は、個人資産パネルの最終更新日時（インポート日時、または手動編集の最終保存日時）を画面上に明記すること（例：「個人資産は2026-08-01時点の値」）
- 個人資産パネルが未入力（金額ゼロ・未編集）の場合は、トグルを「法人のみ」に固定し、「合算」の選択肢をグレーアウトする

---

## 7. FIRE進捗（合算）

3枚のカード（個人側Phase1と同じ構成）＋積み上げバー＋個人化想定比率スライダーで構成する。

- **目標資産額**：法人ツール側で独自に入力（個人ツールの目標資産額とは連動しない、別入力）
- **目標までの進捗**：**個人資産パネルの金額のみ**を分子として計算する。法人保有資産は進捗%には含めない
- **前回記録比**：6.3のトグルに追従
- **個人化想定比率スライダー**（0〜100%、デフォルト値は70%程度を仮置き、KENZOに確認可）：
  - 法人の利益状況を踏まえて、将来どの程度の割合を個人の手取りとして受け取れそうかの目安をユーザー自身が設定する値
  - 法人保有資産合計 × この比率 = 「個人化想定額」として参考表示（計算式はこれのみ、シンプルな掛け算）
  - `simulate.ts`には一切連携しない、表示専用の値
  - スライダー直下の説明文（確定文言）：
    ```
    法人の利益状況を踏まえて、将来どのくらいの割合を個人の手取りとして受け取れそうか、目安をご自身で設定してください
    ```
- **積み上げバー**：横棒に「個人資産（実線塗り）＋法人保有資産（斜線パターン）」を積み上げ、目標資産額のラインをマーカーで示す。凡例に個人資産・法人保有資産（個人化想定額を括弧書きで併記）を表示

---

## 8. 資産クラス内訳（合算）

- 個人資産パネル＋法人保有資産を、**資産クラス軸**（口座カテゴリ軸ではない）で合算した円グラフとテーブルを表示
- **個人化想定比率は反映しない**。あくまで実際の保有金額をそのまま合算表示する（個人化想定比率はFIRE進捗ブロックでのみ使用する値であり、資産クラス内訳の実態を歪めない）
- 6.3の「法人のみ／合算」トグルに追従する
- 円グラフの色は、個人側で確定済みの`classColors.ts`の配色をそのまま踏襲する（新しい配色ルールを作らない）

---

## 9. 資産配分の変化（前回比）

個人側Phase1の「資産配分の変化」ブロックと同じ構成（資産クラスごとの前回%・現在%・変化pt）を、法人側でも同様に実装する。6.3のトグルに追従する。

---

## 10. Export / Import

- **JSON・CSVともに「法人のみ／合算」のトグルを付ける**
- 合算を選択した場合、法人保有資産・個人資産パネルの両方を1ファイルに含める
- Import時、ファイル内に個人資産データが含まれる場合は個人資産パネルへ、法人データは法人保有資産へ、それぞれ振り分けて反映する
- 個人ツール本体のExport/Import機構（段階A：JSON+CSV Export）とは別実装（複製方針）

---

## 11. 対象外（今回やらないこと）

- 法人資産をシミュレーター（`simulate.ts`）に接続する機能（`CompanyState`実装後のPhase2/3）
- hitori-hojin LPの「管理する」ブロックの表示切り替え（Stage 5、別指示）
- 個人ツール本体への書き戻し（一切なし。本ツールの個人資産パネルは常に法人側の独立コピー）
- 貸付金・仮払金の税務上の詳細な性質区分（Phase1では「現金」資産クラス固定で単純化）
- カテゴリ別の個人化想定比率設定（Phase1はグローバル単一値のみ）

---

## 12. 検証

- `tsc` / `build` / `full-verify.js` がクリーンであること
- ロックファイル（`simulate.ts` / `analyze.ts` / `PortfolioPanel.tsx` / `simulatorStore.ts` / `profile.ts`）および個人資産管理ツール本体ファイルへの差分ゼロ
- デスクトップ・モバイル両方で、法人のみ／合算の両方の表示状態のスクリーンショットを取得
- 個人資産パネルが未入力の状態でトグルがグレーアウトされることを確認

---

## 13. 完了報告に含めるべき内容

- 0.1、0.2の事前調査結果（owner corporateの露出有無、実際のスナップショット上限件数）
- 新規作成・変更したファイルの一覧
- 各画面状態（法人のみ表示／合算表示／個人資産パネル未入力時）のスクリーンショット
- ロックファイル・個人ツール本体差分ゼロの確認結果
- `full-verify.js`の実行結果
