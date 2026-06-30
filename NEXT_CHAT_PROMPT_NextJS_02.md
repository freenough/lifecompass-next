# 引き継ぎプロンプト — LifeCompass Next.js版 Phase 3 UI刷新（セッション02以降）

作成日: 2026-06-23

---

## 1. このセッションで完了した修正

### simulatorStore.ts
- **`calcAggregatedSigma`の新規実装**（旧HTMLの`pfAggregateWeights()`相当）
  - 各口座のpctは「口座内100%基準」なので、口座間集計には口座残高による加重が必要
  - 残高0の口座は除外（デフォルト全世界株100%の混入を防ぐ）
  - `calcPortfolioMetrics()`に渡すため0-100スケールに戻す
- **`updatePortfolio`のσ同期バグ修正**
  - `working`フェーズ編集時: `calcAggregatedSigma([nisa, ideco, tax], [bNisa, bIdeco, bTax])`で`mcStd`を更新
  - `retirement`フェーズ編集時: `sameAsWorking=true`のとき`mcStdR = mcStd`に同期（workingのσを使う）
- **`copyCurrentToWorking`のσ同期バグ修正**
  - currentのamount合計を口座残高として`calcAggregatedSigma`に渡す（修正前: 全口座等分ウェイトになっていた）
  - `sameAsWorking=true`のとき`mcStdR`も同値に同期
- **`setSameAsWorking`アクション追加**
  - `val=true`に切り替えたとき`mcStdR = mcStd`に即時同期（`pfManualFlags['mcStdR']`が立っていない場合のみ）

### PortfolioPanel.tsx
- **表示用`calcAggregatedSigma`を同等ロジックで実装**（storeの内部関数と同一アルゴリズム）
  - 口座残高はcurrentのamount合計を優先、未入力ならprofile.paramsのbNisa/bIdeco/bTaxを使う
  - `sigmaW`（積立期）・`sigmaR`（取崩期）を全口座集計σとして表示
- **`sameAsWorking`チェックボックスを`setSameAsWorking`アクションに接続**（旧実装は`loadProfile`直呼び出しだった）

### KpiGrid.tsx — Tier設計最終仕様
```
Tier1（常時3枚）: 資産寿命 / FIRE達成（安心） / MC破綻確率（未実行時は"MCモードで実行"）
Tier2（常時3枚）: 最終資産 / 初年度取崩率 / 収支転換点
Tier3（条件付き）: 資産ピーク（常時）+ iDeCo受取（hasIdeco=trueのとき）
Tier4（expandable）: hasIdeco && idecoReceiveType==='lump' のとき展開可能（iDeCo手取/退職金手取/退職所得税）
```
- `hasSeverance`はKpiGridのpropsに含まれるが現在Tier4で`a.severanceNetKPI`を直接参照
- iDeCo受取値: `idecoReceiveType==='lump'` → `a.idecoLumpNet`、`'pension'` → `a.idecoTotalNetWithdrawal`
- `void mode;` でlint警告抑制（modeプロップは将来用に残してある）

### SimulatorForm.tsx — rR入力フィールド無効化
- `Field`コンポーネントに`disabled?: boolean`プロップを追加
  - `disabled`時: `<input disabled>` + `disabled:opacity-50 disabled:cursor-not-allowed`クラス
- `const sameRate = profile.portfolio.retirement.sameAsWorking;` をコンポーネント本体に宣言
- rR 3フィールド（rRNisa/rRIdeco/rRTax）: `sameRate=true`のとき対応するrW値を表示し、入力無効化
- チェックボックスの`checked`を`sameRate`変数に統一（旧: `profile.portfolio.retirement.sameAsWorking`を直接参照）

### page.tsx（src/app/simulator/page.tsx）
- **hydrationエラー修正**: `mounted`ガードをページレベルに追加
  - ZustandストアはSSR時に`SAMPLE_PROFILE`で初期化、CSR時に`localStorage`から復元 → hydration不一致
  - `const [mounted, setMounted] = useState(false); useEffect(() => { setMounted(true); }, []);`
  - `!mounted`のとき`<p>読み込み中...</p>`を返す（KpiGrid・ImpactTableの個別ガードは不要）
- `<KpiGrid>`に`hasIdeco`・`hasSeverance`プロップを追加
  - `hasIdeco={profile.params.bIdeco > 0 || profile.params.cIdeco > 0}`
  - `hasSeverance={baseAnalysis.severanceNetKPI > 0}`
- `fireAmount`変数・`AssetChart`の`fireAmount`プロップを削除（FIREライン計算はAssetChart内部に移管）

### AssetChart.tsx
- **FIREライン**: `addFireLines(row, s)` → `row['FIREライン'] = s.baseExp * 25`（旧HTML STEP35 line 2963と一致）
- **必要資産ライン廃止**（旧HTML STEP35 line 2964の`s.expense * 25`ラインはUI上削除）
- `fireAmount`プロップ・`baseExpOrig`パラメータを削除

---

## 2. 現在未解決の課題

`CLAUDE_CODE_FEATURE_DIFF.md`（プロジェクトルート）に次セッション向けの詳細指示がある。要点を抜粋:

### 住宅ローンモーダル（最優先・確認済み差分）

**旧HTML版の仕様（移植すべき内容）:**
- 4入力: 借入額（万円）・金利（年率%）・返済年数・返済開始年齢
- リアルタイム試算表示: 月次返済額・年次返済額・総返済額
- 計算式（元利均等返済）:
  ```js
  function calcMortgage(principal, rate, termYears) {
    const r = rate / 100 / 12;
    const n = termYears * 12;
    if (r === 0) return principal / termYears;
    const monthly = principal * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
    return Math.round(monthly * 12); // 年間返済額を返す
  }
  ```
- 保存フィールド: `principal`, `rate`, `termYears`, `age`, `years`（=termYears）
- タイムライン表示例: `住宅ローン 41〜61歳 / 200万`（年次返済額）
- 注意書き: 「元利均等返済のみ対応。変動金利・繰上返済・ボーナス払いは非対応」

**Next.js版の現状:**
- `subtype: 'mortgage'`選択可能だが`amount`直接入力のみ（専用フォームなし）

### 機能差分調査（次セッションの主タスク）

`CLAUDE_CODE_FEATURE_DIFF.md`に調査対象コンポーネント一覧と手順が定義されている:

| コンポーネント | 調査観点 |
|---|---|
| `LifeEventTimeline.tsx` | イベント種別・住宅ローンモーダル・編集削除 |
| `MonteCarloPanel.tsx` | 試行数・表示項目 |
| `SensitivityPanel.tsx` | パラメータ範囲・スライダー |
| `YearlyTable.tsx` | 列構成・数値フォーマット |
| `ImpactTable.tsx` | 比較項目・計算方法 |
| `CashFlowChart.tsx` | 表示項目・凡例 |
| `AssetChart.tsx` | FIREライン・表示項目 |
| `SimulatorForm.tsx` | 全入力項目の網羅性 |

**差分調査の方針**: 旧HTMLから対応箇所を`grep`で確認 → Next.js版と突き合わせ → 差分をまとめて報告してから実装（大きな変更は承認を取る）

---

## 3. src/ ファイル構成

```
src/
├── app/
│   ├── layout.tsx                  — RootLayout（Noto Sans JP等のフォント設定）
│   ├── page.tsx                    — redirect('/simulator')
│   ├── globals.css                 — Tailwindのbase/components/utilities
│   ├── simulator/
│   │   └── page.tsx                — メインシミュレーターページ（'use client'）
│   ├── blog/
│   │   ├── page.tsx                — ブログ一覧（骨格のみ）
│   │   └── [slug]/page.tsx         — ブログ記事（骨格のみ）
│   └── disclosure/
│       └── page.tsx                — アフィリエイト開示ページ
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── AdSlot.tsx              — Google AdSense枠（現在非表示）
│   └── simulator/
│       ├── SimulatorForm.tsx       — 入力パラメータフォーム（左カラム）
│       ├── PortfolioPanel.tsx      — PF①現在 / ②積立期 / ③取崩期
│       ├── LifeEventTimeline.tsx   — ライフイベント追加・編集
│       ├── AssetChart.tsx          — 総資産推移グラフ（Recharts）
│       ├── KpiGrid.tsx             — KPIカードグリッド（Tier1〜4）
│       ├── YearlyTable.tsx         — 年次資産テーブル
│       ├── CashFlowChart.tsx       — キャッシュフローグラフ
│       ├── MonteCarloPanel.tsx     — MC結果パネル
│       ├── SensitivityPanel.tsx    — 感度分析パネル
│       ├── ImpactTable.tsx         — イベントインパクト表
│       ├── ProfileDrawer.tsx       — プロファイル保存・読込ドロワー
│       └── AiPanel.tsx             — AI分析（Gemini）
│
├── lib/
│   ├── types.ts                    — YearSnap・SimParams・LifeEvent等の型定義
│   ├── simulate.ts                 — simulate()コアエンジン（変更禁止）
│   ├── analyze.ts                  — analyze()（変更禁止）
│   ├── montecarlo.ts               — runMC()
│   ├── helpers.ts                  — calcIdecoEligibleAge等
│   ├── profile.ts                  — ProfileV3型・SAMPLE_PROFILE・profileToSimParams・calcMu・calcPortfolioMetrics
│   ├── storage.ts                  — encodeProfileUrl・decodeProfileUrl・localStorage操作
│   └── index.ts                    — simulate/analyze/runMCの再エクスポート
│
└── store/
    └── simulatorStore.ts           — Zustandストア（全状態管理）
```

---

## 4. 開発上の注意事項

### calcAggregatedSigmaのロジック（重要）
- `simulatorStore.ts`と`PortfolioPanel.tsx`の両方に同一ロジックが存在する（重複）
- 将来的に`profile.ts`に移動して共有すべきだが、現セッションでは対応していない
- ロジックの核心:
  1. 口座残高の合計でウェイトを計算（残高0の口座は完全除外）
  2. 各口座のrows（pct=口座内比率）を残高ウェイトで掛けてグローバル資産クラス比率に集計
  3. 集計結果を`calcPortfolioMetrics()`に渡してポートフォリオσを計算

### profile.paramsのフィールド名（旧HTML版と異なる）
| Next.js版フィールド名 | 旧HTML版フィールド名 | 意味 |
|---|---|---|
| `bNisa` | `nisaBal` | NISA残高（万円） |
| `bIdeco` | `idecoBal` | iDeCo残高（万円） |
| `bTax` | `taxBal` | 特定口座残高（万円） |
| `cNisa` | `nisaCon` | NISA積立額（万円/年） |
| `cIdeco` | `idecoCon` | iDeCo積立額（万円/年） |
| `bCash` | `cashBal` | 現金残高（万円） |
| `penAmtVal` | — | フォーム入力値（`penAmt`はprofileToSimParams内で`penAmtVal`を参照） |

### sameAsWorkingの2系統（注意）
- `SimulatorForm.tsx`のチェックボックス: `loadProfile`直呼び出しで`portfolio.retirement.sameAsWorking`を更新していたが、`setSameAsWorking`アクションに接続済み
- `PortfolioPanel.tsx`のチェックボックス: 最初から`setSameAsWorking`を呼んでいた（こちらは問題なし）
- 両方ともチェック時に`mcStdR = mcStd`が同期される

### simulate()/analyze()のシグネチャ変更禁止
- `simulate(p, events, strategy, shockOverrides?)`と`analyze(snaps, p)`の2つのみがUI層のエントリポイント
- `scripts/full-verify.js`が常にPASSであること（Stop Hookで強制）

### hydrationエラーのパターン
- ZustandストアはSSR時に`SAMPLE_PROFILE`で初期化、CSR時に`localStorage`から復元するため、
  ストア値に依存したJSXをSSR時にレンダリングすると不一致が起きる
- 対処: `page.tsx`の`mounted`ガード（`!mounted`で`<p>読み込み中...</p>`を返す）
- 各コンポーネントに個別ガードを入れる必要はない

---

## 5. 次セッションでやること

`CLAUDE_CODE_FEATURE_DIFF.md`の優先順位に従う:

### 優先度1: 住宅ローンモーダル実装
- `LifeEventTimeline.tsx`の`subtype==='mortgage'`選択時のフォームを上記仕様に差し替え
- `calcMortgage(principal, rate, termYears)`を旧HTMLと完全一致で実装
- `types.ts`の`LifeEvent`型に`principal?/rate?/termYears?`フィールドを確認・追加

### 優先度2: 全コンポーネント機能差分調査
1. 各コンポーネントの旧HTML対応箇所を`grep`で確認
2. 差分リストを作成してKENZOに報告（承認後に実装）
3. 数値計算ロジックは旧HTMLと**完全一致**させる
4. 修正後: `npm run build`で型エラーなし確認 + `scripts/full-verify.js` PASS確認

### 優先度: 中（調査結果次第）
- PortfolioPanel.tsxの`calcAggregatedSigma`重複解消（`profile.ts`にエクスポート）
- ProfileDrawerの保存・読込・URLシェア動作確認

### 優先度: 低（将来対応）
- CSVエクスポート・PNG書き出し
- AiPanel（Gemini APIキー管理）
- Vercelデプロイ設定（Phase 5）・ブログCMS連携（Phase 6）

---

## 6. 重要参照ファイル

- `CLAUDE.md` — アーキテクチャ原則・検証ルール・移植フェーズの大原則
- `reference/simulation_fixtures.md` — 全4シリーズの確定数値（ground truth）
- `SPEC.md` — Phase 3 UI刷新の設計仕様（スコープ・デザイン方針）
- `CLAUDE_CODE_FEATURE_DIFF.md` — **次セッションの主指示書**（差分調査・修正対象一覧）
- `scripts/full-verify.js` — 回帰テスト（常にPASSであること）
- `legacy/STEP35_simulator.html` — 旧HTML版の参照実装（機能差分調査の参照元）
