# データ収集指示:「退職翌年の住民税」記事用データ(本番関数経由・実装しない)

## 目的
ブログ記事「退職翌年の住民税」の執筆に使う試算データを、本番の`resident-tax-timing`ツールの
計算ロジック(`calcResidentTaxTiming()`、`src/lib/tax/residentTaxTiming.ts`)から直接取得する。

**本指示はデータ収集のみを目的とする。コードの変更・新規実装は一切行わないこと。
記事用の数値を独自に再実装・手計算で代用しないこと(本番関数経由であることが必須)。**

## 取得するパターン
以下の12パターンすべてについて、`calcResidentTaxTiming()`をNode.js(ts-node等、既存の
検証スクリプトと同じ実行環境)から直接呼び出し、結果を取得すること。

- 退職前年年収:400万円・600万円・800万円
- 退職月:3月・6月・9月・12月
- (3年収 × 4ヶ月 = 12パターン)

## 入力条件(全パターン共通のデフォルト設定)
- `postRetirementIncome: 0`(退職後の給与収入なし)
- `priorYearIncomeTwoYearsAgo`:未指定(前々年所得は代用させる。3月退職パターンで
  `isIncomeBasisEstimated: true`になることを想定)
- `retirementYearIncomeOverride`:未指定
- `lumpSumPreference: "installment"`(6〜12月退職はデフォルトの分割/普通徴収)
- `isAge40OrOver`:未指定(40歳未満のデフォルト料率14.6%)
- `socialInsuranceRateOverride`:未指定

## 取得する項目(各パターンについて)
- `totalCashNeeded`(確保しておきたい現金の目安、円単位の生の値と万円丸め後の値の両方)
- `currentYearTax`の全フィールド(`collectionType`・`remainingAmount`・
  `incomeBasisYearLabel`・`isWithheldAtSource`・`isIncomeBasisEstimated`・
  `nonTaxableWarning`・`socialInsuranceDeductionApplied`・`adjustmentDeductionApplied`)
- `nextYearTax`の全フィールド(`incomeTaxPart`・`perCapitaPart`・`total`・
  `taxableIncomeAssumption`・`isOverridden`・`nonTaxableWarning`・
  `socialInsuranceDeductionApplied`・`adjustmentDeductionApplied`)
- `assumptionNotes`(配列の全文言)
- 内訳表示用に、UI側と同じ丸め方式(①・②をそれぞれ万円へ丸めてから合計する方式、
  `impl_resident_tax_timing_rounding_fix.md`で確定した方式)で計算した表示用の値も
  併記すること(円の生値だけでなく、記事にそのまま転記できる万円表示も用意する)

## 出力形式
`docs/fixes/active/`配下に、12パターン分をまとめた1つのMarkdownまたはJSON形式の
データファイルを作成すること(ファイル名は`resident_tax_timing_article_data.md`等、
分かりやすいものでよい)。各パターンごとに、上記の全項目が一覧できる表形式が望ましい。

## 検証要件
- 取得した12パターンの値が、`scripts/verify-resident-tax-timing-tool.js`内の既存の
  MATRIX・NEXT_YEAR_TOTAL等のテストデータと重複する部分があれば、値が一致していることを
  確認すること(独自に新しい値を計算したわけではなく、既存の検証済みロジックからの
  取得であることの裏付けとして)
- 3月退職(1〜5月グループ)のパターンで、②(波2)が退職月(3月/6月/9月/12月)によらず
  同一年収であれば同額になっていることを確認すること(前年まるまる基準のため。
  `impl_resident_tax_timing_wave2_fix.md`で確認済みの性質)

## 禁止事項
- コードの変更・新規実装
- 記事用データの独自再計算・手計算での代用(本番関数経由を厳守すること)
- `docs/fixes/active/` フォルダの削除
