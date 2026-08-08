# 実装指示書:analyze.tsへの空snaps配列ガード追加(ロックファイル変更)

## 重要:これはロックファイルへの変更です

`analyze.ts`は通常変更禁止のロックファイルですが、今回はプランニングチャット
側で調査結果(`docs/fixes/done/investigation_analyze_empty_snaps_guard.md`)を
確認した上で、明示的な承認のもとに1点のみ変更を許可します。**この指示書に
明記された1行以外は、analyze.ts・simulate.ts・montecarlo.tsのいずれも
一切変更しないこと。**

## 背景

`analyze.ts:87`の`last: snaps[snaps.length - 1].totalAssets`が、`snaps`が
空配列のときに`TypeError`を投げる。前回、アプリ本体側(`profileToSimParams`
経由)はこの経路を防いだが、`profileToSimParams`をバイパスして直接
`SimParams`を組み立てる検証・記事用スクリプト(今後も増える前提)はこの
防御の恩恵を受けないため、`analyze.ts`側で一元的にガードすることにした。

調査の結果、`analyze.ts`内で空配列に対して無防備なアクセスは87行目の
1箇所のみと確認済み(他は`.find()`+ifガード・`.reduce(...,0)`・`for...of`
等で自然に安全)。

## 変更内容

`src/lib/analyze.ts`の87行目のみ、以下のように変更する:

変更前:
```ts
last: snaps[snaps.length - 1].totalAssets,
```

変更後:
```ts
last: snaps.length > 0 ? snaps[snaps.length - 1].totalAssets : 0,
```

**この1行以外、analyze.tsのいかなる箇所も変更しないこと。** 早期return等の
代替案は採用しない(プランニングチャット側で不採用と判断済み)。

## 影響範囲の確認

1. `full-verify.js`を実行し、全PASSを確認すること。既存の全フィクスチャは
   `curAge < lifeEx`を満たす正常系のため、`snaps.length > 0`が常に真になり、
   分岐にすら入らないはずである。実行結果でこれを裏付けること
2. `tsc --noEmit`がクリーンであることを確認すること
3. 念のため、`curAge > lifeEx`となる異常な`SimParams`を直接組み立てて
   `analyze()`を呼び出し、例外が発生せず`last: 0`を含む結果が返ることを
   実機で確認すること(前回の`lifeEx`バグ調査時と同様、リポジトリに
   ファイルを残さない一時的な確認で構わない)

## 完了報告に含めるべき内容

- 変更後のdiff(1行のみのはず)
- `full-verify.js`の実行結果(全PASS確認)
- `tsc`確認結果
- `curAge > lifeEx`の異常系での実機確認結果(例外が発生しないこと)

commit・pushは行わず、報告のみでお願いします。ロックファイルへの変更のため、
commit前に必ずこのチャットで最終確認を行います。
