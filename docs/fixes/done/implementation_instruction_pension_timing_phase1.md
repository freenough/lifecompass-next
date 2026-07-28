# 実装指示書:年金 繰上げ・繰下げ 比較シミュレーター フェーズ1

対象:`pensionCore.ts`新規実装+検証スクリプト
参照:`product_spec_pension_timing_tool.md`(確定版、6・8・9章が本指示書の根拠)

---

## 前提・制約(必読)

- **`simulate.ts`・`analyze.ts`は一切変更しない**(ロックファイル)
- `financeCore.ts`は変更しない。本フェーズは`src/lib/pensionCore.ts`を
  **新規作成**する(投資調査で確定した分離方針)
- 命名規則は`financeCore.ts`と統一:`calc`プレフィックス(`calculate`は使わない)
- 完了報告前に「LifeCompass」「FIRE達成」の文字列がコード内に混入していないか
  grep確認すること(第1〜3弾での前例を踏まえた再発防止チェック)
- 数値算出において独自の再実装による近似は禁止。本フェーズで実装する関数
  自体が「本番関数」となるため、実装ロジックとJSDocの境界値記載を一致させること

---

## 1. 定数定義

`pensionCore.ts`冒頭にモジュールレベル定数として定義する(spec 9.1節)。
月次増減率をロジック内に直接ハードコードしないこと。

```typescript
export const EARLY_RATE_NEW = -0.004; // 繰上げ・新率(1962/4/2以降生まれ)
export const EARLY_RATE_OLD = -0.005; // 繰上げ・旧率(1962/4/1以前生まれ)
export const LATE_RATE = 0.007;       // 繰下げ
export const REFERENCE_AGE = 65;      // 増減の基準年齢
export const MIN_AGE = 60;            // 繰上げ下限
export const MAX_AGE = 75;            // 繰下げ上限
```

---

## 2. `calcPensionAmountAtAge()`

### シグネチャ

```typescript
/**
 * 指定した受給開始年齢における老齢基礎年金・老齢厚生年金の増減後金額を算出する。
 *
 * @param basicAmount - 老齢基礎年金(65歳時点・年額、万円)
 * @param employeesAmount - 老齢厚生年金(65歳時点・年額、万円)
 * @param targetAge - 受給開始年齢(60〜75の整数を想定。呼び出し側UIがセレクトで
 *   範囲を保証するため、範囲外入力への防御的処理は本関数の責務外とする)
 * @param isNewRate - 繰上げ減額率に新率(-0.4%/月)を適用するか
 *   (1962年4月2日以降生まれかどうか。targetAge > 65 の場合は繰下げのため
 *   この引数は無視される)
 * @returns 増減後の年額内訳と適用倍率
 *
 * 境界値:
 * - targetAge === 65 の場合、rate = 1(増減なし)、basicAmount/employeesAmountを
 *   そのまま返す
 * - targetAge === 60(繰上げ上限)の場合、monthsDiff = -60、
 *   rate = 1 + (-60 * 減額率) (新率なら1-0.24=0.76倍、旧率なら1-0.30=0.70倍)
 * - targetAge === 75(繰下げ上限)の場合、monthsDiff = 120、rate = 1 + 120*0.007 = 1.84倍
 */
export function calcPensionAmountAtAge(
  basicAmount: number,
  employeesAmount: number,
  targetAge: number,
  isNewRate: boolean
): {
  totalAmount: number;
  basicAmount: number;
  employeesAmount: number;
  rate: number;
}
```

### 実装ロジック

1. `monthsDiff = (targetAge - REFERENCE_AGE) * 12`
2. `targetAge === REFERENCE_AGE` → `monthlyRate = 0`
   `targetAge < REFERENCE_AGE` → `monthlyRate = isNewRate ? EARLY_RATE_NEW : EARLY_RATE_OLD`
   `targetAge > REFERENCE_AGE` → `monthlyRate = LATE_RATE`
3. `rate = 1 + monthsDiff * monthlyRate`
4. `basicAmount * rate`・`employeesAmount * rate`をそれぞれ`Math.round()`で
   万円単位に丸め、合計(`totalAmount`)は丸め後の2値を加算する
   (丸め誤差の扱いは第1〜3弾の「表示用フィールドのみ丸め」方針を踏襲)

---

## 3. `calcBreakEvenAge()`

### シグネチャ

```typescript
/**
 * 選択した受給開始年齢と65歳受給を比較し、累計受給額が逆転する年齢を算出する。
 *
 * @param basicAmount - 老齢基礎年金(65歳時点・年額、万円)
 * @param employeesAmount - 老齢厚生年金(65歳時点・年額、万円)
 * @param targetAge - 比較対象の受給開始年齢
 * @param isNewRate - 繰上げ減額率の新旧判定
 * @param compareEndAge - 比較終了年齢(寿命の想定。80/85/90/95/100を想定)
 * @returns 損益分岐年齢の算出結果
 *
 * 重要な仕様(spec 6.2節を参照。実装前レビューで明確化された箇所):
 * - targetAge === REFERENCE_AGE の場合、比較対象が同一のため
 *   { age: null, foundWithinHorizon: false } を返す
 *   (UI側はこの場合、損益分岐の表示自体を行わない設計とする)
 * - targetAge > REFERENCE_AGE(繰下げ)の場合、選択年齢の累計受給額が
 *   65歳受給の累計受給額を上回る(または一致する)最初の年齢を探す
 * - targetAge < REFERENCE_AGE(繰上げ)の場合、65歳受給の累計受給額が
 *   選択年齢の累計受給額を上回る(または一致する)最初の年齢を探す
 *   (早く受給開始した分、当初はリードするが後年65歳受給に逆転される)
 * - compareEndAge までに交点が見つからない場合は
 *   { age: null, foundWithinHorizon: false } を返す。これは「損益分岐が
 *   存在しない」ことを意味するのではなく「比較終了年齢の範囲内では
 *   逆転が起きない」ことを意味する。呼び出し側UIは、この場合
 *   「比較終了年齢(◯◯歳)内では、65歳受給との逆転は起こりません」と
 *   表示すること(「損益分岐なし」という表現は使わない)
 */
export function calcBreakEvenAge(
  basicAmount: number,
  employeesAmount: number,
  targetAge: number,
  isNewRate: boolean,
  compareEndAge: number
): {
  age: number | null;
  foundWithinHorizon: boolean;
}
```

### 実装ロジック(累計受給額の積み上げ方式)

1. `targetAge === REFERENCE_AGE` の場合は即座に`{ age: null, foundWithinHorizon: false }`を返す
2. `calcPensionAmountAtAge()`で65歳受給時・選択年齢受給時それぞれの`totalAmount`を取得
3. `age = REFERENCE_AGE`(65)から`compareEndAge`まで1歳刻みでループし、各年齢時点で:
   - `age >= REFERENCE_AGE` なら65歳受給側の累計に`totalAmount(65歳)`を加算
   - `age >= targetAge` なら選択年齢側の累計に`totalAmount(targetAge)`を加算
   (`targetAge < 65`の場合、ループ開始をtargetAgeまで遡らせる必要がある点に注意。
   ループ範囲は`Math.min(REFERENCE_AGE, targetAge)`から`compareEndAge`までとする)
4. 各年齢で「4.のシグネチャのJSDocに記載した方向」の交点条件を満たすか判定し、
   最初に満たした年齢を返す
5. `compareEndAge`まで到達しても条件を満たさなければ
   `{ age: null, foundWithinHorizon: false }`を返す

---

## 4. 検証スクリプト:`scripts/verify-pension-timing.js`

### 境界値ケース(必須、以下すべてを個別テストケースとして含める)

- `targetAge = 60`(繰上げ上限、新率・旧率それぞれ)
- `targetAge = 65`(増減なし、`calcBreakEvenAge`が`{age:null, foundWithinHorizon:false}`
  を返すことも確認)
- `targetAge = 75`(繰下げ上限)
- **増減率切り替わり境界**(倍率計算の境界で最もミスが出やすいため、
  実装前レビューで追加された必須項目):
  - `64 → 65`(繰上げ最終月→基準)
  - `65 → 66`(基準→繰下げ最初の月)
  - `74 → 75`(繰下げ最終月)
- 生年月日境界:1962年4月1日生まれ(旧率)/1962年4月2日生まれ(新率)相当の
  `isNewRate = false / true`それぞれで、同一`targetAge`における金額差を確認
- `compareEndAge`と`targetAge`の大小関係:`compareEndAge < targetAge`となる
  組み合わせ(理論上は入力UIで発生しないが、防御的に`foundWithinHorizon: false`
  を返すことを確認)
- **比較終了年齢内で逆転しないケース**(spec 6.2節の例に対応):
  `targetAge = 75`・`compareEndAge = 80`で`foundWithinHorizon: false`となり、
  かつ`compareEndAge`を90や95に伸ばすと`foundWithinHorizon: true`に転じる
  ことを確認するテストケースを含める

### 代表ケース・ランダムケース

- 代表ケース:既存4フィクスチャ(田中誠・山本恒一・佐々木誠一・中村夫婦相当の
  年金額)を流用し、複数の`targetAge`パターンで算出
- ランダム100件:基礎年金額(50〜100万円)・厚生年金額(0〜200万円)・
  `targetAge`(60〜75)・`isNewRate`(true/false)・`compareEndAge`
  (80/85/90/95/100)をランダムに組み合わせ、`rate`の理論値との一致・
  `totalAmount = basicAmount + employeesAmount`(丸め後)の整合性を確認

### 目標件数

境界値14件以上+代表ケース+ランダム100件、計110件以上全PASS
(第1〜3弾と同水準の網羅性)

### `full-verify.js`への組み込み

新規スクリプトを`scripts/full-verify.js`の実行対象に追加し、
0 failuresで完了すること。

---

## 完了報告のフォーマット

- 関数名(`calcPensionAmountAtAge`・`calcBreakEvenAge`)ベースで報告すること
  (行番号は編集中にずれるため使用しない)
- 検証スクリプトの実行結果(PASS件数/FAIL件数)を明記
- 数値算出方法(本番関数経由であること)を明記
- grep確認結果(「LifeCompass」「FIRE達成」が混入していないこと)を明記
- `full-verify.js`の実行結果(0 failures)を明記
