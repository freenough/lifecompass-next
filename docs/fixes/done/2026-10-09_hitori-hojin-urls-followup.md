# 指示書：一人法人URL統一（fix/hitori-hojin-urls）の追加調査とコミット

配置先: `docs/fixes/active/`（KENZOが手動配置）
対象リポジトリ: lifecompass-next
対象ブランチ: `fix/hitori-hojin-urls`（main 5238d77 から分岐済み）

## 背景

前回の完了報告で、`src/app/sitemap.ts` と `src/lib/hitoriHojinBlog.ts` の2ファイルを修正し、一人法人側の8記事について、サイトマップと記事本文内リンクを canonical と同じクリーンURL（`HITORI_HOJIN_SITE_URL` 起点）に統一した。内容はレビュー済みで問題なし。
ただし次の2点が未確認のため、本指示書で調査する。そのうえで、現在の変更をコミットする（pushはしない）。

## 厳守ルール（全指示書共通）

- コミットは、本指示書のパートBで指示した1回のみ。push、mainへのマージ、PR作成は禁止。
- 検証中は、localhost以外の全ドメインへの通信を遮断する（GA4、AdSense、アフィリエイトリンクへ実際に送信されないようにするため）。ブラウザ自動操作を行う場合は特に徹底する。
- 開発サーバー・本番ビルド用サーバーを停止するときは、ポートからPIDを特定し、PIDを指定して停止する。`taskkill /F /IM node.exe` など全プロセス一括終了コマンドは使わない。
- 破壊的操作（`localStorage.clear()` など）を行う前に、対象オリジンが検証専用であることを確認して報告する。判別できない場合は操作せず、KENZOに確認する。
- `tsconfig.tsbuildinfo` が書き換わったら、元に戻す。
- `docs/fixes/active/` フォルダを `rmdir` しない。処理済み指示書の `done/` への移動は可。
- 次のファイルは触らない: `simulate.ts`, `analyze.ts`, `PortfolioPanel.tsx`, `simulatorStore.ts`, `profile.ts`, `blog.ts`, `blogTopics.ts`, `concerns.ts`, `ConcernCard.tsx`。
- 指示書に書かれていないファイル・フォルダ操作を、自己判断で行わない。
- 完了報告は、実測値・出力・diffなどの証跡を伴うこと。「問題なし」の自己申告だけの報告は受け取らない。

## パートA：調査（読み取り専用。修正はしない）

### A1. 資産シミュレーター側ページに、巻き戻りリンクが残っていないか

背景：今回の修正は一人法人側の8記事だけを対象にしており、資産シミュレーター側のブログ（`blog.ts` 経由）の本文中に一人法人へのリンクがある場合、`/asset-simulator/hitori-hojin/...` に巻き戻るリンクが残っている可能性がある。

1. 前回の検証と同じ方法で、本番ビルドを起動する。
2. サイトマップの資産シミュレーター側の42URLすべてについて、HTML全文を取得する。
3. 各ページのHTML全文（`href`、JSON-LD、ページ内のscriptデータを含む）から、`asset-simulator/hitori-hojin` を検索する。
4. 報告内容：
   - 該当ページ数と総ヒット数（0件なら、検索対象の件数と検索方法の証跡を示す）。
   - 1件以上ある場合：該当ページのURL、該当文字列の前後50文字程度、その文字列を生成しているファイルと行（推定でよいが、根拠を示す）。
5. 修正はしない。修正が必要かどうかの判断は、報告を受けてKENZOが行う。

### A2. 前回の検証方法の事実報告

次の3点に、事実だけで答える。
1. 前回の検証は、curlとビルドだけか。それともブラウザ自動操作（Playwright等）も使ったか。
2. ブラウザ自動操作を使った場合、localhost以外への通信を遮断していたか。遮断の方法も示すこと。
3. 検証中に、localhost以外へ送信された通信はあったか。把握できていない場合は、「把握できていない」と答える。

## パートB：現在の変更のコミット（パートAの結果に関係なく実施）

1. `git status` を確認する。次の2ファイル以外に未コミットの変更がある場合は、触らずに内容を報告し、コミットを中止して報告する。
   - `src/app/sitemap.ts`
   - `src/lib/hitoriHojinBlog.ts`
2. ファイルを個別指定してステージングする（`git add -A` と `git add .` は禁止）。
   `git add src/app/sitemap.ts src/lib/hitoriHojinBlog.ts`
3. 改行コード（CRLF）が維持されていることを確認する。
4. コミットメッセージ例：
   `fix: 一人法人のsitemapと記事内リンクをcanonicalと同じクリーンURLに統一`
5. コミット後、`git show --stat` の出力を報告に含める。
6. pushはしない。mainへのマージもしない（KENZOが自分で実行する）。

## 完了報告に含めるもの

- A1：検索対象の件数、ヒット数、ヒットがあった場合は一覧
- A2：3点への回答
- B：コミットハッシュ、`git show --stat`、`git status` の最終状態
- 後片付け：起動したプロセスを全て停止したこと（PID指定で停止した証跡）、一時ファイルを削除したこと、`tsconfig.tsbuildinfo` を元に戻したこと

## マージ後（KENZOが実施・参考）

1. KENZOが `git merge --no-ff` とpushを実行する。
2. 本番反映後、`https://www.freenough.com/sitemap.xml` で、一人法人の10URLがクリーンURLになっていることを確認する。
3. 一人法人の記事ページで、記事本文内の内部リンクが `https://www.freenough.com/hitori-hojin/blog/...` になっていることを確認する。
4. Search Consoleで、`/asset-simulator/hitori-hojin/...` のURLが重複扱いになっていないかを確認する。
