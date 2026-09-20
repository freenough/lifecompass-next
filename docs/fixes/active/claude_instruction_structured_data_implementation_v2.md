# 指示書: 運営者情報(Organization)・記事構造化データ(Article)実装 v2

## 位置づけ

先の調査専用指示書「claude_instruction_author_structured_data_check.md」の結果を受けた実装指示です。
**v1（Person/Ken関連の記述を含む版）は破棄し、こちらのv2で進めてください。** 検討の結果、著者を個人名で前面に出す方針は採らず、Organization（freenoughブランド）のみで構造化データを実装する設計に変更しました。`/about`ページの追記も行いません。

## 作業ルール(必ず遵守)

- 専用ブランチ（例: `feature/structured-data`）で作業し、Vercel Preview URLで確認できる状態にしてから完了報告してください
- コミット・pushはKENZOの明示的指示があるまで行わないでください
- ロックファイル（`blog.ts`, `hitoriHojinBlog.ts`含む）は**変更不要**な設計にしてあります。フィールド追加等が必要だと判明した場合は、実装を止めて先に報告してください
- 完了報告には実際に生成されたJSON-LDの実データ（curlまたはブラウザのページソースから取得したscriptタグの中身）を最低2記事分（通常ブログ1件・hitori-hojinブログ1件）添えてください

---

## A. SNS URL表記の統一

`src/app/about/page.tsx`の49-57行目付近、`twitter.com/freenough`となっている箇所を`x.com/freenough`に統一してください（共通フッター側は既に`x.com`表記のため、こちらに合わせる）。noteのURLは変更不要です。

`/about`ページのその他の文言（運営者名・運営者についての説明文）は**変更不要**です。現状のままで構いません。

---

## B. サイト全体のJSON-LD（Organization）

`freenough-main/app/layout.tsx`と`lifecompass-next/src/app/layout.tsx`それぞれのルートレイアウトに、`<script type="application/ld+json">`でOrganizationのJSON-LDを埋め込んでください。

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "freenough",
  "url": "https://www.freenough.com",
  "sameAs": [
    "https://x.com/freenough",
    "https://note.com/freenough"
  ]
}
```

- 実装方法（別コンポーネント化して両リポジトリで似た形にする、それぞれ直書きする等）は既存のコード構成に合わせて判断してください

---

## C. 記事ページのArticle構造化データ

### 対象
- `src/app/blog/[slug]/page.tsx`（通常ブログ）
- `src/app/hitori-hojin/blog/[slug]/page.tsx`（一人法人ブログ）

### 実装方針
各記事ページのコンポーネント内で、`<script type="application/ld+json">`として以下の内容を出力してください（`generateMetadata`関数ではなく、ページ本体のJSXで出力する形で構いません）。

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "(post.title)",
  "description": "(post.description)",
  "image": "(記事のOGP画像URL。通常ブログは既存の /api/og/blog/[slug]、hitori-hojinブログは現状の共通OGP画像URLをそのまま使用)",
  "datePublished": "(post.dateをISO 8601形式に変換した値)",
  "dateModified": "(datePublishedと同じ値。更新日を別管理する仕組みが現状ないため、意図的に同値とする旨をコード上にコメントで残してください)",
  "author": {
    "@type": "Organization",
    "name": "freenough",
    "url": "https://www.freenough.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "freenough",
    "url": "https://www.freenough.com"
  }
}
```

- `author`と`publisher`は同一のOrganizationで構いません（個人著者を立てない設計のため）
- `blog.ts`・`hitoriHojinBlog.ts`ともフィールド変更は不要です。上記はすべて固定値または既存フィールドの変換のみで構成できます
- hitori-hojinブログの記事は現状`eyecatch`が未設定のため、`image`は共通OGP画像のURLで問題ありません

---

## 完了報告のフォーマット

- A〜Cそれぞれの変更ファイルパス・行番号
- 生成されたJSON-LDの実データ（最低2記事分、上記参照）
- Vercel PreviewでのGoogle構造化データテスト（[Rich Results Test](https://search.google.com/test/rich-results)等）の結果、またはそれに相当する目視確認結果
