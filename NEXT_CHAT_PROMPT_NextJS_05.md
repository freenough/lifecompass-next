# 引き継ぎプロンプト — LifeCompass Next.js版 Phase 3 UI刷新（セッション05以降）

作成日: 2026-06-29

---

## 1. このセッション（session 04→05）で完了した実装

### 配色変更
- 口座内訳グラフの配色をProjectionLab風に変更
  - NISA: `#1D9E75` / iDeCo: `#0C447C` / 特定: `#378ADD` / 現金: `#888780`

### LPのHeroコピー改行
- H1後・説明文とCTAの間に改行追加

### 配偶者機能 全面実装（セッションA・B・C）

**UI追加（セッションA）：**
- 基本情報セクション末尾に「配偶者の基本情報」折りたたみ（年齢・収入）
- 退職・年金セクション末尾に「配偶者の退職・年金」折りたたみ（退職年齢・年金受給開始・年金額・勤続年数・iDeCo加入年数・iDeCo受取方式・iDeCo受取開始）
- 口座残高・積立セクション末尾に「配偶者の口座情報」折りたたみ（NISA/iDeCo/特定/現金）
- ポートフォリオパネルの各口座カードに配偶者ブロック（折りたたみ）追加
- ライフイベントに `owner: 'self' | 'spouse'` フラグ追加（退職金・積立変更イベント）
- 配偶者折りたたみのスタイル：`var(--color-background-secondary)` / `var(--color-border-tertiary)`
- 折りたたみヘッダの `▲` 削除、フィールドラベルから「配偶者」prefix削除

**エンジン改修（セッションB）：**
- 配偶者口座（spNisa/spIdeco/spTax/spCash）の独立管理
- 配偶者iDeCo受取処理（一時金・年金両対応）
- 配偶者退職金の合算課税（`owner:'spouse'` のライフイベントで振り分け）
- 積立変更イベントの `owner` 振り分け
- AssetChartの合算表示（本人＋配偶者）
- YearSnapに配偶者フィールド追加（spNisa/spIdeco/spTax/spCash/spIdecoWithdrawalAmount/spRetirementTaxPaid/spSeveranceNet）

**KPI・ドキュメント（セッションC）：**
- iDeCo受取の世帯合計表示（本人＋配偶者）
- 詳細展開時に本人・配偶者の内訳表示
- 退職所得税の説明をツールチップに移動
- `/methodology` に配偶者合算の説明追記

### バグ修正
- `spCurAge=0` のフォールバック `??` → `||`（simulate.ts）
- `AssetChart.tsx` の `spEffCurAge` フォールバック追加
- 配偶者ライフイベントの年齢軸変換（配偶者年齢→本人年齢軸）
- `profile.ts` の `loadInitialProfile` を `SAMPLE_PROFILE` とディープマージ（根本対策）
- `idecoReceiveType` の `?? 'lump'` フォールバック追加（page.tsx）
- KPIカードの `hasSeverance` がprops分割代入に含まれていなかったバグ修正
- `analyze.ts` の退職所得税集計が `idecoStartAge` スナップのみ参照していたバグ修正 → 全スナップのreduce合算に変更
- KPIカード `tier4Expandable` の条件を `hasIdeco || hasSeverance` に変更（年金受取・退職金のみでも詳細ボタン表示）
- KPIカード「iDeCo（手取り）」下段の数値を年金受取時も正しく表示

### UI細かい修正
- 配偶者折りたたみの幅・背景色・ラベル統一
- ライフイベントの配偶者バッジ色削除・年齢表示整理
- チャート縦線ラベルのグルーピング・近接オフセット実装
- `useSearchParams` を `SearchParamsLoader + <Suspense>` に分離（ビルドエラー修正）

---

## 2. セッション05で最初にやること（必須）

### 退職所得税の計算式を再確認

`src/lib/helpers.ts` の `retirementTaxCalc()` 関数の計算式が正しいか確認する。

**確認ポイント：**
1. 退職所得控除額の計算式（勤続年数別）
2. iDeCoと退職金の合算課税ロジック
3. 2022年税制改正（同年受取時の控除制限）への対応状況
4. 年金受取時の公的年金等控除の適用

`helpers.ts` をClaude Codeに出力させて、この会話でレビューすること。

---

## 3. 残件（優先順）

1. **OGP画像の設定**（Vercelデプロイ前に必須）
   - `public/images/ogp.png` を用意（1200×630px）
   - `src/app/layout.tsx` に追記：
   ```ts
   openGraph: {
     images: [{ url: '/images/ogp.png', width: 1200, height: 630 }],
   },
   twitter: {
     card: 'summary_large_image',
     images: ['/images/ogp.png'],
   },
   ```

2. **Vercelデプロイ（Phase 5）**
   - デプロイ後にモバイル表示を実機確認

3. **キャラクターカードのnoteリンク追加**（記事公開次第）
   - 中村夫婦・佐々木・山本の note 記事が公開されたら:
     1. `src/app/page.tsx` の `characters` 配列に `href` を追加
     2. バッジを「近日公開」→「公開中」に変更
     3. カード全体を `<a>` でラップ・hover効果を田中さんと同様に

4. **blog/ ページの実装**（必要に応じて）

---

## 4. 開発上の注意事項（継続）

### simulate.ts / analyze.ts の扱い
- セッションB・Cで大幅改修済み（変更禁止の制約は解除）
- `full-verify.js` が常にPASSであること（Stop Hookで強制）
- 現在63チェックポイント（セッション04開始時は70チェック → 要確認）

### カラー方針
- LP・フッター等のCTAは `#334155`
- 口座内訳グラフ：NISA `#1D9E75` / iDeCo `#0C447C` / 特定 `#378ADD` / 現金 `#888780`

### loadInitialProfile のマージ仕様
```ts
return {
  ...SAMPLE_PROFILE,
  ...loaded,
  params: { ...SAMPLE_PROFILE.params, ...loaded.params },
  portfolio: { ...SAMPLE_PROFILE.portfolio, ...loaded.portfolio },
};
```
新フィールドを追加した際も `SAMPLE_PROFILE` にデフォルト値を定義すれば自動的に補完される。

### 配偶者ライフイベントの年齢軸
- `owner: 'spouse'` のイベントは**配偶者年齢**で入力
- エンジン内で `p.curAge + (ev.age - spCurAge)` で本人年齢軸に変換
- UIのラベルも「配偶者の年齢」で表示

### profile.paramsのフィールド名（旧HTML版と異なる）

| Next.js版 | 旧HTML版 | 意味 |
|---|---|---|
| `bNisa` | `nisaBal` | NISA残高（万円） |
| `bIdeco` | `idecoBal` | iDeCo残高（万円） |
| `bTax` | `taxBal` | 特定口座残高（万円） |
| `cNisa` | `nisaCon` | NISA積立額（万円/年） |
| `cIdeco` | `idecoCon` | iDeCo積立額（万円/年） |
| `bCash` | `cashBal` | 現金残高（万円） |

### セッション開始前のGitコミット
```bash
git add . && git commit -m "before session05"
```

---

## 5. src/ ファイル構成（現在）

```
src/
├── app/
│   ├── layout.tsx                  — RootLayout（Noto Sans JP・Header・Footer）
│   ├── page.tsx                    — ランディングページ（LP）
│   ├── globals.css                 — Tailwindのbase・カスタム色変数定義
│   ├── simulator/
│   │   └── page.tsx                — メインシミュレーターページ（'use client'・SearchParamsLoader/Suspense対応済み）
│   ├── blog/
│   │   ├── page.tsx                — ブログ一覧（骨格のみ）
│   │   └── [slug]/page.tsx         — ブログ記事（骨格のみ）
│   ├── guide/
│   │   └── page.tsx                — 使い方ガイド
│   ├── methodology/
│   │   └── page.tsx                — 計算ロジック・前提（配偶者合算の説明追記済み）
│   ├── privacy-policy/
│   │   └── page.tsx
│   ├── disclaimer/
│   │   └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   └── disclosure/
│       └── page.tsx
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── AdSlot.tsx              — Google AdSense枠（現在非表示）
│   └── simulator/
│       ├── SimulatorForm.tsx       — 配偶者折りたたみ全セクション実装済み
│       ├── PortfolioPanel.tsx      — 配偶者ブロック追加済み
│       ├── LifeEventTimeline.tsx   — ownerフラグ・配偶者年齢表示対応済み
│       ├── AssetChart.tsx          — 配偶者合算表示・縦線ラベル修正済み
│       ├── KpiGrid.tsx             — 配偶者内訳・tier4条件修正済み
│       ├── YearlyTable.tsx
│       ├── CashFlowChart.tsx
│       ├── MonteCarloPanel.tsx
│       ├── SensitivityPanel.tsx    — 既存型エラーあり（name: string → any で修正済み）
│       ├── ImpactTable.tsx
│       ├── ProfileDrawer.tsx
│       └── AiPanel.tsx
│
├── lib/
│   ├── types.ts                    — 配偶者フィールド追加済み
│   ├── simulate.ts                 — 配偶者iDeCo・退職金処理実装済み
│   ├── analyze.ts                  — 配偶者KPI集計・退職所得税全スナップ合算修正済み
│   ├── montecarlo.ts
│   ├── helpers.ts                  — retirementTaxCalc()（要確認）
│   ├── profile.ts                  — SAMPLE_PROFILE・profileToSimParams・loadInitialProfile修正済み
│   ├── storage.ts
│   └── index.ts
│
└── store/
    └── simulatorStore.ts           — Zustandストア・loadInitialProfile SAMPLE_PROFILEマージ修正済み
```

---

## 6. 参照ファイル

- `reference/simulation_fixtures.md` — 全シリーズの確定パラメータ・確定数値（ground truth）
- `legacy/STEP35_simulator.html` — 旧HTML版（機能差分の照合元）
- `CLAUDE_CODE_FEATURE_DIFF.md` — 機能差分調査の対象リストと手順
- `CLAUDE.md` — プロジェクト全体の原則・よくある間違い
