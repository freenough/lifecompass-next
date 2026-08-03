# 実装依頢(lifecompass-next):sitemap.tsにツールページを追加

作成日:2026-08-01
対象リポジトリ:**lifecompass-next**
種別:**実装(投資対象は`src/app/sitemap.ts`のみ。他ファイルは調査結果に基づく
確認のみ、変更しないこと)**

---

## 1. 背景

先行の調査(`investigation_sitemap_LIFECOMPASS.md`)で、以下が判明している。

- `sitemap.ts`は`STATIC_PATHS`という手書きの固定配列と、`getAllPosts()`に
  よるブログ記事の動的列挙の2本立てになっている
- ブログ記事の動的列挙は正常に機能している(13本すべて反映)
- `/tools`(一覧ページ)および`/tools/*`(個別ツール7本、計8ページ)が
  `STATIC_PATHS`に一件も追加されておらず、sitemap.xmlに一切出力されて
  いない。これがAdSense「有用性の低いコンテンツ」判定の主因と推測している
- 実在するツールページ(すべて本番200確認済み):
  - `/tools`(一覧、`src/app/tools/page.tsx`)
  - `/tools/monthly-investment`
  - `/tools/fire-age`
  - `/tools/compound`
  - `/tools/pension-timing`
  - `/tools/retirement-tax`
  - `/tools/ideco-withdrawal`
  - `/tools/education-cost`
- `src/app/tools/page.tsx`内に、各ツールの`href`を含む`TOOLS`配列(定数)が
  既に存在している

---

## 2. やってほしいこと

### 2-1. 実装方針(推奨:動的列挙への切り替え)

`STATIC_PATHS`に8件を手書きで追加することも可能だが、**推奨は
`src/app/tools/page.tsx`の`TOOLS`配列をsitemap.ts側からimportし、
その`href`を使って動的に列挙する方式**。理由:

- 今後ツールが追加された際、`TOOLS`配列に足せばsitemapにも自動反映され、
  今回と同じ「sitemap書き忘れ」の再発を防げる
- ブログ記事(`getAllPosts()`)と同じ「データソースから動的に生成する」
  設計思想に統一できる

`TOOLS`配列の`href`フィールドの実際の値(`/tools/xxx`という相対パスの形式か、
それとも`/asset-simulator/tools/xxx`のようにbasePathを含む形式か)を必ず
確認したうえで、`SITE_URL`との結合時に二重にbasePathが付与されたり、
逆に欠落したりしないよう注意すること(既存の`postEntries`が
`${SITE_URL}/blog/${post.slug}`という結合パターンを使っているので、
それと整合する形にすること)。

`TOOLS`配列に、sitemap生成に不向きなデータ(コンポーネントやJSX等)が
混在していて素直にimportできない場合は、代替案として`STATIC_PATHS`への
手書き追加(8件)でも構わない。その場合はなぜ動的列挙を見送ったかを
完了報告に明記すること。

### 2-2. `/tools`一覧ページの追加

個別ツール7本だけでなく、一覧ページ`/tools`自体もsitemapに追加すること
(計8件)。

### 2-3. lastModified の扱い

- 個別ツールページに更新日時を管理する仕組みが既にあれば、それを使う
- なければ、他の`STATIC_PATHS`由来のページと同じ扱い(ビルド時の現在時刻、
  または固定値)で問題ない。ここは既存の`STATIC_PATHS`の実装パターンに
  合わせること

---

## 3. 確認・検証してほしいこと

- 実装後、ローカルまたはプレビュー環境で`sitemap.xml`の出力に、以下8件が
  正しい絶対URL(`https://www.freenough.com/asset-simulator/tools/...`
  の形式)で含まれていることを確認すること
  - `/asset-simulator/tools`
  - `/asset-simulator/tools/monthly-investment`
  - `/asset-simulator/tools/fire-age`
  - `/asset-simulator/tools/compound`
  - `/asset-simulator/tools/pension-timing`
  - `/asset-simulator/tools/retirement-tax`
  - `/asset-simulator/tools/ideco-withdrawal`
  - `/asset-simulator/tools/education-cost`
- 既存のブログ記事13件・固定ページ(about/guide/methodology/disclosure/
  privacy-policy/disclaimer等)の出力が壊れていないことを確認すること
  (差分追加であり、既存エントリの削除・重複が起きていないか)
- `full-verify.js`が0 FAILで通ることを確認すること(sitemap.tsの変更が
  他の検証項目に影響しないか念のため確認)
- 「LifeCompass」「FIRE達成」の文言が変更ファイルに混入していないことを
  grepで確認すること(標準の再発防止チェック)

---

## 4. 触らないこと・スコープ外

- `/disclosure/old`がsitemapに含まれていない件は、意図的かどうか未確認の
  ままなので、本指示書のスコープでは**手を加えないこと**(別途KENZOに
  確認してから対応する)
- `STATIC_PATHS`の既存9件・`getAllPosts()`のロジック自体には変更を
  加えないこと(ツールページの追加のみに限定)
- robots.txt・rewrites・MAIN側(freenough-main)には一切触れないこと

---

## 5. デプロイ・本番反映

- 実装後、本番デプロイまで実行すること
- デプロイ後、本番の`https://www.freenough.com/asset-simulator/sitemap.xml`
  に上記8件が実際に反映されていることをcurl等で確認すること

---

## 6. 完了報告のフォーマット

1. 採用した実装方式(TOOLS配列からの動的import、または手書き追加のいずれか
   と、その理由)
2. 変更した関数/コンポーネント名(行番号ではなく)
3. 本番sitemap.xmlでの8件の反映確認結果(URL一覧を貼り付け)
4. 既存エントリ(ブログ13本・固定ページ)が壊れていないことの確認結果
5. full-verify.jsの結果
6. grepチェック結果
7. `/disclosure/old`について、今回は触れていない旨の明記
