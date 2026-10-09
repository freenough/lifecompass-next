# 指示書：CLS・320px対応のcommitとPreview（第3段階）

作成日：2026-10-09
対象リポジトリ：lifecompass-next
作業ブランチ：`fix/cls-and-320px`（HEAD `ad07e1f`、変更はコミット前の状態）
前の指示書：`cls_and_320px_implement.md`（第2段階。報告済み・レビュー済み）

> この指示書はClaude（クラウド側）が書いた案です。実機で未確認の記述は「推定」と明記しています。

---

## 0. KENZOの決定

- 単位1〜3をcommitする。**単位4（CLS案B）は実装しない。** 一人法人LPの1024pxのCLS 0.154は、今回は残す。
- 単位3の「見えない複製」（KPI行の高さ合わせ）が、スクリーンリーダーに二重に読まれないかを、**commit前に確かめる。**
- **この指示書は、ブランチのpush・Previewの確認までで止まる。** mainへのマージ、指示書の移動、ブランチ削除は、KENZOの次の指示のあと。

## 1. commit前：複製の読み上げの確認（単位3）

`HeroDemo.tsx`に足した、計算前だけの「計算後と同じ文言の見えない複製」について。

1. 複製の要素に、`aria-hidden="true"`が付いているか、または、読み上げに出ない隠し方（`visibility:hidden`、`display:none`など）になっているかを、**実物（ソースと、ブラウザのアクセシビリティツリー）で確かめる。**
2. 付いていなければ、**複製に`aria-hidden="true"`を足す**（見た目・高さは変わらないこと。`visibility:hidden`ならアクセシビリティツリーからも外れるので、その場合は足さない）。足したら、単位3のpatchを作り直す。
3. 足した場合は、単位3の受け入れ条件のうち、次を**再測定**する：描画前後の枠の高さの差（320 / 375 / 414 / 768 / 1024 / 1280px、各0.5px以内）、LP2つのスクリーンショット差0（アニメーション終了後）。
4. 計算後（複製を外したあと）のDOMが、変更前と同じであることを、1か所の例（KPIの1つ）で確かめる。
5. 結果（付いていた／足した、アクセシビリティツリーでの見え方）を報告する。

## 2. commit

3つのcommitに分ける。順番どおり。**メッセージは、ファイルにして`git commit -F`で渡す**（標準入力が使えない）。

| # | 内容 | 含めるもの |
|---|---|---|
| 1 | 資産シミュレーターLPのHero CTAを320pxで収める（#7） | `src/app/page.tsx`のCTA部分（`max-[361px]:px-4`とコメント）のみ |
| 2 | 一人法人LPの320px対応（#6・#13） | `HitoriHojinForkDiagram.tsx`、`src/lib/ctaButtonClass.ts` |
| 3 | 資産シミュレーターLPのHeroチャートによるレイアウトずれを解消（CLS案A） | `src/app/page.tsx`のimport・コメント部分、`HeroDemo.tsx`、`HeroDemoChart.tsx`（新規） |

- `git add -p`は使えない。**保存済みのpatch（`unit1.patch`、`unit2.patch`、`unit3.patch`）を、HEADに順に`git apply --index`して、その都度commitする。** `page.tsx`が単位1と3にまたがるので、patchで分ける。
- 作業ツリーは、いったんpatch全体を保存（バックアップ）してから、`git stash`か`git checkout`で元に戻し、patchを順に当てる。**戻す前に、4節の確認用のSHA-256を取っておく。** 単位3で作り直した場合は、新しいpatchを使う。
- commitメッセージの案（日本語・既存の書き方に合わせる）：
  1. `fix: 資産シミュレーターLPのHero CTAを320px幅で本文幅に収める`
  2. `fix: 一人法人LPの320px幅で、分かれ道図のラベルとCTAを1行・本文幅に収める`
  3. `fix: 資産シミュレーターLPのHeroチャートを先に枠ごと描いてCLSを解消する`
  - 本文に、変更の理由と主な実測値（CLS 0.16〜0.29 → 0.000〜0.032、描画前後の枠の高さの差0px、320pxのはみ出し0）を2〜4行で。
- 各commitの中身そのものに、`npx tsc --noEmit`を通す（`git stash`などで、そのcommitの状態をチェックアウトして確かめる）。`tsconfig.tsbuildinfo`が書き換わったら`git checkout`で戻す。
- **commitの後に確かめること：**
  - `git diff main..HEAD`の全体が、commit前の作業ツリーの差分（バックアップ）と**SHA-256で一致する**（新規ファイル`HeroDemoChart.tsx`は、内容のハッシュで一致を確かめる）。
  - `git log --oneline main..HEAD`が、3commitだけ。
  - `git status`が、未追跡の`docs/fixes/active/`の指示書だけ。

## 3. push・Previewの確認

1. **ブランチだけ**を`git push -u origin fix/cls-and-320px`。mainにはpushしない。
2. PreviewのURLを、GitHub APIのデプロイ状況から取得する（`gh`は未インストール。**curlで公開APIを読む**）。取得できなければ、そう報告する（Vercelのログインが必要なため、Preview自体はKENZOが開く）。
3. **Previewのビルドが成功したか**（デプロイ状況）を報告する。
4. KENZOがPreviewで確かめる項目を、報告の最後に箇条書きで添える（Claude Code側で測れない前提）：
   - 資産シミュレーターLPを、スマホ幅（320 / 375 / 414px）で開き、Heroのチャートが現れるときに、下の文やCTAが動かないか。
   - 同LPの320pxで、CTAが画面内に収まっているか。
   - 一人法人LPの320pxで、分かれ道の図の「完全リタイア」が1行か、「法人資産管理ツールを開く →」が画面内に収まっているか。
   - 1024pxなどPC幅で、見た目が変わっていないか。
   - 読み上げ（VoiceOver等）で、KPIが二重に読まれないか（可能なら）。

## 4. やらないこと

- mainへのマージ、`main`へのpush、指示書の`docs/fixes/done/`への移動、ブランチの削除。
- 単位4（CLS案B）、フォント関連（`layout.tsx`のpreload・`display`、代わりのフォント）。
- 本番のCLS測定（マージ後に、別の指示で行う）。
- 未追跡の`kids-money-game-investigation.md`、`docs/fixes/active/`の指示書への変更。

## 5. 報告の形式

- 1の結果（複製の読み上げ）：付いていたか、足したか。足した場合は、再測定の表。
- 3つのcommitのハッシュ、メッセージ、各commitの規模（ファイル数・行数）、各commitの`tsc`の結果。
- `git diff main..HEAD`のSHA-256一致の結果。
- push後の、`git branch -a`と`git ls-remote --heads origin`の出力（ブランチが存在し、mainが`ad07e1f`のままであること）。
- PreviewのURLとビルド状況、KENZOが確かめる項目（上の3-4）。
- 最後に、`git status`。

## 6. 次の指示書（予定。今はやらない）

KENZOがPreviewを確かめたあと：`--no-ff`でmainへマージ → mainをpush → 指示書2つ（`cls_and_320px_audit.md`、`cls_and_320px_implement.md`、この指示書）を`docs/fixes/done/`へ移す別commit → 本番確認（CLS前後比較は、幅ごとに順番に）→ ブランチ削除（`git branch -d`のみ。`git branch -a`と`git ls-remote --heads origin`で確認）。

引き継ぎ資料4節に足す項目（予定）：
- フォントのpreload：`next/font`のpreloadの`<link>`がHTMLにない理由を調べる（読むだけ）。一人法人LPの1024px（CLS 0.154）と、フォント由来の小さなずれ（資産シミュレーターLP 375pxで0.026、1024pxで0.004）に効く可能性。
- 資産管理デモカードの+17pxずれ（案D、0.006）。
- `AssetManagementPromoSection`など、「HeroDemo.tsx/page.tsxの既存パターンを踏襲」というコメントが古くなっている件。
