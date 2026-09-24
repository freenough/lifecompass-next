# 調査＋修正指示：iPhone（Safari）で一人法人LPの導入文の右側に余白が多く入る

作成日：2026-09-24
種別：**調査のあと修正（原因が2節の想定どおりの場合だけ、報告を待たずに修正まで進めてよい）**
対象リポジトリ：`lifecompass-next`
関連：`impl_hitori_hojin_lp_ui_followup.md`（本番反映済み。この変更で発生した可能性が高い）

---

## 現象

本番（`https://www.freenough.com/hitori-hojin`）を iPhone SE（第3世代、Safari、375px）で表示すると、Heroの下の導入文（2段落）だけ、**すべての行が右端のかなり手前で折り返され**、右側の余白が左側より明らかに広い。

- すぐ下の記事一覧セクションの説明文（「法人化の基本から、…」）は右端近くまで使えている
- Chromeで検証した時点では、導入文は1行あたり約23字で、幅327pxをほぼ使えていた
- 追加修正で、導入文に `mx-auto` と `text-pretty` を加えている

---

## 0. 作業前

1. `git status` と `git branch --show-current` を報告に貼る（想定：`main`、クリーン）。想定と違えば止まって報告する
2. 作業ブランチを作る
   ```
   git switch -c fix/hitori-hojin-intro-safari
   ```

---

## 1. 再現（WebKitで）

リポジトリにある `playwright-core` で、**WebKitエンジン**を使って375pxで表示し、再現させる。WebKitのブラウザ本体が未インストールなら、`npx playwright install webkit` で入れてよい（リポジトリの依存関係は変えないこと）。

**GA4・AdSenseへの通信は遮断すること。**

次の4パターンで、導入文の各段落について「各行の右端のx座標」「1行の文字数」「段落の幅」を実測し、表にする。

| パターン | 内容 |
|---|---|
| A | 現状（`mx-auto`＋`text-pretty`） |
| B | `text-pretty` だけを外す |
| C | `mx-auto` だけを外す |
| D | 両方外す（追加修正の前の状態） |

B〜Dは、開発サーバー上でDevToolsやスクリプトからクラスを一時的に外して測る方法でよい（ファイルを編集する必要はない）。

あわせて、**同じくWebKitで**次も測る（どちらも `text-pretty` が付いている箇所）。

- 記事一覧の各行のタイトル・説明文（前回の改修で `text-pretty` と `word-break:auto-phrase` を付けた）
- 下部CTAの説明文

Chromiumでも同じ箇所を測り、WebKitとの違いを並べる。

---

## 2. 修正（原因が `text-pretty` と確定した場合）

1節で「Bで右側の余白が解消し、Cでは解消しない」ことが確認できた場合は、報告を待たずに次の修正まで進めてよい。**それ以外の結果になった場合は、修正せずに1節の結果を報告して止まること。**

1. 導入文から `text-pretty` を外す。`mx-auto` と `max-w-2xl`、`[line-break:strict]` は残す
   - 375pxで1段落目の最終行が短くなる（以前の「す。」）件は、許容する
2. 記事一覧の行・下部CTAの説明文についても、1節の実測で**WebKitだけ行が不自然に短くなっている箇所**があれば、同じく `text-pretty` を外す。WebKitとChromiumで行の長さに差がない箇所は、そのままにする
3. 外した箇所と、残した箇所の一覧を報告する

---

## 3. 確認

WebKitとChromiumの両方で、375・768・1440pxについて次を確認する。

1. 導入文の各行が、段落の幅（375pxで327px）の近くまで使われていること
2. 記事の行・下部CTAの説明文に、1〜2文字だけの行がないこと（WebKitで出る場合は、どの記事のどの行かを報告する。**この件は今回直さない**）
3. 横スクロールが発生しないこと
4. `npx tsc --noEmit` がエラーなく終わること。`tsconfig.tsbuildinfo`・`next-env.d.ts` が書き換わっていたら `git restore` で戻す

スクリーンショット（WebKit・375pxの修正前後）は `docs/fixes/active/hitori-hojin-intro-safari/` に置き、**コミットしない**。

---

## 4. コミットとPreview

- コミットはファイルを個別に指定する（`git add -A`・`git add .` は禁止）
  1. `一人法人LP：Safariで導入文の行が短くなる問題を修正（text-prettyを外す）`
  2. 本指示書を `done/` へ移動
- `fix/hitori-hojin-intro-safari` をpushし、PreviewのURLを報告する
- **mainへのマージはしない**

---

## 完了報告の形式

- 1節の実測の表（WebKit・Chromium、パターンA〜D、記事の行・下部CTA）
- 原因の判断と、その根拠
- 2節で外した箇所・残した箇所
- 3節の確認結果
- `git log --oneline main..fix/hitori-hojin-intro-safari`、最終の `git status`、PreviewのURL
