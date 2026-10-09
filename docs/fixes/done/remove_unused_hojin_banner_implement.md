# 指示書：未使用の法人版`MonthlyRecordBanner.tsx`を削除する（16番・第2段階・実装・commitなし）

対象：lifecompass-next
引き継ぎ資料：`handoff_cls_and_320px_complete.md` 4節の16番。調査の報告を受けたKENZOの決定にもとづく。
段階：**第2段階（削除まで。commit・pushはしない）**。第3段階（commit・push・マージ・本番確認・ブランチ削除）は、KENZOの指示のあと、別の指示書で行う。

---

## 0. KENZOの決定（この範囲だけ。広げない）

**`src/components/hojinAssetManagement/MonthlyRecordBanner.tsx`の1ファイルだけを削除する。**

- `src/lib/hojinAssetManagement/monthlyCheck.ts`は**削除しない**（このバナーからしか使われなくなるが、同じ状況のファイルをまとめて判断するのは別作業）。
- **個人版**`src/components/assetManagement/MonthlyRecordBanner.tsx`は、使われているので**絶対に触らない**。取り違えない。

## 1. 守ること

- 作業ブランチ`chore/remove-unused-hojin-banner`を`main`から作って作業する。**commit、push、マージはしない。**
- 削除する前に、**パスを2回確かめる**（`hojinAssetManagement/`であって、`assetManagement/`ではないこと）。`git rm`ではなく、ファイルの削除（作業ツリーの変更）だけにして、commitしない。
- `docs/`の過去の指示書・メモ（`rounded_corner_unify_4px.md`など）は、書き換えない。
- `tsconfig.tsbuildinfo`が書き換わっていたら`git restore`で戻す。検証用のファイルは、リポジトリの外に置き、終わったら消す。

## 2. 確かめること

### 2-1. 削除前
- `grep -rn "hojinAssetManagement/MonthlyRecordBanner" src`と、`grep -rn "MonthlyRecordBanner" src`の結果。**個人版（`assetManagement/AssetManagementPage.tsx`のimportとJSX）だけが出ること**。法人版への参照がないこと。
- 個人版のimportが、`./MonthlyRecordBanner`（同じディレクトリの個人版）に解決されること。

### 2-2. 削除後
- `git status`：削除されたのが法人版の1ファイルだけ。
- `grep -rn "hojinAssetManagement/MonthlyRecordBanner" src`が何も返さないこと。
- `tsc --noEmit`と`npm run build`が通ること。
- `next start`で、`/asset-simulator/assets`（個人版のバナーがある画面）が開き、**コンソールにエラーがない**こと。「今月はまだ記録していません」のバナーは、データの状態（今月が未記録か）で出るため、**出る条件を作れれば**（今月が未記録の状態）、出ることを確かめる。作れなければ、「確かめられなかった」と書く（推測で埋めない）。
- `src/lib/hojinAssetManagement/monthlyCheck.ts`が、削除後に**どこからも参照されていない**こと（`grep`）。削除はしない。事実として報告する。

## 3. 報告の形

1. **結論（3行以内）**：削除した、`tsc`・ビルドが通った。
2. 削除前の確認（2-1）：`grep`の結果。
3. 削除後の確認（2-2）：`git status`、`grep`、`tsc`・ビルド、`/assets`の確認。
4. `monthlyCheck.ts`の状態（未使用になったこと。削除していないこと）。
5. 気づいたこと（直さない）。
6. 状態：ブランチ名、`git status`（commitしていないこと）、動きっぱなしのプロセスがないこと。

## 4. 完了の条件

- 削除は法人版の1ファイルだけ。commit・pushはしていない。
- 上の報告がそろっている。問題があれば、先に進めず、事実だけ報告する。
