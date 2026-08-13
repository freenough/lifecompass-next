# 実装指示:resident-tax-timing 最終修正(P0: 内訳表示・文言不整合の是正 / P1: 表現の精緻化)

## 背景
`residentTaxTiming.ts` および関連UIコンポーネントのレビューにより、計算ロジック自体に問題はないが、
UI表示・注記文言に複数の不整合が見つかった。本指示はこれらを修正する。

**方針の確認(重要):`totalCashNeeded` の計算式(`currentYearTax.remainingAmount + nextYearTax.total`)
そのものは変更しないこと。ヘッドライン「確保しておきたい現金の目安」は総額のまま維持し、
その内訳を新たに表示する、という対応に限定する。**

理由:退職金の有無・多寡は読者によって異なる。ヘッドラインを「自分で納付する分」だけに絞ると、
退職金が少ない・ない読者が必要額を過小に見積もるリスクがあるため、総額を前面に出し続ける。

## P0-1: 内訳表示の追加(`residentTaxTiming.ts` + `ResidentTaxTimingResult.tsx`)

### `residentTaxTiming.ts` の変更
- `CurrentYearTax` 型に `isWithheldAtSource: boolean` を追加
  (`collectionType` が `"強制一括徴収"` または `"任意一括徴収"` の場合に `true`、
  `"普通徴収"` または `"通常徴収で完了"` の場合に `false`)
- `calcCurrentYearTax()` 内でこのフィールドを設定すること
- `totalCashNeeded` の計算式・`remainingAmount` の算出ロジックには一切手を加えないこと

### `ResidentTaxTimingResult.tsx` の変更
- ヘッドライン(「確保しておきたい現金の目安」)の直下に、以下の内訳を追加表示すること:
  - 退職時に給与・退職金から差し引かれる想定:`currentYearTax.isWithheldAtSource ? currentYearTax.remainingAmount : 0` を万円表示
  - 自分で納付する想定:`totalCashNeeded` から上記を差し引いた額を万円表示
- 内訳の下に注記を1行追加:「退職時に差し引かれる想定の金額は、退職金・最終給与が十分にある場合の見込みです。不足する場合は、その分も自己資金での準備が必要になります。」

## P0-2: 波2の「自己納付」前提を注記に追加

`calcNextYearTax()` 内、`postRetirationIncome > 0` の場合(退職後に別の給与収入がある場合)に限り、
`assumptionNotes` へ以下を追加すること:
「退職翌年6月からの新規課税は、自己納付(普通徴収)を前提に試算しています。退職後の勤務先で
特別徴収が設定されている場合は、給与天引きになることがあります。」

## P0-3: 任意一括徴収の注記に不足時の扱いを追加

`calcCurrentYearTax()` 内、`lumpSumPreference === "lump"` の分岐(`collectionType: "任意一括徴収"`)の
`note` に、強制一括徴収の場合と同様の一文を追加すること:
「給与・退職金の額が残税額に満たない場合、不足分は普通徴収に切り替わります。」

## P0-4: 非課税警告の「全国共通」表現の是正

以下2箇所を修正すること(いずれも「1級地基準」を「全国共通」と呼んでいる矛盾を解消する):

1. `checkNonTaxable()` 内の警告メッセージ(および `NON_TAXABLE_WARNING_SUFFIX`)
2. `NON_TAXABLE_SALARY_INCOME_THRESHOLD` のJSDocコメント

修正後の文言の趣旨:「全国共通の簡易基準」ではなく「多くの自治体で採用されている水準(1級地)を
簡易的な目安として使用しています。実際の非課税基準はお住まいの自治体(級地区分)・扶養状況に
より異なります。」

`ResidentTaxTimingResult.tsx` の「計算根拠を見る」アコーディオン内の該当箇所も同様に修正すること。

## P0-5: 給与所得控除の静的説明文を動的表示と統一

`ResidentTaxTimingResult.tsx` の「計算根拠を見る」アコーディオン内、給与所得控除の近似に関する
説明文(現在「最大でも1,200円程度に収まることを...確認済みです」という一律表現)を、
`residentTaxTiming.ts` の `calcSalaryIncomeDeduction()` コメントおよび
`calcSalaryDeductionApproxMaxError()` と同じ区分別の説明に統一すること:

「190万円超〜360万円以下の区分:最大1,200円、360万円超〜660万円以下の区分:最大800円、
660万円超〜850万円以下の区分:最大400円、それ以外の区分:差なし」

## P1-1: 波1の月割り計算が「概算」であることの明示

`ResidentTaxTimingResult.tsx` のアコーディオン内、「今の住民税の残り」の説明文に、
「(年間税額を残り月数で按分した概算です。実際の月ごとの徴収額とは一致しない場合があります)」
という一文を追加すること。

## P1-2: 均等割の説明に「標準的な」を明記

同アコーディオン内、「均等割(5,000円)を適用して」という記述を
「標準的な均等割(5,000円)を適用して」に修正すること(自治体独自の超過課税は考慮していない旨を強調)。

## P1-3: 比較表のキャプション改善

`ResidentTaxTimingComparisonTable.tsx` のキャプション(現在「3月・9月のように徴収区分をまたぐと...」)に、
「退職後給与収入は0円、前々年所得・退職年所得の詳細入力は考慮せず、基本条件のみで比較しています。」
という一文を追加すること。

## P1-4: 一括徴収の断定表現を緩和

`residentTaxTiming.ts` の強制一括徴収・任意一括徴収それぞれの `note`、および
`ResidentTaxTimingForm.tsx` の一括/分割トグル下の説明文にある
「会社側から一方的に選択することはできません」という断定表現を、
「原則として、本人の申出がなければ一括徴収されません」程度の表現に緩和すること。

## 明示的な非対応事項(変更しないこと)
- `postRetirementIncome` の収入/所得変換ロジック(レビュー済み、問題なし)
- 波1の月割り計算式そのもの(表現の明示のみ、計算は変更しない)
- 非課税判定の精緻化(級地区分別の厳密判定は引き続きスコープ外)
- 均等割の自治体別対応
- `totalCashNeeded` の計算式

## 検証要件
- `scripts/verify-resident-tax-timing-tool.js` に、`isWithheldAtSource` が
  強制一括徴収/任意一括徴収でtrue、普通徴収/通常徴収で完了でfalseになることを確認するケースを追加
- 内訳の合計(天引き想定+自己納付想定)が `totalCashNeeded` と一致することを検証すること
- `full-verify.js` 全PASS・`tsc --noEmit` エラーなしを再確認
- ブラウザ実機で、1〜4月・5月・6〜12月(分割/一括それぞれ)の全パターンで内訳表示が
  正しく出ることを確認すること
- 完了報告書に、修正前後の文言差分を主要箇所について明記すること

## 禁止事項
- `calcResidentTaxTiming()` の `totalCashNeeded` 計算式の変更
- `remainingAmount` の算出ロジックの変更
- 非課税判定・均等割の精緻化(級地区分対応等)
- `docs/fixes/active/` フォルダの削除
