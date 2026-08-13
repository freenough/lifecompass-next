# 完了報告:resident-tax-timing 前提条件のUI明示(フェーズ0・文言追加のみ)

`impl_resident_tax_timing_phase0_disclosure.md` の実装完了報告。

## 着手前の前提確認

着手前に、`impl_resident_tax_timing_final_fixes.md`(P0/P1修正)・`impl_resident_tax_timing_ui_copy.md`
(UIコピー改善)がいずれも実装済みであることをソースコードで確認した
(`isWithheldAtSource`・①②見出し・トグルの新ラベル・`headlineManYen`の存在を確認)。
未実装箇所はなかった。

**`residentTaxTiming.ts`の計算ロジック・型定義・数値は一切変更していない**(禁止事項を遵守)。
本指示で変更したのは`ResidentTaxTimingForm.tsx`・`ResidentTaxTimingResult.tsx`・
`ResidentTaxTimingComparisonTable.tsx`のUI文言のみ。社会保険料控除・調整控除の実装には
一切着手していない(フェーズ1・2のスコープ)。

## 修正内容

### 1. `ResidentTaxTimingForm.tsx`
- 「退職前年の年収」→「退職前年の年収(額面・税込)」
- 「退職後、同一年内の給与収入」の直下に注記「失業給付・傷病手当金など非課税の給付はここに
  含めないでください。」を追加
- 「退職年の給与収入(実額)」→「退職年の給与収入(実額・額面・税込)」

### 2. `ResidentTaxTimingResult.tsx`
- ヘッドライン(内訳表示の直下、①②セクションより上・アコーディオンの外側)に、目立つ
  slate背景のボックスで前提条件の要約を追加:「本ツールは、独身・扶養家族なし・給与所得のみ
  (社会保険料控除等は未考慮)を前提とした簡易試算です。配偶者控除・扶養控除、事業所得・
  不動産所得等がある場合や、ふるさと納税・住宅ローン控除等を利用している場合は、実際の税額と
  異なります。」
- 「計算根拠を見る」アコーディオン内の既存の締めの一文(社会保険料控除等の簡易な言及のみ)を、
  ヘッドライン付近の要約より詳しい内容に拡張(社会保険料控除・人的控除・給与以外の所得・
  各種控除・額面/税込の入力前提・非課税給付の除外、を具体的に列挙)。

### 3. `ResidentTaxTimingComparisonTable.tsx`
既存キャプション末尾に「(独身・扶養家族なしを前提とした試算です)」を追記。

## 検証結果

- `npx tsc --noEmit`: エラーなし
- `node scripts/full-verify.js`: 全PASS(exit code 0)、既存フィクスチャへの回帰なし
  (文言変更のみのため`residentTaxTiming.ts`・`verify-resident-tax-timing-tool.js`とも無変更)
- ブラウザ実機確認: 追加した注記がすべて意図した位置に表示されることを確認。
  特にヘッドライン直下の前提条件ボックスは、①②セクションより上・アコーディオンの外側に
  配置しており、開かなくても最初から視認できる(埋もれていない)ことを確認。
  フォームの新ラベル・注記、比較表キャプションの追記、アコーディオン内の詳細版もすべて
  期待通り表示された。
