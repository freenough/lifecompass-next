# 引き継ぎプロンプト — LifeCompass Next.js版 セッション06以降

作成日: 2026-06-29

---

## 1. このセッション（session 05→06）で完了した実装

### /methodology 退職所得税の留意事項追記
- 「計算上の留意事項」ブロックを追加（灰色背景・bg-gray-50）
  - ①税率は簡易計算（課税退職所得に一律20.315%を適用・ChatGPT指摘を受けて修正）
  - ②同年受取時の控除年数の扱い（2022年税制改正・max簡略化の説明）
  - ③個人の税務状況は考慮しない
- 「表示値について」セクション追加：浮動小数点誤差の仕様説明

### /methodology モンテカルロ破綻確率の色付きテキストを灰色に統一
- 5%未満／5〜15%／15%以上の色付きテキストを `text-gray-700` に変更

### AiPanel.tsx を Gemini API に修正（重要）
- Claude APIからGemini APIに完全移行
- モデル: `gemini-2.5-flash-lite`・温度: 0.2・タイムアウト: 45秒
- APIキー: ユーザーがブラウザ入力 → `localStorage` 保存
- `buildAIPayload()` + `buildPrompt()` を旧HTML版からポート
- MCゲート・3回リトライ実装
- **AIパネルは必ずGemini APIを使用。Claude APIは絶対に使わない**

### LifeEventTimeline.tsx 住宅ローン表示修正
- 年次返済額を170.7万（小数1桁）で表示するよう修正
- 5040万・1%・35年 → 月次14.2万 / 年次170.7万 / 総返済5,976万

### simulate.ts スナップ保存の丸め修正
- `snaps.push()` 内の8フィールド（nisa/ideco/tax/cash/spNisa/spIdeco/spTax/spCash）を個別に `Math.round()` して保存
- `totalAssets` は合算後に1回だけ `Math.round()`（旧HTML版と同仕様）
- 浮動小数点誤差により totalAssets と明細合計が最大1万円ずれる場合がある（仕様・免責記載済み）

### LPキャラクターカード修正
- 田中さんの年齢・属性を正しく更新（42歳・既婚・サラリーマン）
- 表示順変更：田中・山本・中村夫婦・佐々木
- 田中さん・山本さんのnoteマガジンリンク追加（公開中バッジ）

### LP Hero セクション全面刷新
- H1を2段落ち：「あなたのFIREは、\n何歳？」
- HeroDemo コンポーネント新規作成（`src/components/lp/HeroDemo.tsx`）
  - デモプロファイルで simulate() + montecarlo() をリアルタイム実行
  - KPIカード3枚（FIRE達成年齢・資産寿命・MC破綻確率）ダークネイビー塗りつぶし
  - モンテカルロ扇形グラフ（縦軸なし・退職/年金ライン・FIREラインなし）
  - KPIカードのフェードインアニメーション（0.15秒時間差）
  - グラフの左から描画アニメーション
  - 横軸：35〜90歳（35, 45, 55, 65, 75, 85, 90）
  - 注記：「※ サンプルデータによるシミュレーション結果」（左寄せ）
  - SSRエラー防止のため `dynamic import（ssr: false）`

### デモプロファイル確定値（HeroDemo）
```ts
curAge: 35, retAge: 60, penAge: 65, penAmt: 120, lifeEx: 90,
baseInc: 750, baseExp: 360, inflR: 1,
acct: {
  nisa:  { bal: 400, con: 120, toAge: 60, rW: 5, rR: 3.5 },
  ideco: { bal: 300, con: 27.6, toAge: 60, rW: 5, rR: 3.5 },
  tax:   { bal: 500, con: 0, toAge: 60, rW: 5, rR: 3.5 },
  cash:  { bal: 300 },
},
idecoYrs: 10, idecoReceiveType: 'pension', idecoReceiveYears: 15,
sevYrs: 12, mcStd: 12
// ライフイベント：支出変更 60歳 300万
```
表示数値（目安）：FIRE達成52歳・資産寿命枯渇なし・MC破綻確率0.6〜1.0%

### OGP画像設置
- `public/images/ogp.png` 配置済み（1200×630px）
- `src/app/layout.tsx` にopenGraph・twitterメタタグ追記済み

### Vercelデプロイ
- URL: `https://freenough-lifecompass.vercel.app/`
- basePath なし（将来カスタムドメイン取得後に `lifecompass.freenough.jp` に切り替え予定）
- 再デプロイ方法: `vercel --prod`

---

## 2. セッション06で最初にやること

### Hero左右の高さ調整（未解決・低優先度）
HeroDemoカードとHeroテキストブロックの縦の重心が合っていない。
KPIカードが上寄りになっている。

**現状のコード（page.tsx）：**
```tsx
<div className="flex flex-col sm:flex-row sm:items-start gap-8">
  <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left">
  <div className="hidden sm:flex sm:w-[460px] sm:shrink-0 sm:self-stretch">
```

**試していない案：**
- HeroDemoカードに固定高さ（`style={{ minHeight: '420px' }}`）を設定
- KPIカードの上に `mt-auto` の代わりに固定の `pt-XX` を入れる
- page.tsx のHeroセクション全体の `py-16` を増やして左カラムを縦に引き伸ばす

---

## 3. 残件（優先順）

1. **モバイル表示の確認・修正**
   - `https://freenough-lifecompass.vercel.app/` を実機確認
   - LP・シミュレーターのモバイル表示崩れを修正

2. **Vercel最新コードの再デプロイ**
   - セッション05の修正をVercelに反映する
   - `vercel --prod`

3. **noteリンク追加**（記事公開次第）
   - 中村夫婦・佐々木さんの note 記事が公開されたら:
     1. `src/app/page.tsx` の `characters` 配列に `href` を追加
     2. バッジを「近日公開」→「公開中」に変更

4. **blog/ ページの実装**（必要に応じて）

---

## 4. 開発上の注意事項（継続）

### AIパネルについて（重要）
- **必ずGemini APIを使用。Claude APIは絶対に使わない**
- ユーザーが自身のGemini APIキーを入力する前提
- 参照：`DESIGN_AI_ANALYSIS.md`

### simulate.ts の丸め仕様
- スナップ保存時：個別口座は `Math.round()`・totalAssetsは合算後に `Math.round()`
- 表示時：`fmt()` で `Math.round()` → 万円単位整数表示
- totalAssetsと明細合計が最大1万円ずれるのは仕様（浮動小数点誤差）
- `/methodology` に「表示値について」として記載済み

### カラー方針
- LP・フッター等のCTAは `#334155`
- 口座内訳グラフ：NISA `#1D9E75` / iDeCo `#0C447C` / 特定 `#378ADD` / 現金 `#888780`

### Claude Code検証ルール
- `full-verify.js` が常にPASSであること（現在63チェックポイント）
- Claude Codeの「完了」報告を信用しない。必ずgrepやファイル確認で独立検証する
- アップロードされたファイルは修正前の古いものの場合がある。出力ファイルを使うこと

### loadInitialProfile のマージ仕様
```ts
return {
  ...SAMPLE_PROFILE,
  ...loaded,
  params: { ...SAMPLE_PROFILE.params, ...loaded.params },
  portfolio: { ...SAMPLE_PROFILE.portfolio, ...loaded.portfolio },
};
```

### 配偶者ライフイベントの年齢軸
- `owner: 'spouse'` のイベントは配偶者年齢で入力
- エンジン内で `p.curAge + (ev.age - spCurAge)` で本人年齢軸に変換

---

## 5. src/ ファイル構成（現在）

```
src/
├── app/
│   ├── layout.tsx                  — RootLayout（OGPメタタグ追記済み）
│   ├── page.tsx                    — LP（HeroDemo・キャラクターカード修正済み）
│   ├── globals.css
│   ├── simulator/
│   │   └── page.tsx                — シミュレーター（SearchParamsLoader/Suspense対応済み）
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── guide/
│   │   └── page.tsx
│   ├── methodology/
│   │   └── page.tsx                — 留意事項・表示値について追記済み
│   ├── privacy-policy/page.tsx
│   ├── disclaimer/page.tsx
│   ├── about/page.tsx
│   └── disclosure/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── AdSlot.tsx
│   └── simulator/
│       ├── SimulatorForm.tsx
│       ├── PortfolioPanel.tsx
│       ├── LifeEventTimeline.tsx   — 住宅ローン年次返済額修正済み
│       ├── AssetChart.tsx
│       ├── KpiGrid.tsx
│       ├── YearlyTable.tsx         — 合算表示修正済み
│       ├── CashFlowChart.tsx
│       ├── MonteCarloPanel.tsx
│       ├── SensitivityPanel.tsx
│       ├── ImpactTable.tsx
│       ├── ProfileDrawer.tsx
│       └── AiPanel.tsx             — Gemini API使用（重要）
│   └── lp/
│       └── HeroDemo.tsx            — LP Hero用ライブデモコンポーネント（新規）
│
├── lib/
│   ├── types.ts
│   ├── simulate.ts                 — スナップ丸め修正済み
│   ├── analyze.ts
│   ├── montecarlo.ts
│   ├── helpers.ts                  — retirementTaxCalc()確認済み（仕様通り）
│   ├── profile.ts
│   ├── storage.ts
│   └── index.ts
│
└── store/
    └── simulatorStore.ts
```

---

## 6. デプロイ情報

- **本番URL**: `https://freenough-lifecompass.vercel.app/`
- **再デプロイ**: `vercel --prod`
- **将来のドメイン**: `lifecompass.freenough.jp`（未取得）
- **basePath**: なし（将来カスタムドメイン後に検討）

---

## 7. 参照ファイル

- `reference/simulation_fixtures.md` — 全シリーズの確定パラメータ・確定数値
- `legacy/STEP35_simulator.html` — 旧HTML版（機能差分の照合元）
- `DESIGN_AI_ANALYSIS.md` — AIパネル仕様（Gemini API使用が明記されている）
- `CLAUDE.md` — プロジェクト全体の原則
- `scripts/full-verify.js` — フィクスチャ回帰テスト（63チェックポイント）
