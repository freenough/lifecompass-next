# 実装指示:退職後住民税キャッシュフロー試算ツール(第1段階:計算ロジック+表UI) v2

**本指示は `impl_resident_tax_timing_stage1.md` の全面差し替え版である。
旧版は波1の所得基準年を一律「前々年」としていたが誤りだったため、本v2に置き換える。**

## 目的
退職月・退職前年の年収から、住民税がいつ・いくら発生するかを試算する新規独立ツールを実装する。
ツール名(表示用):退職後の住民税キャッシュフロー試算
スラッグ:`resident-tax-timing`
配置:`/asset-simulator/tools/resident-tax-timing`

**本指示は第1段階(計算ロジック・データモデル・表形式UI)のみを対象とする。
帯状タイムライン表示(V2)は第2段階の別指示で行うため、今回は実装しないこと。**

## 背景・参照ドキュメント(必読)
- 調査報告書1:`docs/fixes/active/investigation_juminzei_taimurag.md`
- 調査報告書2:`docs/fixes/active/investigation_juminzei_futsuchoshu_wariate_result.md`
- 既存の住民税計算関数:`src/lib/tax/retirement.ts` の `calcResidentTax(taxableIncome)`

## 重要:課税年度→所得年→徴収期間モデル(必ずこのモデルで実装すること)

住民税は「前年(1〜12月)の所得」を基準に、その年の6月から翌年5月まで特別徴収される。
退職年を Y、退職月を M とすると:

- **M が 6〜12月の場合**:退職時点で徴収中の住民税年度は、Y年6月開始・Y-1年の所得基準。
  → 波1の所得基準は `priorYearIncome`(退職前年の年収、既存入力)をそのまま使う。**前々年の入力は不要**。
- **M が 1〜5月の場合**:退職時点で徴収中の住民税年度は、(Y-1)年6月開始・**Y-2年**の所得基準。
  → 波1の所得基準には `priorYearIncomeTwoYearsAgo` が必要。

この分岐をコード内で明示的に条件分岐すること(`retirementMonth <= 5` で判定)。一律に「前々年」または「前年」で計算しないこと。

波2(退職年Yの所得を基準にした、Y+1年6月開始の新規課税)の所得基準は退職月によらず常に「退職年Yの所得」(`priorYearIncome`をレートとして月割り推計、または`retirementYearIncomeOverride`)。ここは変更なし。

## データモデル

```ts
type ResidentTaxTimingInput = {
  priorYearIncome: number;              // 退職前年の年収(必須・基本入力)
  retirementMonth: number;              // 1-12
  postRetirementIncome: number;         // 退職後、同一年内の給与収入(デフォルト0、任意)
  priorYearIncomeTwoYearsAgo?: number;  // 前々年の年収(詳細設定・任意。retirementMonth 1-5の時のみ意味を持つ)
  retirementYearIncomeOverride?: number;// 退職年の給与所得の上書き値(詳細設定・任意)
  lumpSumPreference?: "lump" | "installment"; // 6-12月退職時のみ有効。デフォルト "installment"
};

type CurrentYearTax = {
  // 波1:退職時点で徴収中の住民税年度の残額
  incomeBasisYearLabel: "退職前年" | "前々年"; // どちらの所得を基準にしたかを結果表示にも出す
  incomeBasisAmount: number;      // 実際に使った収入額(上記どちらか。前々年未入力時はpriorYearIncomeで代用し、その旨をnoteに明記)
  isIncomeBasisEstimated: boolean; // 前々年入力がなくpriorYearIncomeで代用した場合true
  collectionType: "強制一括徴収" | "通常徴収で完了" | "普通徴収" | "任意一括徴収";
  remainingAmount: number;        // 残額合計。期別の金額配分は算出しない(一次情報で未確定のため)
  note: string;                   // UIにそのまま出す注記文
};

type NextYearTax = {
  // 波2:退職年の所得を基準にした翌年度新規課税(翌年6月〜)
  taxableIncomeAssumption: number;
  isOverridden: boolean;
  incomeTaxDeductionApplied: number; // 給与所得控除額(年間ベース、1回のみ適用)
  incomeTaxPart: number;             // calcResidentTax()の所得割部分
  perCapitaPart: number;             // 均等割(5,000円/年、固定)
  total: number;
};

type ResidentTaxTimingResult = {
  totalCashNeeded: number; // currentYearTax.remainingAmount + nextYearTax.total
  currentYearTax: CurrentYearTax;
  nextYearTax: NextYearTax;
  assumptionNotes: string[];
};
```

## 計算ロジック仕様

### 0. 収入→所得の変換(波1・波2共通で必ず経由すること)

`priorYearIncome` ・ `priorYearIncomeTwoYearsAgo` ・ 波2の課税所得推計値は、いずれも「年収(収入)」であり、そのまま`calcResidentTax()`に渡してはならない。
- 給与所得控除を年間ベースで1回適用し、収入→所得に変換する共通関数を用意すること(波1・波2で同じ変換関数を使い、二重実装しないこと)
- 当該関数が `src/lib/tax/` 配下に既存で存在するか実装前に確認し、あれば流用。なければ国税庁No.1410の速算表に基づき新規実装し、コード内コメントに一次情報URLを明記すること
- 月割り給与所得控除は実装しないこと(制度上根拠なし。国税庁No.1410・No.2674、調査報告書2で確認済み)

### 1. 波1(currentYearTax)

- 上記「課税年度→所得年→徴収期間モデル」に従い、`retirementMonth` が1〜5か6〜12かで所得基準年を切替
- `retirementMonth` が1〜5で `priorYearIncomeTwoYearsAgo` が未入力の場合:`priorYearIncome` で代用し、`isIncomeBasisEstimated: true`、`assumptionNotes` に「前々年の所得が未入力のため、退職前年の年収で代用しています」を追加
- 所得基準額を0の変換関数で所得に変換 → `calcResidentTax()` + 均等割5,000円 → その住民税年度の年間税額を算出
- 退職月による区分(地方税法第321条の5第2項、調査報告書2で確認済み):
  - **1〜4月退職**:強制一括徴収。残額 = 年間税額 ×(退職月から5月までの残り月数 ÷ 12)。端数は`calcResidentTax()`と同じ切り捨てルールに合わせる
  - **5月退職**:通常徴収で完了。`remainingAmount = 0`
  - **6〜12月退職**:`lumpSumPreference` により分岐
    - `"lump"`:残額(上記と同じ計算式)を退職時一括徴収として表示
    - `"installment"`(デフォルト):普通徴収に切替。**期別の金額配分は算出・表示しない**。残額合計のみを表示し、`note` に「実際の納付回数・時期は自治体により異なります。目安として残額の合計を表示しています」を必ず含める

### 2. 波2(nextYearTax)

- 退職年の給与収入 = `(priorYearIncome ÷ 12 × 退職月までの月数) + postRetirementIncome`(自動算出)。`retirementYearIncomeOverride` があれば優先
- 上記0の変換関数で所得に変換 → `calcResidentTax()` + 均等割5,000円
- `assumptionNotes` に「退職前の給与は前年の年収を月割りした仮定値です。賞与の時期により実際の所得とは差が生じます」を追加

### 3. 合計

`totalCashNeeded = currentYearTax.remainingAmount + nextYearTax.total`

## UI仕様(第1段階)

- 基本入力:退職前年の年収(必須)・退職月(1〜12月プルダウン)・退職後給与収入(デフォルト0、任意)
- 「より正確に試算する」開閉セクション:
  - 退職年の実際の給与収入(`retirementYearIncomeOverride`)
  - 現在の住民税の基準となる前年の所得(`priorYearIncomeTwoYearsAgo`)— **退職月が1〜5月の場合のみ表示する**(6〜12月選択時はこの項目自体を非表示にする。使われないため)
- 6〜12月退職を選んだ場合のみ、「退職時に一括で払う/分割で払う(普通徴収)」のトグル(`lumpSumPreference`)
- 出力:
  1. 確保すべき現金の目安(`totalCashNeeded`、最上部に強調表示)
  2. 内訳:波1(残額+区分の説明文+`incomeBasisYearLabel`+`note`)/波2(所得割+均等割の内訳)
  3. `assumptionNotes` を全て注記として明示
  4. 参考比較:3月・6月・9月・12月×同一の退職前年年収での簡易比較。3月・9月は波1の所得基準年が異なる(3月=前々年代用、9月=前年)ことが比較上わかるように表示すること
- デザイン:既存8ツールと統一(スレート基調+`--color-accent`、`globals.css`のトークン使用)
- `ToolCard.tsx` 等の共通コンポーネントを流用すること

## toolMetadata.ts への登録
- `src/lib/toolMetadata.ts` の `TOOLS` 配列に新規追加。既存エントリの構造に厳密に合わせること

## 検証要件
- 退職前年年収400万円・600万円・800万円 × 退職月(1月・5月・9月・12月の代表4パターン)についてPython Decimalで検算し完了報告書に記載すること
- 1月退職パターンでは`priorYearIncomeTwoYearsAgo`を意図的に(a)入力ありと(b)未入力(代用)の両方で検算し、代用ロジックが正しく`isIncomeBasisEstimated: true`を返すことを確認すること
- `full-verify.js` all PASS・`tsc --noEmit` エラーなしを確認すること
- 完了報告書に、本番関数経由/独自再現/簡略化した箇所を項目ごとに明記すること

## 禁止事項
- `calcResidentTax()` 本体の改修
- 波1の所得基準年を退職月で分岐せず一律に扱うこと(旧v1指示の誤り。必ず1-5月と6-12月で分岐すること)
- 収入額をそのまま課税所得として`calcResidentTax()`に渡すこと(給与所得控除の変換を必ず経由すること)
- 波1の期別金額配分を断定的に表示すること
- 月割り給与所得控除の実装
- V2(タイムラインUI)の実装
- `docs/fixes/active/` フォルダの削除
