# 調査指示:sitemap.xmlへの resident-tax-timing 登録確認(調査のみ・必要なら軽微な追加実装)

## 背景
`sitemap.xml`の`STATIC_PATHS`は、ツール追加時に手動登録が必要な設計になっている。
今回新規公開した`resident-tax-timing`ツール、および関連するブログ記事
(`taishoku-yokunen-juminzei`)が、この手動登録から漏れていないか確認する。

## 確認内容

### 1. ツールの登録確認
- サイトマップ生成に関わるファイル(`STATIC_PATHS`が定義されている箇所。過去の実装から
  `src/app/sitemap.ts`または類似のファイルと想定されるが、実際の場所を確認すること)を開き、
  既存の9ツール(`monthly-investment`・`fire-age`・`compound`・`pension-timing`・
  `retirement-tax`・`ideco-withdrawal`・`education-cost`・`prepay-vs-invest`の他1件)が
  どのように登録されているかを確認すること
- `resident-tax-timing`(`/tools/resident-tax-timing`)がこのリストに含まれているかを確認すること

### 2. ブログ記事の登録確認
- ブログ記事が`STATIC_PATHS`のような手動リストで管理されているか、それとも
  `getAllPosts()`等から動的に自動生成されているかを確認すること
  (手動管理の場合、`taishoku-yokunen-juminzei`が含まれているかも確認すること)

### 3. 未登録だった場合の対応
- `resident-tax-timing`(またはブログ記事)が漏れていた場合、既存のエントリと同じ形式で
  追加すること(軽微な追加実装として、本指示の範囲内で対応してよい)
- 追加後、`sitemap.xml`の生成結果(ローカルで確認できる方法があれば、実際に生成して
  該当URLが含まれているか)を確認すること

## 検証要件
- 修正が発生した場合、`full-verify.js`全PASS・`tsc --noEmit`エラーなしを確認すること
- 完了報告書に、確認した結果(登録済みだったか、漏れがあり追加したか)を明記すること

## 禁止事項
- サイトマップ生成の仕組み自体の設計変更(既存のリストへのエントリ追加のみ)
- `docs/fixes/active/` フォルダの削除
