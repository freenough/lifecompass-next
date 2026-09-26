# 修正指示：verifyスクリプトの ts-node 登録を1回にまとめる

作成日：2026-09-26
種別：**実装（検証スクリプトの修正。アプリ本体・計算ロジックは変更しない）**
対象リポジトリ：`lifecompass-next`
関連：`docs/fixes/done/investigation_full_verify_memory.md`（調査・完了済み）
起点テンプレート：`docs/fixes/INSTRUCTION_TEMPLATE.md`
作業ブランチ：`fix/verify-ts-node-register-once`（最新のmainから作成）

---

## 背景

調査の結果、`full-verify.js`が約4.6GBのメモリを使う原因は、ts-nodeの登録が1回の実行で24回重なっていることだと分かった（full-verify本体で1回、各verifyスクリプトの冒頭で23回）。ts-nodeは登録のたびに前のフックを包むため、後から読み込む.tsファイルほど何重にもコンパイルされ、その結果がキャッシュに残り続ける。登録を1回にする実験では、通常のヒープ上限で全件PASS、最大メモリ279MB、所要3秒になった。

KENZOとの設計チャットで、次の方針に確定した。

- ts-nodeの登録処理を共通ファイル1つにまとめ、すべてのスクリプトからそれを使う（調査報告の案C。中身は案Aの「登録済みなら登録しない」判定）
- 再発防止として、ts-nodeを直接登録しているスクリプトがあればFAILにするチェックを追加する

---

## 1. 共通の登録処理を作る

- 新規ファイル`scripts/lib/registerTsNode.js`を作る
  - `process[Symbol.for('ts-node.register.instance')]`で登録済みかを判定し、未登録のときだけ登録する
  - 登録のオプションは、今の各スクリプトと同じにする（`project`は`tsconfig.json`、`transpileOnly: true`）。`tsconfig.json`のパスは、このファイルの位置から正しく解決すること
- 既存の`scripts/lib/seededShocks.js`と同じ置き場所・書き方の慣習に合わせること

## 2. 既存のスクリプトを共通処理に置き換える

- `scripts/`配下で`require('ts-node').register(...)`を直接呼んでいるファイルを**すべて**洗い出し、冒頭の登録処理を`require('./lib/registerTsNode')`（相対パスは各ファイルの位置に合わせる）に置き換える
  - 調査では、full-verify本体と、full-verifyから読み込まれる23本のverifyスクリプトが対象と分かっている。full-verifyから読み込まれないスクリプトにも同じ書き方があれば、それも対象に含める
- 置き換え以外の変更はしないこと（検証の中身・期待値・出力の文言・順番は一切変えない）

## 3. 再発防止のチェックを追加する

- 新規`scripts/verify-ts-node-register.js`を作り、`full-verify.js`に組み込む
  - `scripts/`配下のすべての.jsファイルを調べ、`scripts/lib/registerTsNode.js`以外で`require('ts-node').register`（またはそれに準ずる直接登録）を呼んでいるファイルがあればFAILにする
  - 既存のセクションと同じ形式でPASS／FAILを出し、FAILのときは`process.exitCode`に反映する（`verify-internal-utm.js`の組み込み方に合わせる）
- `docs/fixes/INSTRUCTION_TEMPLATE.md`に、次の1項目を追加する
  - 新しいverifyスクリプトでTypeScriptを読み込むときは、`require('./lib/registerTsNode')`を使う。`ts-node`を直接登録しない

---

## 変更してはいけないもの

- ロックファイル、アプリ本体（`src/`配下）のファイル
- 各verifyスクリプトの検証内容・期待値・出力

---

## 検証

- **通常のヒープ上限で**`node scripts/full-verify.js`を実行し、次を報告する
  - 終了コード
  - ログ全体の[PASS]／[FAIL]件数。変更前（mainで上限8GBで実行）の1,126件に、3で追加したチェックの件数を足した数になっていること
  - プロセス全体の最大メモリ使用量と所要時間
- **出力が変わっていないこと**：mainで上限8GBで実行したログと、変更後のログを比べ、差分が「3で追加したチェックの出力」と「乱数を使う参考値（シードなしのモンテカルロ）の数値」だけであることを示す。それ以外の差分があれば、その内容を報告する
- **単独実行**：置き換えた各verifyスクリプトを、それぞれ単独で`node scripts/verify-*.js`として実行し、今までどおり動くこと（終了コードとPASS／FAIL件数）を一覧で報告する
- **チェックが効くこと**：一時的に1本のスクリプトへ`require('ts-node').register`を書き戻し、3のチェックがFAILになることを確かめてから、元に戻す（戻した後の`git diff`でその変更が残っていないことを示す）
- `package.json`のscriptsやCIの設定など、verifyスクリプトを呼んでいる場所がほかにあれば一覧で報告する
- `npm run build`が通ること
- `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す

---

## 完了報告

- 変更・新規作成したファイルの一覧と`git diff --stat`
- 1〜3の実装のコード抜粋（2は代表の1ファイル分でよい。全ファイルの置き換えが同じ形であることは一覧で示す）
- 上記の検証結果
- 終了時の`git status`
- ローカルのファイルパスを含めないこと
- **コミット・push・mainへのマージはしないこと。** ブランチ上の未コミットの変更のまま止めて報告すること
- 処理後、この指示書は`docs/fixes/done/`へ移動してよい。`active/`フォルダ自体は削除しない
