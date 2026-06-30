# 引き継ぎプロンプト — LifeCompass Next.js版 Phase 3 UI刷新（セッション04以降）

作成日: 2026-06-25

---

## 1. このセッション（session 03→04）で完了した実装

### ランディングページ（LP）大幅改善

**Heroセクション 2カラム化**
- 左カラム：キャッチコピー・CTA
- 右カラム：シミュレーター画面スクショ（角丸・影付き・キャプション付き）
- コンテナ幅を差別化セクションと統一
- モバイルでは1カラムに自動切替

**Heroコピー確定版：**
```
H1：あなたのFIREは、何歳？
サブ：未来の選択肢を、自分の数字で見える化。
説明：1,000通りの市場変動で、破綻確率まで計算します。
CTA：今すぐシミュレーションする →
補足：無料・登録不要・データは端末内に保存
```

**スクショキャプション：**
`資産寿命・FIRE達成年齢・MC破綻確率が一画面で確認できます`

### 静的コンテンツページ（新規作成）

| URL | ファイル | 概要 |
|---|---|---|
| `/guide` | `src/app/guide/page.tsx` | 使い方ガイド（入力項目・タイムライン・結果の読み方） |
| `/methodology` | `src/app/methodology/page.tsx` | 計算ロジック・前提（収入固定・インフレ・税金・FIRE判定・MC） |

フッターに両ページへのリンクを追加済み。

### AssetChart.tsx 凡例ラベル修正

- 戦略1つのときの凡例ラベル「現在の編集内容」→ 戦略名（例：「比例取崩」）に変更
- 複数戦略選択時と同一ロジックに統一

---

## 2. 現在未完了・確認中の項目

### スクリーンショット画像の改善（軽微）

`public/images/screenshot.png` は配置済みだが、上部の「固定モード／MCモード／1,000試行を実行」タブバーが切れている。
タブバーが見えるよう少し上から撮り直すと望ましい。

### 差別化カード〜キャラクターカード間の余白

わずかに大きいが許容範囲。デプロイ後に確認して必要なら調整。

### キャラクターカードのnoteリンク追加（記事公開次第）

中村夫婦・佐々木さん・山本さんの note 記事が公開されたら:
1. `src/app/page.tsx` の `characters` 配列に `href` を追加
2. バッジを「近日公開」→「公開中」に変更
3. カード全体を `<a>` でラップ・hover効果を田中さんと同様にする

---

## 3. OGP設定（TODO・優先度高）

Vercelデプロイ前に対応すること。XやnoteでURLシェア時にカード画像が出るかどうかに直結する。

**やること：**

1. OGP用画像を用意（`public/images/ogp.png`、1200×630px推奨）
   - シミュレーター画面スクショをベースにCanva等で「あなたのFIREは、何歳？」テキストを乗せる

2. `src/app/layout.tsx` のmetadataに追記：

```typescript
openGraph: {
  images: [{ url: '/images/ogp.png', width: 1200, height: 630 }],
},
twitter: {
  card: 'summary_large_image',
  images: ['/images/ogp.png'],
},
```

---

## 4. src/ ファイル構成（現在）

```
src/
├── app/
│   ├── layout.tsx                  — RootLayout（Noto Sans JP・Header・Footer）
│   ├── page.tsx                    — ランディングページ（LP）★session03-04で大幅改修
│   ├── globals.css                 — Tailwindのbase、カスタム色変数定義
│   ├── simulator/
│   │   └── page.tsx                — メインシミュレーターページ（'use client'・mounted guard）
│   ├── blog/
│   │   ├── page.tsx                — ブログ一覧（骨格のみ）
│   │   └── [slug]/page.tsx         — ブログ記事（骨格のみ）
│   ├── guide/
│   │   └── page.tsx                — 使い方ガイド ★session04新規
│   ├── methodology/
│   │   └── page.tsx                — 計算ロジック・前提 ★session04新規
│   ├── privacy-policy/
│   │   └── page.tsx                — プライバシーポリシー
│   ├── disclaimer/
│   │   └── page.tsx                — 免責事項
│   ├── about/
│   │   └── page.tsx                — 運営者情報
│   └── disclosure/
│       └── page.tsx                — 広告開示
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx              — ロゴ画像・ナビ2リンク
│   │   ├── Footer.tsx              — 法的ページ・guide・methodology リンク追加済み
│   │   └── AdSlot.tsx              — Google AdSense枠（現在非表示）
│   └── simulator/
│       ├── SimulatorForm.tsx
│       ├── PortfolioPanel.tsx
│       ├── LifeEventTimeline.tsx   — 住宅ローンモーダル実装済み（calcMortgage済み）
│       ├── AssetChart.tsx          — 凡例ラベル戦略名に修正済み ★session04
│       ├── KpiGrid.tsx
│       ├── YearlyTable.tsx
│       ├── CashFlowChart.tsx
│       ├── MonteCarloPanel.tsx
│       ├── SensitivityPanel.tsx
│       ├── ImpactTable.tsx
│       ├── ProfileDrawer.tsx
│       └── AiPanel.tsx
│
├── lib/
│   ├── types.ts
│   ├── simulate.ts                 — 変更禁止
│   ├── analyze.ts                  — 変更禁止
│   ├── montecarlo.ts
│   ├── helpers.ts
│   ├── profile.ts
│   ├── storage.ts
│   └── index.ts
│
└── store/
    └── simulatorStore.ts           — Zustandストア
```

---

## 5. 開発上の注意事項（継続）

### カラー方針
- LP・フッター等のCTAは `#334155`
- `style={{ backgroundColor: '#334155' }}` をインラインで指定している箇所あり

### simulate()/analyze()のシグネチャ変更禁止
- `scripts/full-verify.js` が常にPASSであること（Stop Hookで強制）

### calcAggregatedSigmaのロジック（重複・未解消）
- `simulatorStore.ts` と `PortfolioPanel.tsx` の両方に同一ロジックが存在
- 将来的に `profile.ts` に移動して共有すべきだが現在未対応

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
git add . && git commit -m "before session[N]"
```
作業前に必ず実行すること。

---

## 6. 次セッションでやること（優先順）

1. **OGP画像の設定**（Vercelデプロイ前に必須）
   - `public/images/ogp.png` を用意して `layout.tsx` に追記

2. **機能差分調査と修正**（`CLAUDE_CODE_FEATURE_DIFF.md` 参照）
   - 各コンポーネントを旧HTML版と比較・差分報告 → 承認後に実装

3. **配偶者機能の基本情報統合**（検討中）
   - 現在はアコーディオン内に独立している
   - 基本情報セクションに本人と並べて入力できる形式に変更したい
   - 設計はKENZOと要相談

4. **Vercelデプロイ（Phase 5）**
   - デプロイ後にモバイル表示を実機確認すること

5. **キャラクターカードのnoteリンク追加**（記事公開次第）

6. **blog/ ページの実装**（必要に応じて）

---

## 7. 参照ファイル

- `reference/simulation_fixtures.md` — 全シリーズの確定パラメータ・確定数値（ground truth）
- `legacy/STEP35_simulator.html` — 旧HTML版（機能差分の照合元）
- `CLAUDE_CODE_FEATURE_DIFF.md` — 機能差分調査の対象リストと手順
- `CLAUDE.md` — プロジェクト全体の原則・よくある間違い
