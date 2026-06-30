# 引き継ぎプロンプト — LifeCompass Next.js版 Phase 3 UI刷新（セッション03以降）

作成日: 2026-06-25

---

## 1. このセッション（session 03）で完了した実装

### ランディングページ `src/app/page.tsx`

旧実装は `/simulator` へのリダイレクトのみだったところを、本格的なLPに全面実装。

**セクション構成:**
1. Hero（見出し・本文・CTAボタン・補足テキスト）
2. スクリーンショット（`/images/screenshot.png`。未配置時はグレープレースホルダー表示）
3. 差別化3カラム（Tabler Icons付き：IconChartBar / IconBuildingBank / IconLock）
4. キャラクターカード4枚（Tabler Icons付き・下記参照）
5. 使い方3ステップ（Tabler Icons付き：IconPencil / IconPlayerPlay / IconChartLine）
6. CTA（ボタン）
7. 広告スロットA/Bコメントアウト済み

**スタイル方針:**
- CTAボタン・テキストリンクはすべて `#334155`（blue-600ではない）
- `style={{ backgroundColor: '#334155' }}` をインラインで指定（Tailwindカスタム色未登録のため）

**キャラクターカードの詳細（重要）:**

| キャラクター | サブタイトル | 不安コピー | noteリンク | バッジ |
|---|---|---|---|---|
| 田中さん（35歳・独身） | 貯めてきた。でも、いつ辞められる？ | NISAもiDeCoも続けてきた。でもゴールが見えない | https://note.com/freenough/n/n3ac02f175447 | **公開中**（#334155） |
| 中村夫婦（共働き） | 教育費とFIREを両立したい。 | 収入は高いのに、いつ辞められるか見えない | なし（近日公開） | **近日公開**（グレー） |
| 佐々木さん（53歳） | 早期退職しても大丈夫？ | 退職金・年金・NISAをまとめて計算したい | なし（近日公開） | **近日公開**（グレー） |
| 山本さん（34歳・独身エンジニア） | FIRE達成は、いつ始めるかで決まる。 | 積立額を増やしても、開始年齢が本当のボトルネックだった | なし（近日公開） | **近日公開**（グレー） |

- **田中さんのみ** `<a href="...">` でカード全体をリンク化・hover時に shadow-md + border-slate-300 強調
- 他3枚は `<div>` + `cursor-default`・hover効果なし
- 下部の「→ それぞれのシミュレーション結果をnoteで読む」は https://note.com/freenough へのボタン（#334155）

---

### 法的ページ（新規作成）

| URL | ファイル | 概要 |
|---|---|---|
| `/privacy-policy` | `src/app/privacy-policy/page.tsx` | GA4・AdSense・ローカルストレージ説明 |
| `/disclaimer` | `src/app/disclaimer/page.tsx` | 試算である旨・投資助言否定 |
| `/about` | `src/app/about/page.tsx` | freenough運営者情報・SNSリンク |
| `/disclosure` | `src/app/disclosure/page.tsx` | 広告・アフィリエイト開示（全面書き直し） |

`src/components/layout/Footer.tsx` に上記4リンクを追加（`flex-wrap` 対応済み）。

---

### ヘッダー `src/components/layout/Header.tsx`

- ナビゲーションから「広告開示」を削除（シミュレーター・ブログの2リンクのみ）
- ロゴ画像（`/images/compass_logo.png`、28×28px）を `next/image` でテキスト左に追加

---

### PortfolioPanel.tsx

- セクションラベル変更: ① `現在のPF` / ② `シミュレーションPF` / ③ `シミュレーションPF`（括弧書き削除）
- ②のコピーボタンを別行（`subAction` prop）に移動。セクション展開時のみ表示
- 開閉chevronの向きを修正: 閉じているとき▼、開いているとき▲

---

### SensitivityPanel.tsx（大幅改善）

旧HTML版ロジックと突き合わせて以下を修正:

**ロジック修正:**
- `findFireAge(snaps, refSnaps)` を旧HTML版と同一実装に変更
  - ベースライン: 自身の `baseExp×25` で判定（`refSnaps=null`）
  - 変化後: `baseSnaps` の `baseExp×25` を閾値に使用（公平な比較）
- `inflR` を `Math.max(0, ...)` でクランプ
- `retAge` を `Math.min(baseP.lifeEx - 1, ...)` で上限クランプ
- 差分計算バグ修正: `imp` はクランプ前の生値 (`rawBaseShort - rawSensShort`) で計算、表示のみクランプ
- `−0万` → `0万`（`fmtShort()` ヘルパー追加）

**KPI表示の3ケース対応:**
1. 両者FIRE達成: 「N年早 / N年遅 / 変化なし」
2. ベース未達・変化後達成: 「初FIRE達成」
3. 両者未達: 退職時点の不足額 + 改善/悪化額（元のラベルから「退職時(N歳)」表記を削除）

**UI改善:**
- FIREラインをグラフの動的ライン（`baseSnaps` per-snap `baseExp×25`）に変更（定数 `ReferenceLine` → `Line`）
- 退職年齢縦棒（`dA` スライダーに連動・AssetChartと同スタイル `stroke="#64748b" strokeDasharray="3 3"`）追加
- KPIカード〜グラフ間に凡例行（FIREライン/ベースライン/変化後）と最終資産差を表示
- リセットボタンを `border border-slate-300 rounded-full px-2 py-0.5` スタイルに変更
- タイトルから「（安心）」を除去

---

## 2. 現在未完了・確認中の項目

### 住宅ローンモーダル（最優先・session 02から持越し）

**旧HTML版の仕様（移植すべき内容）:**
- 4入力: 借入額（万円）・金利（年率%）・返済年数・返済開始年齢
- リアルタイム試算表示: 月次返済額・年次返済額・総返済額
- 元利均等返済計算式:
  ```js
  function calcMortgage(principal, rate, termYears) {
    const r = rate / 100 / 12;
    const n = termYears * 12;
    if (r === 0) return principal / termYears;
    const monthly = principal * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
    return Math.round(monthly * 12); // 年間返済額
  }
  ```
- 保存フィールド: `principal`, `rate`, `termYears`, `age`, `years`（=termYears）
- タイムライン表示例: `住宅ローン 41〜61歳 / 200万`

**Next.js版の現状:** `subtype: 'mortgage'` 選択可能だが `amount` 直接入力のみ（専用フォームなし）

### 機能差分調査（session 02から持越し）

`CLAUDE_CODE_FEATURE_DIFF.md`（プロジェクトルート）に対象コンポーネント一覧と手順が定義されている。
調査対象: `LifeEventTimeline` / `MonteCarloPanel` / `YearlyTable` / `ImpactTable` / `CashFlowChart` / `SimulatorForm`

### スクリーンショット画像（LP用）

`/images/screenshot.png` が未配置。現在はグレープレースホルダーで表示。
シミュレーター画面のスクリーンショットを `public/images/screenshot.png` に配置すれば自動表示される。

### noteリンク（キャラクターカード）

中村夫婦・佐々木さん・山本さんのnote記事が公開されたら:
1. `src/app/page.tsx` の `characters` 配列に `href` を追加
2. バッジを「近日公開」→「公開中」に変更

---

## 3. src/ ファイル構成（現在）

```
src/
├── app/
│   ├── layout.tsx                  — RootLayout（Noto Sans JP・Header・Footer）
│   ├── page.tsx                    — ランディングページ（LP）★今セッション新規実装
│   ├── globals.css                 — Tailwindのbase、カスタム色変数定義
│   ├── simulator/
│   │   └── page.tsx                — メインシミュレーターページ（'use client'・mounted guard）
│   ├── blog/
│   │   ├── page.tsx                — ブログ一覧（骨格のみ）
│   │   └── [slug]/page.tsx         — ブログ記事（骨格のみ）
│   ├── privacy-policy/
│   │   └── page.tsx                — プライバシーポリシー ★今セッション新規
│   ├── disclaimer/
│   │   └── page.tsx                — 免責事項 ★今セッション新規
│   ├── about/
│   │   └── page.tsx                — 運営者情報 ★今セッション新規
│   └── disclosure/
│       └── page.tsx                — 広告開示 ★今セッション全面書き直し
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx              — ロゴ画像追加・広告開示リンク削除 ★今セッション修正
│   │   ├── Footer.tsx              — 法的ページリンク追加 ★今セッション修正
│   │   └── AdSlot.tsx              — Google AdSense枠（現在非表示）
│   └── simulator/
│       ├── SimulatorForm.tsx       — 入力パラメータフォーム（rR無効化対応済み）
│       ├── PortfolioPanel.tsx      — ラベル・コピーボタン位置・chevron修正 ★今セッション修正
│       ├── LifeEventTimeline.tsx   — ライフイベント追加・編集（住宅ローンモーダル未実装）
│       ├── AssetChart.tsx          — 総資産推移グラフ（FIREライン動的計算済み）
│       ├── KpiGrid.tsx             — KPIカード（Tier1〜4）
│       ├── YearlyTable.tsx         — 年次資産テーブル
│       ├── CashFlowChart.tsx       — キャッシュフローグラフ
│       ├── MonteCarloPanel.tsx     — MC結果パネル
│       ├── SensitivityPanel.tsx    — 感度分析（旧HTML版ロジックに準拠）★今セッション大幅修正
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
│   ├── profile.ts                  — ProfileV3型・SAMPLE_PROFILE・profileToSimParams・calcMu等
│   ├── storage.ts                  — localStorage操作
│   └── index.ts                    — simulate/analyze/runMCの再エクスポート
│
└── store/
    └── simulatorStore.ts           — Zustandストア（全状態管理）
```

---

## 4. 開発上の注意事項（session 02から継続）

### カラー方針
- LP・フッター等のCTAは `#334155`（Tailwindの `text-accent` 変数相当）
- Tailwindカスタムテーマには `--color-accent: #334155` が定義済みだが、`bg-[#334155]` より `style={{ backgroundColor: '#334155' }}` を使っている箇所あり（統一検討余地あり）

### simulate()/analyze()のシグネチャ変更禁止
- `simulate(p, events, strategy, shockOverrides?)` と `analyze(snaps, p)` の2つのみがUI層のエントリポイント
- `scripts/full-verify.js` が常にPASSであること（Stop Hookで強制）

### calcAggregatedSigmaのロジック（重要・session 02から継続）
- `simulatorStore.ts` と `PortfolioPanel.tsx` の両方に同一ロジックが存在（重複）
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

---

## 5. 次セッションでやること（優先順）

1. **住宅ローンモーダルの実装**（`LifeEventTimeline.tsx`）
   - `subtype: 'mortgage'` 選択時に専用フォームを表示
   - 4入力 + リアルタイム試算表示
   - 旧HTML版の `calcMortgage()` ロジックを移植

2. **機能差分調査と修正**（`CLAUDE_CODE_FEATURE_DIFF.md` 参照）
   - 各コンポーネントを旧HTML版と比較・差分報告 → 承認後に実装

3. **キャラクターカードのnoteリンク追加**（記事公開次第）
   - 中村夫婦・佐々木さん・山本さんの href を追加
   - バッジを「近日公開」→「公開中」に変更

4. **スクリーンショット配置**
   - シミュレーター画面を撮影して `public/images/screenshot.png` に配置

5. **blog/ ページの実装**（必要に応じて）
   - 現在は骨格のみ

---

## 6. 参照ファイル

- `reference/simulation_fixtures.md` — 全シリーズの確定パラメータ・確定数値（ground truth）
- `legacy/STEP35_simulator.html` — 旧HTML版（機能差分の照合元）
- `CLAUDE_CODE_FEATURE_DIFF.md` — 機能差分調査の対象リストと手順
- `CLAUDE.md` — プロジェクト全体の原則・よくある間違い
