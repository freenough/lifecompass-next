# 実装指示書: 全7ツール共通デザインシステム(第1弾)

## 位置づけ

前段の調査(`INVESTIGATION_design-system-7tools.md`)を踏まえ、プランニングチャットで方針を決定済み。この指示書に従って実装してください。仕様に明記のない判断が必要になった場合は、独自判断せず一旦停止してKENZOに報告してください。

## 重要な前提訂正(調査で判明)

- デザイントークン案にあった5色のうち、**NISA緑/iDeCo青/特定青/現金グレーの4色は7ツールと無関係**(本体シミュレーターの口座色)。この4色は一切使用しないこと。
- 実際にツール群で使われている色は `slate` スケール・`--color-accent`(#334155)・`--color-bg-sub`(#f8fafc)・`--color-border`(#e2e8f0)・`--color-warn-bg`/`--color-warn-text`等、`src/app/globals.css`の`@theme`に定義済みのトークンのみ。
- **今回の実装では新しい色を一切追加しない。** 既存トークンの活用・強化のみで対応する。

---

## 1. 新規共有コンポーネント: `src/components/tools/ui/ToolCard.tsx`

以下16箇所で重複している`className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"`(結果カード系10箇所)および`overflow-hidden`系(テーブル系5箇所)を置き換える薄いラッパーコンポーネントを新設してください。

**対象ファイル(結果カード系・10箇所):**
- `CompoundInterestResult.tsx`
- `EducationCostResult.tsx`
- `FireAgeResult.tsx`(2箇所)
- `IdecoWithdrawalResult.tsx`
- `MonthlyInvestmentResult.tsx`
- `PensionTimingResult.tsx`
- `PrepayVsInvestResult.tsx`
- `RetirementTaxResult.tsx`
- `RelatedArticles.tsx`

**対象ファイル(テーブル系・5箇所):**
- `CompoundInterestSensitivityTable.tsx`
- `FireAgeSensitivityTable.tsx`
- `PensionTimingComparisonTable.tsx`
- `PrepayVsInvestComparisonTable.tsx`
- `SensitivityTable.tsx`

**新しいスタイル(既存slateパレット内での強化のみ):**
- 枠線: `border-slate-200` → `border-slate-300`
- `shadow-sm`を追加
- 角丸・パディングは現状維持(`rounded-xl p-5 sm:p-6`)

`ToolCard`は`variant`propで「結果カード(`p-5 sm:p-6`)」と「テーブルラッパー(`overflow-hidden`、パディングなし)」の2パターンに対応できるようにしてください(例: `<ToolCard variant="result">`/`<ToolCard variant="table">`)。中身のJSXは無変更、外側の`<div className="...">`を`<ToolCard>`に置換するだけの機械的な移行とすること。

**ロジックは一切持ち込まない。** 見た目のみを担うコンポーネントとする。

---

## 2. テーブル型5ファイルの見た目統一

`ToolCard variant="table"`への移行に加え、`<thead>`の見出し行・`<tbody>`の行境界(`border-slate-100`程度)のスタイルを5ファイル間で揃えてください。**計算ロジック・データ受け渡しの構造は変更しない。** 各ファイルの既存のprops構造・内部計算呼び出しはそのまま維持し、外枠と行のスタイリングクラスのみ統一します。

`SensitivityTable.tsx`が`MonthlyInvestmentTool.tsx`にしか使われておらず、`fire-age`/`compound`が独自の重複ファイルを持っている件(調査報告 項目1)については、**今回は統合しない。** ファイル統合は別途スコープとして扱う(今回は見た目の統一のみ)。

---

## 3. 比較表(pension-timing・prepay-vs-invest)とメイン数値の強調

**方針転換(プランニングチャットでのモックアップ検討により決定):当初案の列ごとの色分け(accent/5 vs bg-bg-sub)は撤回します。** 比較表の2列に異なる色を割り当てると、「accent色=推奨・選択されている」という既存の意味連想(選択状態・CTA等で使われている)を持ち込んでしまい、「勝敗判定ではなく判断材料の比較」というツールの中立性コンセプトと矛盾するためです。

代わりに以下の2点を実施してください:

**(a) 比較表の2列は中立に統一する**

`PensionTimingComparisonTable.tsx`・`PrepayVsInvestComparisonTable.tsx`の両方で、2列(繰上返済/投資、または早める/遅らせる)に**色の違いをつけない**。以下の構造的な装置のみで列を区別する:
- ヘッダー行の背景を両列とも同じ`bg-slate-100`程度の薄いグレーに統一
- 列と列の間に`border-left: 1px solid`(既存の`--color-border` #e2e8f0)を入れて縦の区切りを作る
- ヘッダーのテキストは`font-weight: 500`程度で太字にする(色ではなく太さで強調)

**(b) メイン数値(最も見てほしい結果)を薄いブルーの強調ボックスで囲む**

`PrepayVsInvestResult.tsx`(および`PensionTimingResult.tsx`の該当箇所があれば同様に)の主要数値(例:利息削減額)を、既存の`ideco-withdrawal`・`education-cost`の2ツールで使われている確立済みパターンと**完全に同じ配色**で強調する:

```
border: border-accent(#334155)
background: bg-blue-50(Tailwindデフォルト #eff6ff、globals.cssでのオーバーライドなし)
数値テキスト: text-slate-800(青ではなくグレー。ideco-withdrawal/education-costと同一)
```

**注意:** これは新しい色の導入ではなく、`IdecoWithdrawalResult.tsx`(71行目・78行目)と`EducationCostResult.tsx`で既に使われている`border-accent bg-blue-50` + `text-slate-800`パターンを、3ツール目(prepay-vs-invest)に適用するものです。`bg-blue-50`はTailwindのデフォルト値をそのまま使うこと(カスタムトークン化はしない、既存2ツールと同じ実装方法に揃える)。

**この強調ボックスは、比較表を持つ2ツール(pension-timing・prepay-vs-invest)のメイン数値のみに適用する。** 単純な結果表示ツール(monthly-investment/fire-age/compound等)の大きな数字表示への適用は今回のスコープ外(将来検討・要判断として保留)。

---

## 4. カードグリッド型・内訳リスト型は内部構造変更なし

`IdecoWithdrawalResult.tsx`(カードグリッド型)・`RetirementTaxResult.tsx`(内訳リスト型)は、**外側のラッパーを`ToolCard`に置換する以外、内部構造は一切変更しないこと。** これらの型の統一は今回のスコープ外(バックログ)。

---

## 5. warn系トークンの活用(driftクリーンアップ)

`fire-age`・`monthly-investment`の警告カードでハードコードされている`bg-yellow-50`/`border-yellow-200`/`text-yellow-800`を、`src/app/globals.css`で既に定義済みの`--color-warn-bg`/`--color-warn-text`トークン(`bg-warn-bg`/`text-warn-text`等、既存の`education-cost`の`warn-bg`/`warn-text`使用箇所と同じ書き方)に置き換えてください。**新規トークンの追加ではなく、既存の未活用トークンを使うだけの置換です。**

---

## 6. 今回のスコープ外(触らないこと)

- 行単位アイコンの追加(前例のない新規パターンのため、別テーマとして扱う)
- `toolMetadata.ts`のアイコン選定方針の統一(対象物ベース/行為ベースの混在は今回は放置)
- カードグリッド型・内訳リスト型の`table`型への統一
- `SensitivityTable.tsx`の重複解消・ファイル統合
- `good`/`danger`トークンの新規活用箇所の追加(今回はwarnのみ)

---

## 7. 検証

- `full-verify.js`が全PASSであること
- `tsc`クリーンであること
- 実機ブラウザで7ツール(+`prepay-vs-invest`)全てのカード境界・shadow・比較表の列色分けが意図通り表示されること
- 既存の計算結果の数値が変化していないこと(見た目のみの変更であることの確認)

**すべてのスタイル変更は既存トークンの組み合わせのみで実現し、新規hex値・新規Tailwindカラークラスの追加は行わないこと。** 完了報告にはこの点を明記すること。

---

## 8. 完了報告に含めるべき内容

- `ToolCard.tsx`の実装内容・移行したファイル一覧
- 比較表2ファイルの列色分け・数値強調の実装箇所
- warn系トークン置換の対象ファイル・箇所
- `full-verify.js`/`tsc`の結果
- 実機での見た目確認結果(可能ならスクリーンショット添付)
- 停止判断した箇所があればその内容

**commit/pushは行わず、プランニングチャットでの確認・承認を待つこと。**
