# 実装指示書:目標資産到達年齢シミュレーター フェーズ1(finance-core拡張)

参照: `product_spec_fire_age_tool.md`(確定版)

## 目的

`src/lib/financeCore.ts` に、目標資産到達年齢を計算する関数を追加する。
既存の `calcRequiredMonthlyContribution()` の逆算にあたる関数。

## 実装内容

### 1. 関数の追加

```typescript
export function calcAchievementAge(
  currentAge: number,
  currentAssets: number,
  targetAssets: number,
  monthlyContribution: number,
  annualRate: number
): number | null
```

**前提条件(既存の`calcRequiredMonthlyContribution()`と同一)**:
- 利回りは年率固定
- 複利計算は年1回(年末)
- 積立は年末に一括投入
- 積立額は期間中一定

**計算式**:

- `currentAssets >= targetAssets` の場合 → `0` を返す(既に到達済み)

- `annualRate > 0` の場合:
  ```
  x = (targetAssets + monthlyContribution*12/annualRate)
      / (currentAssets + monthlyContribution*12/annualRate)
  ```
  - `x <= 0` または `x`が計算不能(分母が0など) → `null` を返す(到達不可能)
  - それ以外:
    ```
    years = ln(x) / ln(1 + annualRate)
    return currentAge + years
    ```

- `annualRate === 0` の場合:
  - `monthlyContribution <= 0` → `null`(積立ゼロ・利回りゼロでは永遠に到達しない)
  - それ以外:
    ```
    years = (targetAssets - currentAssets) / (monthlyContribution * 12)
    return currentAge + years
    ```

**戻り値の意味(既存の`number | null`規約を踏襲)**:
- `null` = 到達不可能
- `0` = 既に到達済み
- 正の数値 = 到達年齢(小数のまま返す。整数化はUI側で行う。**四捨五入ではなく
  切り捨て(floor)を使うこと**をUI側実装者への申し送りとしてJSDocコメントに
  明記すること)

**命名規則**: 既存コードベースの`calc`プレフィックス規則に統一
(`calculate...`にはしない。既存の`calcRequiredMonthlyContribution`と同じ)

### 2. JSDocコメント

関数の直前に、以下を含むJSDocコメントを付けること:

```typescript
/**
 * 目標資産額への到達年齢を計算する(年金終価の閉じた式を逆向きに解く)。
 * calcRequiredMonthlyContribution() の逆算にあたる関数。
 *
 * 前提: 利回り年率固定・年1回複利(年末)・積立は年末一括・積立額一定。
 *
 * @returns 到達年齢(小数)。null=到達不可能。0=既に到達済み。
 *          UI側で整数化する際は四捨五入ではなく切り捨て(floor)を使うこと
 *          (年末積立モデルとの整合性、法務的な保守性のため)。
 */
```

### 3. 検証スクリプトの作成

`scripts/verify-fire-age.js` を新規作成する。

**検証方法**: `calcRequiredMonthlyContribution()` と `calcAchievementAge()` の
往復整合性を確認する(順算→逆算で同じ値に戻るか)。

具体的には、以下の手順でテストケースを生成する:
1. ランダムな `currentAge, currentAssets, targetAssets, years, annualRate` を用意
2. `calcRequiredMonthlyContribution(currentAge, currentAssets, targetAssets, currentAge+years, annualRate)` で必要積立額 `M` を算出
3. `calcAchievementAge(currentAge, currentAssets, targetAssets, M, annualRate)` を実行し、結果が `currentAge + years` に近似すること(許容誤差:0.1年)を確認

**必須の境界値ケース(9件、個別に明示的なテストケースとして書くこと。
ランダム生成に混ぜない)**:
1. 現在資産 = 目標資産 → `0` が返ること
2. 現在資産 > 目標資産 → `0` が返ること
3. 積立額 = 0、利回り > 0 → 資産成長のみで到達できるケースが正しく計算されること
4. 利回り = 0、積立額 > 0 → 積立のみで到達年数が正しく計算されること
5. 積立額 = 0 かつ 利回り = 0 → `null` が返ること
6. 現在資産 = 0 → 正しく計算されること
7. 目標資産との差が1円 → 極小の到達年数が返る、または丸め誤差で異常値にならないこと
8. 超高利回り(20%) → 発散や`NaN`にならないこと
9. 超長期(到達に60年以上かかる想定のケース) → 正しく計算されること

**代表ケース**: 山本・中村・田中・佐々木の4フィクスチャの現在資産・年齢を使い、
現実的な積立額パターンで往復整合性を確認する代表5件程度。

**ランダムケース**: 100件程度、上記の往復整合性チェックで全PASSとなること。

**実行結果**: 境界値9件+代表5件+ランダム100件、計114件全PASSを目標とする。

## 完了報告フォーマット

- `calcAchievementAge()` の実装箇所(financeCore.ts内、関数名で参照)
- 各境界値ケースの実行結果(9件それぞれの入力・出力)
- ランダムケースのPASS件数(何件中何件PASSか)
- 往復整合性チェックの許容誤差(0.1年)で問題が出た場合はその内容
- 数値算出方法の明記(recent_updatesルール通り:本番のfinanceCore.tsの関数を
  直接importして呼び出したか、独自再実装ではないか)
