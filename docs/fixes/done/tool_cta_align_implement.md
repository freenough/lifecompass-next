# 指示書：ツールCTA 10本を、LPのCTAに近づける（第2段階・実装・commitなし）

対象：lifecompass-next
引き継ぎ資料：`handoff_cls_and_320px_complete.md` 4節の17番。棚卸しの報告（第1段階）を受けたKENZOの決定にもとづく。
段階：**第2段階（実装まで。commit・pushはしない）**。第3段階（commit・push・Preview）、第4段階（マージ・本番確認・ブランチ削除）は、KENZOの明示的な指示のあと、別の指示書で行う。

---

## 0. KENZOの決定（この範囲だけ。広げない）

ツールCTA 10本のclassについて、**次の2つだけ**を変える。

1. `font-bold`（700）を`font-semibold`（600）にする。
2. `hover:opacity-90`を取り除く（hover時に色が薄くなる動きを外す）。

**変えないもの**：幅（`w-full sm:w-auto`）、縦padding（`py-3`）、横padding、高さ、折り返し、色（`bg-accent`）、角丸、`transition-all`、`hover:-translate-y-0.5`、`hover:shadow-lg`、`mt-2`／`mt-3`、文言。**常時の影（`shadow`）も足さない。**

## 1. 守ること

- 作業ブランチ`fix/tool-cta-align`を`main`から作って作業する。**commit、push、マージはしない。**
- 変えるのは、棚卸しで挙がった次の10ファイルの、CTAの`className`だけ。
  - `tools/CompoundInterestCta.tsx`、`FireAgeCta.tsx`、`MonthlyInvestmentCta.tsx`
  - `education-cost/EducationCostCta.tsx`、`ideco-withdrawal/…`、`pension-timing/…`、`prepay-vs-invest/…`、`resident-tax-timing/…`、`retirement-ideco-timing/…`、`retirement-tax/…`
  - 先に`find src -name "*Cta*.tsx"`と、棚卸しの報告の行番号を照らし合わせ、**10本のclassが同じ文字列（`mt-`以外）であること**を確かめてから変える。違うものがあれば、変えずに報告する。
- ブログ記事末のCTA、ブログ一覧のカード、LP、一人法人LP、TOP（別リポジトリ）は**触らない**。
- `bg-accent`の定義（`globals.css`）、フッター、フォームのトグルは触らない。
- 検証用のスクリプトやログは、リポジトリの外に置き、終わったら消す。

## 2. 確かめること

### 2-1. 変更の確認
- `git diff --stat`：10ファイル、各ファイルの変更はCTAのclass 1行だけ（+1 −1）であること。
- `grep -rn "hover:opacity-90" src`で、**ツールCTAに残っていない**こと（ほかの場所に残っているものは、触らず一覧だけ報告）。
- `tsc --noEmit`と`npm run build`が通ること。

### 2-2. 太さ600が、実際に別の太さで描かれるかの確認（重要）
`layout.tsx`のNoto Sans JPは、`weight:['400','500','700']`だけを読み込んでいる。**600は読み込まれていないため、ブラウザは700で描く可能性が高い**（CSSのフォント選択のルール。これは推定）。LPのCTA（`font-semibold`）も同じはず。

- `next build`→`next start`で、ツールCTAの1つを、変更前（`main`）と変更後で比べる。**文字の幅（`getBoundingClientRect().width`、Range/テキストノードの幅）が変わるか**を測り、見た目が700と同じか確かめる。LPのHero CTAの文字幅とも比べる。
- 結果を「変わる／変わらない」で報告する。**変わらなければ、太さの変更は見た目に出ない**（コードをLPにそろえるだけ）と明記する。
- フォントのpreloadがWindowsのビルドで出ないため、CLSの値はこの作業では見ない。

### 2-3. 見た目の実測（変更前後、`next start`）
ツールページのうち、**文言が最も長いもの・最も短いもの・education-cost（文言が違う）**の3ページで、幅 **320 / 375 / 768 / 1024px**：

- CTAの幅・高さ・行数、`font-weight`の計算値、親からのはみ出し、横スクロールの有無。
- 変更前後で、**幅・高さ・行数が同じ**であること（太さが実際に変わる場合は、幅が少し変わるので、その値と、行数が変わらないか）。
- hover：`getComputedStyle`の`opacity`が、変更前は0.9、変更後は1であること（hover状態を当てて、transitionの終わり＝600ms待ってから読む）。浮き・影（`-translate-y-0.5`、`shadow-lg`）は、変更前後で同じこと。

## 3. 報告の形

1. **結論（3行以内）**：変更した内容、見た目が変わったか。
2. 変更の確認（2-1）：`git diff --stat`、`grep`の結果、`tsc`・ビルドの結果。
3. 太さ600の確認（2-2）：変わる／変わらない、数値。
4. 実測表（2-3）：変更前後。
5. 気づいたこと（直さない）：例えば、`hover:opacity-90`が残る場所。
6. 状態：ブランチ名、`git status`（commitしていないこと）、動きっぱなしのプロセスがないこと。

## 4. 完了の条件

- 10ファイルのclass 1行ずつだけが変わっている。commit・pushはしていない。
- 上の報告がそろっている。問題があれば、変更を進めず、事実だけ報告する。
