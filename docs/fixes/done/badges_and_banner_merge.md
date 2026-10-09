# 指示書：22番・16番の変更を、commit・マージして本番で確かめ、ブランチを削除する（第3段階）

対象：lifecompass-next
- 22番：ブランチ`fix/asset-badges-sizer`（作業ツリー。`AssetProgressBadges.tsx`だけ変更、commitなし）
- 16番：ブランチ`chore/remove-unused-hojin-banner`（worktree `../lifecompass-next-wt-banner`。法人版`MonthlyRecordBanner.tsx`だけ削除、commitなし）
- `main`：`f85ae2a`

前段階：`asset_badges_sizer_implement.md`、`remove_unused_hojin_banner_implement.md`（第2段階。実装済み・commitなし）
段階：**第3段階（commit・マージ・本番確認・アーカイブ・ブランチ削除）**。**この指示書は、KENZOが、2つのcommit、マージ、`main`へのpushを指示したものとして扱う。** Previewは、ログイン保護のため見た目の確認は飛ばす（KENZOの決定。17番と同じ）。

---

## 0. 守ること

- **作業ブランチはGitHubへpushしない**（Previewを使わないため）。pushするのは`main`だけ。マージcommit2つと、アーカイブcommit1つ。
- commitには、**それぞれの変更ファイルだけ**を、名前で指定して入れる（`git add -A`・`git add .`は使わない）。`docs/fixes/active/`の未追跡ファイルは、アーカイブ以外のcommitに入れない。
- 本番の測定は、外部ドメインを遮断し、クリックしない。
- 問題があれば、先に進めず事実だけ報告する。**本番で問題があった場合は、`git revert -m 1 <マージのハッシュ>`の案を示し、KENZOの指示を待つ（勝手にrevertしない）。**

## 1. 手順

### 1-1. 22番のcommit（作業ツリー、`fix/asset-badges-sizer`）
- `git status`：変更が`AssetProgressBadges.tsx`だけ（と、未追跡の指示書）であること。`git diff --stat`：+34 −1、CRLFのまま差分が変更行だけであること。
- `tsc --noEmit`と`npm run build`が通ること。通ったあと、`tsconfig.tsbuildinfo`が書き換わっていれば`git restore`で戻す。
- `git log --oneline -10`で書き方を確かめ、同じ書き方（`fix: …`＋本文＋`Co-Authored-By`）にする。commitは**1つ**。内容：資産管理プロモのKPIバッジに、最終値の見えない複製を重ねて、カウントアップによる折り返しのずれ（幅326〜413pxで+17px）をなくす。最終状態の見た目は変えない。
- `git show --stat HEAD`で1ファイルであること。

### 1-2. 16番のcommit（worktree、`chore/remove-unused-hojin-banner`）
- worktreeで、`git status`：削除が法人版`hojinAssetManagement/MonthlyRecordBanner.tsx`の1ファイルだけ。**個人版`assetManagement/MonthlyRecordBanner.tsx`が残っていること。**
- 削除をステージ（`git add`でファイルのパスを指定、または`git rm`）してcommit。メッセージ：`chore: 未使用の法人版MonthlyRecordBannerを削除`（書き方は上と同じ）。本文に、参照元の`HojinAssetManagementPage.tsx`がf26221aで削除され、取り残されていたこと、`monthlyCheck.ts`は残していることを書く。
- `git show --stat HEAD`で、1ファイルの削除であること。

### 1-3. worktreeを片づける
- `git worktree remove ../lifecompass-next-wt-banner`。**失敗したら`--force`を使わず、残っている中身を報告する**（`node_modules`のリンクなどが原因なら、リンクだけを外す。実際の`node_modules`には触らない）。
- `git worktree list`が、作業ツリー1つだけであること。

### 1-4. マージ
- `git fetch`のあと、`main`が`origin/main`と同じ（`f85ae2a`）であること。
- `git switch main`→`git merge --no-ff fix/asset-badges-sizer`→`git merge --no-ff chore/remove-unused-hojin-banner`。メッセージは、前回のマージ（`3ac6814`）と同じ書き方（`Merge branch '…': …`）。メッセージはファイルで渡す（stdinの`-F -`は使えない）。
- `git show --stat`で、それぞれのマージが1ファイル（22番：`AssetProgressBadges.tsx`、16番：法人版バナーの削除）であること。
- `git push origin main`。

### 1-5. 本番の確認（デプロイ完了を待ってから）
- Vercelの本番デプロイが、この`main`の先頭のcommitでsuccessになるまで待つ（`deployments?sha=`）。10分待っても出なければ、そのまま報告する。
- **22番**：`http://www.freenough.com/asset-simulator`、幅 **320 / 326 / 375 / 413 / 414 / 768 / 1024**で、資産管理プロモのカード：
  - KPI行の高さが、マウント直後・カウントアップ中・終了後で**同じ**こと（326〜413px：81px、320px：81px、414px：64px、768/1024px：72px）。
  - 「資産の内訳」（`div.mt-4.pt-4.border-t`）の位置が、カウントアップの前後で動かないこと（`requestAnimationFrame`で毎フレーム記録）。
  - カードの`layout-shift`（`sources`がカードまたはケーススタディのセクション）の合計が0であること（カードを画面中央に置いて止めた場合と、小さな読み取りステップでスクロールした場合）。
  - カウントアップ終了後、複製がDOMから消えていること（`aria-hidden`の複製が0）。KPIの値が、アクセシビリティツリーで二重に出ていないこと。
  - コンソールにエラーがないこと。
- **16番**：`http://www.freenough.com/asset-simulator/assets`が200で、コンソールにエラーがないこと。今月が未記録の状態（新しいブラウザ・記録なし）で、「今月はまだ記録していません。資産の推移を残しておきましょう。」のバナーが出ること。
- **変わっていないことの確認**：LPのHero CTA（272/304×56）、ツールCTA（compound：320で240×72・2行、1024で354.36×48）の寸法が、これまでと同じであること。

### 1-6. アーカイブ（別のcommit）
`docs/fixes/done/`へ、次の**5つ**だけを移す（未追跡なので`mv`して`git add`）：
1. `asset_mgmt_card_shift_investigation.md`
2. `monthly_record_banner_investigation.md`
3. `asset_badges_sizer_implement.md`
4. `remove_unused_hojin_banner_implement.md`
5. `badges_and_banner_merge.md`（この指示書）

**移さないもの**：`kids-money-game-investigation.md`（別の調査・扱いは未決定）。`docs/fixes/active/`に残す。移したあと、`active/`に残るファイルを一覧にする。

commitのメッセージは、前回のアーカイブcommit（`f85ae2a`）の書き方に合わせる。`git push origin main`。

### 1-7. ブランチの削除
- `git branch -d fix/asset-badges-sizer`と`git branch -d chore/remove-unused-hojin-banner`（`-d`。`-D`は使わない）。
- **確認**：`git branch -a`が`main`と`origin/main`だけであること。`git ls-remote --heads origin`が`main`だけであること。`git worktree list`が1つだけであること。
- **復元用**に、削除したブランチの先頭のハッシュ（`git branch <name> <hash>`で戻せる）を、報告に書く。

## 2. 報告の形

1. **結論（3行以内）**：commit・マージ・本番確認・アーカイブ・削除の結果。
2. commit：2つのハッシュ・メッセージ・`git show --stat HEAD`。
3. マージ：2つのマージのハッシュ、`git show --stat`。
4. 本番の確認：22番（幅ごとの表）、16番、変わっていないことの確認。
5. アーカイブ：ハッシュ、移したファイル、`active/`に残ったファイル。
6. ブランチ：`git branch -a`、`git ls-remote --heads origin`、`git worktree list`、復元用のハッシュ。
7. 気づいたこと（直さない）。
8. 状態：`main`の先頭のハッシュ、`git status`、動きっぱなしのプロセスがないこと。

## 3. 完了の条件

- `main`に、2つのマージcommitとアーカイブcommitがあり、`origin/main`と同じ。
- 本番で、22番のカードが動かず（CLS 0）、`/assets`が正常であること。ほかのCTAの寸法が変わっていないこと。
- ブランチが、ローカル・GitHubとも消え、worktreeが1つだけであること。
