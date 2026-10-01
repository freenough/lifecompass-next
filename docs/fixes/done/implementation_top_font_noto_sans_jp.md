# 実装指示書：TOPページの本文フォントを、LPと同じNoto Sans JPに揃える

作成日：2026-10-01
種別：**実装指示**（対象：`freenough-main`リポジトリ、`app/layout.tsx`と`app/globals.css`）
前提：TOPの本文フォントは、`globals.css`の`body { font-family: Arial, Helvetica, sans-serif; }`で固定されている。日本語はArialにないため、閲覧する端末の標準フォントに切り替わる。一方、`lifecompass-next`（資産シミュレーターLP・一人法人LP）は、`next/font/google`のNoto Sans JPを使っている。引き継ぎ資料（2026-09-30）で「TOPの本文フォントがArial表示になっているバグ（既存、別タスク）」としていたものへの対応。

---

## 0. 今回の内容

TOPの書体を、LPと**まったく同じ設定**のNoto Sans JPに揃える。

- LPの設定（変更しない・そのまま写す）：
  ```ts
  const notoSansJP = Noto_Sans_JP({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    display: 'swap',
  });
  ```
  `<html className={notoSansJP.className}>`で全体に適用する。
- **読み込む太さは、LPと同じ400・500・700の3つにする（800や600を足さない）。** 理由：TOPのクラス（`font-medium`＝500、`font-semibold`＝600、`font-bold`＝700、`font-extrabold`＝800）は、LPと同じ書き方になっている。LPは3つしか読み込まないため、600と800は、ブラウザの仕様で、それぞれ700で描かれている。TOPだけ600と800を足すと、ボタンやロゴの太さがLPと食い違う。
- `page.tsx`、`Header.tsx`、`Footer.tsx`のクラス名は、**変更しない**。
- **文字サイズ（px、`clamp`、`cqi`）、行間、字間、余白は、一切変えない。変えるのは書体だけ。** TOPの文字サイズは、KENZOがTOP用に調整済みのため。
- **採用の条件：レイアウトが変わらないこと。** 7-3の判定基準を、すべて満たす場合だけ、採用できる。1つでも満たさない場合は、変更を残したまま止めて、報告する（commitしない。元に戻すかどうかは、KENZOが決める）。

## 1. 作業上の絶対ルール

1. 最新の`main`から`feature/top-font-noto-sans-jp`ブランチを作って作業する。
2. **第1段階はローカル確認・報告のみ。commit・pushはKENZOの明示的な指示があってから。**
3. セッション開始時に、`main`に無関係な未コミット変更が残っていたら、ファイル一覧を報告して確認を得るまで手を付けない。
4. **`AGENTS.md`の指示に従う。** コードを書く前に、`node_modules/next/dist/docs/`の`next/font`に関するガイドを読むこと。`lifecompass-next`（Next 14）と書き方が異なる点があれば、完了報告に書く。
5. 推測で値を決めない。迷ったら実物の挙動を確認し、判断理由を報告に書く。
6. 気づいた点は、**修正せず報告だけ**にする。

## 2. スコープ

### 変更するファイル（この2つだけ）
- `app/layout.tsx`
- `app/globals.css`

### 対象外（触らない）
- `app/page.tsx`、`app/components/*`（クラス名・文言・数値）
- Hero見出しの`clamp(2.5rem, 6.6cqi, 4.5rem)`などの数値。**折り返しが変わっても、今回は数値を変えない**（7-3の通り、報告だけにする）。
- `Reveal`関連（`Reveal.tsx`、`globals.css`の`--rv-*`と`.rv`のルール）。
- `lifecompass-next`。

---

## 3. `app/layout.tsx`

1. `next/font/google`のimportを、`Geist`と`Geist_Mono`から、`Noto_Sans_JP`と`Geist_Mono`に変える。
   - **Geist Mono（等幅）は残す。** Hero上部の「FREE + ENOUGH.」が`font-mono`で使っているため。
   - **Geist（欧文の本文用）は、本文に使われていない**（`body`がArial固定のため）。import、`geistSans`の定義、`${geistSans.variable}`を削除する。他に`--font-geist-sans`を参照している箇所がないか、`grep`で確認し、あれば報告する。
2. 3節冒頭の設定で`notoSansJP`を定義する。
3. `<html>`の`className`を、`${notoSansJP.className} ${geistMono.variable} antialiased`にする（`lang="ja"`と`suppressHydrationWarning`、`REVEAL_BOOT_SCRIPT`などは、そのまま）。

## 4. `app/globals.css`

1. `body`の`font-family: Arial, Helvetica, sans-serif;`を**削除**する（`color`は残す）。
2. `@theme inline`の`--font-sans: var(--font-geist-sans);`を**削除**する（Geist Sansを読み込まなくなるため、参照先がなくなる）。`--font-mono: var(--font-geist-mono);`は残す。
3. 上記以外（`--background`、`--foreground`、`--color-*`、`Reveal`のCSS）は変更しない。

---

## 5. 確認したいこと（実装前の調査）

- Tailwind 4のpreflightは、`html`に`font-family`を設定する。`<html>`の`className`（`next/font`が生成するクラス）が、これに勝って適用されることを、ブラウザで確認する（`getComputedStyle`で`body`と`html`の`font-family`を見る）。LPと同じ仕組みで動くはずだが、Next 16・Tailwind 4で、実際にそうなることを確認する。

## 6. 作業の進め方

1. 変更前の`main`で、10幅のフルページのスクリーンショットを撮る（「動きを減らす」設定をエミュレートした状態で。`Reveal`の初期非表示を避けるため）。
2. 変更を入れる。
3. 同じ条件で、変更後のスクリーンショットを撮る。

## 7. 検証

375, 390, 768, 799, 800, 1024, 1280, 1366, 1440, 1920の各幅で確認する。**今回は、書体が変わるため、変更前後の差分は0にならない。** 見るのは、差分があるかどうかではなく、次の項目である。

### 7-1. 書体が実際に適用されていること
- Chromeのデバッガ（CDP）の`CSS.getPlatformFontsForNode`などで、本文、見出し、ボタン、ロゴが、**実際にNoto Sans JPで描かれている**ことを確認する（Arialや端末の標準フォントになっていないこと）。
- 「FREE + ENOUGH.」のタグラインが、これまでどおりGeist Monoで描かれていること。
- ネットワークに、Google Fontsなど外部ドメインへの書体のリクエストが**ないこと**（`next/font`がビルド時に自己ホストする）。

### 7-2. 太さ
- ボタン（`font-semibold`＝600）が、700で描かれていること。ロゴ（`font-extrabold`＝800）が、700で描かれていること。LPと同じ見え方になるため。
- 変更前（Arial／端末の標準フォント）との、ロゴとボタンの見た目の違いを、スクリーンショットで示す。

### 7-3. 折り返しとレイアウトの崩れ（採用の判定）

**判定基準（10幅すべてで、変更前の`main`と比べる）**
1. Hero見出しの折り返し位置と行数が、同じ。
2. MESSAGEと2本柱の説明文の行数が、同じ（各段落ごと）。
3. ページ全体の高さと、各セクション（Hero、MESSAGE、SERVICES）の高さが、同じ（±1pxまでの丸め誤差は許容）。
4. 横スクロールがない。ヘッダーのロゴとナビが、折り返し・はみ出しをしていない。

4つとも満たせば「採用可」。1つでも違えば「採用不可」として、違う幅、変更前後の値（行数、高さ）、スクリーンショットを報告し、commitしない。

**確認の詳細**
- **Hero見出し**：「あなたにとっての／「足りる」を、／数字で描く。」の折り返し位置が、10幅すべてで、変更前と同じか。違う幅があれば、その幅、変更前後の行数、見出しがコンテナ幅に収まっているか（はみ出していないか）を、数値で報告する。**数値は変えない。**
- **MESSAGEと2本柱の説明文**：文節ごとの折り返し（`<wbr />`と`keep-all`）の結果の行数が、変更前と比べてどうか。違う幅があれば、報告する。
- **レイアウト**：ページ全体の高さ、MESSAGEの帯、2本柱のグリッド（800px以上の左右の上揃え）、01と02の図のカードの高さが揃っていることに、悪化がないか。
- **横スクロール**：どの幅でも発生していないこと。
- **ヘッダー**：ロゴと2つのナビが、全幅で、折り返したり、はみ出したりしていないこと。スマホのメニューの開閉も、確認する。

### 7-4. 表示速度（確認のみ）
- フォントの読み込み中に、文字が目立ってずれる（レイアウトシフト）ことがないか、目視で確認する。`next/font`が、代替フォントの大きさを自動で調整する仕組みを持つため、通常は問題ない。
- Geist（欧文の本文用）を読み込まなくなったことで、転送されるフォントのファイルが、変更前と比べてどう変わったか（バイト数）を報告する。

### 7-5. 他への影響
- `Reveal`の演出（6個）が、これまでどおり動くこと。
- `/robots.txt`、`/sitemap.xml`が、変更前と同じであること。

### 7-6. ビルドとlint
- `npm run build`が通る。
- `npm run lint`：`main`と同じ2件（`Header.tsx:27`、`Footer.tsx:50`の`no-html-link-for-pages`）のままで、増えていないこと。

---

## 8. 完了報告の形式

1. 変更したファイルと、変更の要点（`layout.tsx`と`globals.css`の差分）
2. 5節の確認結果と、Next 16のドキュメントで分かった、`lifecompass-next`との違い
3. 7の各項目の結果。**7-3の判定（採用可／採用不可）を、最初に書く。** 違いがあった幅があれば、幅ごとの変更前後の値を表で示す
4. `npm run build`と`npm run lint`の結果
5. 気づいた点があれば別枠で記載。修正はせず報告のみ

commit・pushは、KENZOの明示的な指示があってから行う。

---

## 9. 補足（KENZO向け・Claude Codeには関係なし）

- 目で見て差が小さいのは、日本語の標準フォント（WindowsのYu Gothicなど）と、Noto Sans JPが、どちらも似たゴシック体のため。差が出やすいのは、欧文と数字の形、端末による違いの出方。この変更で、どの端末でもLPと同じ書体になる。
- 書体そのものを別のものに変えたくなった場合は、LP・一人法人LP・TOPの3か所で折り返しを確認し直すため、別の作業として扱う。
