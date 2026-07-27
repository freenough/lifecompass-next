# 実装指示書:積立(複利)計算機 フェーズ1(finance-core拡張)+文言修正

## 前提

投資調査の結果、順算(将来価値)ロジックは`scripts/verify-finance-core.js:70-76`の
`forwardFutureValue(currentAssets, monthlyContribution, years, ratePct)`として
検証スクリプト内にのみ存在し、`financeCore.ts`本体にはエクスポートされていない
ことが判明した(ケース2)。

第3弾ツール(積立(複利)計算機)の本番UIは`financeCore.ts`からimportして使う
必要があるため、このロジックを本体に昇格させる。

## 対応1:financeCore.tsへの関数昇格

- `src/lib/financeCore.ts`に`calcFutureValue()`を新規`export`する
  - 実装内容は`scripts/verify-finance-core.js:70-76`の`forwardFutureValue()`と
    **完全に同一のロジック**を用いること(独自の再実装・簡略化・最適化は禁止。
    既存の年金終価の式とビット単位で一致させる)
  - 引数名・シグネチャは既存の命名規則に統一する:
    - `calc`プレフィックス(`calculate...`にしない)
    - 利回りは%表記(`annualRatePct`のような命名)で受け取り、関数内部で`/100`する
      (`calcAchievementAge()`で確定した規則を踏襲。小数表記との混在は往復チェックで
      100倍ズレるバグの原因になるため厳守)
    - 引数の順序・型は`forwardFutureValue(currentAssets, monthlyContribution, years, ratePct)`
      を踏襲してよいが、他2関数との一貫性がある命名にすること
  - 戻り値は将来評価額(number)。第1弾・第2弾の`null`許容パターンは本関数には
    不要(順算に計算不能ケースは基本的に存在しないため)だが、境界値
    (`years<=0`等)の扱いは明確にしておくこと

- `scripts/verify-finance-core.js`側は、独自実装していた`forwardFutureValue()`を
  削除し、`financeCore.ts`からimportして使う形に修正する(重複実装の解消)

## 対応2:scripts/verify-compound.jsの新規作成

- Product Spec(`product_spec_compound_interest_tool.md`)12章に基づき、
  境界値(現在資産0円・積立期間1年・利回り0%等)+代表ケース(既存4フィクスチャの
  積立条件を流用)+ランダム100件程度で検証
- 加えて、第1弾`calcRequiredMonthlyContribution()`に本関数の出力(将来価値)を
  入力し直して元の積立額に近似するかという「逆方向の往復整合性チェック」も
  実施すること(3ツール間の数値的一貫性を担保するため)
- 第1弾・第2弾の検証スクリプトと同水準の網羅性・PASS基準とする

## 対応3:インフレ非考慮注記の文言修正(第1弾・第2弾、軽微)

前回追記した以下の文言のうち、末尾が既存の最終行と重複しているため短縮する。

**修正前(現状):**
> 「本ツールはインフレ(物価上昇)を考慮しません。入力した利回りをそのまま
> 複利計算するだけの試算です。入力する利回りが名目か実質かによって、
> 将来の金額の意味合いが変わります。インフレ率を加味した現在価値ベースの
> 試算をご希望の場合は、本格シミュレーターをご利用ください。」

**修正後:**
> 「本ツールはインフレ(物価上昇)を考慮しません。入力した利回りをそのまま
> 複利計算するだけの試算です。入力する利回りが名目か実質かによって、
> 将来の金額の意味合いが変わります。」

(最後の一文を削除。既存の最終行「より詳しい条件で試算したい場合は、
資産シミュレーターをご利用ください。」がこの役割を既に担っているため)

- 対象:`MonthlyInvestmentResult.tsx`・`FireAgeResult.tsx`の2ファイル

## 完了報告に含めるべき事項

- `calcFutureValue()`の最終的な関数シグネチャ(引数名・型・戻り値)
- `verify-finance-core.js`の重複実装削除・import化が完了していること
- `verify-compound.js`の実行結果(境界値・代表・ランダム・逆方向往復チェックの
  それぞれの件数とPASS/FAIL)
- 文言修正2ファイルの反映確認
- `tsc --noEmit`・`full-verify.js`の結果
