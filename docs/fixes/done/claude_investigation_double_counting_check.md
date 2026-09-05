# 調査依頼：法人取崩extraEventsと法人残高（合算線）の二重計上リスク確認

作成日：2026-09-03
種別：**調査のみ（実装は行わない、最優先で確認してほしい）**
関連：`claude_investigation_combined_line_prereq.md`（1.5で二重計上の可能性が指摘されたため、その内部ロジックを確認する）

---

## 0. 確認したいこと（一言で）

「法人取崩を織り込む」チェックONで保存した計画は、個人カーブに`buildCorporateGeneratedEventsFromSnaps(corporateSnaps, effectiveTaxRate)`由来の収入イベントが既に混ざっている。この状態に、さらに`corporateSnaps`（法人残高）を「合算」線として単純加算すると、同じお金を2回計上してしまわないか？

---

## 1. 調査してほしいこと

### 1.1 `buildCorporateGeneratedEventsFromSnaps()`の内部ロジック

`src/lib/hojinCompanyState/buildCombinedSimulationInput.ts`の`buildCorporateGeneratedEventsFromSnaps()`の実装全体を引用し、以下を明確にする：

- 生成される各年のイベント金額は、その年の法人残高（`corporateSnaps[i].total`）そのものを毎年変換しているのか、それとも「取崩イベントによって法人残高が減った分（差分）」だけを変換しているのか
- 具体的な計算式を引用する（例：`amount = withdrawalAmountForYear * (1 - effectiveTaxRate)`のような形か、`amount = corporateSnaps[i].total * ...`のような形か）

### 1.2 `simulateCorporateAssets()`が法人の取崩イベントをどう扱っているか

- `src/lib/hojinCompanyState/corporateGrowth.ts`の`simulateCorporateAssets()`が、`events`（法人側のLifeEvent、取崩イベントを含む）をどう処理しているかを確認する
- 取崩イベントが発生した年、`corporateSnaps[i].total`（戻り値の法人残高）は、その取崩額を**差し引いた後**の残高になっているか（＝取崩済みの金額はもう`total`に含まれていないか）を、具体的な計算箇所を引用して確認する

### 1.3 結論の明示

上記1.1・1.2を踏まえて、以下のどちらが実態として正しいかを明言する：

- **(A) 二重計上は起きない**：`corporateSnaps[i].total`は取崩額差し引き後の残高であり、`buildCorporateGeneratedEventsFromSnaps()`はその差し引かれた分（取崩額）だけを個人側イベントに変換している。したがって「個人カーブ（取崩収入込み）＋法人残高（取崩後）」を合算しても、実際の総資産と一致する
- **(B) 二重計上が起きる**：`buildCorporateGeneratedEventsFromSnaps()`が、取崩の有無に関わらず`corporateSnaps[i].total`（その年の法人残高全体、またはそれに近い額）をそのまま個人側イベントに変換しており、法人残高側にはその金額がまだ残ったまま計上されている。この場合、単純加算すると同じ金額が二重に数えられる

推測ではなく、実際のコードから確実に判断できる場合のみ(A)/(B)を明言すること。判断がつかない場合は、その旨と、判断に必要な追加情報（テストケースでの実際の数値比較等）を報告する。

---

## 2. 報告フォーマット

- ファイルパス・関数名・関連コードを引用
- 1.1〜1.3を明確に報告する。特に1.3の結論は曖昧にせず、根拠となるコード行とともに明言する
- 可能であれば、既存のテストや`scripts/verify-plan-snapshot.js`等に、この検証に使える実際の数値例があれば併せて報告する

## 3. やらないこと

- コードの変更
- 合算線の実装

以上は、本調査結果をもとにこのチャットで設計を確定させたうえで、別途の実装指示書で依頼する。
