# 実装指示書：CompanyState 基本骨格（①事業タイムライン／②法人ポートフォリオ／③成長計算／④取崩→個人化変換）

作成日：2026-08-20
前提：`2026-08-20_companystate-investigation.md`の調査結果を踏まえた実装指示書

---

## 1. スコープ

**含む**：法人資産（一人法人）を対象にした、FIRE試算のための以下4要素。

1. 法人の事業タイムライン入力（事業利益・取崩を、期間・金額/年で複数登録）
2. 法人ポートフォリオ設定（現在PF／積立期PF／取崩期PFの3フェーズ、資産クラス配分→μ・σ自動算出）
3. 法人資産の年次成長計算
4. 法人の取崩額を個人シミュレーションへ注入する変換処理（`buildCombinedSimulationInput()`）＋既存`simulate()`/`analyze()`の呼び出し

**含まない（今回のスコープ外・別フェーズ）**：
- 資産管理ツールとの連携（実績データの取込、目標配分との比較、実績×予測の重ね合わせグラフ）
- 法人特有の資産クラス（非上場株式等）の追加
- 精緻な法人税・個人所得税の個別計算（実効税率は単一パラメータのユーザー入力のまま）

---

## 2. 絶対に守ること（ロックファイル制約）

以下のファイルは**一切変更しないこと**。差分ゼロを維持すること。

`simulate.ts` / `analyze.ts` / `types.ts` / `profile.ts` / `PortfolioPanel.tsx` / `simulatorStore.ts` / `blog.ts` / `blogTopics.ts` / `concerns.ts`

これらへの関わり方は以下の通り確定している。指示と異なる実装が必要だと判断した場合は、実装を進めず先に報告すること。

| ファイル | 扱い |
|---|---|
| `simulate.ts` / `analyze.ts` | **import**して呼び出す（変更しない） |
| `types.ts` | 一切触れない。新しいLifeEvent種別は追加せず、既存の`other_inc`（`period`型）をそのまま利用する |
| `profile.ts`の`calcMu`/`calcAggregateMu`/`calcAggregateSigma` | ロジックを**複製**（Phase1資産管理ツールと同じ方針）。importしない |
| `PortfolioPanel.tsx` | UIパターンのみ**複製**。状態管理は法人専用の新規ストアに差し替える |
| `useSimulatorStore` | 一切触れない。個人側のシミュレーターの動作に影響を与えないこと |

---

## 3. データ構造

### 3.1 資産クラス

**Hitori-Hojin資産管理ツール（`hojinAssetManagement`）で既に定義済みの資産クラス一覧をそのまま再利用すること**。新たに定義し直さない。既存の`src/lib/hojinAssetManagement/`配下（`categories.ts`または`classColors.ts`等、実際に定義されているファイルを確認の上）から、資産クラス一覧を参照または複製する。個人側`ASSET_CLASSES`との整合性・不動産の扱いは、資産管理ツールで確定した内容に完全に合わせること。法人特有の資産クラス追加は行わない。

### 3.2 法人事業タイムラインイベント（新規型）

```typescript
// src/lib/hojinCompanyState/types.ts（新規）
export type CorporateEventKind = 'business_profit' | 'withdrawal';

export interface CorporateLifeEvent {
  id: string;
  kind: CorporateEventKind;   // '事業利益' | '取崩'
  label: string;              // 名称（省略可、UIの「名称」欄）
  startAge: number;           // 開始年齢
  years: number;              // 期間（年）
  amount: number;             // 金額/年（万円）
}
```

- 個人側のライフイベント（`period`型LifeEvent）と同じ「1イベント＝1金額×1期間」の粒度。金額が変動する場合は複数イベントを連ねて表現する（個人側と同じ思想、調査結果の論点1を踏まえた確定方針）
- 開始・終了タイミングは「退職」等に固定しない。ユーザーが任意のタイミングで複数イベントを自由に登録できること

### 3.3 法人ポートフォリオ（3フェーズ）

`PortfolioPanel.tsx`と同じ構造を法人専用に複製する。

```typescript
// src/lib/hojinCompanyState/types.ts に追加
export interface CorporatePortfolioPhase {
  rows: { assetClass: string; pct: number }[]; // 3.1の資産クラスを使用
}

export interface CorporatePortfolio {
  current: CorporatePortfolioPhase;
  working: CorporatePortfolioPhase;
  retirement: CorporatePortfolioPhase;
  retirementSameAsWorking: boolean; // PortfolioPanel.tsxのsameAsWorkingトグルと同じ挙動
}
```

- μ・σの自動算出は、3.1で複製した資産クラス一覧と、複製した`calcMu`/`calcAggregateMu`/`calcAggregateSigma`相当のロジックを使う（個人側は口座別集計だが、法人側は法人資産1本のみなので、複数口座の加重集計部分は不要——単一ポートフォリオのμ・σ算出のみでよい。過剰実装しないこと）
- 「①現在PFの比率を②積立期にコピー」ボタン（`copyCurrentToWorking`相当）も同様に複製する

### 3.4 実効税率

```typescript
// src/lib/hojinCompanyState/types.ts に追加
export interface CompanyStateSettings {
  effectiveTaxRate: number; // 0-100、デフォルト25、UIヒントで「目安20〜30%」を表示
}
```

---

## 4. 計算ロジック

### 4.1 法人資産の年次成長

```
その年の法人資産 = 前年末残高 × (1 + 3.3で算出したμ) + その年の事業利益（3.2のタイムラインイベントから算出）
```

- 事業利益はタイムラインイベント（`kind: 'business_profit'`）を年齢ごとに集計した値
- MC（モンテカルロ）を実行する場合の扱いは、Stage Aでは**固定計算（期待リターンのみ）に限定してよい**。法人側資産のMCでの確率的変動は今回のスコープに含めない（調査済みの通り、市場ショックの連動設計は別途検討が必要な重い論点のため）

### 4.2 取崩→個人化変換、`buildCombinedSimulationInput()`

```typescript
// src/lib/hojinCompanyState/buildCombinedSimulationInput.ts（新規）
// 概要（実装時に正確な型・シグネチャを詰めること）:
// 1. CorporateLifeEvent[]から kind: 'withdrawal' のイベントを年齢ごとに集計
// 2. 各年の取崩額 × (1 - effectiveTaxRate/100) で税引き後の個人収入を算出
// 3. 税引き後収入を、既存のLifeEvent型（subtype: 'other_inc', kind: 'period'）として組み立てる
//    ※ 複数年で金額が変わる場合は、変わるたびに新しいother_incイベントを生成して複数個作る
// 4. 個人側のprofile.events（ユーザー入力の本来のイベント）と、3で生成したイベント配列を
//    「その場でマージした一時配列」として結合する
//    重要：生成したイベントをprofile.eventsストア（永続化・ユーザー編集対象）に書き込んではならない。
//    simulate()呼び出し時にのみ使う一時的な配列とすること
// 5. simulate(p, mergedEvents, strategy) を呼び出す（simulate.tsは一切変更しない）
```

- この関数が、法人側コードから個人側ロックファイル（`simulate.ts`）への**唯一の接続点**になる
- 生成する`other_inc`イベントには、ユーザーが個人側で本来入力した`other_inc`イベントと区別がつくよう、`label`等に法人由来であることが分かる印（例：`"法人取崩（自動生成）"`）を付けること。UI上表示する際に生成元を区別できるようにするため

---

## 5. UI実装

### 5.1 法人事業タイムライン画面

`LifeEventTimeline.tsx`のUIパターンを複製する。

- コンポーネント：`src/components/hojinCompanyState/CorporateEventTimeline.tsx`（新規）
- 種別セレクタは「事業利益」「取崩」の2種類のみに絞る（個人側のような多数のsubtypeは不要）
- 開始年齢・期間・金額/年の入力欄構成は`LifeEventTimeline.tsx`と同じ
- 状態管理は5.3の新規ストアを使用し、`useSimulatorStore`には一切依存しないこと

### 5.2 法人ポートフォリオ画面

`PortfolioPanel.tsx`のUIパターンを複製する。

- コンポーネント：`src/components/hojinCompanyState/CorporatePortfolioPanel.tsx`（新規）
- 3フェーズ構成（現在／積立期／取崩期）、「①→②コピー」ボタン、「③は②と同じ」トグルを複製
- 個人側は口座別（NISA/iDeCo/特定口座）にAssetCardが複数並ぶが、法人側は口座区分がないため、**AssetCard相当のカードは1つのみ**（法人資産全体で1つのポートフォリオ配分）。個人側の複数口座UIをそのまま複製しないこと（過剰実装を避ける）

### 5.3 状態管理

- 新規ストア：`src/lib/hojinCompanyState/companyStateStore.ts`（Zustand、既存`simulatorStore.ts`の実装パターンを参考にしつつ新規作成、importはしない）
- 保持する状態：`CorporateLifeEvent[]`、`CorporatePortfolio`、`CompanyStateSettings`
- 永続化：localStorage、新規キー（例：`'hojinCompanyState'`）。既存の個人側・資産管理ツールのキーとは完全に別

### 5.4 実効税率入力UI

- 単一のパーセンテージ入力欄
- ヒントテキストで「目安：20〜30%程度（役員報酬として受け取る場合の所得税・住民税・社会保険料の合計負担率の概算）」を表示すること。この数値が精緻な税務計算ではなくユーザー自身の見積もりであることが伝わる文言にすること

---

## 6. 配置・ルーティング

- URL（暫定）：`freenough.com/hitori-hojin/simulate`（内部実体：`/asset-simulator/hitori-hojin/simulate`）
- 既存の`/hitori-hojin/assets`（資産管理ツール）と並列の構成とする
- Hitori-Hojin LPの「計算する」ブロックの表示化は今回のスコープ外（別途指示）。ページ自体は実装するが、LP側のリンク解禁は次フェーズで判断する

---

## 7. 検証要件

- `full-verify.js` 全件PASS（新規追加分のテストケースが必要であれば、既存パターンに倣って追加すること。追加後の件数を完了報告に明記）
- `tsc --noEmit` クリーン
- `npm run build` 成功
- 第2章に挙げたロックファイルの差分が**ゼロ**であることを`git diff --stat`等で確認し、完了報告に含めること
- `simulate()`/`analyze()`への呼び出し結果（法人取崩を含めた個人シミュレーション結果）が、法人イベントなしの場合と比較して意図通り変化することを、簡単な手動シナリオ（例：法人取崩200万円/年、実効税率25%→個人年次収入+150万円になっているか）で確認し、確認結果を報告すること

---

## 8. 完了報告のフォーマット

1. 実装したファイル一覧（新規作成・変更の別を明記）
2. ロックファイルの差分ゼロの確認結果
3. `full-verify.js`/`tsc`/`build`の結果
4. 7章の手動シナリオ確認結果
5. 指示書からの逸脱・判断が必要だった箇所（あれば。独断で決めた場合はその理由も明記）
6. 未実装・保留にした項目（あれば）
