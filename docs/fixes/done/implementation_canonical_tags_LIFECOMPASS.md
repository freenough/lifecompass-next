# 実装依頼(lifecompass-next):全主要ページへのcanonicalタグ追加

作成日:2026-08-01
対象リポジトリ:**lifecompass-next**
種別:**実装**

---

## 1. 背景

先行の調査(`investigation_lifecompass_legacy_path.md`)で、以下が判明している。

- ブログ記事(`/asset-simulator/blog/[slug]`)にはcanonicalタグが正しく
  設定されている
- それ以外の全ページ(ホーム`/asset-simulator`・`/asset-simulator/app`・
  `/asset-simulator/tools`・`/asset-simulator/tools/*`(7本)・
  `/asset-simulator/guide`・`/asset-simulator/methodology`・
  `/asset-simulator/disclosure`・`/asset-simulator/privacy-policy`・
  `/asset-simulator/disclaimer`・`/asset-simulator/about`)には
  canonicalタグが一切設定されていない

本リポジトリはVercelの既定ドメイン(`freenough-lifecompass.vercel.app`)
自体が独立してアクセス可能であり、`www.freenough.com/asset-simulator/*`と
同一内容を別ドメインで公開している状態にある。この`.vercel.app`ドメインを
Googleが直接クロール・インデックスした場合、ドメインをまたいだ重複
コンテンツとして評価される懸念がある。canonicalタグを全ページに設定する
ことで、正規URLが`www.freenough.com`側であることを明示し、この懸念に
対する防御策とする。

---

## 2. やってほしいこと

### 2-1. canonicalタグの拡充

以下の全ページに、`generateMetadata`(またはページ単位の`metadata`
エクスポート)で`alternates.canonical`を設定すること。既にブログ記事
(`src/app/blog/[slug]/page.tsx`)が使っているパターン
(`canonical: ${SITE_URL}/blog/${post.slug}`)と同じ実装方式を踏襲すること。

対象ページと、対応するcanonical URL:

| パス | canonical URL |
|---|---|
| `/asset-simulator`(ホーム) | `${SITE_URL}` |
| `/asset-simulator/app` | `${SITE_URL}/app` |
| `/asset-simulator/blog`(一覧) | `${SITE_URL}/blog` |
| `/asset-simulator/tools`(一覧) | `${SITE_URL}/tools` |
| `/asset-simulator/tools/monthly-investment` | `${SITE_URL}/tools/monthly-investment` |
| `/asset-simulator/tools/fire-age` | `${SITE_URL}/tools/fire-age` |
| `/asset-simulator/tools/compound` | `${SITE_URL}/tools/compound` |
| `/asset-simulator/tools/pension-timing` | `${SITE_URL}/tools/pension-timing` |
| `/asset-simulator/tools/retirement-tax` | `${SITE_URL}/tools/retirement-tax` |
| `/asset-simulator/tools/ideco-withdrawal` | `${SITE_URL}/tools/ideco-withdrawal` |
| `/asset-simulator/tools/education-cost` | `${SITE_URL}/tools/education-cost` |
| `/asset-simulator/guide` | `${SITE_URL}/guide` |
| `/asset-simulator/methodology` | `${SITE_URL}/methodology` |
| `/asset-simulator/disclosure` | `${SITE_URL}/disclosure` |
| `/asset-simulator/privacy-policy` | `${SITE_URL}/privacy-policy` |
| `/asset-simulator/disclaimer` | `${SITE_URL}/disclaimer` |
| `/asset-simulator/about` | `${SITE_URL}/about` |

`SITE_URL`は既存の`src/lib/siteConfig.ts`の定義
(`https://www.freenough.com/asset-simulator`、本番環境変数
`NEXT_PUBLIC_SITE_URL`経由)をそのまま使うこと。新しい定数やハードコード
文字列を作らないこと。

ブログ一覧(`/blog`)・ツール一覧(`/tools`)ページに既存の`metadata`
エクスポートがない場合は、新規に追加すること(タイトル・descriptionまで
新設する必要はなく、canonicalの追加のみでよい。既にtitle/description等の
metadataが存在する場合は、そこに`alternates.canonical`を追記する形にする
こと)。

### 2-2. 触らないこと

- ブログ記事詳細ページ(`src/app/blog/[slug]/page.tsx`)のcanonical実装は
  既に正しいため、変更不要
- sitemap.ts・robots.ts・rewrites/redirects設定には触れないこと

---

## 3. 確認・検証してほしいこと

- 実装後、本番環境で対象17ページ(表の全行)のHTMLを実際に取得し、
  `<link rel="canonical" href="...">`が意図した値で出力されていることを
  確認すること(全ページ分、curlまたはブラウザのソース表示で確認し、
  結果を一覧で報告すること)
- 既存のブログ記事のcanonicalタグに影響が出ていないこと(1件サンプル確認
  でよい)
- `full-verify.js`が0 FAILで通ることを確認すること
- 「LifeCompass」「FIRE達成」の文言が変更ファイルに混入していないことを
  grepで確認すること

---

## 4. デプロイ・本番反映

- 実装後、本番デプロイまで実行すること

---

## 5. 完了報告のフォーマット

1. 変更したファイル一覧(page.tsxごとに列挙)
2. 実装方式(`generateMetadata`か静的`metadata`エクスポートか、ページごとに
   異なる場合はその旨)
3. 本番17ページ分のcanonicalタグ出力確認結果(一覧)
4. ブログ記事側への影響がないことの確認結果
5. full-verify.jsの結果
6. grepチェック結果
