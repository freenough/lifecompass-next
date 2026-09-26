# 指示書テンプレート（Claude Code向け：調査・実装）

`docs/fixes/active/` に置く調査指示書・実装指示書の雛形。必要な節だけを残して使う。
「検証環境の安全ルール」の節は、**すべての指示書にそのまま含める**（該当しない項目があっても削らない）。

作成日：2026-09-25（`docs/fixes/done/` の過去の指示書に共通して書かれていた安全ルールをまとめたもの）

---

```markdown
# 調査指示／実装指示：〈件名〉

作成日：YYYY-MM-DD
種別：**調査のみ（コード変更・コミット・push禁止）**／**実装**
配置：`docs/fixes/active/〈フォルダ名〉/〈ファイル名〉.md`
対象リポジトリ：`lifecompass-next`（`freenough-main` を見る場合は**読み取りのみ**と明記）
ブランチ：専用ブランチを作成して作業する（例：`feature/〈件名〉`）。mainへ直接pushしない

---

## 背景

## 開始時の状態

- 開始時・終了時に `git status` と `git branch --show-current` を実行し、出力をそのまま報告に貼る
- 想定する状態：〈例：`main`、未追跡は本指示書（とこのフォルダ）だけ〉。**違う場合は何も触らずに報告して止まる**

## 調査項目／実装内容

## 対象外（今回は行わない）

## 検証環境の安全ルール

（下の「検証環境の安全ルール」の節をそのまま貼る）

## 確認

## コミットとPreview

- コミットはファイルを個別に指定する（`git add -A`・`git add .` は禁止）
- 専用ブランチをpushし、PreviewのURLを報告する。**mainへのマージはしない**（KENZOがPreviewを確認してから行う）
- スクリーンショット・実測値は `docs/fixes/active/〈フォルダ名〉/` に置き、コミットしない

## 完了報告の形式

- 事実（コマンドの出力・実測値から直接言えること）と所見（推測・提案）を分けて書く
- 根拠（ファイル:行、実行したコマンドと出力、スクリーンショット）を付ける。根拠のない「問題なし」「該当なし」は書かない
- 開始時・終了時の `git status`
```

---

## 検証環境の安全ルール

### 開始時・終了時の状態

- 開始時・終了時に `git status` と `git branch --show-current` を実行し、出力をそのまま報告に貼る
- 開始時に想定外の未commitの変更・未追跡ファイルがあった場合は、**中身に触れず**、ファイル名だけを報告して止まる（`git stash`・`git restore`・`git add` などで片付けない）
- 調査のみの指示書では、既存ファイルの変更・コミット・pushをしない。作ってよいのは、指示書が置かれたフォルダ内の報告書・実測値・スクリーンショットだけ

### 通信の遮断

- ローカルでPlaywright等を使って表示・計測するときは、GA4・AdSenseへの通信を必ず遮断する（`googletagmanager.com`・`google-analytics.com`・`googlesyndication.com`・`doubleclick.net` など）
- **クリックを自動操作するテスト（Playwright等）では、localhost以外のすべてのドメインへの通信を遮断する（許可リスト方式。許可リストの外はすべてabortし、遮断したURLをログに残す）。Google系ドメインだけの遮断では不十分。外部リンク・新しいタブの挙動を確かめたいときも、実際には外部へ出さず、href・targetや遮断したリクエストのURLで判定する。**（2026-09-25、アフィリエイトリンクを誤ってクリックし、本番の外部サイトにクリックが1件送られた件の再発防止）

### プロセス（devサーバー）

- devサーバーを停止するときは、ポートからPIDを特定し、そのPIDだけを個別に停止する。`taskkill /F /IM node.exe` のような全プロセス一括終了コマンドは**使用禁止**
- **Claude Codeが起動していないプロセス（KENZOが起動したdevサーバーなど）は止めない**。止める必要があるときはKENZOに依頼する

### ファイル・データ

- `localStorage.clear()` などの破壊的な操作は行わない。どうしても必要な場合は、対象のオリジンが検証専用であることを確認し、実施前に報告する。判別できなければ操作せずにKENZOに確認する
- `tsc --noEmit`・`npm run build`・devサーバーの起動で `tsconfig.tsbuildinfo`・`next-env.d.ts` が書き換わったら、`git restore` で元に戻す（戻したファイル名を報告する）
- `docs/fixes/active/` フォルダ自体と `.gitkeep` には触れない（処理済みの指示書を `done/` へ移したあとも、`active/` と `.gitkeep` が残っていることを確認する）
- 新しいverifyスクリプトでTypeScriptを読み込むときは、`require('./lib/registerTsNode')`を使う。`ts-node`を直接登録しない（登録が重なると`full-verify.js`のメモリが膨らむため。`verify-ts-node-register.js`がチェックする）
- ロックファイル（`simulate.ts`・`analyze.ts`・`montecarlo.ts`・`types.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`・`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`）は変更しない。変更が必要な場合は、指示書で「管理された例外」として明示されたときだけ、指定された範囲に限る

### Git

- 作業は専用ブランチで行う。mainのままでの変更、mainへの直接pushはしない
- コミットはファイルを個別に指定する（`git add -A`・`git add .` は禁止）
- mainへのマージはKENZOが行う
