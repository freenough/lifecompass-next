# 指示書:9記事目(nisa-monthly-investment)の公開配置

## 背景

9記事目「新NISAは毎月いくら積み立てればいい?」の本文が確定した。ブログへの
配置・画像確認・ビルド確認を行い、公開できる状態にする。

## 前提:画像ファイルについて

以下2枚の画像は、KENZOが外部の画像生成ツールで作成済みのものを、別途
`public/images/`配下に配置する(このセッションでは画像データそのものは
提供されない)。

- `public/images/nisa-monthly-investment-eyecatch.png`(アイキャッチ、1536×1024px)
- `public/images/nisa-monthly-investment-distribution.png`(本文中の分布図、横長)

**この2ファイルがまだ配置されていない場合は、その旨を報告し、配置後に
改めて確認を依頼すること(存在しないままビルド確認を進めない)。**

## やってほしいこと

### 1. 記事ファイルの配置

添付の`nisa-monthly-investment.md`を、既存の他記事(`ideco-nisa.md`等)と
同じディレクトリ(`src/content/blog/`想定、実際のパスは既存記事の配置場所に
合わせること)に配置する。

### 2. frontmatterの整合性確認

記事のfrontmatterには`image: "/images/nisa-monthly-investment-eyecatch.png"`
という形式で記載している。既存記事のfrontmatterと同じフィールド名・形式に
なっているか確認し、もし実際のブログ表示コンポーネント
(`src/app/blog/[slug]/page.tsx`)が読んでいるフィールド名と異なる場合は、
実装側に合わせて修正すること(記事側を直すか、報告してKENZOに確認するか、
どちらが適切か判断すること)。

### 3. AffiliateLinkショートコードの確認

記事内に2箇所、`<AffiliateLink provider="matsui" landing="nisa" />`を
記載している(本文中CTA・記事末尾CTA)。既存の`ideco-nisa.md`等と同様に
正しくレンダリングされるか(リンク先・`[PR]`表記・`rel="sponsored"`等)を
ビルド後に確認すること。

### 4. 既存の再発防止チェックの実行

`scripts/check-raw-html-in-blog.js`を実行し、`<AffiliateLink>`以外の
生HTMLタグが記事内に混入していないか確認すること(このscriptは既存の
`prebuild`で自動実行される想定だが、念のため単体でも実行して結果を
報告すること)。

### 5. UTMリンクの確認

記事内の以下2つのリンクが、正しいURL(basePath込み)で生成されているか
確認すること:

- 本文中CTA:`/asset-simulator/tools/monthly-investment?utm_source=blog&utm_medium=referral&utm_campaign=nisa_monthly_investment&utm_content=mid_cta`
- 記事末尾CTA:同URLで`utm_content=bottom_cta`

### 6. ビルド確認

`npm run build`(または既存の確認手順)を実行し、記事ページが正常に
生成されることを確認する。画像2枚が正しく表示されるか(ファイルが存在し、
パスが一致しているか)もあわせて確認すること。

### 7. 既存回帰テスト

`full-verify.js`が引き続きPASSすることを確認する(記事追加は`src/lib`に
影響しないはずだが、念のため)。

## 完了報告の形式

- 記事ファイルの配置先パス
- 画像2枚の配置状況(存在確認、存在しない場合はその旨)
- frontmatterの`image`フィールドが実装と整合しているか(整合しない場合、
  どう対応したか)
- AffiliateLinkのレンダリング確認結果
- `check-raw-html-in-blog.js`の実行結果
- UTMリンクの生成結果(実際のURL)
- ビルド結果
- `full-verify.js`の結果
- 変更範囲(`git status`)
