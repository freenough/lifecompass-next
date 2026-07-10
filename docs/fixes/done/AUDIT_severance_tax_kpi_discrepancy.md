# 調査依頼：spRetirementTaxKPIとspRetirementTaxPaidの数値不一致

## 背景

`FIX_severance_age_match_requirement.md`の完了報告内で、配偶者の新規テストケース(53歳・1,000万円、spRetAge=56歳と不一致)について、以下の2箇所で異なる数値が報告されていた。

- 「spSeveranceNetKPI=931・**spRetirementTaxKPI=241**」
- 「spSeveranceNetKPI=931(税引後)、**spRetirementTaxPaid=69**(発生年)」

1,000万円の額面に対して手取り931万円であれば、税額は1,000-931=69万円のはずで、これは2回目の記載(69)と整合する。しかし1回目の記載(241)とは一致しない。

## 確認してほしいこと

1. `spRetirementTaxKPI`と`spRetirementTaxPaid`は、それぞれ何を表す変数か(関数名・ファイル名も明記)
2. 今回のテストケース(配偶者53歳・1,000万円)で、この2つの変数が実際にどのような値になるか、あらためて実測してください
3. なぜ241と69という異なる値になったのか。以下のどちらかを明確にしてください
   - `spRetirementTaxKPI`が単発イベントの税額ではなく、配偶者のiDeCo一時金分なども含めた累計・合算KPIであり、たまたま別の数字を見ているだけ(=矛盾ではない)
   - 報告作成時の転記ミス、または実装上どちらかの変数が誤った値を参照している(=別の不具合)

## 依頼の範囲

**確認のみ。実装・修正は行わないこと。** 別の不具合と判明した場合は、対応要否をKENZOとClaudeで相談する。

## 報告フォーマット

```
## 確認結果

### 1. 各変数の定義
- spRetirementTaxKPI：（役割・ファイル名・関数名）
- spRetirementTaxPaid：（役割・ファイル名・関数名）

### 2. 実測値
- spRetirementTaxKPI：
- spRetirementTaxPaid：

### 3. 差異の原因
- 合算KPIによる差である／転記ミスや別の不具合である
- 詳細：
```
