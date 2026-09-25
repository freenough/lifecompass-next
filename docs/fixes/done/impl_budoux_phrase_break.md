# 実装指示：BudouXのParserと日本語モデルを取り込み、一人法人LPの改行に適用する

作成日：2026-09-25
種別：**実装**
対象リポジトリ：`lifecompass-next`
関連：`experiment_budoux_hitori_hojin.md`（試験導入。npmパッケージ版で効果を確認済み）

---

## 背景と方針

試験導入で、BudouXを使うと WebKit と Chromium の改行位置が4幅すべてで一致し、iPhoneで目立っていた1〜2文字の行が減ることを確認した。ブラウザ向けのJSも増えなかった。

一方、npmパッケージ `budoux@0.9.2` は、実行時に使わない依存（`google-artifactregistry-auth` ほか）を含め、61パッケージ・約14MBを追加する。そこで今回は、**BudouX公式のParserとモデルという構成を参考に、DOM処理と不要な依存を除いた最小構成をリポジトリ内に持つ**。

- npmパッケージは**追加しない**（`package.json`・`package-lock.json` の差分は0）
- 取り込むのは、文節区切りに必要な **Parser（`parse` の処理）と日本語モデル** だけ。`HTMLProcessor`・Webコンポーネント・CLI・DOM操作・`linkedom` に関わる部分は取り込まない
- ライセンス（Apache-2.0）と著作権表示を維持し、取得元のバージョンを記録する
- 「Google公式推奨の方式」とは表現しない。ドキュメントやコメントでは「BudouX公式のParser＋モデルの構成を参考にした最小構成」と書く

---

## 0. 作業前

1. `git status` と `git branch --show-current` を報告に貼る
   - 想定：`experiment/budoux-hitori-hojin` にいる。未追跡は `experiment_budoux_hitori_hojin.md`・`budoux-hitori-hojin/`（試験時の実測）・本指示書の3件
   - それ以外の未commitの変更があれば、作業を始めずにファイル名だけ報告して止まる
2. mainへ移り、新しいブランチを作る
   ```
   git switch main
   git switch -c feature/budoux-phrase-break
   ```
   - 試験ブランチ `experiment/budoux-hitori-hojin` は**削除しない**（マージ後にKENZOが削除する）
3. **`npm ci` を実行する**。試験ブランチで入れた `node_modules/budoux` が残っていると、誤って `import 'budoux'` を書いてもローカルでは動いてしまい、Vercelで初めて失敗するため
   - 実行後、`node_modules/budoux` が存在しないことを確認して報告する

---

## 1. 取り込むもの（`src/lib/budoux/`）

### 1-1. 取得元

- **`budoux@0.9.2`**（試験導入で検証したのと同じ版）の JavaScript 版ソース
- 取得方法は、GitHub の `google/budoux` のタグ `v0.9.2` から該当ファイルを参照する方法、または**リポジトリ外の一時フォルダ**で `npm pack budoux@0.9.2` して展開する方法のどちらでもよい。**リポジトリ内に `npm install` しないこと**
- 実際に参照したファイルのパスと、タグのコミットハッシュ（分かる場合）を記録する

### 1-2. ファイル構成（名前は目安。役割が分かれていればよい）

```
src/lib/budoux/
  parser.ts            … Parser（parse の処理だけ）
  model-ja.ts          … 日本語モデル（公式のJSONをそのまま移したもの）
  protectedTerms.ts    … 区切らない用語のリスト（2節）
  index.ts             … 外部に公開する関数（例：segmentJapanese(text): string[]）
  LICENSE              … Apache License 2.0 の全文
  README.md            … 取得元・変更点・更新手順（1-4）
```

### 1-3. 各ファイルの扱い

- `parser.ts`
  - 公式の Parser の `parse` に相当する処理だけを移す。スコア計算・しきい値など、**区切り方の結果に関わる処理は変えない**
  - 先頭に、元ファイルの著作権表示とApache-2.0のライセンス通知をそのまま残し、その下に「FREENOUGHによる変更：HTMLProcessor・DOM操作に関わる部分を削除、TypeScriptの型を調整」等、**加えた変更を具体的に書く**
- `model-ja.ts`
  - 公式の日本語モデルの内容を**1文字も変えずに**移す（データの形式を合わせるための `export` 文などは除く）
  - 先頭に著作権表示と取得元を書く
- **サーバー専用にする**：`index.ts`（または `parser.ts`）の先頭に `import 'server-only'` を入れ、クライアントコンポーネントからimportされた時点でビルドエラーになるようにする
  - `server-only` が**新しいパッケージの追加なしに**解決できるかを先に確認すること。追加が必要な場合は、**入れずに止めて報告する**

### 1-4. `README.md` に書くこと

- 取得元（`google/budoux`、バージョン `0.9.2`、参照したファイル）と取得日
- 何を取り込み、何を取り込まなかったか
- 加えた変更の一覧
- 将来BudouXを更新するときの手順（公式の新しい版の Parser とモデルを比べ、差分を反映し、3節の検証を再実行する）
- 区切らない用語リストの運用ルール（2節）

---

## 2. 区切らない用語リスト

`protectedTerms.ts` に、次の**2語だけ**を定義する。

```
一人法人
法人
```

- 処理：BudouXで区切った結果について、**区切りの位置が上記の用語の途中にある場合だけ、その区切りを取り除く**（隣り合う文節を結合する）
  - 用語の直前・直後の区切りはそのまま残す（例：「法人に／残す？」の「法人に」の前は区切ってよい）
  - 長い用語から先に判定する（「一人法人」の中の「法人」を重ねて処理しない）
- 文字列そのものは変えない（結合するだけ）
- ファイルの先頭に、次の運用ルールをコメントで書く
  - **実測で「語の途中での区切り」が確認された語だけを追加する。推測では追加しない**
  - 追加したら、3節の検証スクリプトにその語のケースを足す

期待する結果の例（試験導入の区切りとの比較）：

| 試験導入（npm版） | 今回 |
|---|---|
| 一人／法／人って、／そもそも／何？ | 一人法人って、／そもそも／何？ |
| 一人／法人の／基本と、／… | 一人法人の／基本と、／… |
| 一人／法人を／考える／前に、／… | 一人法人を／考える／前に、／… |
| 法人に／残す？／個人に／移す？ | （変化なし） |

---

## 3. 検証スクリプト

既存の `scripts/verify-*.js` の書き方・実行方法に合わせて、`PhraseBreak` 用の検証スクリプトを追加する（名前は任せる。例：`scripts/verify-phrase-break.js`）。`full-verify.js` から呼ばれる仕組みがあれば、そこにも加える。

確認する内容：

1. **npm版との一致**：試験導入の完了報告にある区切り（記事8件のタイトル・説明文、下部CTAの2文。計18文）を期待値として持ち、**用語リストで結合される箇所を除いて**、今回の実装の結果が完全に一致すること
2. **用語リスト**：「一人法人」「法人」の途中に区切りが入らないこと（上の表の例を含む）
3. **文字列の保存**：すべてのケースで、区切った結果を連結すると元の文字列に一致すること
4. 空文字・英数字だけの文字列・記号だけの文字列で例外が出ないこと

---

## 4. `PhraseBreak` と適用箇所

- 試験ブランチの `src/components/text/PhraseBreak.tsx` と同じ仕様で作る（`git show experiment/budoux-hitori-hojin:src/components/text/PhraseBreak.tsx` を参照してよい）
  - 受け取るのは**文字列だけ**（`text` プロパティ）。文節の間に `<wbr />` を挟んで描画する
  - `dangerouslySetInnerHTML` は使わない
  - 区切りには 1節・2節の `src/lib/budoux/` を使う。**`budoux` パッケージをimportしないこと**
- 適用箇所とCSSは、試験導入と同じ
  - 記事の行のタイトル・説明文（`HitoriHojinArticleList.tsx`）、下部CTAの説明文2文（`page.tsx`。間の `<br />` はそのまま）
  - `[line-break:strict]`・`[word-break:keep-all]`・`[overflow-wrap:anywhere]`。記事の行の `[word-break:auto-phrase]` は外す
- それ以外の箇所には適用しない

---

## 5. 確認

**GA4・AdSenseへの通信を遮断したうえで**確認する。

1. **依存関係**：`git diff main -- package.json package-lock.json` が空であること。`git grep -n "from 'budoux'\|from \"budoux\"\|require('budoux')"` が0件であること
2. **ブラウザ向けのJS**：`npm run build` を実行し、`.next/static/` にモデルやParserが含まれていないこと（試験導入と同じ方法で確認）。一人法人LPのFirst Load JSが、mainのビルドと同じであること
3. **改行の実測**：WebKitとChromiumで、**320・375・768・1440px** の記事の行と下部CTAを測り、試験導入の結果と並べる
   - WebKitとChromiumの改行位置が一致していること
   - 1〜2文字の行、3〜4文字の行の一覧
   - 「一人／」「法／」で改行されている箇所がないこと
4. `textContent`・リンク・`aria` の扱いが、mainと同じであること
5. `npx tsc --noEmit` がエラーなく終わること。3節のスクリプトを含む検証スクリプトがすべてPASSすること
   - `full-verify.js` のモンテカルロのケースは、乱数のシードが固定されていないため、まれに許容範囲を外れることが分かっている。FAILした場合は**そのケースだけ再実行し**、結果を報告する（修正はしない）
6. `tsconfig.tsbuildinfo`・`next-env.d.ts` が書き換わっていたら `git restore` で戻す

実測値とスクリーンショットは `docs/fixes/active/budoux-phrase-break/` に置き、コミットしない。

---

## 6. コミットとPreview

コミットはファイルを個別に指定する（`git add -A`・`git add .` は禁止）。

1. `BudouXのParserと日本語モデルを最小構成で取り込み（v0.9.2、Apache-2.0）`：`src/lib/budoux/` 一式
2. `PhraseBreak を追加し、一人法人LPの記事の行と下部CTAに適用`
3. `PhraseBreak の検証スクリプトを追加`
4. `処理済み指示書を done/ へ移動`：`experiment_budoux_hitori_hojin.md` と本指示書

- `feature/budoux-phrase-break` をpushし、PreviewのURLを報告する
- **mainへのマージはしない**
- `docs/fixes/active/budoux-hitori-hojin/`（試験時の実測）は、今回の比較に使ったあと、**削除してよい**

---

## 完了報告の形式

- 1節：取得元（バージョン・参照したファイル・コミットハッシュ）と、取り込んだ部分・除いた部分
- `server-only` の扱い
- 2節：用語リストによって結合された箇所の一覧
- 3節：検証スクリプトの結果
- 5節：確認結果（試験導入との比較を含む）
- `git log --oneline main..feature/budoux-phrase-break`、最終の `git status`、PreviewのURL
