# src/lib/budoux

和文を文節ごとに区切るための、BudouX公式のParser＋モデルの構成を参考にした最小構成。
一人法人LPの記事の行・下部CTAで、`<wbr />` を文節の区切りに入れるために使う（`src/components/text/PhraseBreak.tsx`）。
npmパッケージ `budoux` は使わない（実行時に使わない依存を含め、61パッケージ・約14MBが追加されるため。
`docs/fixes/done/experiment_budoux_hitori_hojin.md` 参照）。

## 取得元

- リポジトリ：`google/budoux`
- バージョン：`0.9.2`（タグ `v0.9.2` = コミット `e00fd7f9e2b5b39b6243fbab072d76c6a6e1f41b`）
- 取得日：2026-09-25
- 参照したファイル
  - `javascript/src/parser.ts` → `parser.ts`
  - `budoux/models/ja.json` → `model-ja.ts`
  - `LICENSE` → `LICENSE`
- npm `budoux@0.9.2`（リポジトリ外の一時フォルダで `npm pack` して展開）の `src/parser.ts`・`src/data/models/ja.ts` と
  同一内容であることを確認済み

## 取り込んだもの・取り込まなかったもの

| 取り込んだ | 取り込まなかった |
|---|---|
| `Parser`（`parse`・`parseBoundaries`） | `HTMLProcessor`・`HTMLProcessingParser`（`html_processor.ts`） |
| 日本語モデル（`ja.json`） | DOM操作（`dom.ts`・`dom-browser.ts`）、`linkedom` への依存 |
| Apache License 2.0 の全文 | Webコンポーネント・CLI、日本語以外のモデル、`ja_knbc` モデル |

## 加えた変更

- `parser.ts`：配置場所の変更と、先頭のコメント（取得元・変更点）の追加だけ。`Parser` クラスのコードは無変更
- `model-ja.ts`：`ja.json` の内容を1文字も変えずに、`export const model = …` の形にした
- 追加したファイル
  - `protectedTerms.ts`：区切らない用語のリスト
  - `segment.ts`：`Parser` の結果から、用語の途中にある区切りだけを取り除く処理（`segmentJapanese`）
  - `index.ts`：外部に公開する入口。`import 'server-only'` で、クライアントコンポーネントからのimportをビルドエラーにする
    （`server-only` はパッケージを追加せず、Next.jsのビルド時エイリアスで解決される）

アプリのコードからは `@/lib/budoux`（`index.ts`）経由で使うこと。`segment.ts` を直接importするのは、
Next.jsのビルドを通らない検証スクリプト（`scripts/verify-phrase-break.js`）だけ。

## 区切らない用語リスト（`protectedTerms.ts`）の運用ルール

- 実測で「語の途中での区切り」が確認された語だけを追加する。推測では追加しない
- 追加したら、`scripts/verify-phrase-break.js` にその語のケースを足す
- 区切りの位置が用語の途中にある場合だけ、その区切りを取り除く。用語の直前・直後の区切りは残す。長い用語から先に判定する

## BudouXを更新するときの手順

1. 公式の新しい版の `javascript/src/parser.ts` と `budoux/models/ja.json` を取得する（リポジトリ内に `npm install` しない）
2. `parser.ts` の `Parser` クラスのコードと、モデルの内容を、このフォルダの版と比べる
3. 差分を反映する（`parser.ts` はコード部分だけを差し替え、先頭のコメントの取得元・コミットを更新する。
   モデルは中身を1文字も変えずに差し替える）
4. このREADMEの「取得元」を更新する
5. `node scripts/verify-phrase-break.js` を実行する。npm版との一致の期待値（区切り）は、新しい版の
   公式パッケージの結果に合わせて見直す
6. WebKitとChromiumで、一人法人LPの記事の行と下部CTAの改行を実測し直す
