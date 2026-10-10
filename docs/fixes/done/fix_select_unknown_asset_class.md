# 指示書：PFの銘柄`<select>`が、一覧にない値を「全世界株」と表示する（実装〜本番確認までまとめて）

作成日：2026-10-10
**この指示書を渡す＝実装・commit・push・マージの指示をしたことになる。** 範囲は下の1〜7だけ。
対象：`src/components/simulator/PortfolioPanel.tsx`（ロックファイル。**この修正に限り、このファイルの変更を許可する**。ほかのロックファイルは触らない）。
前提の修正：`3a02406`（現在のPFの残高消失の修正）。

---

## 1. 症状と原因

- シミュレーターの銘柄一覧（`profile.ts`の`ASSET_CLASSES`）は12種類。資産管理ツール側には、一覧にない**「保険」「その他」**がある（`assetManagement/categories.ts`）。
- 資産管理ツールからインポートすると、これらは銘柄名のまま特定口座の行に入る（`importFromAssetManagementPersonal.ts`の`toRows`）。CSV取り込みでは、任意の文字列も入りうる。
- `<select value="保険">`は、一致する`<option>`がないため、先頭の「全世界株」を表示する。**データは「保険」のままなのに、画面は「全世界株」と出る。**
- 計算への影響はない（コピーのガードが、一覧にない値を持つ口座をコピーしない）。問題は表示だけ。

## 2. 仕様

1. `<select>`の`value`が、(a)空文字`''`でなく、(b)`ASSET_CLASSES`の`key`にもないとき、**その値を追加の`<option>`として出す**（選択された状態）。ラベルは「`{値}`（一覧外）」（例：「保険（一覧外）」）。`value`は元の値のまま。
2. 追加の`<option>`は、選択済みの値が一覧にある場合や`''`の場合は出さない。別の銘柄を選び直すと、追加の`<option>`は消える（値が一覧にあるため）。
3. **表示だけを変える。** データ（`assetClass`）・ストア・保存・インポート・コピーのガード・μ/σの計算は、一切変えない。開いただけで値が書き換わらないこと。
4. 見た目は、「銘柄を選択」と同じ薄い色（slate-400）にして、選択済みの銘柄と見分けられるようにする（3色の原則を守る）。
5. 対象は、`PortfolioPanel.tsx`の、`row.assetClass`を表示するすべての`<select>`（本人・配偶者、現在・積立期・取崩期）。同じ処理を3〜4か所に書き写さず、小さな共通の部品（または関数）にする。置き場所は`PortfolioPanel.tsx`の中。

## 3. 確認項目

再現の用意：本番と同じ方法（前回の本番確認と同じ。新しいブラウザの状態）で、特定口座の行に`assetClass: '保険'`を持つプロファイルを用意する（JSON取り込み、または資産管理ツールのデータ）。

1. 「保険（一覧外）」が、選択された状態で表示される。「全世界株」と出ない。
2. 開いたときに、選択肢は「全世界株…暗号資産」の12個＋「保険（一覧外）」（行の値が一覧外のとき）。
3. 「全世界株」など一覧の銘柄を選ぶと、値が変わり、追加の選択肢が消える。
4. 画面を開いただけ・何も触らないとき、`assetClass`は`'保険'`のまま（保存した内容・URL共有にも変化がない）。
5. 「①の比率をコピー」は、その口座をコピーしない（従来どおり）。メッセージも従来どおり。
6. 未選択（`''`）の行は、「銘柄を選択」のまま（変化なし）。ふつうの銘柄の行も変化なし。
7. 配偶者側の行でも、同じ表示になる。
8. 幅：375pxと320pxで、PF行が1行に収まり、カードからはみ出さない（320pxで「万円」が2行に折れるのは、すでにある別件。悪化させない）。
9. `scripts/full-verify.js`が全PASS。`verify-fixtures.js`が全一致。`tsc --noEmit`・`npm run build`が通る。**`tsconfig.tsbuildinfo`は、commitの前に`git restore`で戻す。**
10. 変更は`PortfolioPanel.tsx`だけ。改行コードは、そのファイルの元のまま（CRLF）。`git diff`に変更行だけが出る。

## 4. 実装

- ブランチ：`fix/select-unknown-asset-class`（`main`から）。1つのcommit。コミットメッセージは変更内容を具体的に。

## 5. マージ・本番確認

1. マージ前：`git status`、`main`が`origin/main`と同じこと。
2. `git merge --no-ff`（メッセージはファイルで渡す。`-F -`は使わない）。マージ後に`npm run build`。`git push origin main`。マージのハッシュを報告（戻すときは`git revert -m 1 <マージのハッシュ>`）。
3. 本番（https://www.freenough.com/asset-simulator/app）で、デプロイの反映を確かめてから、確認項目1〜4・6を確認する（新しいブラウザの状態。KENZOのブラウザ・既存のデータには触らない）。デプロイの確認は、本番のJSに「（一覧外）」が含まれることで行う。
4. 失敗したら、自動で`revert`せず、報告して止まる。

## 6. アーカイブ・後片づけ

- この指示書を`docs/fixes/done/`へ移して、1回commit・push。
- `git branch -d fix/select-unknown-asset-class`（`-D`・`--force`は使わない）。`git branch -a`と`git ls-remote --heads origin`で確かめる。

## 7. 触らないもの・報告

- 未追跡の3ファイル（`docs/fixes/active/2026-10-09_hitori-hojin-urls-production-check.md`、`docs/fixes/done/2026-10-09_hitori-hojin-urls-followup.md`、`docs/fixes/active/kids-money-game-investigation.md`）は、触らない。
- 報告に入れる：マージのハッシュ、`main`の先頭、確認項目の結果（PASS/FAIL）、アーカイブのcommit、削除したブランチのハッシュ、`git branch -a`・`git ls-remote`の結果、触らなかったファイルがそのままであること。
