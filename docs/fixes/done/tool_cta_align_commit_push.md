# 指示書：ツールCTAの変更を、commit・pushしてPreviewで確かめる（第3段階）

対象：lifecompass-next、ブランチ`fix/tool-cta-align`（`main`は`94748f0`から）
前段階：`tool_cta_align_implement.md`（第2段階。実装済み・commitなし）
段階：**第3段階（commit・push・Preview確認）**。`main`へのマージ、本番確認、ブランチ削除は、KENZOの次の指示のあと（第4段階）。**この指示書は、KENZOがこの段階のcommit・pushを指示したものとして扱う。**

---

## 0. 守ること

- **`main`へのマージ、`main`へのpushはしない。** pushするのは`fix/tool-cta-align`だけ。
- commitに入れるのは、**ツールCTAの10ファイルだけ**。`docs/fixes/active/`の未追跡ファイルは、**このcommitに入れない**（`git add`は10ファイルを名前で指定する。`git add -A`・`git add .`は使わない）。
- `tsconfig.tsbuildinfo`など、変更されたほかの追跡ファイルがあれば、入れずに報告する。

## 1. 手順

### 1-1. commit前の確認
- `git status`で、変更が10ファイルの`*Cta.tsx`だけ（と、未追跡の指示書）であること。
- `git diff --stat`：10ファイル、+10 −10。
- 10ファイルの改行コードが、変更前と同じ（CRLF）であること。差分が1行ずつだけであること（`git diff`で確認。全行が変わっていたら、改行コードが変わっている）。
- `tsc --noEmit`と`npm run build`が通ること。通ったあと、`tsconfig.tsbuildinfo`など、追跡ファイルが書き換わっていれば`git restore`で戻す。

### 1-2. commit
- 先に`git log --oneline -10`で、このリポジトリのcommitメッセージの書き方を確かめ、**同じ書き方**にする。
- commitは**1つ**。内容：ツールCTA 10本について、`font-bold`→`font-semibold`、`hover:opacity-90`の削除（LPのCTAにそろえる）。メッセージに、見た目が変わるのはhover時の透明度だけであることを、1行で書く。
- commit後に、`git show --stat HEAD`で10ファイル・+10 −10であることを確かめ、`git status`で、追跡ファイルの変更が残っていないことを確かめる。

### 1-3. push
- `git push -u origin fix/tool-cta-align`。
- push後、`git ls-remote --heads origin`で、`fix/tool-cta-align`があることを確かめる。

### 1-4. Previewの確認
- Vercelのこのブランチの**Preview URL**を探す（GitHubのcommitのチェック、PRの有無にかかわらずVercelのデプロイ一覧など、使える方法で）。Previewの作成を待ち、ビルドが成功したことを確かめる。
- **Previewに入れない・URLが取れない場合は、無理に探さず、そのまま報告する**（推測で埋めない）。
- Previewで、次を確かめる：
  - ツールページのうち、compound（文言が最も長い）と、education-cost。幅 **320 / 375 / 768 / 1024px**。
  - CTAの幅・高さ・行数が、第2段階の表（320：240×72・2行、375：295×72・2行、768/1024：354.36×48と306.36×48・1行）と**同じ**こと。親からのはみ出し、横スクロールがないこと。
  - hover状態（transitionの終わり＝600ms待ってから読む）で、`opacity`が1であること、浮き（`translate: 0px -2px`）と影（`shadow-lg`）があること。
  - **本番（`main`）側のCTA**を同じ方法で測り、hoverの`opacity`が0.9のままであること（＝この変更がPreviewだけに入っていること）。
- Previewはフォントのpreloadが出る（Linuxでビルドされる）ため、CLSは本番に近い値になる。**この作業ではCLSは測らない。**

## 2. 報告の形

1. **結論（3行以内）**：commit・push・Previewの結果。
2. commit：ハッシュ、メッセージ、`git show --stat HEAD`。
3. push：`git ls-remote --heads origin`の結果。
4. Preview：URL（取れた場合）、ビルドの結果、確認の表（幅ごと）、hoverの値、本番側との比較。
5. 気づいたこと（直さない）。
6. 状態：ブランチ名、`git status`、動きっぱなしのプロセスがないこと。

## 3. 完了の条件

- commitは1つ、10ファイルだけ。`main`は変わっていない（`94748f0`のまま）。
- 上の報告がそろっている。問題があれば、先に進めず、事実だけ報告する。
