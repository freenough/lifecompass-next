# 試験導入指示：BudouXで一人法人LPの和文の改行を改善できるか確かめる

作成日：2026-09-25
種別：**試験導入（専用ブランチで実装・実測まで。mainへのマージは結果を見て判断する）**
対象リポジトリ：`lifecompass-next`
関連：`fix_hitori_hojin_intro_safari.md`（本番反映済み）

---

## 背景

一人法人LPの記事の行と下部CTAで、375pxのときに1〜2文字だけの行（「る？」「い？」「構造」「す。」など）が出ている。WebKitで6か所、Chromiumで2か所。

- `word-break:auto-phrase`（文節での改行）はChrome/Edgeにしかなく、Safariでは効かない
- `text-pretty` はSafariで段落全体の行を短くしてしまうため、外した

そこで、**BudouX**（Googleの文節区切りライブラリ。Chromeの `auto-phrase` の中身と同じ仕組み）を使い、**サーバー側で文節の区切りに `<wbr>` を入れる**方法を試す。ブラウザに関係なく同じ区切り方になるかを確かめるのが目的。

**前提として理解しておくこと**：BudouXが防ぐのは「言葉の途中での改行」であり、短い行をゼロにするものではない。文節の区切りで折り返した結果、「変わる？」のような4文字前後の行が残ることはあり得る。結果はこの観点で評価する。

---

## 0. 作業前

1. `git status` と `git branch --show-current` を報告に貼る
   - 想定：`main`。未追跡は**本指示書だけ**（前回の `docs/fixes/active/hitori-hojin-intro-safari/` が残っていれば、中身を確認せずに削除してよい）
   - それ以外の未commitの変更があれば、作業を始めずにファイル名だけ報告して止まる
2. 作業ブランチを作る
   ```
   git switch -c experiment/budoux-hitori-hojin
   ```
3. **変更前の実測**を取っておく（4節と同じ方法・同じ幅・同じ2エンジンで）

---

## 1. パッケージの追加

1. `budoux` を追加する。バージョンは固定する（`npm install budoux --save-exact`）
2. 次を報告する
   - 追加したバージョン、ライセンス
   - `npm ls budoux` の出力と、budoux が依存しているパッケージの数
   - `node_modules/budoux` のサイズ
3. **budoux 以外の依存関係を追加・更新しないこと**。`package-lock.json` の差分が budoux 関連だけであることを確認する

---

## 2. 実装

### 2-1. 文節区切りのコンポーネント

`src/components/text/` 等に、文字列を受け取って**文節ごとに `<wbr />` を挟んで描画する**小さなコンポーネントを作る（名前は任せる。例：`<PhraseBreak text="…" />`）。

- BudouXの日本語パーサー（`loadDefaultJapaneseParser`）を使う。パーサーはモジュールの読み込み時に1回だけ作る
- **サーバーコンポーネントとして使う**こと（`'use client'` のファイルからimportしない）。BudouXのモデルがブラウザ向けのJSに含まれないようにするため
- 出力は `<wbr />` だけを挟む。文字列そのものは1文字も変えない（`textContent` が元の文字列と一致すること）
- `dangerouslySetInnerHTML` は使わない

### 2-2. 適用する箇所（この3か所だけ）

1. 記事の行のタイトル（`HitoriHojinArticleList.tsx`）
2. 記事の行の説明文（同上）
3. 下部CTAの説明文（`page.tsx`。2文それぞれ。1文目の後の `<br />` はそのまま）

`HitoriHojinArticleList.tsx` がクライアントコンポーネントになっている場合は、**実装せずに止めて報告すること**（構成の変更が必要になるため、判断を仰ぐ）。

### 2-3. CSS

適用した3か所で、次の組み合わせにする。

- `[word-break:keep-all]`（文節の途中では折り返さない。`<wbr>` の位置だけで折り返す）
- `[overflow-wrap:anywhere]`（1つの文節が行に収まらないほど長い場合の保険）
- `[line-break:strict]` は残す
- 記事の行の `[word-break:auto-phrase]` は外す（`keep-all` と役割が重なり、ブラウザごとの差の原因になるため）

**適用しない箇所**：導入文・Hero・見出し（h2・h3）・法人資産ブロック。今回の対象は上の3か所に限る。

---

## 3. 区切り方の確認

BudouXが実際にどこで区切ったかを、次の全件について一覧にする（`／` で区切って示す）。

- 記事8件のタイトル
- 記事8件の説明文
- 下部CTAの2文

そのうえで、**意味の途中で区切られている箇所**（例：「FIRE／って」「維持コ／スト」のような区切り）があれば、所見として挙げる。修正はしない。

---

## 4. 実測

**GA4・AdSenseへの通信を遮断したうえで**、WebKitとChromiumの両方で、**320・375・768・1440px** について測る。

1. 記事の行（タイトル・説明文）と下部CTAの、各行の文字数と右端のx座標
2. **1〜2文字だけの行**の一覧（どの記事の、どの行か）。変更前（0-3）と並べる
3. **3〜4文字の短い行**の一覧（BudouXで増える可能性があるため）
4. WebKitとChromiumで、改行位置が一致しているか（一致しない箇所の一覧）
5. 横スクロールが発生しないこと

---

## 5. 副作用の確認

1. **ブラウザ向けのJSにBudouXが含まれていないこと**
   - `npm run build` を実行し、`.next/static/` 配下のJSにBudouXのモデル（パーサーの定義や、モデルのデータに含まれる特徴的な文字列）が含まれていないことを `grep` 等で確認する
   - ビルド結果の、一人法人LPのページのFirst Load JSのサイズを、変更前（mainでビルドした値）と比べる
2. 記事の行のリンク・`aria` の扱い・キーボード操作が変わっていないこと
3. 描画されたHTMLで、タイトル・説明文の `textContent` が元の文字列と一致すること（`<wbr>` 以外が混ざっていないこと）
4. `npx tsc --noEmit` がエラーなく終わること。既存の検証スクリプトがすべてPASSすること
5. `tsconfig.tsbuildinfo`・`next-env.d.ts` が書き換わっていたら `git restore` で戻す。`.next/` はGit管理外なのでそのままでよい

---

## 6. コミットとPreview

- コミットはファイルを個別に指定する（`git add -A`・`git add .` は禁止）
  1. `budoux を追加`（`package.json`・`package-lock.json`）
  2. `一人法人LP：記事の行と下部CTAの改行にBudouXを試験適用`
- **本指示書は `done/` へ移動しない**（採用・不採用が決まってから移動する）
- `experiment/budoux-hitori-hojin` をpushし、PreviewのURLを報告する
- **mainへのマージはしない**
- スクリーンショットと実測値は `docs/fixes/active/budoux-hitori-hojin/` に置き、コミットしない

---

## 完了報告の形式

- 1節：パッケージの情報
- 3節：区切り方の一覧と、気になる区切りの所見
- 4節：変更前後の比較（1〜2文字の行、3〜4文字の行、WebKitとChromiumの一致）
- 5節：副作用の確認結果（First Load JSの比較を含む）
- 事実と所見を分けて書くこと。所見には「採用する価値があるか」の見立てを含めてよい
- `git log --oneline main..experiment/budoux-hitori-hojin`、最終の `git status`、PreviewのURL
