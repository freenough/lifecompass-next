# 実装指示書:11本目ブログ記事 アフィリエイトリンク追加

対象:記事本文に松井証券アフィリエイトリンクを追加した最終版への差し替え・
再デプロイ

参照:`blog11_pension_timing_draft.md`(アフィリエイトリンク追加版)

---

## 前提

前回のセッションで本番デプロイ済みの記事に、松井証券のアフィリエイト
リンクを新規追加した。差分は以下の3箇所のみ(数値・構成の変更はなし):

1. 記事冒頭に`[PR] 本記事にはアフィリエイト広告を含みます。`を追加
2. H2-5(自分の場合はどうなるか確認する)の末尾に、文脈から繋げる一文+
   `<AffiliateLink provider="matsui" landing="general" />`を追加
3. まとめの直後に、同じく`<AffiliateLink provider="matsui" landing="general" />`を追加

## 作業内容

1. `src/content/blog/pension-timing.md`の本文を、添付の
   `blog11_pension_timing_draft.md`(アフィリエイトリンク追加版)の内容に
   全面差し替えする。frontmatterは変更不要
2. `node scripts/check-raw-html-in-blog.js`を実行し、
   `<AffiliateLink>`以外の意図しない生HTMLタグが混入していないことを確認する
3. `<AffiliateLink provider="matsui" landing="general" />`が、
   `src/lib/affiliateLinks.ts`の既存の対応表(`general`ランディング)に
   正しく解決され、意図したリンク・リンクテキスト(「証券口座開設先の
   一例として、松井証券の情報はこちら」)・`rel="sponsored"`が
   付与されることをビルド後のHTMLで確認する
4. `[PR]`表記が、過去記事(`ideco-nisa`等)と同じ位置づけ・見た目で
   表示されているか確認する(記事冒頭の`[PR]`表記、CTA直前の`[PR]`表記の
   両方)
5. `npm run build`・`node scripts/full-verify.js`を実行し、成功を確認する
6. 問題なければ本番デプロイ(git push→Vercel)を実行する

## 完了報告に含めるべき内容

- 本文差し替えの結果
- 生HTML混入チェックの結果
- `AffiliateLink`の解決結果(実際に生成されたリンクURL・テキスト・
  `rel`属性をビルド後HTMLで確認したもの)
- ビルド・デプロイの結果

## 参考:アフィリエイト表記ルール(既存ルールの再掲)

- 広告ラベルは「[PR]」に統一(「広告」「[広告]」等は使わない)
- `rel="sponsored"`を使用(Google推奨)
- 表記位置は「リンク直前」が法律上の必須要件ではないが、慣例として
  CTA直前に配置している
