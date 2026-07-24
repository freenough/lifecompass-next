# 指示書：GA4計測タグ（gtag.js）のNext.js版への実装

## 背景・原因

旧HTML版（`legacy/STEP*.html`）には以下の通りGA4タグが直書きされていた。

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-KQNTWNKPJ7"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-KQNTWNKPJ7');
</script>
```

Next.js移行の際にこの実装が引き継がれず、本番サイト（`freenough.com`および`freenough.com/asset-simulator`）の
両方でGA4タグが完全に欠落していることを確認済み（実際の本番HTMLソースを目視確認、`gtag`/`G-`の文字列なし）。
そのため直近のGA4データが一切記録されていない。

**測定ID**：`G-KQNTWNKPJ7`（旧HTML版と同一のものを引き続き使用する。プロパティを新規作成しない）

---

## 対応方針

Next.js公式の `next/script` を使い、`app/layout.tsx`（RootLayout）に実装する。
`next/script` の `strategy="afterInteractive"` を使うことで、ページの初期表示をブロックせずに読み込む。

**対象ファイル**：`src/app/layout.tsx`

## 実装内容

`layout.tsx` の `<head>` 相当部分（Next.js App Routerでは`<html>`直下の`<body>`前、
または既存の`<head>`関連実装箇所）に以下を追加する。

```tsx
import Script from 'next/script';

// RootLayoutのreturn内、<body>タグの直前または直後に追加
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-KQNTWNKPJ7"
  strategy="afterInteractive"
/>
<Script id="ga4-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-KQNTWNKPJ7');
  `}
</Script>
```

**注意点**：
- 既存の `AdSlot.tsx`（AdSense用コンポーネント）と同様の配置パターンがあれば、それに倣って実装すること
- 環境変数化は必須ではないが、既存コードが`NEXT_PUBLIC_SITE_URL`等を`.env`で管理する方針であれば、
  測定IDも `NEXT_PUBLIC_GA_MEASUREMENT_ID` として `.env` に切り出しても良い（どちらでも可、KENZOの判断）
- `/asset-simulator` 配下の全ページ（LP・シミュレーター本体・ブログ・法的ページ全て）で
  共通して発火する必要があるため、必ず**ルートのlayout.tsx**（サブディレクトリのlayoutではない）に実装すること

## 完了確認手順

1. `npm run build` が通ること
2. ローカルまたはVercel Previewでページを開き、「ページのソースを表示」で
   `G-KQNTWNKPJ7` が含まれることを確認
3. Vercel本番デプロイ後、`https://www.freenough.com/asset-simulator` を開いた状態で
   GA4管理画面の「リアルタイム」レポートを開き、アクティブユーザー数が1以上になることを確認
4. トップページ（`https://www.freenough.com/`）側にも同様のタグが必要か要検討
   （ブランドサイトと計測を分けるか、同一GA4で統合管理するかはKENZOの判断待ち。
   本指示書はまず `/asset-simulator` 側の実装を優先する）

## 完了報告フォーマット

- 実装箇所：
- ビルド結果：
- ソース確認結果（G-KQNTWNKPJ7の存在）：
- リアルタイムレポート確認結果：
- 残課題（トップページ側の扱いなど）：
