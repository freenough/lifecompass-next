# 実装指示:iDeCo/DC出口戦略シミュレーター(第6弾ツール)

対象:Claude Code
性質:**実装フェーズ。投資調査は完了済み、全項目確定。**
参照:`product_spec_ideco_exit_tool.md`(確定版Product Spec)、`INVESTIGATION_ideco_withdrawal_tool.md`(投資調査報告、参考)

---

## 前提

Product Spec確定版の内容で実装を進めてよい。以下、実装時に特に注意すべき点を優先度順にまとめる。不明点や「Specと実装可能性が食い違う」箇所が見つかった場合は、実装を止めてこのチャットに戻ること(見切り発車で仕様を独自解釈しないこと)。

`simulate.ts`・`analyze.ts`は引き続きロック対象。今回の実装でも一切変更しないこと。

---

## 1. モジュール構成

### 1-1. `src/lib/tax/retirement.ts`のリファクタリング(先行作業)

投資調査で判明した通り、`calcRetirementIncomeTax()`内に以下がインラインで実装されている:
- 累進所得税計算ロジック(5%〜45%のブラケット処理)
- 住民税計算ロジック(市民税6%・県民税4%、それぞれ100円未満切り捨てて合算)

これらを独立関数として切り出す:

```
calcProgressiveIncomeTax(taxableIncome)
  → 課税所得金額から所得税額(超過累進税率適用)を計算する共通関数

calcResidentTax(taxableIncome)
  → 課税所得金額から住民税額(市民税6%+県民税4%、各100円未満切り捨てて合算)を計算する共通関数
```

**切り出し後、必ず`node scripts/verify-retirement-tax-tool.js`を実行し、既存40 PASSが変わらないことを確認すること。1件でも失敗したら実装を止めて報告すること。** これは第5弾ツール(退職金手取り計算ツール)の動作保証のための必須ゲートであり、スキップ不可。

### 1-2. `src/lib/tax/ideco.ts`の新規作成

```
calcPublicPensionDeduction(pensionTotal, age)
  → 公的年金等控除額。国税庁No.1600速算表(令和2年分以後)に基づく。
     age>=65かage<65かの2区分のみで判定(受給開始年齢ではなく、その年の年齢)。
     以下の速算表をそのまま実装する(公的年金等以外の所得1,000万円以下ケースのみ対応、
     1,000万円超のケースはv1では非対応・Methodologyに明記):

     65歳以上:
       330万円未満         → 110万円(定額)
       330万円以上410万円未満 → 収入額×25%+27.5万円
       410万円以上770万円未満 → 収入額×15%+68.5万円
       770万円以上1,000万円未満 → 収入額×5%+145.5万円
       1,000万円以上        → 195.5万円(定額)

     65歳未満:
       130万円未満         → 60万円(定額)
       130万円以上410万円未満 → 収入額×25%+27.5万円
       (410万円以上の区分は65歳以上と同じ式)

calcPublicPensionTaxableIncome(publicPensionAnnual, idecoAnnual, age)
  → { deduction, taxableIncome } を返す
  → deduction = calcPublicPensionDeduction(publicPensionAnnual + idecoAnnual, age)
  → taxableIncome = max(0, publicPensionAnnual + idecoAnnual - deduction)

calcComprehensiveIncomeTax(pensionTaxableIncome, otherIncome)
  → { basicDeduction, taxableIncomeAfterDeduction, incomeTax, reconstructionTax, residentTax, totalTax } を返す
  → 計算順序(確定、Product Spec 2-2参照):
     1. 総所得金額 = pensionTaxableIncome + otherIncome (単純合算)
     2. 所得税の基礎控除額を合計所得金額(≒総所得金額)に応じて決定
        (現行表:132万円以下95万円/132万円超336万円以下88万円/336万円超489万円以下68万円/
         489万円超655万円以下63万円/655万円超2,350万円以下58万円。
         2,350万円超の高所得者向け逓減規定はv1では非対応、Methodologyに明記)
     3. 課税所得金額 = max(0, 総所得金額 - 基礎控除額)
     4. incomeTax = calcProgressiveIncomeTax(課税所得金額)  ※1-1で切り出した共通関数を再利用
     5. reconstructionTax = incomeTax × 2.1%(1円未満切り捨て)
     6. **住民税は所得税と別の基礎控除額(原則43万円、所得に応じ逓減)を用いて別途計算すること。
        所得税の基礎控除額をそのまま流用しないこと**(令和7年度改正は所得税のみが対象)。
        住民税用の課税所得金額 = max(0, 総所得金額 - 住民税基礎控除43万円)
        residentTax = calcResidentTax(住民税用課税所得金額)  ※1-1で切り出した共通関数を再利用
     7. totalTax = incomeTax + reconstructionTax + residentTax

calcIdecoLumpSumTax(idecoLump, severance, idecoYrs, sevYrs)
  → retirement.tsの3関数(calcRetirementDeduction/calcRetirementTaxableIncome/calcRetirementIncomeTax)
     に対する薄いラッパー。retirement.ts本体は無変更。
  → income = idecoLump + severance
  → serviceYears = Math.max(idecoYrs, sevYrs)
  → 上記2値をretirement.tsの各関数にそのまま渡す
```

---

## 2. パターン別の手取り計算(直接合算方式、差分方式は使わない)

**「手取り総額」の定義(確定)**:annuityYears(年金受給期間)を全パターン共通の比較期間とし、その期間全体で受け取れる合計手取り額を比較する。単年スナップショット比較は行わない(一時金パターンが常に有利に見える無意味な比較になるため)。

- **一時金パターン**:`calcIdecoLumpSumTax(idecoLump=残高全額, severance=退職金額, idecoYrs, sevYrs)`の手取り(一括) + annuityYears年間、`calcComprehensiveIncomeTax(公的年金のみの雑所得, otherIncome)`の手取りを毎年積み上げた合計(DCの影響なし、iDeCoAnnual=0で計算)
- **年金パターン**:annuityYears年間、`calcPublicPensionTaxableIncome(publicPensionAnnual, idecoAnnual=残高÷annuityYears, age)` → `calcComprehensiveIncomeTax(...)`の手取りを毎年積み上げた合計。会社の退職金がある場合は`calcIdecoLumpSumTax(idecoLump=0, severance=退職金額, idecoYrs, sevYrs)`で別途一時金として同年加算
- **併用パターン**:一時金割合(10%刻み)で残高を分割。一時金分は`calcIdecoLumpSumTax(idecoLump=分割後一時金額, severance=退職金額, idecoYrs, sevYrs)`の手取り(一括) + annuityYears年間、年金分(公的年金+DC年金の残り部分)の合計手取り

**実装上必須の追加修正(2点)**:

1. **65歳境界の固定適用**:比較期間中に65歳をまたぐケース(受取開始年齢+annuityYearsが65歳を超える場合)は、受取開始年齢時点の区分(65歳以上/未満)を比較期間全体に固定適用する。年ごとの区分切り替えは非対応。Methodologyに明記すること
2. **`calcIdecoLumpSumTax()`のmax()ロジック修正**:勤続年数のmax()調整は、iDeCo一時金と退職金が実際に同一年に同時受給される場合(`idecoLump > 0 かつ severance > 0`)にのみ適用する。

```
calcIdecoLumpSumTax(idecoLump, severance, idecoYrs, sevYrs):
  if idecoLump > 0 && severance > 0:
    serviceYears = Math.max(idecoYrs, sevYrs)
  else if idecoLump > 0:
    serviceYears = idecoYrs
  else if severance > 0:
    serviceYears = sevYrs
  else:
    return 0円
  income = idecoLump + severance
```

   これを怠ると、年金パターン(idecoLump=0・severance>0)で退職金の退職所得控除にiDeCo加入年数が誤って混入するバグになる。併用パターン(iDeCo一時金部分>0かつ退職金>0)は両者同時受給のためmax()適用のままでよい

「DC受給によって公的年金部分の税額がいくら増えたか」という差分値は主計算に使わない。UI上どうしても見せたい場合のみ、上記の直接計算結果から事後的に差分を取って参考表示すること(計算の起点にはしない)。

---

## 3. 入力UI

Product Spec 3章の通り。特に注意:

- 併用時の一時金割合スライダーは**10%刻み**
- 年金受給期間は**5〜20年、5年刻みのプルダウン**(年額は残高÷期間で内部計算、直接入力させない)
- 「年金以外の所得(概算)」のラベルは**「課税所得」ではなく「所得」**。注記は「給与所得・事業所得など、年金以外の所得額です(収入額そのままではありません)。分からない場合は0円のままで概算できます」。加えてFREENOUGHユーザー層(退職後も収入継続の可能性が高い層)向けに「退職後も収入がある方は、この項目の入力を推奨します」を併記
- 退職金額・勤続年数は詳細設定として維持(対応確定、5-3参照)

---

## 4. 出力UI

Product Spec 4章の通り。3パターン常時比較+選択パターンの内訳常時展開。`calcPublicPensionTaxableIncome()`・`calcComprehensiveIncomeTax()`がオブジェクトで内訳を返すので、第5弾同様「控除→課税所得→所得税→住民税→手取り」の内訳表示にそのまま使える。

---

## 5. Tools共通仕様

- ルート:`/tools/ideco-withdrawal`
- UTM:`ideco_withdrawal_tool`
- GA4イベント:`tool_calculate` / `tool_to_simulator_cta_click` / `tool_to_nisa_cta_click`(既存4ツールと共通)
- CTA構造:単一の本体シミュレーターCTAブロック + `AffiliateLink`(松井証券NISA)を直下配置
- インフレ注記:全Toolsページ共通の確定文言を掲載
- `Math.floor()`使用箇所は浮動小数点誤差対策(イプシロン+1e-6)を適用
- `/tools`ページに6番目のカードとして追加

---

## 6. Methodologyページ文言(下書き、実装完了後に最終レビュー)

反映/非反映事項はProduct Spec 6章の表の通り実装し、以下のまとめ文を掲載(最終文言はUI実装後にこのチャットで確定させる。この下書きのまま確定させないこと):

「本ツールは制度の主要な税制(所得税・復興特別所得税・住民税)を反映した概算です。差分方式による経路依存性を避け、各受取方法の手取り総額を直接計算しています。特に年金・併用パターンでは、税負担に加えて社会保険料の増加も別途考慮する必要があります。退職後も収入がある方は「年金以外の所得」欄への入力を推奨します。実際の手取りは社会保険料や各種所得控除、受給履歴などの影響により増減する可能性があります。」

---

## 7. テスト・検証方針

第5弾と同じ形式(`scripts/verify-*.js`)で新規検証スクリプトを作成する。最低限含めるべきケース:

- 公的年金等控除の速算表境界値(65歳以上/未満、各区分の境界金額)
- 3パターン(一時金/年金/併用)それぞれの手取り総額の妥当性チェック(手計算またはe-Tax計算例との突合)
- 併用パターンで一時金割合0%/100%が、それぞれ年金パターン・一時金パターン単体の結果と一致すること(境界一致性の確認)
- `calcIdecoLumpSumTax()`が退職金額0円のとき、DC一時金単体の退職所得税と一致すること
- **`calcIdecoLumpSumTax()`のmax()条件分岐**:idecoLump=0・severance>0のとき、勤続年数がsevYrsのみを使用しidecoYrsが混入しないこと(逆のケースも確認)
- **annuityYears共通期間での合計手取り計算**:一時金パターンに「annuityYears年間の公的年金のみの手取り」が正しく積み上げられていること
- リファクタリング後の`calcRetirementIncomeTax()`が既存の`verify-retirement-tax-tool.js`(40 PASS)を通過すること(1-1参照、必須)

完了後、`node scripts/full-verify.js`で全体0 FAILを確認し、grep確認(「LifeCompass」「FIRE達成」の不適切な混入なし)を実施すること。

**コミット・デプロイは実施せず、完了報告のみでKENZOの指示を待つこと**(第5弾と同じ運用)。
