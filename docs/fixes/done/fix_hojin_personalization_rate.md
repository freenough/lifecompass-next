# 修正指示：「法人資産を個人化した場合」の個人化想定額の計算式を直す

作成日：2026-09-26
種別：**実装（バグ修正）**
対象リポジトリ：`lifecompass-next`
関連：`docs/fixes/done/investigation_hojin_personalization_rate.md`（調査・完了済み）
起点テンプレート：`docs/fixes/INSTRUCTION_TEMPLATE.md`
作業ブランチ：`fix/hojin-personalization-rate`（**`feature/hitori-hojin-manage-live-demo`がmainにマージされた後**、最新のmainから作成する）

---

## 背景

調査の結果、`calcPersonalizedAmount()`が「法人資産 × 適用税率」で計算していることが分かった。画面では適用税率を「負担率」と説明しているので、正しくは「法人資産 ×（100 − 適用税率）÷ 100」である。

KENZOの判断により、今回は**計算式を正しくするだけ**とする。保存済みの値の変換処理は入れない。

---

## 1. 計算式を直す

`src/lib/hojinAssetManagement/personalization.ts`の`calcPersonalizedAmount()`を、次の式に変更する。

```ts
return Math.round(hojinTotal * ((100 - ratioPercent) / 100));
```

- `calcCombinedTotal()`は`calcPersonalizedAmount()`を呼んでいるだけなので、変更しない
- 関数名・引数名・デフォルト値（`DEFAULT_PERSONALIZATION_RATIO` = 25）・スライダーの範囲・画面の文言・localStorageとJSONエクスポート／インポートの形式は変更しない

## 2. テストの期待値を直す

`scripts/verify-personalization-ratio.js`は、逆の計算式を正しい値として固定しているため、正しい期待値に直す。

- 期待値の例（法人資産1,000万円）：適用税率42% → 580、0% → 1,000、100% → 0、25% → 750
- 個人＋法人（個人化後）の合計の期待値も、同じ考え方で直す
- 既存のテストケースの数・観点は減らさない。上の3点（42%・0%・100%）が含まれていなければ追加する

---

## 変更してはいけないもの

- ロックファイル（既存の指示書で定められたもの）
- `personalization.ts`の2関数以外のファイル（テストを除く）

---

## 検証

- 本番の関数を直接importして呼び出し、法人資産1,000万円で適用税率0%・25%・42%・100%の出力を報告する（算出方法を明記すること）
- `node scripts/verify-personalization-ratio.js`の結果
- `node scripts/full-verify.js`の終了コードと、ログ全体の[PASS]／[FAIL]件数
- `npm run build`が通ること
- 画面の実機確認はKENZOが行う。Claude Codeは資産管理ツールの画面を開かず、localStorageにも触れないこと
- devサーバーを起動した場合、停止はポートからPIDを特定して個別に行う
- `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す

## 完了報告

- `git diff`（2ファイル）
- 上記の実行結果
- 終了時の`git status`
- ローカルのファイルパスを含めないこと
- **コミット・pushはしないこと**
- 処理後、この指示書は`docs/fixes/done/`へ移動してよい。`active/`フォルダ自体は削除しない
