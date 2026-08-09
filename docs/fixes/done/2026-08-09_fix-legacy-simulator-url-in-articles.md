# 指示ファイル:記事ソース内の旧ルート名(/simulator)絶対URL表記の統一

## 種別
実装指示(投資不要・軽微なテキスト置換のみ、ロジック変更なし)

## 背景
先の調査タスクで、以下7記事のMarkdownソース内に、`freenough-lifecompass.vercel.app/simulator/...`
という**旧ルート名**の絶対URLがそのまま残っていることが判明した。

現状、`src/lib/blog.ts`の`applyBasePathToHtml()`が表示時に以下の変換を行って
いるため、本番表示上は実害がない(リンクは正しく機能している):

```js
.split(`${SITE_URL}/simulator`).join(`${SITE_URL}/app`)
```

ただし、ソース側が実態(現在のルート名`/app`)と乖離したままなのは技術的負債
であり、将来この変換ロジックに触る際に混乱の元になる。表示上の実害がない
うちに、ソース側を素直な状態(`/app`表記)に揃えておく。

## 対象記事(7本、いずれも `src/content/blog/` 直下)
- `4percent-rule.md`
- `dual-income-couple-fire.md`
- `fire-checklist.md`
- `fire-inflation-sensitivity.md`
- `ideco-nisa.md`
- `montecarlo-simulation.md`
- `withdrawal-strategy-comparison.md`

## 作業内容

### 1. 対象記事内の該当箇所を特定
各記事内で `freenough-lifecompass.vercel.app/simulator` を含むURLをすべて
検索する(クエリパラメータ付き `?s=...` 等が付いている場合もあるため、
`/simulator` の前後を含めて正確に特定すること)。

### 2. 文字列置換
`freenough-lifecompass.vercel.app/simulator` → `freenough-lifecompass.vercel.app/app`
に置換する。**URLの`/simulator`部分のみ**を置換対象とし、クエリパラメータや
アンカー等、それ以外の部分は変更しないこと。

### 3. 確認
- 置換後、各記事内のリンクが正しい形式(`https://freenough-lifecompass.vercel.app/app/...`)
  になっていることを目視確認
- 置換によって本文の地の文(リンク以外の箇所)に意図しない変更が生じていないか確認
  (`/simulator`という文字列がURL以外の場所で使われていないか、念のため確認)
- `applyBasePathToHtml()`側の`.split(...).join(...)`変換ロジックは今回
  変更しないこと。ソース側が`/app`表記に揃った後もこの変換処理自体は
  残しておいて問題ない(冪等な処理のため、対象がなくても実害なし)

## スコープ外(やらないこと)
- `src/lib/blog.ts`の`applyBasePathToHtml()`ロジックの変更・削除
- 対象7記事以外の記事の変更
- 記事本文の内容・文言の変更(URL文字列の置換以外)
- Git commit/push(承認は別途プランニングチャットで行う)

## 完了報告に含めるべき事項
- 記事ごとの置換件数(該当なしだった記事があれば明記)
- 置換前後のURL文字列の具体例(1〜2件でよい)
- 地の文への意図しない影響がなかったことの確認結果
- `tsc --noEmit`の実行結果(Markdownのみの変更のため通常は無関係だが念のため)
