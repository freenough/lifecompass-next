# 指示書：ツールCTAの変更を、マージして本番で確かめ、ブランチを削除する（第4段階）

対象：lifecompass-next、ブランチ`fix/tool-cta-align`（`d2b2011`、`main`は`94748f0`）
前段階：`tool_cta_align_commit_push.md`（第3段階。commit・push済み、Previewはログイン保護のため見た目の確認は飛ばす。KENZOの決定）
段階：**第4段階（マージ・本番確認・指示書のアーカイブ・ブランチ削除）**。**この指示書は、KENZOがマージと`main`へのpushを指示したものとして扱う。**

---

## 0. 守ること

- マージは`--no-ff`（これまでと同じ）。`main`へのpushは、マージとアーカイブの**2つのcommit**だけ。
- アーカイブで移す指示書は、**名前を挙げたものだけ**（3-2）。ほかの未追跡ファイルは、触らない・commitしない。
- 本番の測定は、外部ドメインを遮断し、クリックしない（これまでと同じ）。
- 問題があれば、先に進めず事実だけ報告する。**本番で寸法が変わっていた場合は、`git revert -m 1 <マージのハッシュ>`の案を示し、KENZOの指示を待つ（勝手にrevertしない）。**

## 1. 手順

### 1-1. マージ前の確認
- `git fetch`のあと、`main`が`origin/main`と同じ（`94748f0`）で、`fix/tool-cta-align`が`d2b2011`であること。
- `git log --oneline -10`で、マージcommitのメッセージの書き方を確かめ、同じ書き方にする。

### 1-2. マージ・push
- `git switch main`→`git merge --no-ff fix/tool-cta-align`。
- `git show --stat HEAD`で、マージの内容が10ファイル・+10 −10であることを確かめる。
- `git push origin main`。

### 1-3. 本番の確認
- Vercelの本番デプロイが完了するのを待つ（GitHubのcommitのステータス、または`deployments?sha=`で、環境が本番・状態がsuccessのもの）。
- **本番**（`http://www.freenough.com`）で、compoundとeducation-costの、幅 **320 / 375 / 768 / 1024px**：
  - CTAの幅・高さ・行数が、これまでの表と**同じ**こと（320：240×72・2行、375：295×72・2行、768/1024：compound 354.36×48・education-cost 306.36×48、いずれも1行）。親からのはみ出し、横スクロールがないこと。
  - hover状態（600ms待ってから読む）で、`opacity`が**1**であること（変更前は0.9）。浮き（`translate: 0px -2px`）と影（`shadow-lg`）があること。
  - 静止時：`opacity` 1、影なし、`font-weight`の計算値が600。
- 本番のHTMLに、まだ古いデプロイが出ていないこと（`opacity`が0.9のままなら、デプロイの反映を待ってやり直す。10分待っても変わらなければ、そのまま報告する）。
- 本番のほかのページのCTA（LPのHero CTA 272/304×56、ブログ記事末のCTA 164×48）が、変わっていないこと（寸法のみ）。

### 1-4. アーカイブ（別のcommit）
- `docs/fixes/done/`へ、次の**5つ**だけを移す（未追跡なので、`mv`して`git add`）：
  - `cls_and_320px_merge.md`
  - `font_preload_investigation.md`
  - `tool_cta_inventory.md`
  - `tool_cta_align_implement.md`
  - `tool_cta_align_commit_push.md`
  - `tool_cta_align_merge.md`（この指示書）
- **移さないもの**：`kids-money-game-investigation.md`（別の調査・扱いは未決定）、`asset_mgmt_card_shift_investigation.md`（22番の調査中。あれば）。`docs/fixes/active/`に残す。
- commitのメッセージは、前回のアーカイブcommit（`94748f0`）の書き方に合わせる。`git push origin main`。

### 1-5. ブランチの削除
- `git branch -d fix/tool-cta-align`（マージ済みなので`-d`で消える。`-D`は使わない）。
- `git push origin --delete fix/tool-cta-align`。
- **確認**：`git branch -a`が`main`と`origin/main`だけであること。`git ls-remote --heads origin`が`main`だけであること。

## 2. 報告の形

1. **結論（3行以内）**：マージ・本番確認・削除の結果。
2. マージ：ハッシュ、`git show --stat HEAD`。
3. 本番の確認表（幅ごと）：寸法、hoverの`opacity`、ほかのCTAが変わっていないこと。
4. アーカイブ：ハッシュ、移したファイル。`docs/fixes/active/`に残ったファイル。
5. ブランチ：`git branch -a`と`git ls-remote --heads origin`の結果。**復元用**に、削除したブランチのハッシュ（`d2b2011`）。
6. 気づいたこと（直さない）。
7. 状態：`main`の先頭のハッシュ、`git status`、動きっぱなしのプロセスがないこと。

## 3. 完了の条件

- `main`にマージcommitとアーカイブcommitがあり、本番のhover `opacity`が1。寸法は変わっていない。
- ブランチが、ローカル・GitHubとも消えている（上の2つのコマンドで確認）。
