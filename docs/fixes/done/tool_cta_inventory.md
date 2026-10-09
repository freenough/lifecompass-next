# 指示書：ツールのCTA（`*Cta.tsx`）の棚卸し（第1段階・読むだけ・実測）

対象：lifecompass-next（TOPのCTAとの比較のため、freenough-mainは読むだけ）
引き継ぎ資料：`handoff_cls_and_320px_complete.md` 4節の17番
段階：**第1段階（棚卸しのみ）**。そろえる作業（実装）は、この報告を見てKENZOが方針を決めてから、別の指示書で行う。

---

## 0. 守ること

- **コードの変更、commit、push、ブランチ作成は一切しない。** 読む・測る・報告するだけ。
- 検証用のスクリプトやログは、リポジトリの外（作業用の一時ディレクトリ）に置き、終わったら消す。最後に`git status`が作業前と同じであることを確かめる。
- 測定は`next build`→`next start`（本番ビルド）か、本番URLで行う。開発サーバーでは測らない。
- 測定は幅ごとに別のプロセスで順番に走らせる。終わったら`ps`で動きっぱなしの`next start`がないか確かめる。
- ローカルのCLS値は、フォントのpreloadがWindowsのビルドで出ないため、本番より悪く出る（font preload調査の結果）。**この作業はCLSを測らないので影響しない**が、見た目の実測値（幅・高さ）は、念のため本番でも確かめる。

## 1. 目的

ツールページ（約10本）のCTAは、`*Cta.tsx`で`bg-accent`を使っている。LPのCTA（`src/lib/ctaButtonClass.ts`の`CTA_BUTTON_CLASS`。値は幅304px、`#334155`、縦56px、角丸4px）とは別の見た目になっている疑いがある。

そろえるべきか・どこまでそろえるかをKENZOが決められるように、**今の状態を、事実の表にする。**

## 2. 調べること

### 2-1. 一覧（読む）
- `src/`の下で、CTAボタンを描いているファイルをすべて挙げる（`*Cta.tsx`、`bg-accent`を使う箇所、`CTA_BUTTON_CLASS`を使う箇所）。**`grep`で漏れなく**探し、検索した式も書く。
- ファイルごとに、次を記録する：
  - CTAが置かれるページ（URL）と、表示の条件（常時か、計算後か、など）
  - ボタンの要素（`<a>`か`<button>`か、`next/link`か）、リンク先、文言
  - classの全文（そのまま）
  - `CTA_BUTTON_CLASS`を使っているか、独自のclassか
- `bg-accent`が何色か（`globals.css`・Tailwindの`@theme`などでの定義）と、hover・focus-visible・activeの状態のclass。

### 2-2. 実測（本番、または`next start`）
ページごとに、CTAの`getBoundingClientRect`と`getComputedStyle`を、**320 / 375 / 768 / 1024px**で測る。

- 幅、高さ、`padding`、`border-radius`、`font-size`、`font-weight`、`line-height`、`color`、`background-color`、`border`、`box-shadow`、`transition`
- 横スクロールの有無（`document.documentElement.scrollWidth`と`innerWidth`）、CTAが親からはみ出していないか
- hover・focus-visibleを実際に当てたときの`background-color`・`outline`（取れる範囲で。取れなければ「取れない」と書く）
- 計算後にしか出ないCTAは、ページを操作して出す。出せなかったものは、出せなかったと書く（推測で埋めない）。
- **基準として、LPのCTA（`/asset-simulator`のHero CTA）とTOPのCTA（freenough-main、本番URL）も、同じ項目を測る。**

### 2-3. 比較表
基準（LPのCTA）との差を、項目ごとに「同じ／違う（値）」で表にする。**差がないものも、「同じ」と書く。**

### 2-4. 付随して分かること
- 同じ役割（ツールから、ほかのツールや`/app`へ進むCTA）なのに、見た目が2種類以上ある場合は、その分類。
- `rounded-lg`・`rounded-xl`など、4pxでない角丸が残っていないか（CTA周辺のみ）。
- 18番（LPのツール一覧が`rounded-none`）の準備として、**該当ファイルと行だけ**記録する（直さない）。

## 3. 報告の形

1. **結論（3行以内）**：CTAは何種類あり、基準とどれだけ違うか。
2. **一覧表**：2-1。
3. **実測表**：2-2（幅ごと）。
4. **基準との差の表**：2-3。
5. **そろえる場合の選択肢**（実装はしない）：たとえば「各`*Cta.tsx`に`CTA_BUTTON_CLASS`を使う」「`bg-accent`の定義を変える」「何もしない」。それぞれ、見た目の変化（どのページの何が変わるか）、影響範囲、リスク、確かめ方を1〜2行で。**推奨は1つに絞り、理由を書く。**
6. 18番の準備メモ：該当ファイルと行。
7. 後始末：`git status`が作業前と同じこと、動きっぱなしのプロセスがないこと。

## 4. 完了の条件

- 変更ゼロ（`git status`が作業前と同一）。
- 上の報告がそろっている。
- 測れなかった項目は、理由を書く。
