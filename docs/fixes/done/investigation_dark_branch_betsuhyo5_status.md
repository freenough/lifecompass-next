# 調査指示：未マージブランチ `feature/lp-asset-dark-experiment` と `docs/fixes/active/betsuhyo5-extraction/` の現状確認

作成日：2026-09-24
種別：**調査のみ（コード・ファイル・ブランチへの変更は一切禁止）**
対象リポジトリ：`lifecompass-next`

---

## 背景

`lifecompass-next` に、扱いが決まっていないものが2つ残っている。

- **A. 未マージのブランチ `feature/lp-asset-dark-experiment`**：残すか削除するかを判断したい
- **B. `docs/fixes/active/betsuhyo5-extraction/` フォルダ**：以前からGit管理下にある。完了済みなら `done/` へ移すか判断したい

判断はこのチャット側とKENZOで行う。Claude Codeは、判断に必要な事実を集めて報告するだけにとどめること。

---

## 0. 開始時・終了時の状態確認（必須）

調査の**開始時と終了時の両方**で、次を実行し、出力をそのまま報告に貼ること。

```
git status
git branch --show-current
```

- 開始時に未commitの変更があった場合は、**中身に触れず**、ファイル名だけを報告すること（`git stash`・`git restore`・`git add` 等は禁止）
- 終了時の出力が開始時と完全に一致していることを確認すること

リモートの最新状態を取るために `git fetch origin` は実行してよい（`--prune` は付けない）。

---

## A. `feature/lp-asset-dark-experiment` の調査

**ブランチを切り替えずに**、参照（ref）を指定するgitコマンドだけで調べること。`git switch`・`git checkout` は使わない。

### A-1. 基本情報

1. ブランチの存在場所：ローカルのみか、リモート（`origin`）にもあるか
   - `git branch -a --list "*lp-asset-dark-experiment*"`
   - `git ls-remote --heads origin feature/lp-asset-dark-experiment`
2. ローカルとリモートで先頭コミットが一致しているか（両方ある場合）
3. 分岐点：`git merge-base main feature/lp-asset-dark-experiment` のコミットハッシュ・日付・メッセージ
4. ブランチ側だけにあるコミットの一覧（日付・作者付き）
   - `git log main..feature/lp-asset-dark-experiment --format="%h %ad %an %s" --date=short`
5. 分岐後にmainが進んだコミット数
   - `git rev-list --count feature/lp-asset-dark-experiment..main`

### A-2. 変更内容

1. ブランチで変更されたファイルの一覧と行数
   - `git diff --stat main...feature/lp-asset-dark-experiment`（**ドット3つ**：分岐点からのブランチ側の変更だけを見る）
2. 変更ファイルの中に、次のロックファイルが含まれていないか
   - `simulate.ts`・`analyze.ts`・`montecarlo.ts`・`types.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`・`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`
3. 変更内容の要約：ファイルごとに、何を変えているかを2〜3行で説明する（「LPの資産ブロックの背景をダーク系に変更」等）。判断の根拠として、主要な差分の抜粋を添えること
4. コミットメッセージや差分から読み取れる「この実験の目的」

### A-3. mainとの重複・衝突

1. ブランチのコミットがmainに取り込み済みかどうか
   - `git cherry -v main feature/lp-asset-dark-experiment`（`-` は取り込み済み、`+` は未取り込み）
2. 変更されたファイルのうち、**分岐後にmain側でも変更されたもの**の一覧
   - `git diff --name-only $(git merge-base main feature/lp-asset-dark-experiment) main` と A-2 の一覧を突き合わせる
3. 今マージした場合に衝突するかどうかの見込み
   - `git merge-tree --write-tree main feature/lp-asset-dark-experiment` の結果（衝突の有無と、衝突するファイル名）
   - このコマンドは作業ツリーもブランチも変更しない。gitのバージョンが古く `--write-tree` が使えない場合は、実行せずにその旨を報告すること（代わりの方法で実際にマージを試すことは禁止）

### A-4. 関連資料

- `docs/` 配下（`docs/fixes/done/` を含む）で、このブランチや「dark」「ダーク」に関する指示書・メモがあるか
  - `git grep -n -i -E "lp-asset-dark|dark-experiment|ダーク" -- docs/`
- 見つかった場合は、ファイル名と該当箇所を報告すること

---

## B. `docs/fixes/active/betsuhyo5-extraction/` の調査

### B-1. フォルダの中身

1. フォルダ内の全ファイル一覧（サイズ・拡張子付き。サブフォルダも含む）
2. 各ファイルが次のどれにあたるか：指示書／調査結果・完了報告／データ（CSV・JSON・PDF・画像等）／スクリプト／その他
3. Git管理の状態
   - `git ls-files docs/fixes/active/betsuhyo5-extraction/`（管理下のファイル）
   - `git status --ignored docs/fixes/active/betsuhyo5-extraction/`（管理外・無視されているファイルがあるか）

### B-2. 経緯

1. このフォルダに関係するコミットの一覧
   - `git log --format="%h %ad %s" --date=short -- docs/fixes/active/betsuhyo5-extraction/`
2. 最初に追加されたコミットと、最後に変更されたコミット
3. 各指示書について、完了しているかどうか
   - 指示書の中に「完了」「未完了」等の記載があるか
   - 同じ件名の完了報告・結果ファイルがあるか
   - 指示書で作るように指示されている成果物（スクリプト・データ・コンポーネント等）が、mainに実在するか
     - `git grep -n -i -E "betsuhyo5|別表5|別表五"`（フォルダ自身は除いて検索する）

### B-3. 取り扱いに注意が必要な内容の有無

別表五（法人税申告書の別表）に関する資料のため、**実在の個人・法人の数値や情報が含まれていないか**を確認すること。

- 含まれている可能性があるファイルがあれば、**ファイル名と「実データらしき数値・名称を含む」という事実だけ**を報告する
- **中身の数値や名称を報告に書き写さないこと**
- サンプル・架空のデータと判断できる場合は、その根拠（「架空の会社名」「フィクスチャとして作成」等）を添えること

### B-4. `active/` に残っている理由の推測

B-1〜B-3の事実から、次のどれに近いかを所見として述べること（事実と所見は分けて書く）。

- 完了済みだが `done/` への移動漏れ
- 作業途中で止まっている
- 指示書ではなく参照用の資料として、意図的に置かれている
- 判断できない（不足している情報を明記する）

---

## 禁止事項

- `git switch`・`git checkout`・`git merge`・`git rebase`・`git cherry-pick`・`git reset`・`git stash`
- ブランチの削除・作成・名前変更（ローカル・リモートとも）
- ファイル・フォルダの移動・削除・編集・作成（`mv`・`rm`・`rmdir` を含む。`docs/fixes/active/` 自体と `.gitkeep` には絶対に触れない）
- `git add`・`git commit`・`git push`
- `tsc`・`npm run build`・devサーバーの起動（`tsconfig.tsbuildinfo` が書き換わるのを避けるため。今回の調査では不要）
- ブラウザでの確認（今回の調査では不要。万一行う場合は、GA4・AdSenseへの通信を遮断すること）
- **本指示書自体も `done/` へ移動しないこと**。移動はKENZOの指示を受けてから行う

---

## 完了報告の形式

- 各項目について、**実行したコマンドとその出力をそのまま**貼ること。要約だけの報告は受け付けない
- 事実（コマンドの出力から直接言えること）と所見（推測・おすすめ）を、見出しを分けて書くこと
- 最後に、0節の終了時の `git status` の出力を貼り、作業ツリーが開始時と変わっていないことを示すこと
