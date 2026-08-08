# 実装指示書:①手動モード時の再確認 ②保存時の休眠データ更新

## 背景

`docs/fixes/done/investigation_saved_profile_mu_sigma_sync_bug.md`(前回調査)で、
自動モード(pfManualFlags=false)時はμ・σとも`getEffectiveRW`/`getEffectiveRR`/
`getEffectiveMcStd`/`getEffectiveMcStdR`経由でライブ再計算され、保存された
`params.rWNisa`等の生の数値は無視されることを確認した。これは計算結果には
実害がないが、JSONファイルを直接見た人間(KENZOさん自身を含む)が、実際には
使われていない古い数値を見て混乱する、という問題が今回の一連のやり取りで
実際に発生した。これを解消する。

## 対象・制約

**ロックファイル(`simulate.ts`・`analyze.ts`・`montecarlo.ts`)は変更禁止・読むだけ。**
対象は`profile.ts`(確認のみ、変更不要)と`src/lib/storage.ts`の
`saveProfile()`(修正対象)。他のファイルには一切触れないこと。

## 項目1:手動モード時のgetEffectiveRW/RR等の再確認(調査のみ・修正不要)

`pfManualFlags`が`true`(手動)のとき、`getEffectiveRW`・`getEffectiveRR`・
`getEffectiveMcStd`・`getEffectiveMcStdR`が、ライブ計算(calcMu等)を行わず、
`p.rWNisa`等の保存値をそのまま返していることをコードで確認し、報告して
ください。σについては別件調査で確認済みだが、μ(rW/rR、NISA・iDeCo・
特定口座それぞれ)についても同様であることを、この機会に明示的に確認して
ください。もし手動モードなのにライブ計算に上書きされてしまう経路が
見つかった場合は、それこそ実害のあるバグなので、修正はせず詳細を報告して
ください。

## 項目2:保存(save)時に休眠データを最新のEffective値で上書きする

### 変更内容

`src/lib/storage.ts`の`saveProfile()`で、保存直前に以下の処理を追加する:

- `pfManualFlags`が`false`(自動)になっている各項目について、対応する
  `params`のフィールド(`rWNisa`・`rRNisa`・`rWIdeco`・`rRIdeco`・`rWTax`・
  `rRTax`・`mcStd`・`mcStdR`)を、保存時点の`getEffectiveRW`/`getEffectiveRR`/
  `getEffectiveMcStd`/`getEffectiveMcStdR`の返り値(実際に計算へ使われている
  ライブ値)で上書きしてからシリアライズする
- `pfManualFlags`が`true`(手動)の項目は、既にユーザーが指定した値がそのまま
  `params`に入っているはずなので、上書きしない(触らない)
- この処理は`SimulatorForm.tsx`の`setLinked()`(自動→手動切り替え時に
  ライブ値をシードする処理)と同じ考え方をsave時に適用するイメージ。
  既存の`setLinked()`のロジックを参考にしてよいが、コピーではなく
  `saveProfile()`内で完結する形にすること

### 注意点

- この変更は**保存されるJSONの見た目(内容)が変わるだけ**で、計算ロジック
  (`profileToSimParams`・`simulate()`等)には一切影響しない。既存の
  `pfManualFlags=false`の挙動(読み込み時にASSET_CLASSESから再計算する)は
  そのまま維持すること。今回の変更で「自動モードなのに保存値が使われる
  ようになる」といった挙動の変化を起こさないこと
- 保存フォーマットのバージョン(`version: 3`等)を上げる必要があるかどうか
  判断し、既存の保存済みJSONとの後方互換性(古いJSONの読み込みが壊れないか)
  も確認すること

## 影響範囲の確認

1. `full-verify.js`を実行し、全PASSを確認すること(計算ロジックは変更して
   いないため、差分が出ないはず)
2. 既存の保存済みJSON(例:今回添付された`暴落シナリオ.json`のような、
   自動モードで古い数値が残っているファイル)を読み込んでも、引き続き
   正しく動作する(読み込み時の再計算ロジックは変更していないため)ことを
   確認すること
3. 新規に保存したJSONの`params`内の数値が、保存直前のPF画面表示(実効値)と
   一致していることを、実際に保存・ファイル内容確認する形でテストすること

## 完了報告に含めるべき内容

- 項目1の確認結果(手動モード時の挙動、問題の有無)
- 項目2の変更diff
- `full-verify.js`実行結果
- 新規保存したJSONの中身が実効値と一致していることの確認結果(サンプル可)
- 既存の古いJSON(自動モード・古い数値)の読み込みが引き続き正常に動作する
  ことの確認結果

commit・pushは行わず、報告のみでお願いします。
