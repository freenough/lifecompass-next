# 実装指示：`betsuhyo5-extraction/` を `done/` へ移し、参照パスを書き換える

作成日：2026-09-24
種別：**実装（ファイル移動＋コメント・文字列のパス書き換えのみ。動作の変更なし）**
対象リポジトリ：`lifecompass-next`
関連：`investigation_dark_branch_betsuhyo5_status.md`（調査済み。本指示で `done/` へ移す）

---

## 背景

調査の結果、`docs/fixes/active/betsuhyo5-extraction/` は作業が完了していて、`done/` への移し忘れと判断した。元の指示書・後続の実装指示書・完了報告はすべて `done/` にあり、成果は `src/lib/tax/residentTaxTiming.ts` に取り込まれている。

ただし、ソースのコメントと検証スクリプトがこのフォルダのパスを直接書いているため、移動と同時に参照も書き換える。

---

## 0. 作業前の確認

1. 開始時の `git status` と `git branch --show-current` を報告に貼る
   - 想定：`main`。未追跡ファイルは `investigation_dark_branch_betsuhyo5_status.md` と本指示書の2件
   - **それ以外の未commitの変更があれば、作業を始めずにファイル名だけ報告して止まること**
2. 移動先 `docs/fixes/done/betsuhyo5-extraction/` が**まだ存在しない**ことを確認する。存在する場合は作業を止めて報告する
3. 移動前の `raw-data/` のファイル数とサイズを記録する（`ls -la` 等）。調査時点では11ファイル、`shotokuzei_raw.xml` が 16,443,561 バイト

---

## 1. 作業ブランチ

```
git switch -c chore/betsuhyo5-to-done
```

見た目の変更はないので、ブランチのpushとPreviewでの確認は不要。

---

## 2. フォルダの移動

1. 管理下の3ファイルを含むフォルダを移動する
   ```
   git mv docs/fixes/active/betsuhyo5-extraction docs/fixes/done/betsuhyo5-extraction
   ```
2. `raw-data/`（`.gitignore` により管理外）が一緒に移動したかを確認する
   - 移動先に11ファイルがそろい、`shotokuzei_raw.xml` のサイズが0節の記録と一致すること
   - 移動元 `docs/fixes/active/betsuhyo5-extraction/` が**残っていない**こと
   - もし `raw-data/` が移動元に残っていた場合は、ファイルシステム上で移動先へ移し、空になった移動元フォルダ（`betsuhyo5-extraction/` のみ）を削除する
3. **`docs/fixes/active/` 自体と `.gitkeep` には絶対に触れないこと**。作業後も `active/` と `.gitkeep` が残っていることを確認する
4. `.gitignore` の `docs/fixes/**/raw-data/` が移動先でも効いていることを確認する
   ```
   git check-ignore -v docs/fixes/done/betsuhyo5-extraction/raw-data/shotokuzei_raw.xml
   git status --ignored docs/fixes/done/betsuhyo5-extraction/
   ```
   `raw-data/` の中身が「Untracked」として出てきた場合は、**作業を止めて報告すること**（16MBのXMLをGit管理に入れないため）

---

## 3. 参照パスの書き換え

### 3-1. 書き換える箇所（2か所）

`docs/fixes/active/betsuhyo5-extraction/` → `docs/fixes/done/betsuhyo5-extraction/`

- `src/lib/tax/residentTaxTiming.ts` の118行付近（**コメント内のパスのみ**）
- `scripts/verify-resident-tax-timing-tool.js` の443行付近（`console.log` の出力文字列のみ）

どちらも、パス以外の文字は1文字も変えないこと。

### 3-2. 書き換えない箇所

`docs/fixes/done/` 配下の指示書・完了報告に書かれている旧パスは、**当時の記録としてそのまま残す**。

### 3-3. ほかに参照が残っていないかの確認

```
git grep -n "fixes/active/betsuhyo5" -- . ":(exclude)docs/fixes/done/"
```

ヒットが0件になることを確認する。3-1以外のヒットがあった場合は、**書き換えずに報告すること**。

### 3-4. フォルダ内のスクリプトのパス確認

`extract_betsuhyo5.py`・`check_boundaries.py` について、次を確認して報告する。

- `active` を含むパス、絶対パス、`raw-data` の参照が、どう書かれているか（該当行を抜粋）
- スクリプト自身の位置からの相対パス（`__file__` 基準など）であれば、書き換え不要
- `active/` を前提にしたパスが直接書かれている場合は、`done/` に書き換える

**スクリプトは実行しないこと**（外部APIへのアクセスやファイル生成を避けるため）。

---

## 4. 動作確認

1. `node scripts/verify-resident-tax-timing-tool.js` がPASSし、出典の行が新しいパスで出力されること（該当行を報告に貼る）
2. `npx tsc --noEmit` がエラーなく終わること
3. `tsconfig.tsbuildinfo` が書き換わった場合は、`git restore tsconfig.tsbuildinfo` で元に戻すこと

devサーバーの起動とブラウザでの確認は不要。

---

## 5. 処理済みの指示書を `done/` へ移す

次の2件を `docs/fixes/active/` から `docs/fixes/done/` へ移す（どちらも未追跡なので、通常の `mv` でよい）。

- `investigation_dark_branch_betsuhyo5_status.md`
- 本指示書 `impl_betsuhyo5_move_to_done.md`

移動後、`docs/fixes/active/` に `.gitkeep` だけが残っていることを `ls -la docs/fixes/active/` で確認する。

---

## 6. コミットの準備（コミットはKENZOの指示を待つ）

**ステージングまで行い、コミットはしないこと。**

- 2節の `git mv` による移動（3ファイル）は、すでにステージ済みになっている
- 3節で変更したファイルと、5節で移した指示書2件は、**ファイルを個別に指定して** `git add` する（`git add -A`・`git add .` は禁止）

想定するコミットの分け方：

1. `betsuhyo5-extraction を done/ へ移動し、参照パスを更新`
   - フォルダの移動（3ファイル）、`residentTaxTiming.ts`、`verify-resident-tax-timing-tool.js`（3-4で書き換えた場合はそのスクリプトも）
2. `処理済み指示書を done/ へ移動`
   - 5節の指示書2件

ステージング後、次の出力を報告に貼り、KENZOのコミット指示を待つこと。

```
git status
git diff --cached --stat -M
git diff --cached -M -- src/ scripts/
```

`--stat -M` で、3ファイルが「追加＋削除」ではなく**リネーム**として認識されていることを確認する。

mainへのマージは、コミット後にKENZOが自分で行う。Claude Codeはマージもpushもしないこと。

---

## 遵守事項

- ロックファイル（`simulate.ts`・`analyze.ts`・`montecarlo.ts`・`types.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`・`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`）には一切触れない
- `src/` の変更は `residentTaxTiming.ts` のコメント内パスだけ。ロジックには触れない
- 指示書に書かれていないファイル・フォルダの操作はしない。想定外の状況になったら、その場で止めて報告する
- ブラウザを使う場合は、GA4・AdSenseへの通信を遮断すること（今回は不要）

---

## 完了報告の形式

- 各節で実行したコマンドとその出力をそのまま貼ること
- `raw-data/` の移動前後のファイル一覧・サイズの比較
- 3-4のスクリプトのパス確認結果（該当行の抜粋と、書き換えたかどうか）
- 6節の3つのコマンドの出力
