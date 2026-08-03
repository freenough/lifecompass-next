# SPEC: ideco-withdrawalツール再設計(案A) — iDeCo単体比較への変更

作成日: 2026-08-03
このチャットの役割: 企画・Spec作成・意思決定 / 実行: Claude Code
実装方式: Plan Mode推奨(投資調査で「複数コンポーネントに影響する設計変更」と判定済み)
参照: `docs/fixes/done/investigation_ideco_tool_redesign_planA.md`(現状調査結果)

---

## 1. 目的・背景

現状の主比較カード(「手取り総額」)は、iDeCo手取り+公的年金手取り(年金受給期間分)の
合算になっている。このため「年金受給期間」を変更すると、一時金パターンの合計額まで
変化して見え、「受け取り方式そのものが変わった」という誤解を招く(実際は公的年金の
合算年数が変わっているだけで、一時金自体は不変)。

再設計の方針(確定):
- 主比較3カードは**iDeCo単体の手取り額のみ**で構成する(公的年金を含めない)
- 公的年金額は「参考」として別枠に表示し、主比較の合計には含めない
- 年金・併用パターンでiDeCo分だけを分離する際は、**比例配分方式**(grossの金額比で
  按分)を採用する。差分方式(公的年金のみの税額を引く)は、順序の仮定に依存する
  恣意性があり、ツールが既に一時金+退職金の合算課税で採用している「経路依存性を
  避ける」という設計哲学と矛盾するため不採用とした

---

## 2. 変更後のUI仕様

### 2.1 主比較カード(3枚)

| カード | 表示内容 | 変更点 |
|---|---|---|
| 一時金 | iDeCo一時金分の手取り額(既存の`lumpSum.netAmount`をそのまま使用) | **変更なし**(既に公的年金非依存) |
| 年金 | iDeCo年金分の手取り額(按分後・annuityYears分の合計) | **新規計算**(3.2参照) |
| 併用 | 一時金部分の手取り+iDeCo年金部分の手取り(按分後・annuityYears分の合計) | **新規計算**(3.3参照) |

見出し文言も「◯年間で比較した手取り総額(概算)」から、公的年金を含まないことが
伝わる文言に変更する(例:「iDeCo/DC受取額(手取り)の比較」)。◯年間という期間表記は
年金・併用カードにのみ関係するため、見出しから外すか、カードごとの補足に移す。

### 2.2 「参考:公的年金」表示(新規)

- 主比較カードの下(または横)に、独立した参考枠を新設
- 表示内容:入力値`values.publicPensionAnnualManYen`をそのまま表示
  (「参考:公的年金 年間◯◯万円(税引前)」。新規の税額計算は不要)
- 「主比較には含まれていません」という一言を添え、誤解防止する

### 2.3 内訳表示(既存、維持)

- 現状の「◯◯パターンの内訳」展開表示はそのまま維持する
- `lumpSum.netAmount`は主比較カードと内訳表示で共有(重複計算なし)

---

## 3. 計算ロジック仕様

対象ファイル:`src/lib/tax/ideco.ts`(`calcMixedPattern()`または新規ヘルパー関数)

### 3.1 一時金パターン

変更なし。既存の`lumpSum.netAmount`をそのまま主比較カードの値として使う。

### 3.2 年金パターン(ratio=0%相当、iDeCo全額を年金受取)

比例配分ロジックを新設する。年あたりの計算:

```
idecoAnnualGross = pensionPortion / annuityYears   // iDeCo年金分・グロス(年額)
publicPensionGross = values.publicPensionAnnualManYen // 公的年金・グロス(年額、既存入力値)
combinedTax = comprehensive.totalTax               // 既存計算値(年額)

idecoShareOfGross = idecoAnnualGross / (idecoAnnualGross + publicPensionGross)
idecoTaxPerYear = combinedTax * idecoShareOfGross
idecoNetPerYear = idecoAnnualGross - idecoTaxPerYear

idecoAnnuityNetTotal = idecoNetPerYear * annuityYears  // 主比較カード「年金」の値
```

※ `idecoAnnualGross + publicPensionGross = 0`(両方0円)の場合は0除算を避け、
  `idecoAnnuityNetTotal = 0` とする。

### 3.3 併用パターン

一時金部分と年金部分をそれぞれ計算し合算する:

```
lumpPortionNet = (併用計算内で既に算出されているlumpSumPortionの手取り額)
                  ※ calcIdecoLumpSumTax()の出力をそのまま使用(3.1と同じ考え方)

pensionPortionNet = 3.2と同じ按分ロジックを、pensionPortion(併用時の年金分残高)に適用

mixedIdecoNetTotal = lumpPortionNet + pensionPortionNet  // 主比較カード「併用」の値
```

### 3.4 税額・実効税率のサブ行(新規・カード内の整合性確保のため必須)

各カードの「税額」「実効税率」サブ行も、手取り額と同じiDeCo単体ベースで再計算する
(公的年金込みの現行値のまま流用しない)。手取り額+税額=グロス額の整合性を
カード内で保つことが目的。

```
// 一時金:既存のlumpSum.taxAmount / lumpSum.grossAmountをそのまま使用(変更なし)

// 年金:
idecoOnlyGrossTotal = idecoAnnualGross * annuityYears
idecoOnlyTaxTotal   = idecoTaxPerYear  * annuityYears   // 3.2のidecoTaxPerYearを使用
idecoEffectiveRate  = idecoOnlyTaxTotal / idecoOnlyGrossTotal

// 併用:
mixedIdecoGrossTotal = lumpPortionGross + idecoOnlyGrossTotal(pensionPortion分)
mixedIdecoTaxTotal   = lumpPortionTax   + idecoOnlyTaxTotal(pensionPortion分)
mixedEffectiveRate   = mixedIdecoTaxTotal / mixedIdecoGrossTotal
```

grossGrossTotal=0円のケース(0除算)は実効税率を「—」等で表示する。

### 3.5 既存の`netAmount`(公的年金込みの現行値)について

削除はせず、内訳表示または将来の「総受取額」参考表示のために計算自体は残してよい。
**主比較カードの表示に使う値だけを、上記3.1〜3.3の値に差し替える**。

---

## 4. ツール画面内「計算根拠を見る」パネルへの追記文言(案)

**重要:これは資産シミュレーター本体のMethodologyページとは別物。
`IdecoWithdrawalResult.tsx`内の既存「計算根拠を見る」展開パネル
(現状「本ツールは、所得税(累進課税)・復興特別所得税・住民税・公的年金等控除を
中心に…」から始まる説明文)に追記する。**

既存文中、「差分方式による経路依存性を避け、各受取方法(一時金・年金・併用)に
ついて、指定いただいた受給期間全体で受け取れる手取り総額を直接計算しています」
という一文は、一時金+退職金の合算課税(および従来のnetAmount全体)について
述べたもの。今回新設する「iDeCo単体の年金・併用手取り」の按分ロジックは、
これとは別の計算(合算税額の事後按分)なので、混同されないよう独立した段落として
追記する:

> **iDeCo単体の年金・併用パターンの手取り額について**
> 年金・併用パターンでは、iDeCo年金と公的年金を合算した金額に公的年金等控除・
> 所得税・住民税を一括で計算しています。上記カードのiDeCo単体の手取り額は、
> この合算税額をiDeCoと公的年金のグロス金額比で按分した概算値です(差分計算では
> ありません)。実際の按分結果は、税額計算上の仮定によって多少変動する可能性が
> あります。

文言は最終的にKENZOの確認を経てから確定する(この指示書ではドラフトとして提示)。
実装時は、既存の「ただし、以下は反映していません」箇条書きリストより前に配置する
(按分ロジックの説明は計算方式そのものの話であり、非対象項目の一覧とは性質が
異なるため)。

---

## 5. 影響範囲・非対象

### 影響を受けるファイル(投資調査より)
- `src/components/tools/ideco-withdrawal/IdecoWithdrawalResult.tsx`(主比較カード・参考枠・見出し文言)
- `src/lib/tax/ideco.ts`(按分ロジックの新規追加)

### 非対象(このSpecでは変更しない)
- `annuityYears`パラメータ自体の分離(比較期間とiDeCo年金受給期間を別入力にする案B/案C)は
  引き続き別バックログとする
- 一時金+退職金の合算課税ロジック自体(既存の直接計算方式を維持)
- 他ツール(monthly-investment等)への影響なし

---

## 6. 検証方法

- `full-verify.js`に新規チェックポイントを追加するか検討(按分ロジックの境界値:
  publicPensionAnnualManYen=0円のケース、pensionPortion=0円のケース)
- 今回KENZOが実機で確認した2条件(残高2000万円・加入20年・受取65歳・公的年金150万円、
  受給期間10年/20年)を使って、変更後の「一時金カード」の値が変更前と完全一致することを
  確認する(一時金は本来変化しないはずのため、回帰確認として有効)
- 「年金」「併用」カードの新しい値について、按分ロジックが数学的に
  `idecoNetPerYear + publicPensionNetPerYear(参考計算) ≒ pensionNetPerYear`(合算値)に
  近い範囲に収まっているか、境界チェックを行う

---

## 7. 実装ワークフロー

- 複数ファイル・計算ロジック変更を含むため、**Plan Modeでの実装を推奨**
- 実装前にKENZOへ差分提案 → GO確認 → 実装、の順序を厳守
- コミット・pushはこのチャットの明示判断を待つ(実装完了後、差分提示のみ)
