# 完了報告:sitemap.xmlへの resident-tax-timing 登録確認

`docs/fixes/active/check_sitemap_resident_tax_timing.md` の実装。

## 確認結果:**漏れあり(想定より1件多く発見)**

サイトマップ生成箇所は`src/app/sitemap.ts`の`STATIC_PATHS`(手動登録リスト)。修正前の内容を、
実際の`src/app/tools/`配下のディレクトリ(=実在するツールページ)と突き合わせたところ、
**`resident-tax-timing`だけでなく、`retirement-ideco-timing`も未登録だった**ことが判明した。

指示書は「既存の9ツール(8ツールを列挙+他1件)」が既に登録済みという前提で
`resident-tax-timing`(10番目)の漏れだけを疑っていたが、実際には`STATIC_PATHS`に
登録されていたのは8ツールのみで、`retirement-ideco-timing`(直近の別セッションで追加された
ツール)も同様に登録から漏れていたことを、`src/app/tools/`配下の実ディレクトリ数(10件)との
突き合わせで発見した。

### 修正前の`STATIC_PATHS`(ツール関連8件)
`monthly-investment`・`fire-age`・`compound`・`pension-timing`・`retirement-tax`・
`ideco-withdrawal`・`education-cost`・`prepay-vs-invest`

### 実在するツールページ(`src/app/tools/`配下、`page.tsx`除く10件)
上記8件 + `retirement-ideco-timing` + `resident-tax-timing`

## 対応内容

`src/app/sitemap.ts`の`STATIC_PATHS`に、既存エントリと同じ形式(`{ path: '/tools/{slug}', title: '' }`)
で2件追加した。

```diff
   { path: '/tools/education-cost', title: '' },
   { path: '/tools/prepay-vs-invest', title: '' },
+  { path: '/tools/retirement-ideco-timing', title: '' },
+  { path: '/tools/resident-tax-timing', title: '' },
   { path: '/concerns', title: 'お悩み一覧' },
```

## ブログ記事の登録方式について

`sitemap.ts`の`postEntries`は`getAllPosts()`(`src/content/blog/*.md`を動的に読み込む関数)を
そのまま使っており、`STATIC_PATHS`のような手動リストではない。したがって、新規公開した
`taishoku-yokunen-juminzei`を含め、`src/content/blog/`にMarkdownファイルを置いた時点で
自動的にサイトマップへ反映される設計であり、ブログ記事側には手動登録漏れという概念自体が
存在しない(確認の結果、対応不要)。

## 検証結果

- `npx tsc --noEmit`: エラーなし
- `node scripts/full-verify.js`: 全ブロックPASS
- ローカルの開発サーバーで実際に`/asset-simulator/sitemap.xml`を取得し、以下のURLが
  正しく含まれていることを確認した:
  - `https://freenough-lifecompass.vercel.app/asset-simulator/tools/resident-tax-timing`(新規追加)
  - `https://freenough-lifecompass.vercel.app/asset-simulator/tools/retirement-ideco-timing`(新規追加、想定外の追加発見分)
  - `https://freenough-lifecompass.vercel.app/asset-simulator/blog/taishoku-yokunen-juminzei`(`getAllPosts()`経由で元々反映済み)
  - `https://freenough-lifecompass.vercel.app/asset-simulator/blog/retirement-ideco-timing`(同上)
- `/tools/`配下のURL数が、修正後は`src/app/tools/`の実ディレクトリ数(10件)と一致することを確認した

## 禁止事項の遵守

- サイトマップ生成の仕組み自体(`sitemap()`関数のロジック)は変更していない。`STATIC_PATHS`への
  エントリ追加のみ
- `docs/fixes/active/`フォルダは削除していない(本報告書もこのフォルダ内に作成)
