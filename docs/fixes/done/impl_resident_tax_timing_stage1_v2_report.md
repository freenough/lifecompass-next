# 完了報告:退職後の住民税キャッシュフロー試算ツール(第1段階)

`impl_resident_tax_timing_stage1_v2.md` の実装完了報告。承認済みプラン
(`C:\Users\kenzo.kakinuma\.claude\plans\modular-squishing-ullman.md`)通りに実装した。

## 実装ファイル

- 新規: `src/lib/tax/residentTaxTiming.ts`(計算ロジック本体)
- 新規: `src/components/tools/resident-tax-timing/{ResidentTaxTimingForm,ResidentTaxTimingResult,ResidentTaxTimingComparisonTable,ResidentTaxTimingTool,ResidentTaxTimingCta}.tsx`
- 新規: `src/app/tools/resident-tax-timing/page.tsx`
- 新規: `scripts/verify-resident-tax-timing-tool.js`(104チェック全PASS)
- 修正: `src/lib/tax/ideco.ts`(`RESIDENT_TAX_BASIC_DEDUCTION`をexport化のみ、値・ロジック無変更)
- 修正: `src/lib/toolMetadata.ts`(第10弾ツールとして`TOOLS`配列に追加)
- 修正: `scripts/full-verify.js`(新規verifyスクリプトの配線を追加)

## 本番関数経由 / 独自新規実装 / 簡略化した箇所

**本番関数をそのまま再利用(無改修)**
- `calcResidentTax()`(`src/lib/tax/retirement.ts`、所得割6%+4%)— 波1・波2とも直接呼び出し
- `RESIDENT_TAX_BASIC_DEDUCTION`(`src/lib/tax/ideco.ts`、住民税基礎控除43万円)— exportを追加しただけで値は無変更、新規定数を作らずそのまま再利用

**今回新規実装したもの**
- `calcSalaryIncomeDeduction()`: 給与所得控除(国税庁No.1410、令和7年分以後の5区分速算表)。このリポジトリに給与所得控除を計算する既存関数は存在しなかった(`ideco.ts`は呼び出し側が既に変換済みの「所得」を受け取る設計)ため、初めての実装。令和7年度税制改正(最低保障額55万円→65万円、適用上限162.5万円→190万円)を反映した現行の表を使用。
- `calcTaxableSalaryIncome()`: 給与所得控除→住民税基礎控除43万円、の2段階変換を行う波1・波2共通の変換関数
- `PER_CAPITA_TAX`(均等割5,000円/年、道府県民税1,000円+市町村民税3,000円+森林環境税1,000円の標準額)
- 波1(`currentYearTax`)・波2(`nextYearTax`)の計算ロジック、および両者を束ねる`calcResidentTaxTiming()`

**簡略化・非対応として明示した箇所(UI注記・コード内コメントに記載済み)**
- 給与所得控除は速算表による近似値(年収660万円未満の正式ルールである所得税法別表第五は非対応)
- 普通徴収に切り替わった場合の期別(6月/8月/10月/翌1月)内訳は算出・表示しない(一次情報で配分ルールを確認できなかったため、指示書の禁止事項通り合計額のみ表示)
- 均等割の非課税基準(低所得者向け)、社会保険料控除・扶養控除等の人的控除、自治体独自の超過課税は非対応
- 退職前の給与の月割り自動算出は賞与の時期を考慮しない近似(UI注記で明示)

## 検証結果

- `node scripts/verify-resident-tax-timing-tool.js`: **104 PASS / 0 FAIL**
  (Python(標準float、実質Decimal相当の精度)で検算した期待値と突き合わせ。
  給与所得控除の全区分境界値、退職前年年収400/600/800万円×退職月1/5/9/12月の12パターン、
  1月退職での前々年入力あり/なし、6〜12月退職でのlump/installment分岐、postRetirementIncome加算、
  retirementYearIncomeOverride指定時の注記非表示、を個別に検証)
- `node scripts/full-verify.js`: **全PASS(exit code 0)**、既存フィクスチャへの回帰なし
- `npx tsc --noEmit`: エラーなし
- ブラウザ実機確認(`/asset-simulator/tools/resident-tax-timing`。`next.config.js`の`basePath: '/asset-simulator'`により実URLはこのプレフィックス付き):
  - 退職月1〜5月選択時のみ「前々年の所得」チェックボックス・入力欄が表示され、未入力時は代用注記が表示されることを確認
  - 退職月6〜12月選択時のみ一括/分割トグルが表示され、切替でcollectionTypeが「普通徴収」⇄「任意一括徴収」に変わり残額は同一であることを確認
  - 前々年年収を350万円に変更すると残額が再計算されることを確認(199,000円×5/12→8万円)
  - 比較テーブルで3月=前々年基準・9月=退職前年基準と表示され分岐が視覚化されていることを確認
  - `/asset-simulator/tools`一覧ページに新規ツールカードが正しいアイコン・リンクで表示されることを確認
  - コンソールエラーなし

## 環境メモ(本実装とは無関係)

検証中、ポート3000〜3008に築かれていた計9個のゾンビ`next dev`プロセスが`.next`ビルドキャッシュを
破損させ、既存ルール(`/tools/retirement-tax`等)を含む全ルートが404になる事象が発生した。
ユーザー確認の上、該当9プロセス(対象ポートのみ・全node.exeではない)を終了し、クリーンな状態で
dev serverを起動し直して検証した。本実装のコード自体には問題なし。

## 未実装(指示書の禁止事項通り)

- V2(帯状タイムラインUI)は未実装(第2段階の別指示待ち)
- `calcResidentTax()`本体・波1の所得基準年一律処理・波1の期別金額配分・月割り給与所得控除は、
  いずれも指示書の禁止事項通り実装していない
