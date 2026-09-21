# 指示書: BreadcrumbList構造化データ・画像alt属性の確認と修正

## 位置づけ

サイト全体の技術基盤整備の一連の作業(sitemap・画像最適化・OGP・Organization/Article/FAQPage構造化データ)の最後の仕上げです。BreadcrumbListは現役の機能で、FAQPageのような廃止リスクは確認済みです（2026年6月時点のGoogle構造化データ一覧に現役タイプとして記載あり）。

## 作業ルール(必ず遵守)

- 専用ブランチ（例: `feature/breadcrumb-alt-text`）で作業し、Vercel Preview URLで確認できる状態にしてから完了報告してください
- コミット・pushはKENZOの明示的指示があるまで行わないでください
- ロックファイル（`blog.ts`, `hitoriHojinBlog.ts`含む）は**変更不要**な設計です。変更が必要だと判明した場合は実装を止めて先に報告してください
- **構造化データは、ページに実際に表示されているパンくずUIのテキスト・リンク先と完全に一致させてください**（Organization/Personの時と同じ原則。表示内容と構造化データが食い違うと無効化・ペナルティのリスクがあります）

---

## A. BreadcrumbList構造化データ

### 対象
- `src/app/blog/[slug]/page.tsx`（通常ブログ、確認済みの表示: `Home › Blog › (記事タイトル)`）
- `src/app/hitori-hojin/blog/[slug]/page.tsx`（一人法人ブログ。パンくずUIの実際の表示内容・階層をまず確認し、それに合わせて構造化データを作成してください。通常ブログと同じ2階層か、`一人法人`を挟んだ3階層かは要確認）

### 実装方針

各記事ページに、既存のArticle・FAQPage JSON-LDと同じ形で、`<script type="application/ld+json">`としてBreadcrumbListを追加してください。

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "(パンくず1階層目の実際の表示テキスト)",
      "item": "(そのリンク先の絶対URL)"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "(パンくず2階層目の実際の表示テキスト)",
      "item": "(そのリンク先の絶対URL)"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "(記事タイトル)",
      "item": "(記事ページ自体の絶対URL)"
    }
  ]
}
```

- `name`はページに実際に表示されているテキストをそのまま使ってください（意訳・省略しない）
- 最後の項目（記事自身）は、現在のパンくずUIでリンクになっていない（クリックできないテキストのみ）場合でも、構造化データ上は`item`に自分自身のURLを入れる形で問題ありません（Googleの標準的な実装方法です）

### 他ページの確認（実装は不要、報告のみ）

`/tools`配下・`/concerns`配下等、記事ページ以外にも同様のパンくずUIが存在するか確認し、存在する場合はページの種類とURLパターンを完了報告に記載してください。**この指示書の範囲では実装しないでください**（対象が見つかった場合は、別途指示書を出します）。

---

## B. 画像alt属性の確認と修正

### 対象
先日のnext/image移行で変更した以下のファイル、および両リポジトリのその他の`next/image`使用箇所すべて:
- `src/components/blog/BlogListClient.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/app/hitori-hojin/blog/[slug]/page.tsx`
- `src/components/hitori-hojin/HitoriHojinBlogListClient.tsx`
- `src/components/hitori-hojin/HitoriHojinArticleCard.tsx`
- `freenough-main/app/page.tsx`（`compass_logo.png`使用箇所）
- 上記以外にも`<Image>`タグを使っている箇所があれば、grep等で洗い出して対象に含めてください

### 確認・修正内容

1. 各`<Image>`タグの`alt`属性の現在の値を一覧化してください
2. 空文字（`alt=""`）、汎用的すぎる値（`alt="image"` `alt="サムネイル"`等、内容を説明していないもの）があれば、その画像が何を表しているかが伝わる具体的な文言に修正してください
   - ブログのeyecatch画像: 記事タイトルをそのまま使う、または「(記事タイトル)のイメージ画像」のような形で構いません
   - ロゴ画像: 「FREENOUGH」「freenoughロゴ」等、シンプルな説明で構いません
3. 既に適切な値が入っている場合は、変更不要です（その旨を報告してください）

---

## 完了報告のフォーマット

- A: 変更ファイルパス・行番号、通常ブログ・hitori-hojinブログそれぞれのBreadcrumbList実データ（最低1記事ずつ）、パンくずUIの表示内容との一致確認結果、他ページのパンくずUI有無の調査結果
- B: 確認した全`<Image>`タグのalt属性一覧（変更前→変更後）
- Vercel PreviewでのSchema Markup ValidatorまたはRich Results Testの結果（BreadcrumbListが正しく検出されるか）
