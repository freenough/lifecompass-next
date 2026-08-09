# 指示ファイル:記事内リンクの絶対URL→相対パス統一 + applyBasePathToHtml()簡素化

## 種別
実装指示(投資フェーズ完了済み・設計確定済み)

## 背景
先行の調査タスクにより、以下が判明・確定している:

- ブログ記事内の内部リンクは現在「相対パス(`/asset-simulator/...`)」と
  「絶対URL(vercel.appドメインまたはfreenough.com直リンク)」が混在している
- 絶対URL形式(13記事・26件)は現状404を起こしていないが、`SITE_URL`定数の
  値に依存する暗黙の前提の上に成り立っている
- 全記事を相対パス形式に統一することで、この依存をなくし、basePath付与を
  1つの正規表現だけに一本化できる(最終形)
- `applyBasePathToHtml()`内の2つの変換ロジック(vercel.appドメイン変換、
  `/simulator`→`/app`変換)は、統一後は不要になり、他に依存箇所がないことも
  確認済み(`src/lib/blog.ts`以外での使用なし)

## 作業内容

### 1. 対象13記事・26箇所のURLを相対パスに統一

対象記事(`src/content/blog/`直下):
- `4percent-rule.md`(2件、vercel.app/app形式)
- `dual-income-couple-fire.md`(2件、vercel.app/app形式)
- `fire-checklist.md`(1件、vercel.app/app形式)
- `fire-inflation-sensitivity.md`(2件、vercel.app/app形式)
- `ideco-nisa.md`(2件、vercel.app/app形式)
- `montecarlo-simulation.md`(2件、vercel.app/app形式)
- `withdrawal-strategy-comparison.md`(2件、vercel.app/app形式)
- `compound-interest-rate-vs-years.md`(2件、freenough.com直リンク)
- `ideco-withdrawal.md`(2件、freenough.com直リンク)
- `retirement-tax-net-amount.md`(3件、freenough.com直リンク)
- `housing-loan-fire.md`(2件、http://www.freenough.com直リンク)
- `semi-retirement-blank-period.md`(2件、http://www.freenough.com直リンク)
- `sequence-of-returns-risk.md`(2件、freenough.com直リンク)

置換方針:
- `https://freenough-lifecompass.vercel.app/app...` → `/asset-simulator/app...`
- `https://freenough.com/asset-simulator/...` → `/asset-simulator/...`
- `https://www.freenough.com/asset-simulator/...` → `/asset-simulator/...`
- `http://www.freenough.com/asset-simulator/...` → `/asset-simulator/...`
  (httpも対象。プロトコル+ドメイン部分をまとめて削除し、`/asset-simulator`
  以降のパス・クエリパラメータ・アンカーはそのまま維持する)

**重要**:クエリパラメータ(`?utm_source=...`等)を破損させないこと。ドメイン
部分の文字列だけを取り除き、パス以降は一切変更しない。前回の`/simulator→/app`
修正時と同様、URL文字列の部分置換で対応すること。

### 2. `applyBasePathToHtml()`から不要ロジックを削除

`src/lib/blog.ts`内の以下2行を削除する:

```js
.replace(/https:\/\/freenough-lifecompass\.vercel\.app\//g, `${SITE_URL}/`)
.split(`${SITE_URL}/simulator`).join(`${SITE_URL}/app`)
```

削除後、関数は以下の1行(既存)のみでbasePath付与を担う想定:

```js
.replace(/href="\/(?!\/|asset-simulator\b)/g, `href="${BASE_PATH}/`)
```

(画像`src`属性への処理行は維持。念のため関数全体を確認し、削除対象の2行
以外は変更しないこと)

### 3. 動作確認
- ローカルビルドまたは該当関数の単体実行で、13記事26箇所のリンクが
  すべて`/asset-simulator/...`形式でレンダリングされることを確認
- `full-verify.js`実行(全PASSを確認)
- `tsc --noEmit`でエラーがないことを確認
- 可能であれば、置換後の記事のうち数件を実際にHTML出力してリンクが
  正しい形式になっていることを目視確認

## スコープ外(やらないこと)
- 対象13記事以外の記事の変更
- `Footer.tsx`の外部リンク(意図的なハードコード、変更不要)
- `SITE_URL`定数自体の変更
- Git commit/push(承認は別途プランニングチャットで行う)

## 完了報告に含めるべき事項
- 記事ごとの置換件数(該当なしがあれば明記、想定26件との一致確認)
- 置換前後のURL例(2〜3件、utm付きクエリを含むものを1件は含めること)
- `applyBasePathToHtml()`の削除後の最終コード(全文)
- `full-verify.js`の結果(PASS件数)
- `tsc --noEmit`の結果
- 地の文・クエリパラメータへの意図しない影響がなかったことの確認結果
