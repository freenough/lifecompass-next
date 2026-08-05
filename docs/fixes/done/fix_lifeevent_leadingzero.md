# 指示書:ライフイベントモーダル 前0バグ修正(方針B・共有コンポーネント化)

このセッションの役割: 実装。バグ修正のみのため設計提案なしで直接着手可。

## 背景・調査結果の要約

LifeEventTimeline.tsxのEventFormコンポーネント(260〜466行目)内の数値入力欄6箇所が、SimulatorForm.tsx等で既に適用済みの前0バグ修正(src/lib/numberInput.tsのstripLeadingZero/clearZeroOrSelect)のロールアウトから漏れている。原因はロジックの分岐ではなく、このファイルだけが対応対象から漏れたこと。

対象6項目:開始年齢(age)・期間(years)・金額/変更後(amount)・借入額(principal)・金利(rate、step=0.1)・返済年数(termYears)

## 実装方針

EventForm内(またはモジュールスコープ、LifeEventTimeline.tsx内に閉じる形)に、ラベル+単位+数値入力をまとめた小さな共有NumberFieldローカルコンポーネントを新設し、対象6箇所をこれに置き換える。

### 設計要件

**既存ヘルパーをそのまま使う**
- src/lib/numberInput.tsのstripLeadingZero・clearZeroOrSelectを新規発明せずimportして使う
- onChange/onFocus/onClick/onBlurの4段構えはSimulatorForm.tsxのFieldコンポーネント(73〜127行目)のロジックをそのまま踏襲する

**isIntegerStep判定**
- 金利(rate)のみstep=0.1の小数フィールド → isIntegerStep=false
- 他5項目は整数 → isIntegerStep=true
- NumberFieldのpropsとしてstepまたはisIntegerStepを渡せるようにする

**住宅ローン連動ロジックとの共存**
- 借入額(principal)・金利(rate)・返済年数(termYears)はupdateMortgage()(266〜273行目)経由で他フィールド(years・amount)への連動再計算が走る複合ロジック
- NumberFieldのonChangeは「DOM側のstripLeadingZero正規化+値のパース」までを担当し、パース後の数値を親から渡されたonValueChangeコールバックに渡す設計とする。連動計算(updateMortgage()呼び出し)は呼び出し元(EventForm側)のコールバック内で従来通り行い、NumberField自体は連動ロジックを知らない疎結合な作りにすること

**既存レイアウトとの整合**
- 現在使われているinputCls・UNIT_WIDTH_CLASS等のクラス名・幅指定は維持し、見た目が変わらないようにする
- NumberFieldはレイアウト用propsをそのまま透過できる構造にする(className等)

**対象外の確認**
- LifeEventTimeline.tsx内に上記6項目以外の数値入力欄がないか、実装前に再確認すること(調査時点のリストで漏れがないか念のため)

## 実装後の検証

- full-verify.js 実行し、既存チェックが全てPASSであること(件数が減っていないこと)
- tscクリーンであること
- 手動確認項目(KENZOが本番/ローカルで実施する想定。Claude Codeは実施結果を待たず、確認観点をリストアップして報告に含めること):
  - 各6項目で、値を1文字ずつ入力した際に前0が付かないこと(例:「5」→「51」と正しく置換される)
  - フォーカス時に既存値が全選択される、または値が0のときは空になること
  - 住宅ローンの連動計算(借入額・金利・返済年数→期間・金額への反映)が修正前と同じ挙動を維持していること
  - 金利(rate)フィールドで小数入力(例:1.5)が正しく扱えること

## 報告フォーマット

- 変更ファイル一覧・行番号
- NumberFieldの実装内容(コード引用)
- 6箇所の置き換え内容(diff形式推奨)
- full-verify.js・tscの実行結果
- 手動確認が必要な項目リスト(上記4点含む)

コミット・pushはこのチャット側の明示判断を待つこと。実装完了後はコミットせず報告のみ行うこと。
