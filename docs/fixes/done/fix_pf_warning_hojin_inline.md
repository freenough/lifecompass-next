# 指示書：手動入力の警告を、法人側でも保険・その他に広げる＋個人側のPFパネル内にも出す＋コメント修正（実装〜本番確認までまとめて）

作成日：2026-10-10
**この指示書を渡す＝実装・commit・push・マージの指示をしたことになる。** 範囲は下の1〜8だけ。
前提：`2c25e33`（保険・その他の追加）が`main`に入っている（`main`の先頭は`673befc`）。

---

## 1. 目的

1. **法人側：** 法人側のPFで保険・その他を選び、利回り（μ・σ）が自動のままだと、今は警告なしで0%として計算される。個人側（`2c25e33`）と同じ警告を出す。
2. **個人側：** 手動入力の警告は、結果パネルの先頭にしか出ない。スマホでは、入力を開いている間は見えない。**PFパネルの中にも出す**（法人側は、すでにPFパネルの先頭に出している：`CorporatePortfolioPanel.tsx`の396〜401行目）。
3. **コメント：** `assetManagement/categories.ts`の古いコメントを直す。

## 2. 仕様

### 2-1. 法人側の警告を広げる（`src/lib/hojinCompanyState/portfolioMath.ts`の`getCorporateCryptoWarnings`）

- 個人側の`NO_DEFAULT_ASSUMPTION_CLASSES`（`profile.ts`、現在は`export`なし）を**`export`して、法人側でも使う**（定数を2か所に書かない）。`profile.ts`の変更は、この`export`の追加だけ。
- 判定の条件は、今のまま（②積立期の行に該当銘柄があり、μ・σのどちらかが自動のとき。③取崩期は、`rateSameAsWorking`と`sigmaSameAsWorking`がどちらもOFFのときだけ）。
- 該当銘柄は、含まれているものを定数の順に「・」でつなぐ（例：「暗号資産・保険」）。警告は、フェーズごとに1つ。
- **暗号資産だけのときの警告文は、今と1文字も変えない。** 文の形：
  「{銘柄名}は既定の期待リターンを設定していません。②積立期のPFを手動入力に切り替えて、ご自身の想定利回り・標準偏差を入力してください。」（③取崩期も同様）
- 関数名は変えない（コメントだけ更新）。呼び出し元（`CorporatePortfolioPanel.tsx`）は変えない。

### 2-2. 個人側のPFパネルの中にも警告を出す（`src/components/simulator/PortfolioPanel.tsx`）

- `getCryptoManualWarnings(profile)`を、PFパネルでも呼び、**PFパネルの先頭**に出す。見た目は、法人側と同じ（`rounded border border-amber-300 bg-amber-50 px-3 py-2`、文は`text-[11px] text-amber-700`）。
- **`lg:hidden`（1024px未満だけ）にする。** 1024px以上は、左右に並ぶ結果パネルの先頭の警告が常に見えるため、同じ文が2回出るのを避ける。
- 結果パネルの先頭の警告（`page.tsx`）は、今のまま残す。
- 警告の文・判定は、新しく書かない（既存の関数の戻り値をそのまま使う）。

### 2-3. コメントの修正（`src/lib/assetManagement/categories.ts`、コメントのみ）

- `ASSET_CLASSES`の上のコメントの、「`profile.ts`の`ASSET_CLASSES`（31-42行目）」と、「目視で突き合わせる（手動確認で十分）」を、実態に合わせて直す：行番号を書かず、「`scripts/verify-asset-classes-sync.js`が、`profile.ts`との一致を自動で確認する（`full-verify.js`から呼ばれる）」と書く。
- **コメント以外は変えない。**

### 2-4. 変えないもの

- 個人側の警告の判定（`getCryptoManualWarnings`の中身）、μ・σの計算、`simulate.ts`・`analyze.ts`、ストア、資産管理ツールの一覧・選択肢、法人側のμ・σの計算。
- 変更を許可するロックファイルは、`profile.ts`（`export`の追加だけ）と`PortfolioPanel.tsx`（警告の表示だけ）。ほかのロックファイルは触らない。

## 3. コミット

ブランチ`fix/pf-warning-hojin-inline`（`main`から）。**3つのcommit**に分ける。
- commit 1：2-1（法人側の警告＋`profile.ts`の`export`）
- commit 2：2-2（個人側のPFパネルの警告）
- commit 3：2-3（コメント）

## 4. 確認項目

再現の用意：前回までの本番確認と同じ方法（新しいブラウザの状態。保存済みプロファイルを`localStorage`に入れる）。

### commit 1（法人側）
1. ②積立期のPFの行に「保険」を入れ、μ・σの手動入力をオフ（自動）にすると、警告が出る：「保険は既定の期待リターンを設定していません。②積立期のPFを手動入力に切り替えて、ご自身の想定利回り・標準偏差を入力してください。」。手動にすると消える。「その他」でも同じ。
2. 暗号資産と保険の両方があると、警告は1つで「暗号資産・保険は…」になる。
3. **暗号資産だけのとき、警告文が変更前と同じ**（1文字も違わない。変更前のコードでも同じ入力で比べる）。
4. ③取崩期（`rateSameAsWorking`・`sigmaSameAsWorking`がOFF）でも、同じ警告が「③取崩期」の文で出る。
5. 保険・その他を含まない法人プロファイルで、μ・σ・結果が変わらない。

### commit 2（個人側）
6. 375pxで、特定口座の積立期PFに「暗号資産」（または保険）を入れ、特定口座の利回りを自動にすると、**PFパネルの先頭に**、結果パネルの先頭と同じ文の警告が出る。手動にすると、両方から消える。
7. 1024px以上では、PFパネルの警告は出ない（結果パネルの先頭の警告だけ）。
8. 警告の枠が、375px・320pxで、はみ出さない。入力欄・PF行の並びが、変更前と変わらない（警告がないとき、見た目は変更前と同じ）。

### commit 3
9. `git diff`が、コメント行だけ。

### 共通
10. `scripts/full-verify.js`が全PASS（一致の確認3件を含む）。`verify-fixtures.js`が全一致。`tsc --noEmit`・`npm run build`が通る。**`tsconfig.tsbuildinfo`は、commitの前に`git restore`で戻す。**
11. 改行コードは、ファイルごとに元のまま（`profile.ts`・`PortfolioPanel.tsx`はCRLF。ほかは、変更前に確認して合わせる）。`git diff`に変更行だけが出る。

## 5. マージ・本番確認

1. マージ前：`git status`、`main`が`origin/main`と同じこと、`git log main..fix/pf-warning-hojin-inline --oneline`が3つだけであること。
2. `git merge --no-ff`（メッセージはファイルで渡す。`-F -`は使わない）。マージ後に`npm run build`。`git push origin main`。マージのハッシュを報告（戻すときは`git revert -m 1 <マージのハッシュ>`）。
3. 本番（個人：https://www.freenough.com/asset-simulator/app、法人は該当のページ）で、デプロイの反映を確かめてから、確認項目1・3・6・7を確認する（新しいブラウザの状態。KENZOのブラウザ・既存のデータには触らない）。デプロイの反映は、本番のJSに、新しい警告の文言（「・」でつなぐ処理）が含まれることで確かめる。
4. 失敗したら、自動で`revert`せず、報告して止まる。

## 6. アーカイブ・後片づけ

- この指示書を`docs/fixes/done/`へ移して、1回commit・push。
- `git branch -d fix/pf-warning-hojin-inline`（`-D`・`--force`は使わない）。`git branch -a`と`git ls-remote --heads origin`で確かめる。

## 7. 触らないもの

- 未追跡の3ファイル（`docs/fixes/active/2026-10-09_hitori-hojin-urls-production-check.md`、`docs/fixes/done/2026-10-09_hitori-hojin-urls-followup.md`、`docs/fixes/active/kids-money-game-investigation.md`）は、触らない。

## 8. 報告に入れること

- マージのハッシュ、`main`の先頭、確認項目の結果（PASS/FAIL。ローカルと本番）、アーカイブのcommit、削除したブランチのハッシュ、`git branch -a`・`git ls-remote`の結果、触らなかったファイルがそのままであること。
- 法人側の本番確認に使ったページのURLと、プロファイルの用意のしかた。
