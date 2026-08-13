# 実装指示:1〜5月退職時の retirementYearIncomeOverride 非表示化+計算側の防御(コミット前必須)

## 背景
波2修正(案A、`impl_resident_tax_timing_wave2_fix.md`)により、1〜5月退職の波2は
「退職前年の年収(`priorYearIncome`)」を基準にするようになった。この結果、
「退職年の実際の給与収入がわかっている」(`retirementYearIncomeOverride`)という入力欄が、
1〜5月退職では**計算上意味を持たなくなった**。しかし現状、この入力欄はUI上表示されたままであり、
ユーザーが「より正確に試算する」つもりで数値を入力しても、1〜5月退職では**黙って無視される**。
これは注記で説明して済ませる問題ではなく、UIと計算モデルを一致させることで解決すべき問題である。

## 修正方針(UI・計算ロジックの二重防御)

### 1. UI側:1〜5月退職では入力欄を非表示にする(`ResidentTaxTimingForm.tsx`)
- `priorYearIncomeTwoYearsAgo`の表示条件(`retirementMonth <= 5`)と対になる形で、
  `retirementYearIncomeOverride`のチェックボックス・入力欄の表示条件に
  **`retirementMonth >= 6`** を追加すること(1〜5月退職では表示しない)
- 対応関係を明確にするため、以下の整理をコード内コメントとして残すこと:
  - 1〜5月退職:波2の所得基準=退職前年の年収(`priorYearIncome`で入力済み)。
    `retirementYearIncomeOverride`は不要
  - 6〜12月退職:波2の所得基準=退職年の所得(月割り推計)。`retirementYearIncomeOverride`が
    実額の上書き先として意味を持つ
- 退職月を6〜12月→1〜5月に切り替えた際、既存の`useRetirementYearOverride`の状態
  (true/入力値)をリセットする必要は**ない**こと(非表示にするだけでよく、値を消す必要はない。
  理由はパート2の計算側の防御で吸収されるため)。ただし、この設計判断についても実装前に
  違和感がないか確認し、もし内部的にstateを持ち回ることで意図しない副作用が出そうであれば
  報告すること

### 2. 計算ロジック側:1〜5月退職では明示的に無視する(`residentTaxTiming.ts`)
- `calcNextYearTax()`(またはその呼び出し元)内で、`retirementMonth <= 5`の場合、
  `retirementYearIncomeOverride`が渡されていても**明示的に参照・使用しないコードにする**こと
  (現状、暗黙的に使われていないだけであれば、意図を明確にするため、条件分岐の中で
  明示的にコメント付きで無視する形に直すこと。例:
  `// 1〜5月退職では波2の基準が退職前年の年収になるため、retirementYearIncomeOverrideは
  意図的に無視する`)
- UIの表示条件を将来誰かが変更した場合や、別経路から値が渡された場合でも、1〜5月退職の
  計算モデルが意図せず影響を受けないようにすることが目的。UI側の非表示化だけに頼らないこと

## 検証要件
- 1〜5月退職(例:5月)で`retirementYearIncomeOverride`に任意の値(例:300万円)を渡しても、
  `nextYearTax.total`・`nextYearTax.taxableIncomeAssumption`が、override未指定時と
  完全に同一であることを検証項目として追加すること(前回の`postRetirementIncome`の
  無視確認と同じパターン)
- 6〜12月退職では、`retirementYearIncomeOverride`が引き続き正しく反映されることを確認し、
  既存のテストケースに回帰がないことを確認すること
- ブラウザ実機で、退職月を1〜5月に設定した際に「退職年の実際の給与収入がわかっている」の
  チェックボックス・入力欄が表示されないことを確認すること
- `full-verify.js`全PASS・`tsc --noEmit`エラーなしを確認すること
- 完了報告書に、この修正が「注記による説明」ではなく「UIと計算ロジックの二重防御による
  根本対応」であることを明記すること

## 禁止事項
- `calcResidentTax()`本体の改修
- 6〜12月退職側の`retirementYearIncomeOverride`の挙動の変更
- `docs/fixes/active/` フォルダの削除
