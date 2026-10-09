# 指示書：フォントのpreloadの`<link>`がHTMLにない理由を調べる（第1段階・読むだけ）

対象：lifecompass-next（先に）、freenough-main（同じ設定かの確認のみ）
引き継ぎ資料：`handoff_cls_and_320px_complete.md` 4節の20番
段階：**第1段階（調査のみ）**。次の段階（実装）は、この報告を見てから別の指示書で決める。

---

## 0. 守ること

- **コードの変更、commit、push、ブランチ作成は一切しない。** 読む・測る・報告するだけ。
- 一時的な検証用ファイルを作る場合は、リポジトリの外（`/tmp`など）に置き、終わったら消す。`git status`が作業前と同じであることを最後に確かめる。
- 測定は開発サーバーではなく、`next build`→`next start`（本番ビルド）と、本番URLで行う。
- 本番の測定は、幅ごと・項目ごとに別のプロセスで順番に走らせる（メモリ不足でシェルが止まった前例がある）。終わったら`ps`で動きっぱなしの`next start`がないか確かめる。
- freenough-mainは`AGENTS.md`により、**Nextの挙動を判断する前に`node_modules/next/dist/docs/`の該当部分を読む**。

## 1. 目的

`src/app/layout.tsx:12-16`の`next/font`（Noto Sans JP、`display:'swap'`、`subsets:['latin']`）について、

1. preloadの`<link rel="preload" as="font">`が、なぜHTMLに出ていないのか
2. フォントファイルは、いつ・どの順で取得されているのか
3. これが、CLS（資産シミュレーターLP 375pxで0.012〜0.026、1024pxで0.004、一人法人LP 1024pxのローカル0.154）にどう関わるのか

を、事実と推定を分けて報告する。**見た目は変えない方針。**

## 2. 調べること

### 2-1. 設定の事実
- `layout.tsx`のフォント設定を、そのまま報告する（`weight`、`variable`、`preload`、`adjustFontFallback`、`display`、`subsets`の有無）。
- `next.config.*`の`basePath`・`assetPrefix`の値。
- lifecompass-nextのNextのバージョンと、`next/font/google`の挙動の根拠となるソース（`node_modules/next/dist/compiled/@next/font/`や`node_modules/next/dist/build/`内の該当箇所）。読んだファイルとおおよその行を挙げる。

### 2-2. ビルド成果物の事実
- `next build`のあと、`.next/static/media/`のwoff2ファイル（ファイル名、サイズ）。
- 生成されたCSSの`@font-face`（`src`、`unicode-range`、`font-display`）。どのファイルがlatinか。
- `.next/server/next-font-manifest.json`（あれば）の中身。preload対象に何が入っているか、**ページごと**に。
- 代わりのフォント（大きさを合わせたArial）の`@font-face`（`size-adjust`など）。

### 2-3. HTMLの事実（ローカルの`next start`と、本番）
- 3ページ（`/asset-simulator`、`/asset-simulator`配下のほか1ページ、`/hitori-hojin`はfreenough-mainではなく本番URLで）について、**サーバーが返す生のHTML**（`curl`。JS実行前）で次を探す：
  - `<link rel="preload" ... as="font">`の有無
  - `<link rel="stylesheet">`と、`@font-face`が入るCSSのどれか
  - `Link:`レスポンスヘッダー（preloadのヒントが入っていないか）
- ブラウザ（Playwrightなど）で、フォントのリクエストの**開始時刻、完了時刻、イニシエーター**（CSSか、preloadか）を記録する。FCP・LCPの時刻と並べる。ローカルと本番の両方で、各3回。
  - Noto Sans JPのwoff2が、そもそも**ページで取得されているのか**。取得されていないなら、画面の和文は何で描かれているのか（latinのsubsetしかないため、和文はOSのフォントのはず。`document.fonts`、Performance、`getComputedStyle`で確かめる）。
  - 取得されているなら、どの文字（latinの数字・英字）のために取得されているか。

### 2-4. 「preloadが出ない」理由の切り分け
次の仮説を、事実で当てはめて「当たり／外れ／判断できない」と書く。**推測と事実は分けて書く。**
- A. `next/font`の仕様で、そのsubsets・ページの条件ではpreload対象にならない（`preload`の既定、subsetの扱い）。
- B. `layout.tsx`のフォントの使い方（`className`をどこに当てているか、`variable`か）のため、ページごとのpreload対象に載らない。
- C. `basePath`（`/asset-simulator`）との組み合わせの問題。
- D. App Routerの仕様で、preloadの`<link>`はHTMLの別の形（ストリーミング後の`<script>`内など）で出る。
- E. その他（調べて分かったもの）。

### 2-5. 21番の推定の確認（余裕があれば）
- 引き継ぎ資料21番に「本番で0になる理由は、フォントの読み込み時機が違うため（推定。未確認）」とある。2-3の時刻の記録から、**ローカルと本番で、フォントの取得・切り替わりの時機がどう違うか**を、数値で示せるなら示す。示せなければ「判断できない」でよい。

## 3. 報告の形

次の順で、短く。

1. **結論（3行以内）**：preloadが出ない理由は何か（確度つき）。
2. **事実の一覧**：2-1〜2-3。表を使ってよい。読んだファイルと行、実行したコマンドを添える。
3. **仮説の判定表**：2-4のA〜E。
4. **CLSとの関係**：フォントのpreloadが出れば、どのずれが減りそうか（推定と書く）。減らない・悪化する可能性も書く。
5. **次の段階の選択肢**（実装はしない）：preloadを出す方法、`display`の変更、`subsets`の追加など。それぞれ「見た目の変化」「全ページへの影響」「リスク」「確かめ方」を1〜2行で。**推奨は1つに絞り、理由を書く。**
6. 後始末：`git status`が作業前と同じこと、動きっぱなしのプロセスがないこと。

## 4. 完了の条件

- 変更ゼロ（`git status`が作業前と同一）。
- 上の報告がそろっている。
- 判断できなかった項目は、「判断できない」と理由を書く（推測で埋めない）。
