# 調査専用指示書:積立期/取崩期σの重み計算(getAggregateWeights)の不整合

**ロックファイル(`simulate.ts`・`analyze.ts`・`montecarlo.ts`)は変更禁止・読むだけ。**
**`profile.ts`も今回は変更禁止・読むだけ(調査のみ)。**
コードの変更は一切行わず、調査結果の報告のみでお願いします。

## 背景

`src/lib/profile.ts`の`getAggregateWeights()`で、積立期(working)の重みは
「現在残高 + 年間積立額1年分」(`bNisa + cNisa`等)、取崩期(retirement)の重みは
「現在残高のみ」(`bNisa`等)という異なる計算式になっている。この差により、
PF画面の「全口座集計σ」が「取崩期は積立期と同じPFを使う」チェックON時でも
積立期と取崩期で微妙に異なる値になる(例:17.5% vs 17.7%)。

「年間積立額1年分だけ加算する」という計算に数学的な意味はなく、設計上の
不整合(バグ)と判断しているが、実際の計算結果(モンテカルロのシミュレーション
結果そのもの)に影響するかどうかがまだ確認できていない。

## 調査項目

1. **`calcAggregateSigma`/`getAggregateWeights`の呼び出し箇所を全て洗い出してください**(`grep`等で使用箇所を特定)。特に以下を明確にしてください:
   - `PortfolioPanel.tsx`のμ/σ表示(表示専用)
   - `getEffectiveMcStd`/`getEffectiveMcStdR`(`profile.ts`内)経由で`profileToSimParams`の`mcStd`/`mcStdR`に渡っているか

2. **`profileToSimParams`が返す`mcStd`/`mcStdR`が、実際に`simulate.ts`・`montecarlo.ts`でどう使われるか確認してください。**特に:
   - `mcStdDynamic`/`mcStdRDynamic`フラグがtrueのとき(PF計算値を使う=自動モード)、`mcStd`/`mcStdR`の値自体は年次シミュレーション内でそのまま使われるのか、それとも初期値としてのみ使われ、実際のシミュレーションでは口座別`sigmaW`/`sigmaR`(`getAccountSigmaW`/`getAccountSigmaR`)を毎年の実残高で動的に再計算する別ロジックが使われるのか
   - 上記の動的再計算ロジックがある場合、そこでの口座間の重み付け(残高比率)は、今回問題にしている`getAggregateWeights`の「1年分だけ加算」というクセを引き継いでいるか、それとも別の(より正確な)方法で毎年の実残高を使っているか

3. **結論として、`getAggregateWeights`の「積立期は+1年分の積立額」という設計は以下のどちらに該当するか、コードを根拠に判定してください:**
   - (A)表示パネルの目安にのみ影響し、モンテカルロの実際の計算結果(破綻確率・p10/p50/p90等)には影響しない
   - (B)`mcStd`/`mcStdR`の初期算出値として、実際の計算結果にも影響する経路がある

## 出さなくてよいもの

- 修正案・修正コードは不要(このセッションでは調査のみ)
- ファイルの変更は一切行わないこと

以上の調査結果をもとに、プランニングチャット側で修正要否・修正方針を判断します。
