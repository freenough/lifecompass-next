# 実装指示書: 繰上返済 vs 投資比較ツール(第8弾)

## 位置づけ

前段の調査(`INVESTIGATION_prepay-vs-invest-tool.md`)を踏まえ、プランニングチャットで以下を決定済み。この指示書に従って実装してください。仕様に明記のない判断が必要になった場合は、独自判断せず一旦停止してKENZOに報告してください。

---

## 決定済み事項(調査からの要判断ポイントの解消)

1. **住宅ローンモーダル(`LifeEventTimeline.tsx`)側の完済年齢表示(Math.round/Math.ceil)は今回のスコープ外。一切触らない。**
   - 注意:これは既存モーダルの表示精度に関する論点(端数按分後の丸め方)であり、**新ツール側の「完済年齢・期間への影響」表示行(下記5参照)とは別物**。新ツールの完済年齢表示は通常通り実装すること。混同しないこと。
2. **新規計算ロジックは`src/lib/mortgagePrepayCore.ts`に新設。** `simulate.ts`/`analyze.ts`には一切依存しない独立した純粋関数群とする(`pensionCore.ts`/`financeCore.ts`と同じ設計方針)。
3. **期間短縮型で解なし(`calcMortgageTermFromPayment`が`null`を返す)場合は、既存モーダルと同様「効果なし」相当の表示にする。** 新規の特別扱いは行わない。既存モーダル側の該当箇所を`grep`で確認し、同一の表示文言・扱いに揃えること。

---

## 1. 新規ファイル: `src/lib/mortgagePrepayCore.ts`

以下の関数を実装してください(調査報告の疑似コードをベースに、TypeScriptとして正式化):

```typescript
import { calcMortgage, calcMortgageMonthly, calcMortgageTermFromPayment } from './helpers';

export type PrepayType = 'reduce' | 'shorten';

export interface PrepaySavingsResult {
  interestSaved: number;        // 繰上返済による利息削減額(万円)
  interestWithoutPrepay: number; // 繰上返済しなかった場合の総利息(万円)
  interestWithPrepay: number;    // 繰上返済した場合の総利息(万円)
  newPayment?: number;           // 返済額軽減型: 新年間返済額(万円)。期間短縮型ではundefined
  newTermYears?: number;         // 期間短縮型: 新残存期間(年、小数)。返済額軽減型ではundefined
  noSolution?: boolean;          // 期間短縮型で解なしの場合true
}

export function calcPrepaySavings(
  balance: number,
  rate: number,
  remainingYears: number,
  prepayAmount: number,
  prepayType: PrepayType
): PrepaySavingsResult {
  // 実装: 調査報告の疑似コードを参照
  // - currentPayment = calcMortgage(balance, rate, remainingYears)
  // - interestWithoutPrepay = currentPayment * remainingYears - balance
  // - newPrincipal = Math.max(0, balance - prepayAmount)
  // - reduce: newPayment = calcMortgage(newPrincipal, rate, remainingYears)
  //           totalCostWithPrepay = prepayAmount + newPayment * remainingYears
  // - shorten: monthlyPayment = calcMortgageMonthly(balance, rate, remainingYears)
  //            newTermYears = calcMortgageTermFromPayment(newPrincipal, rate, monthlyPayment)
  //            null の場合 noSolution: true を返し、既存モーダルの「効果なし」表示と同じ扱いにする
  //            totalCostWithPrepay = prepayAmount + currentPayment * newTermYears
  // - interestWithPrepay = totalCostWithPrepay - balance
  // - interestSaved = interestWithoutPrepay - interestWithPrepay
}
```

**投資側の計算は新規実装しない。** `financeCore.ts`の既存`calcFutureValue`をコンポーネント側から直接呼び出す:

```typescript
calcFutureValue(比較する金額, 0, 残年数, 投資利回り)
```

---

## 2. コンポーネント: `src/components/tools/prepay-vs-invest/`

`pension-timing`のディレクトリ構成・実装パターンを完全に踏襲してください:

- `PrepayVsInvestTool.tsx` — 状態管理・レイアウト統括(`useState`でvaluesオブジェクト一括保持、`handleChange = (patch) => setValues(v => ({...v, ...patch}))`)
- `PrepayVsInvestForm.tsx` — 入力フォーム
- `PrepayVsInvestResult.tsx` — 単一結果の強調表示(利息削減額を主役に)
- `PrepayVsInvestComparisonTable.tsx` — 比較表(繰上返済 vs 投資)
- `PrepayVsInvestCta.tsx` — 関連記事CTA

**入力フォーム項目(確定仕様通り):**

| 項目 | 型 | 初期値 | 備考 |
|---|---|---|---|
| ローン残高 | 数値(万円) | — | |
| 金利 | 数値(%、step 0.1) | — | 変動/固定の区別はしない(現在の金利のみ) |
| 残年数 | 数値(年) | — | |
| 比較する金額 | 数値(万円) | 100 | 可変。単発の臨時収入・退職金等を想定 |
| 繰上返済タイプ | 選択(期間短縮型/返済額軽減型) | 期間短縮型 | 両方式とも`mortgagePrepayCore.ts`で実装済み(調査済み・解決済み) |
| 投資利回り | 選択(5%/7%/9%) | 7% | プルダウン。NISA枠内・非課税前提固定 |

**比較表の出力項目(確定仕様・5行構造):**

| 項目 | 繰上返済 | 投資 |
|---|---|---|
| 確実な効果 | 利息削減額(万円) | なし(市場次第) |
| 期待値 | 削減額そのもの(確定) | 選択利回りでの複利試算額(万円) |
| リスク | なし | あり(元本割れの可能性に触れる注記) |
| 流動性 | 低い(使うと戻せない) | 高い(いつでも引き出し可) |
| 完済年齢・期間への影響 | 短縮 or 返済額軽減の効果を表示 | 影響なし |

締め文言(固定テキスト):「どちらが適しているかは、金利・リスク許容度・投資期間によって異なります。」

`PrepayVsInvestComparisonTable.tsx`はこの5行構造をそのまま実装すること(定性項目のリスク・流動性は固定テキストでよく、計算不要)。

**「完済年齢・期間への影響」行の実装:**
- 期間短縮型を選択している場合:`calcPrepaySavings`が返す`newTermYears`から新完済年齢(または短縮年数)を表示
- 返済額軽減型を選択している場合:`calcPrepaySavings`が返す`newPayment`(新返済額)を表示
- これは新ツール独自の実装であり、上記「決定済み事項1」の住宅ローンモーダル側の丸め方問題とは無関係。新ツールでは通常の四捨五入等、素直な表示でよい(モーダル側の按分ロジックを持ち込む必要はない)。

**計算結果のキャッシュ・受け渡しはしない。** `pension-timing`と同様、Result・ComparisonTableそれぞれが生のvaluesを受け取り、内部で`mortgagePrepayCore.ts`/`financeCore.ts`の関数を呼んで自前計算する設計にする。

---

## 3. GA4イベント

`PensionTimingTool.tsx`/`RetirementTaxTool.tsx`と完全同一パターンを踏襲:

```typescript
const isFirstRender = useRef(true);
useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  const timer = setTimeout(() => trackEvent('tool_calculate'), 500);
  return () => clearTimeout(timer);
}, [values]);
```

UTMキャンペーンパターン: `prepay_vs_invest_tool`

---

## 4. `toolMetadata.ts`への登録

`TOOLS`配列に以下の形式で追加(`pension-timing`の実例に倣う):

```typescript
{
  slug: 'prepay-vs-invest',
  title: '繰上返済 vs 投資 比較シミュレーター',
  description: '住宅ローンの繰上返済と投資、どちらが適しているかの判断材料を比較します',
  href: '/tools/prepay-vs-invest',
  Icon: (適切な既存アイコンを選定、または新規追加。既存アイコン命名パターンに準拠),
  group: (既存グループ分類を確認し、最も近いものを採用。不明な場合は要判断として停止),
  primaryTopic: 'mortgage',
  topics: ['mortgage'],
},
```

**注意:** `group`フィールドの既存の値の種類(`receive`等)を`TOOLS`配列全体からgrepして確認し、住宅ローン関連に最も自然なグループを選定すること。該当なしと判断した場合は新規追加せず、一旦停止して報告すること(独自判断で新グループを作らない)。

`primaryTopic: 'mortgage'`が`blogTopics.ts`の`TOPIC_GROUPS`に存在するか確認し、存在しない場合も停止して報告すること(住宅ローン関連ブログ記事`housing-loan-fire`が既に公開されているため、既存のtopicがあるはずです)。

---

## 5. 固定条件(実装しないこと)

- 投資は常にNISA枠内前提。課税口座の税引き計算は一切実装しない
- Monte Carlo/σ/インフレ率関連のimportは一切行わない(`runMC`/`montecarlo`/`randNorm`等)
- 繰上返済は単発のみ。継続的な毎月繰上返済のUIは作らない
- 変動金利のブレ・借り換えシナリオのUIは作らない
- 住宅ローンモーダル(`LifeEventTimeline.tsx`)は一切変更しない

---

## 6. 検証

- `full-verify.js`が全PASSであること(新規チェックポイント追加は不要、既存構成を壊していないことの確認)
- `tsc`クリーンであること
- 新ツールページが`/asset-simulator/tools/prepay-vs-invest`でアクセス可能であること
- サイトマップに新規ページが反映されること

**すべての数値計算結果は、実装した`mortgagePrepayCore.ts`の関数を実際に呼び出して確認すること。独自の再計算スクリプトは使わない。** 完了報告には算出方法(実機関数経由)を明記すること。

---

## 7. 完了報告に含めるべき内容

- 新設ファイル一覧
- `mortgagePrepayCore.ts`の関数が実際にどう動作したか(サンプル入力・出力を1〜2ケース)
- `toolMetadata.ts`の`group`フィールド選定結果とその根拠
- `full-verify.js`/`tsc`の結果
- 停止判断した箇所があればその内容

**commit/pushは行わず、プランニングチャットでの確認・承認を待つこと。**
