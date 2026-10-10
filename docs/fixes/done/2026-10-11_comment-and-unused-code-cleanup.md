# 指示書：コメントのずれ修正（34・36）＋未使用コードの削除（27）＋未追跡指示書の整理（35）

作成日：2026-10-11
対象リポジトリ：lifecompass-next（`main`の先頭：`5821906`）
引き継ぎ資料：`handoff_pf_balance_asset_classes_complete.md`の5節 34・35・36・27番
性質：**挙動を変えない。コメント・ドキュメントの修正と、未使用コードの削除だけ。**

---

## 0. 進め方（2フェーズ）

- **Phase 0（読むだけ）**：2節の「前提の確認」をすべて実行して、結果を報告する。食い違いがあれば、**そこで止まって報告する**（Phase 1に進まない）。
- **Phase 1（実装〜マージ〜アーカイブ）**：Phase 0がすべて一致したときだけ進む。失敗したら、自動で`revert`せず、報告して止まる。
- ブランチ：`chore/comment-and-unused-code-cleanup`。commitは、下の3つに分ける（デプロイはそろえる）。
- commitメッセージの末尾に、このセッションの共通の署名行を付ける（`Co-Authored-By`と`Claude-Session`）。

---

## 1. 許可する変更（これ以外は触らない）

### ロックファイル（コメント行のみ。コードは1文字も変えない）
| ファイル | 許可する変更 |
|---|---|
| `src/lib/profile.ts` | `getAggregateWeights`まわりのコメント3行（下の3-B） |
| `src/components/simulator/PortfolioPanel.tsx` | コメント2行（下の3-B） |

### ロックファイルではないもの
| ファイル | 変更 |
|---|---|
| `src/lib/hojinAssetManagement/monthlyCheck.ts` | 未使用の`isCurrentMonthRecorded`と、不要になるtype importの削除 |
| `src/lib/hojinAssetManagement/routes.ts` | **ファイルごと削除** |
| `src/lib/hojinCompanyState/portfolioMath.ts` | 冒頭コメントの修正 |
| `CLAUDE.md` | 「重み」の説明の修正 |
| `docs/fixes/`配下 | 35番の整理（下の3-A） |

**改行コードは、手元のファイルのまま編集する（統一しない）。** `profile.ts`・`PortfolioPanel.tsx`はCRLF、`simulatorStore.ts`・`portfolioMath.ts`はLF。ほかの3ファイルは、手元で`file`コマンド等で確認してから、そのままの改行で編集する。

---

## 2. Phase 0：前提の確認（読むだけ。結果を表にして報告）

チャット側のClaudeが、公開リポジトリ（`5821906`）で確認した内容。**手元の`main`で、同じ結果になるか確かめる。**

1. **`hojinAssetManagement/monthlyCheck.ts`は、ファイルとしては使われている。**
   `src/lib/hojinAssetManagement/storage.ts`が、`toYearMonth`をimportしている。→ **ファイルは削除しない。**
2. **`isCurrentMonthRecorded`（法人側）は、どこからも使われていない。**
   `grep -rn "isCurrentMonthRecorded" src scripts`の結果のうち、法人側（`hojinAssetManagement/monthlyCheck.ts`）を使う箇所が0件。個人側（`assetManagement/monthlyCheck.ts`）は、`MonthlyRecordBanner.tsx`が使っているので**触らない**。
3. **`hojinAssetManagement/routes.ts`の`HOJIN_ASSET_MANAGEMENT_PATH`は、定義だけで参照が0件。**
   `grep -rn "HOJIN_ASSET_MANAGEMENT_PATH\|hojinAssetManagement/routes" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next`で、`routes.ts`自身と`docs/fixes/done/`配下の過去の指示書（2件）以外に出ないこと。`scripts/`、`next.config.*`、`package.json`も対象。
   - 経緯：法人ツールは`/assets`に統合済み。`HitoriHojinManageSection.tsx`は、個人側の`ASSET_MANAGEMENT_PATH`（`/assets`）に直接リンクしている。`src/app/hitori-hojin/assets/page.tsx`は`/assets`へのリダイレクトだけのページで、**今回は触らない**。
4. **`getAggregateWeights`のコードは、残高だけを使っている**（`profile.ts`、`balance(cur.nisa, p.bNisa)`など。積立額を読んでいない）。`phase`引数は、結果に影響しない。
5. **ずれたコメントの位置**（3-Bの表と一致するか）。位置が違えば、実際の位置を報告する（資料の`profile.ts:262-269`は、実際は別の位置）。
6. **`portfolioMath.ts`の冒頭コメント（2〜6行目）に、「ロジックを複製、importしない」とあり、9行目で`NO_DEFAULT_ASSUMPTION_CLASSES`を`profile.ts`からimportしている。**
7. **35番の3ファイルの状態**（3-A）。`git status`と、各ファイルの冒頭・チェックリストを読む。

---

## 3. Phase 1：実装

### 3-A. commit 1：未追跡の指示書の整理（35番）
**KENZOからの指定は、まだない。次の保守的な扱いで進める。**

| ファイル | 扱い |
|---|---|
| `docs/fixes/done/2026-10-09_hitori-hojin-urls-followup.md` | すでに`done`にある。**そのまま`git add`してcommit。** |
| `docs/fixes/active/2026-10-09_hitori-hojin-urls-production-check.md` | ファイルを読み、**完了条件・チェックリストがすべて満たされ、完了報告（実施結果）が書かれているときだけ**`done`へ`git mv`相当で移して追加。**判断できなければ、動かさず、未追跡のまま残して報告する。** |
| `docs/fixes/active/kids-money-game-investigation.md` | **触らない（未追跡のまま）。** 扱いはKENZOが決める。 |

commitメッセージ：`docs: 未追跡だった指示書を整理（done移動・追加）`。移動・追加が0件なら、このcommitは作らない。

### 3-B. commit 2：未使用コードの削除（27番）と、commit 3：コメント修正（34・36番）

**commit 2：`chore: 法人側の未使用コード（isCurrentMonthRecorded・routes.ts）を削除`**

- `src/lib/hojinAssetManagement/monthlyCheck.ts`：
  - 1行目の`import type { HojinAssetSnapshot } from './types';`と、続く空行を削除。
  - ファイル末尾の`isCurrentMonthRecorded`（コメント付き）を削除。ファイルの末尾は、改行1つで終える。
  - 2行目のコメント「個人資産管理ツール（monthlyCheck.ts、ロック対象）と同じロジックを複製。」の**次の行**に、次の1行を足す：
    `// toYearMonthのみ使用（storage.tsが参照）。月次記録判定（isCurrentMonthRecorded）は、法人版バナー削除に伴い削除した。`
  - `toYearMonth`は、**1文字も変えない**。
- `src/lib/hojinAssetManagement/routes.ts`：`git rm`で削除。
- 本文に、`monthlyCheck.ts`自体は`storage.ts`が使うため残したこと、`routes.ts`は法人ツールの`/assets`統合で取り残されていたことを書く。

**commit 3：`docs: getAggregateWeightsまわりのコメントを実際の挙動（残高のみ）に合わせる`**

| ファイル | 変更前 → 変更後 |
|---|---|
| `src/lib/profile.ts`（約300行） | `重み付けはσ側（getAggregateWeights・実残高＋積立額）と統一する。` → `重み付けはσ側（getAggregateWeights・現在の残高）と統一する。` |
| `src/lib/profile.ts`（約311-312行） | ` * 重みは実際の残高・積立額のみ（getAggregateWeights）。PF欄に資産配分の入力があるかどうかは`／` * 重みの有無と無関係――残高・積立額が0円の口座は、資産配分を入力しても重み0のままにする。` → ` * 重みは実際の現在の残高のみ（getAggregateWeights。積立額は含めない）。PF欄に資産配分の入力があるかどうかは`／` * 重みの有無と無関係――残高が0円の口座は、資産配分を入力しても重み0のままにする。` |
| `src/components/simulator/PortfolioPanel.tsx`（約266-267行） | `  // 重みはμ・σとも実際の残高・積立額（getAggregateWeights）で統一する——資産配分の`／`  // 入力有無とは無関係に、残高・積立額が0円の口座は重み0のままにする。` → `  // 重みはμ・σとも現在の残高（getAggregateWeights。積立額は含めない）で統一する——資産配分の`／`  // 入力有無とは無関係に、残高が0円の口座は重み0のままにする。` |
| `CLAUDE.md`（約33-35行） | 「**全口座集計のμ・σの重みは「資産配分の入力有無」ではなく実際の残高・積立額**（`getAggregateWeights`: 積立期は残高＋積立額、取崩期は残高のみ。①現在のPFに金額入力があればそれを優先）。残高・積立額が0円の口座は、…」→「**…ではなく現在の残高**（`getAggregateWeights`: 積立期・取崩期とも残高のみ。積立額は含めない。`phase`引数は結果に影響しない。口座ごとに、①現在のPFに金額入力があればその合計、なければ`bNisa/bIdeco/bTax`を使う）。残高が0円の口座は、…」 |
| `src/lib/hojinCompanyState/portfolioMath.ts`（2〜6行目） | 3行目の末尾を「（実装指示書2章：「ロジックを複製、importしない」方針。計算ロジックは複製）。」に変え、その次に2行足す：`// ただし定数NO_DEFAULT_ASSUMPTION_CLASSES（手動入力の警告対象）だけは、個人側と同じ一覧を`／`// 共有するためprofile.tsからimportする。` |

**理由（背景）**：全口座集計のσ・μの重みは、表示専用の「今の残高構成」。将来の積立額を足す設計は、「何年分を足すか」の根拠がなく採用しない（コードも最初から残高だけ）。シミュレーション（MC）は、口座ごとのσ×その年の残高で毎年計算し直すため、この重みの影響を受けない。

---

## 4. 検証（commitの前に、すべて実行して結果を貼る）

チャット側で、同じ編集を作業用コピーに適用して確認済み：`tsc --noEmit`は成功、`scripts/full-verify.js`は1,131 PASS・0 FAIL。**`npm run build`は、サンドボックスがGoogle Fontsに接続できず失敗したため、未確認。手元で確認する。**

1. `npx tsc --noEmit`：エラー0件。
2. `npm run build`：成功。
3. `node scripts/full-verify.js`：FAIL 0件（PASS数も報告）。
4. **コード行が変わっていないことの証明**：commit 3の`git diff`から、コメント行（`//`・` *`・`/**`）とCLAUDE.mdを除いた行が**0件**であること。`git diff -U0 -- src | grep '^[+-]' | grep -v '^+++\|^---'`の結果を、全行コメントであることを確認して報告する。
5. 参照の再確認：削除後に`grep -rn "HOJIN_ASSET_MANAGEMENT_PATH\|hojinAssetManagement/routes" src scripts`が0件。
6. `tsconfig.tsbuildinfo`は、commit前に`git restore`で戻す。

---

## 5. マージ〜本番確認〜片付け

- `main`へマージ（`--no-ff`）。マージのメッセージは、**ファイルに書いて渡す**（`-F -`は使えない）。
- push後、デプロイの反映を待つ。**今回はコメントと未使用コードの削除だけなので、見た目・挙動は変わらない。** 本番では、次の3つだけ確認する：
  1. https://www.freenough.com/asset-simulator/app が開く。
  2. https://www.freenough.com/asset-simulator/assets が開く。
  3. https://www.freenough.com/asset-simulator/hitori-hojin/assets が、`/asset-simulator/assets`にリダイレクトされる（`routes.ts`削除の影響がないこと）。
- この指示書を、`docs/fixes/done/`へ移して、アーカイブのcommitを作る。
- 作業ブランチを削除する（`git branch -d`）。復元用に、削除前にハッシュを報告する。
- 戻すときは、`git revert -m 1 <マージのハッシュ>`。

---

## 6. 報告してほしいこと

1. Phase 0の7項目の結果（一致／食い違い）。
2. 35番の3ファイルの扱い（どれを`done`へ移したか、動かさなかった理由）。
3. 検証1〜6の結果。
4. commitとマージのハッシュ、本番確認3項目の結果。
5. 気づいた追加の「未使用」「ずれ」があれば、**直さずに**一覧で（資料5節の番号の続きとして）。

---

## 7. やらないこと

- `getAggregateWeights`のコードの変更（コメントのみ）。
- 個人側`assetManagement/monthlyCheck.ts`・`MonthlyRecordBanner.tsx`の変更。
- `src/app/hitori-hojin/assets/page.tsx`（リダイレクトのページ）の削除。
- 37番（銘柄一覧の1ファイル化）、23番（古いコメントの掃除）など、ほかの項目。
