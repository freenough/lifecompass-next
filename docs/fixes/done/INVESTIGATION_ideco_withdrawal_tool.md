# 投資調査依頼:iDeCo/DC出口戦略シミュレーター(第6弾ツール)

対象:Claude Code
性質:**投資調査のみ。実装はまだ行わないこと。**
参照:`product_spec_ideco_exit_tool.md`(このチャットで作成したProduct Spec確定版。本ファイルと合わせて読むこと)

---

## 背景

Product Specは確定しているが、5-2・5-3・8章に記載の通り、既存コードの実装状況次第で仕様の一部(特に退職金との同一年受給対応の可否)が変わる可能性がある投資調査項目が残っている。実装に入る前に、以下を調査し報告してほしい。

**ロック対象ファイル(`simulate.ts`・`analyze.ts`)は調査のための参照のみで、絶対に変更しないこと。**

---

## 調査項目1(最優先):退職金+DC一時金の合算課税への対応可否

### 背景
退職所得控除は会社の退職金とDC一時金で共有される枠であり、本体`simulate.ts`内の`retirementTaxCalc(totalIdeco, totalSev, idecoYrs, sevYrs)`は`max(dcYears, sevYears)`で勤続年数を決めて合算課税している(フラットレート20.315%版)。第5弾ツールで作成した`src/lib/tax/retirement.ts`の`calcRetirementDeduction()` / `calcRetirementTaxableIncome()` / `calcRetirementIncomeTax()`が、同様に「退職金+DC一時金の合算額・max年数」形式の呼び出しに対応できる構造になっているかを確認したい。

### 確認してほしいこと
1. `calcRetirementDeduction()`の現在のシグネチャと実装を提示してほしい(単一の勤続年数のみを受け取る設計か、それとも複数の年数からmaxを取る拡張が容易な構造か)
2. `calcRetirementTaxableIncome()` / `calcRetirementIncomeTax()`が「退職金額」と「DC一時金額」を別々の引数として受け取り、内部で合算してから控除を適用する形に拡張する場合、どの程度のコード変更量になるか見積もってほしい(関数シグネチャの破壊的変更が必要か、後方互換の形で拡張引数を追加できるか)
3. 拡張する場合、第5弾ツール(退職金手取り計算ツール、`/tools/retirement-tax`)側の既存の呼び出し箇所に影響が出ないかを確認してほしい

### 期待する報告形式
- 「対応容易(工数小)」「対応可能だが工数中〜大」「現実的に対応困難」のいずれかの判定と、その根拠となるコード箇所
- 対応する場合の拡張案(関数シグネチャ案)
- 対応が困難な場合、次善策としてこのツールでは会社退職金との同一年受給を対象外とする(その場合はUI警告文言の実装が別途必須になる。Product Spec 5-3参照)

---

## 調査項目2:累進所得税計算ロジックの共通化可否

### 背景
退職所得(分離課税)と雑所得(総合課税)は課税方式が異なるが、日本の所得税率表自体(5%〜45%の超過累進税率)は共通のはず。

### 確認してほしいこと
1. `calcRetirementIncomeTax()`内で、課税所得金額から所得税額を計算する累進税率の計算部分(5%〜45%のブラケット処理)が独立した関数として切り出されているか、それとも`calcRetirementIncomeTax()`内に埋め込まれているかを確認してほしい
2. 切り出されていれば、新規ツールの`calcComprehensiveIncomeTax()`(総合課税用)からその関数をそのまま再利用できるか(退職所得の場合と総合課税の場合で、累進税率の適用対象金額が異なるだけで税率テーブル自体は同一のはず)
3. 切り出されていない場合、この機会に共通関数として切り出す作業がどの程度の規模になるか見積もってほしい(第5弾側の既存動作に影響がないことが前提)

---

## 調査項目3:住民税計算ロジックの再利用可否

### 背景
第5弾では住民税を「市民税(6%)・県民税(4%)をそれぞれ100円未満切り捨てしてから合算」という端数処理で実装している。総合課税(雑所得+その他所得)の住民税計算でも同じ端数処理を踏襲する想定。

### 確認してほしいこと
1. `calcRetirementIncomeTax()`内の住民税計算部分が独立した関数として切り出されているか
2. 総合課税の課税所得金額に対して同じ関数(税率6%/4%・100円未満切り捨て)をそのまま適用できる構造か

---

## 前提として共有しておく決定事項(調査結果次第で変わらない部分)

- 差分方式(本体`calcPensionTaxDiff()`と同様の増分税額方式)は採用しない。各受取パターンの手取り総額を直接計算する
- 公的年金等控除は国税庁No.1600速算表(令和2年分以後、65歳以上/未満の2区分)を新規実装する。これは調査不要、Product Spec通りに新規作成でよい
- モジュール配置は`src/lib/tax/ideco.ts`として新規ファイル化(`retirement.ts`は変更するとしても後方互換を保つ形にする)
- 関数命名は`calc`プレフィックス、戻り値はオブジェクト形式(`{ deduction, taxableIncome }` 等)で内訳をUI表示できる形にする(Product Spec 5-1参照)

---

## 成果物として期待するもの

上記3項目についての調査結果レポート(コード引用付き)。**この段階では実装コードの変更は行わないこと。** 報告を受けてこのチャットで最終仕様を確定させ、その後に別途実装指示を出す。

特に調査項目1の結論(対応するか、対象外にするか)は、入力設計(「退職金額・勤続年数」欄を残すか削除するか)そのものに関わるため、ここが決まらないとProduct Specの入力設計セクションが確定しない。

---

## 調査結果(2026-07-29・`src/lib/tax/retirement.ts`を読んで確認。コード変更は一切行っていない)

### 調査項目1(最優先):退職金+DC一時金の合算課税への対応可否

**判定:対応容易(工数小)。それどころか、シグネチャ変更が一切不要。**

現在の3関数のシグネチャ:

```ts
export function calcRetirementDeduction(
  serviceYears: number,
  hasDisabilityException: boolean
): number

export function calcRetirementTaxableIncome(
  income: number,
  deduction: number,
  serviceYears: number,
  isExecutive: boolean
): number

export function calcRetirementIncomeTax(
  income: number,
  serviceYears: number,
  isExecutive: boolean,
  hasDisabilityException: boolean
): RetirementIncomeTaxResult
```

3関数とも、**「単一の勤続年数」「単一の収入額」を受け取る設計だが、その値がどこから来たか(単一の退職金なのか、複数の受取を合算した金額なのか)を一切関知しない、完全に汎用的な純粋関数**になっている。本体`helpers.ts`の`retirementTaxCalc(idecoBalance, severanceAmount, dcYears, sevYears)`のように「2つの受取源を受け取り、関数内部で合算・max年数を取る」設計にはなっておらず、**呼び出し側が事前に`income = idecoLump + severance`・`serviceYears = Math.max(idecoYrs, sevYrs)`を計算してから渡す**という前提の設計になっている。

これは偶然そうなっているのではなく、`calcRetirementTaxableIncome()`の実装を見ると裏付けが取れる:

```ts
export function calcRetirementTaxableIncome(
  income: number,
  deduction: number,
  serviceYears: number,
  isExecutive: boolean
): number {
  const payType = determinePayType(serviceYears, isExecutive);
  const base = Math.max(0, income - deduction);
  // ...
}
```

`income`・`deduction`はすでに計算済みの数値としてそのまま使われているだけで、内部で「退職金由来か、DC一時金由来か」を区別する分岐は存在しない。つまり**退職金+DC一時金の合算課税対応は、`retirement.ts`本体を1行も変更せずに、呼び出し側(新規`ideco.ts`)に薄いラッパー関数を1つ追加するだけで実現できる**:

```ts
// src/lib/tax/ideco.ts に新規追加するイメージ(このフェーズでは未実装)
export function calcIdecoLumpSumTax(
  idecoLump: number,
  severance: number,
  idecoYrs: number,
  sevYrs: number,
  isExecutive: boolean,
  hasDisabilityException: boolean
): RetirementIncomeTaxResult {
  const totalIncome = idecoLump + severance;
  const maxYears = Math.max(idecoYrs, sevYrs);
  return calcRetirementIncomeTax(totalIncome, maxYears, isExecutive, hasDisabilityException);
}
```

この設計が本体`retirementTaxCalc()`の`max(dcYears, sevYears)`ルールと数式レベルで整合することは、第5弾実装時の検証スクリプト(`scripts/verify-retirement-tax-tool.js`)内の「一致検証」セクションで既に確認済み(本体の実出力から逆算した控除額と`calcRetirementDeduction()`の出力が、勤続6〜42年の11パターンで一致することを確認済み)。

**第5弾ツール(`/tools/retirement-tax`)への影響:ゼロ。** `calcRetirementDeduction()`/`calcRetirementTaxableIncome()`/`calcRetirementIncomeTax()`のシグネチャ・実装ともに一切変更が不要なため、既存の呼び出し箇所(`RetirementTaxResult.tsx`)・既存の検証スクリプト(40 PASS)はそのまま影響を受けない。

**Product Specへの示唆**:調査項目1の結論により、5-3章の「対応可否」判断は**対応する(v1スコープに含める)**方向で確定してよいと考えられる(拡張コストが「小さい」どころか「ゼロ」に近いため)。したがって3章「入力設計」の「詳細設定:退職金額・勤続年数」欄は、削除せずそのまま残す前提でよい。この結論を踏まえたProduct Spec入力設計セクションの確定は、ご指示の通りこのチャット側の判断に委ねる。

### 調査項目2:累進所得税計算ロジックの共通化可否

**判定:現状は独立関数として切り出されていない。切り出し自体は小規模(工数小)。**

`calcRetirementIncomeTax()`内、Step 3として以下のようにインラインで実装されている:

```ts
// Step 3: 所得税(復興特別所得税込み)
const bracket = INCOME_TAX_BRACKETS.find((b) => taxableIncome <= b.upTo)!;
const rawIncomeTax =
  (taxableIncome * bracket.rate - bracket.deduction) *
  RECONSTRUCTION_SURTAX_RATE;
const incomeTax = Math.max(0, Math.floor(rawIncomeTax + 1e-6));
```

`INCOME_TAX_BRACKETS`(速算表本体)はモジュールスコープの`const`として定義されているが、`export`されておらず、上記のブラケット参照・税額計算・端数処理のロジック自体も独立関数になっていない。

ご認識の通り、退職所得(分離課税)と雑所得(総合課税)は課税「方式」が異なる(退職所得は他の所得と合算せず単独で税率表に当てる分離課税、雑所得は他の所得と合算してから同じ税率表に当てる総合課税)だけで、**税率表(5%〜45%・速算控除額)自体は同一のもの**という認識は一次情報(国税庁の源泉徴収税額速算表)と整合しており正しい。

共通化の作業規模:
- `INCOME_TAX_BRACKETS`を`export`する
- ブラケット参照+税額計算+端数処理の3行を`calcProgressiveIncomeTax(taxableIncome: number): number`のような独立関数に切り出し、`calcRetirementIncomeTax()`側もこの関数を呼ぶ形にリファクタリングする
- リファクタリング後、既存の`verify-retirement-tax-tool.js`(40 PASS)を再実行し、退職所得側の挙動が一切変わっていないことを確認する

**第5弾側の既存動作への影響**:リファクタリング自体にバグがなければゼロだが、これは「関数の中身を書き換える」変更であるため、調査項目1(呼び出し側にラッパーを足すだけ)より慎重な回帰確認が必要になる。実装フェーズでは、この切り出しと動作不変であることの確認をセットで行うことを推奨する。

### 調査項目3:住民税計算ロジックの再利用可否

**判定:こちらも現状は独立関数として切り出されていない。切り出し自体は小規模(工数小)。**

`calcRetirementIncomeTax()`内、Step 4として以下のようにインラインで実装されている:

```ts
// Step 4: 住民税(市民税・県民税を別々に計算し、それぞれ100円未満切り捨ててから合算)
const municipal =
  Math.floor((taxableIncome * MUNICIPAL_TAX_RATE) / 100 + 1e-6) * 100;
const prefectural =
  Math.floor((taxableIncome * PREFECTURAL_TAX_RATE) / 100 + 1e-6) * 100;
const residentTaxTotal = municipal + prefectural;
```

`MUNICIPAL_TAX_RATE`(6%)・`PREFECTURAL_TAX_RATE`(4%)もモジュールスコープの`const`で`export`されていない。ロジック自体は「課税所得金額に税率を掛けて100円未満切り捨て」という単純な処理のため、`calcResidentTax(taxableIncome: number): { municipal: number; prefectural: number; total: number }`という独立関数に切り出せば、雑所得+その他所得を合算した総合課税の課税所得金額に対してもそのまま適用できる構造になっている(調査項目2と同様、税率・端数処理のルール自体は退職所得か総合課税かで変える理由がない)。

作業規模・回帰確認の必要性も調査項目2と同等(小規模だが、切り出し後に第5弾の既存検証スイートで動作不変を確認する必要あり)。

### 総括

3項目とも「対応可能・工数小」という結論になった。特に調査項目1は当初想定より容易で、`retirement.ts`本体には一切手を入れずに`ideco.ts`側の薄いラッパーだけで実現できる。調査項目2・3は`retirement.ts`への軽微なリファクタリング(独立関数への切り出し)が必要だが、いずれも小規模かつ機械的な変更で、既存の検証スイートで動作不変性を確認できる見込み。

**実装コードの変更はこの調査中は一切行っていません。** 次のご指示(Product Spec入力設計セクションの最終確定、および実装指示)をお待ちします。
