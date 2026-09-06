# 実装指示書: hitori-hojinの一部ページにopenGraph.urlを追加

## 背景

`implementation_hitorihojin_url_cleanup.md` の検証過程で判明した件。

`src/app/hitori-hojin/blog/[slug]/page.tsx` は `openGraph.url` を明示的に設定しているが、`src/app/hitori-hojin/page.tsx` と `src/app/hitori-hojin/blog/page.tsx` は `alternates.canonical` のみで `openGraph.url` を設定していない(バグではなく、元々存在しなかった設定)。

一貫性のため、この2ファイルにも `openGraph.url` を追加する。

## やること

1. `src/app/hitori-hojin/page.tsx` の `metadata`(または `generateMetadata`)内、`openGraph` オブジェクトに `url: HITORI_HOJIN_SITE_URL` を追加する。
   - `HITORI_HOJIN_SITE_URL` は既存の `src/lib/siteConfig.ts` の定数をそのまま使う(前回の対応で追加済みのはず)。
2. `src/app/hitori-hojin/blog/page.tsx` の `metadata`(または `generateMetadata`)内、`openGraph` オブジェクトに `url: `${HITORI_HOJIN_SITE_URL}/blog`` を追加する。
3. `blog/[slug]/page.tsx` の既存の書き方(`openGraph.url`の実装パターン)を参考にし、同じ流儀に揃える。

## 確認してほしいこと

- `tsc --noEmit` / `npm run build` が通ること。
- 本番デプロイ後、`https://www.freenough.com/hitori-hojin` と `https://www.freenough.com/hitori-hojin/blog` の実際のHTMLで `<meta property="og:url">` が以下になっていること:
  - `/hitori-hojin` → `https://www.freenough.com/hitori-hojin`
  - `/hitori-hojin/blog` → `https://www.freenough.com/hitori-hojin/blog`

## やってはいけないこと

- `blog/[slug]/page.tsx` 側の既存実装は変更しない(既に正しいので触らない)。
- `og:image` など他のOGPフィールドは変更しない(今回のスコープ外)。
- `SITE_URL` そのものは変更しない。

---

## 実施結果(2026-09-06・完了)

- `src/app/hitori-hojin/page.tsx`・`src/app/hitori-hojin/blog/page.tsx` の`metadata`に`openGraph.title`/`description`/`url`を追加(`url`は`HITORI_HOJIN_SITE_URL`ベース)。`blog/[slug]/page.tsx`は変更していない。
- `tsc --noEmit`・`npm run build`・ローカル`next start`でのog:url実測、いずれも成功。
- コミット`a5c7c79`をmainへpush、Vercel本番デプロイ後に本番実機で確認:
  - `https://www.freenough.com/hitori-hojin` → `<meta property="og:url" content="https://www.freenough.com/hitori-hojin"/>`
  - `https://www.freenough.com/hitori-hojin/blog` → `<meta property="og:url" content="https://www.freenough.com/hitori-hojin/blog"/>`
- 指示書記載の期待値と完全一致。
