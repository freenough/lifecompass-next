# 追加指示:AffiliateLink対応表に「米国株」landingを追加

## 背景
`fire-inflation-sensitivity.md`(インフレ率記事)にて、インフレ対策としての
米国株投資に関するCTAを設置したい。既存のA8素材を新しいlandingとして
対応表に追加する。

## 追加内容

`src/lib/affiliateLinks.ts`(前回作業1で作成したファイル)の対応表に、
以下のエントリを追加してください。

| provider | landing | URL | リンクテキスト |
|---|---|---|---|
| matsui | usstock | `https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+6LP3M` | 米国株投資の一例として、松井証券の情報はこちら |

既存の `nisa` / `general` と同じ形式(target="_blank" rel="sponsored noopener noreferrer")で
生成されるようにしてください。

## 確認事項
- 遷移先URL(a8mat=...+6LP3M)は「為替手数料無料の米国株取引ページ」という
  想定です。KENZOさんに実際の遷移先を確認してもらっている最中のため、
  もし遷移先が想定と異なる旨の連絡があった場合は、そちらを優先してください。

## 完了報告に含めてほしい内容
- `affiliateLinks.ts` の変更差分
- `<AffiliateLink provider="matsui" landing="usstock" />` を一時テスト記事で
  ビルド・表示確認した結果
- 既存記事(ideco-nisa等ですでに使っている `landing="nisa"`)が
  引き続き正常に動作することの確認
