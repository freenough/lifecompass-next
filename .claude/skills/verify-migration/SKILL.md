---
name: verify-migration
description: Verify that the migrated TypeScript simulation engine produces the same results as the original HTML version's confirmed values in reference/simulation_fixtures.md. Use this when porting or modifying simulate()/analyze() logic, after any change to account/tax/withdrawal calculations, or whenever asked to verify migration correctness.
---

# 移植検証スキル

`reference/simulation_fixtures.md` にある確定パラメータ・確定数値を使って、移植後のエンジンが旧HTML版と同じ結果を返すか確認する。

## 手順

1. `reference/simulation_fixtures.md` から対象シナリオのパラメータと期待値を読む。
2. 移植後の `simulate()` / `analyze()` に同じパラメータを渡して結果を取得する。
3. 固定利回りシナリオ（山本シリーズの①最低限②最速③安心、中村シリーズの中立シナリオ年次資産）は、期待値と完全一致するか比較する。1円・1歳でもズレたら不一致として報告する。
4. モンテカルロシナリオ（破綻確率）は、確定値から±2%pt以内かを確認する（乱数誤差として許容）。
5. 不一致があれば、どのフィールド・どの年でズレたかを具体的に報告し、CLAUDE.mdの「よくある間違い」一覧と照らして原因を推測する。原因が特定できない場合は推測で終わらせず「原因不明、追加調査が必要」と明記する。
6. 田中誠・佐々木誠一シリーズは確定データが未整備のため、これらのシナリオに対する検証は「確定データなし、検証スキップ」と報告し、KENZOに旧HTML版での再CSV出力を依頼する。

## 出力フォーマット

シナリオごとに表で報告する。

| シナリオ | 期待値 | 実際の値 | 一致 |
|---|---|---|---|
| 山本：基本シナリオ①最低限 | 55歳 | (実測値) | ✅/❌ |

最後に「全シナリオ一致」「N件不一致」のいずれかで総括する。

## 注意

- 数値の不一致を「だいたい合っているからOK」で済ませない。固定利回りシナリオは完全一致が条件。
- このスキル自体が検証の代わりにスクリプトで再計算して結果を捏造することは絶対にしない。必ず移植後のエンジンを実際に実行して得た値を使う。
