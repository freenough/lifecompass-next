# 指示書：現在のPF残高消失の修正を、マージして本番で確認する（第3・第4段階をまとめて）

作成日：2026-10-10
対象ブランチ：`fix/current-pf-balance-wipe`（`5630245` fix、`c64d5f4` feat。ローカルのみ・未push）
元の指示書：`docs/fixes/active/fix_current_pf_balance_wipe.md`
**この指示書を渡す＝commit・push・マージの指示をしたことになる。** 範囲は下の1〜6だけ。

---

## 0. してはいけないこと

- **未コミットの4ファイル、`docs/fixes/active/kids-money-game-investigation.md`には触らない**（commitに入れない・消さない・移さない）。
- `--force`を使わない。`git merge`のメッセージは`-F -`（stdin）で渡せない。ファイルに書いて渡す。
- `tsconfig.tsbuildinfo`は、commitの前に`git restore`で戻す。

## 1. マージの前に

1. `git status`を見せる。ブランチが`fix/current-pf-balance-wipe`で、作業ツリーに今回の変更の取り残しがないこと（未コミットの4ファイルは、既存のまま）。
2. `git log main..fix/current-pf-balance-wipe --oneline`が、`5630245`と`c64d5f4`の2つだけであること。
3. `main`が`origin/main`と同じであること（`git fetch`のあと）。違えば、報告して止まる。

## 2. マージ

1. `main`へ切り替え、`git merge --no-ff fix/current-pf-balance-wipe`。メッセージはファイルに書いて渡す。例：「Merge branch 'fix/current-pf-balance-wipe'：現在のPF編集で他口座の残高が0になる件の修正、未選択の銘柄行の導入」。
2. マージ後、`npm run build`が通ること（`tsconfig.tsbuildinfo`は戻す）。
3. `git push origin main`。**マージのハッシュを報告する**（戻すときは`git revert -m 1 <マージのハッシュ>`）。

## 3. 本番で確認する（Vercelのデプロイ完了後）

Previewは使わない（ログイン保護のため）。本番 https://www.freenough.com/asset-simulator を、Playwright（または同等のブラウザ操作）で確認する。

デプロイの完了は、本番のHTMLに今回の変更が出ていること（「銘柄を選択」の文言が、PFの「+ 追加」の後に出る）で確かめる。出ていなければ、待って再確認する（数回まで。出なければ報告して止まる）。

確認する条件：NISA 1,700／iDeCo 1,200／特定口座 6,000／現金 2,000（総資産 10,900万円）。

| # | 操作 | 期待 |
|---|---|---|
| 1 | NISAの「+ 追加」を押す | iDeCo・特定口座・現金の残高が変わらない。総資産が10,900のまま |
| 1b | iDeCoの「+ 追加」を押す | 同上（NISA・特定口座・現金が変わらない） |
| 2 | 同じ口座で、もう一度「+ 追加」を押す | 2本目は、銘柄「銘柄を選択」、金額0。残高・総資産が変わらない。1本目は、銘柄「銘柄を選択」、金額は押した口座の残高（NISAなら1,700） |
| 7 | 配偶者側：配偶者の資産を入れ、配偶者のNISAの「+ 追加」を押す | 配偶者のほかの口座の残高が変わらない |

追加で1つ：「①の比率をコピー」を押して、未選択の行がある口座に、「…コピーしませんでした」のメッセージが出ること。

- 本番のデータは、ブラウザ内の保存（localStorageなど）に入る。**確認は、確認用の新しいブラウザの状態で行う**（既存の利用者のデータに触らない。KENZOのブラウザは使わない）。
- 外部への送信（解析・広告など）は、確認の操作に関係しないので、ブロックしてよい。本番へのアクセスは許可する。
- 失敗したら、**自動で`revert`しない。** 何が起きたか（操作・期待・実際）を報告して止まる。

## 4. アーカイブ

本番確認が通ったあと、次の2つを`docs/fixes/done/`へ移して1回commitし、pushする。

- `docs/fixes/active/fix_current_pf_balance_wipe.md`
- `docs/fixes/active/merge_current_pf_balance_wipe.md`（この指示書）

## 5. 後片づけ

1. `git branch -d fix/current-pf-balance-wipe`（`-D`・`--force`は使わない）。worktreeがあれば、先に`git worktree remove`。
2. 復元用に、削除前のハッシュ（`5630245`・`c64d5f4`）を報告に書く。
3. `git branch -a`と`git ls-remote --heads origin`で、ブランチが残っていないことを確かめる。

## 6. 報告に入れること

- マージのハッシュと、`main`の先頭のハッシュ。
- 本番確認の結果（表の#1・1b・2・7・追加の1つ。それぞれPASS/FAIL）。
- アーカイブのcommitのハッシュ。
- 削除したブランチとハッシュ、`git branch -a`・`git ls-remote`の結果。
- 触らなかったもの（未コミットの4ファイル、`kids-money-game-investigation.md`）が、そのままであること。
