# 実装指示書：資産シミュレーターLPへのスクロール表示演出（Reveal）の追加

作成日：2026-10-01
種別：**実装指示**（対象：`lifecompass-next`リポジトリ、資産シミュレーターLP＝`src/app/page.tsx`）
前提：演出の強さは、Claudeで作成したプレビューで比較し、KENZOが「しっかり」に決定済み。

---

## 0. 今回の内容

LPの各セクションが、画面に入ったときに「透明から現れながら、下から少し上がる」演出を追加する。

- 強さ（確定値）：**24px上から／0.9秒／複数要素は0.12秒ずつ時間差**
- 動かすのは`opacity`と`transform: translateY`だけ。拡大・ぼかし・clip（ワイプ）は使わない
- 各要素で**一度だけ**再生する（スクロールで往復しても再発火しない）
- 追加する依存ライブラリはなし（Framer Motion等は入れない）

## 1. 作業上の絶対ルール

1. `main`から`feature/lp-scroll-reveal`ブランチを作って作業する。
2. **第1段階はローカル確認・報告のみ。commit・pushはKENZOの明示的な指示があってから。**
3. セッション開始時に、`main`に無関係な未コミット変更が残っていたら、ファイル一覧をKENZOに報告し、確認を得るまで手を付けない（CLAUDE.mdのコミットルールどおり）。
4. `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す。
5. **推測で値を決めない。** 迷ったら実物の挙動を確認して、判断理由を完了報告に書く。

## 2. スコープ

### 対象
資産シミュレーターLP（`src/app/page.tsx`と、そこから呼ばれる`ConcernBlockLP`、`AssetManagementPromoSection`）。

### 対象外（触らない）
- Hero（見出し、CTA、`HeroDemo`）
- FIREガイドのカルーセル（`FireGuideCarousel`）。見出し以外は演出なし
- 資産管理ブロックの右側のデモ（`AssetProgressBadges`、`AssetBreakdownDonut`）。既存のカウントアップをそのまま使う
- 一人法人LP（`/hitori-hojin`）、`/tools`、`/concerns`、その他のページ
- `freenough-main`（TOPページ）。今回は別作業
- 新規のカウントアップ（既にあるため追加しない）

### 共有コンポーネントの扱い（重要）
次のコンポーネントは、LP以外でも使われている。**LP以外の見た目・挙動を変えないこと。**

| コンポーネント | LP以外の使用箇所 | 方針 |
|---|---|---|
| `SectionHeading` | `/tools`、`/concerns`、一人法人LP | **本体は変更しない。** 呼び出し側で`<Reveal>`で包む |
| `AssetManagementPromoSection` | 一人法人LP（`HitoriHojinManageSection`） | 任意のprop `reveal?: boolean`（既定`false`）を追加し、LPからだけ`reveal`を渡す |
| `ConcernCard` | `/concerns`の一覧 | **本体は変更しない。** `ConcernBlockLP`側で包む（`ConcernBlockLP`はLPだけで使用） |

---

## 3. `Reveal`コンポーネントの仕様

### 3-1. 置き場所と役割
- `src/components/motion/Reveal.tsx`（`'use client'`）
- 子要素を、画面に入ったタイミングで表示させるラッパー。
- props：`children`、`className?`、`as?`（`'div' | 'li' | 'h2' | 'p'`、既定`'div'`）。
- **`className`は`Reveal`自身が描画する要素に付ける**（余計なラッパーを増やさないため）。例：3カラムの各項目は、元の`<div className="flex flex-col items-center text-center">`を`<Reveal className="flex flex-col items-center text-center">`に置き換える。

### 3-2. 検知と時間差
- `IntersectionObserver`（threshold `0.12`、rootMargin `'0px 0px -6% 0px'`）を、モジュール内で**1つだけ共有**する。
- 画面に入った要素に`in`クラスを付け、**すぐに監視を解除する**（一度だけ再生）。
- **時間差は、同じコールバックで同時に入った要素のDOM順**で決める。`transition-delay = min(順番, 4) × 0.12s`。
  - こうすると、4列が2列に折り返す幅でも、列数を数えずに自然な時間差になる。
  - `index`のようなpropは作らない。
- `prefers-reduced-motion: reduce`のときは、監視せず即表示する。

### 3-3. CSS（`src/app/globals.css`に追記）
- `:root`に`--rv-dist: 24px; --rv-dur: 0.9s; --rv-stagger: 0.12s;`を定義（後から調整しやすくするため）。
- 初期の非表示は、**`html`に`js-reveal`クラスが付いているときだけ**適用する。
  - `.js-reveal .rv:not(.in)`：`opacity: 0; transform: translateY(var(--rv-dist));`
  - `.rv`：`transition: opacity var(--rv-dur) ease-out, transform var(--rv-dur) ease-out;`（`js-reveal`配下のみ）
  - `will-change`は、表示前の要素にだけ付ける（表示後は外す）。
- `@media (prefers-reduced-motion: reduce)`では、`.rv`を常に表示（`opacity: 1; transform: none; transition: none`）。
- 既存の`prefers-reduced-motion`ルール（カルーセル用）は変更しない。

### 3-4. `js-reveal`クラスの付与（内容が消えたままにならないための仕組み）
- `src/app/layout.tsx`の`<html>`に`suppressHydrationWarning`を追加し、`<body>`の先頭付近に、`html`へ`js-reveal`を付ける小さなインラインスクリプトを置く（既存のJSON-LDの`dangerouslySetInnerHTML`と同じ書き方）。
  - 目的：JSが動かない環境では、クラスが付かず、内容は最初から表示されたままになる。
  - 初期表示のちらつきを避けるため、ハイドレーションを待たずに、HTML解析中にクラスを付ける。
- **保険（必須）**：スクリプト内で、一定時間（**4秒**）後に、`Reveal`が動き出していなければ`js-reveal`を外す。`Reveal`はマウント時に`window`へ「動作開始」の目印を付ける。
  - 目的：ハイドレーションが失敗した場合に、非表示のままになる事故を防ぐ。
- `layout.tsx`は全ページ共通のため、`.rv`を使うのはLPだけであること（他ページの見た目が変わらないこと）を確認する。

---

## 4. 適用箇所（`src/app/page.tsx`ほか）

| セクション | 適用 |
|---|---|
| Hero | **なし** |
| ③ 差別化（3カラム） | 各項目を`<Reveal className="…元のクラス…">`に置き換える |
| ③.7 お悩み（`ConcernBlockLP`） | `<SectionHeading>`を`<Reveal>`で包む。各`ConcernCard`も`<Reveal>`で包む |
| ③.5 FIREガイド | `<SectionHeading>`だけ`<Reveal>`で包む。`FireGuideCarousel`は**触らない** |
| ③.6 かんたん計算ツール | `<SectionHeading>`を`<Reveal>`で包む。4枚のカードも各々`<Reveal>`で包む |
| ③.8 資産管理導線 | `reveal`propを`true`にし、**左の文章列全体を1つの`Reveal`**にする。右のデモは触らない |
| ④ ケーススタディ | `<SectionHeading>`を`<Reveal>`で包む。各行（キャラクター）も`<Reveal>`で包む |
| ⑤ 使い方 | `h2`を`<Reveal as="h2">`に。3つの`li`を`<Reveal as="li" className="…元のクラス…">`に置き換える |
| ⑥ CTA | `h2`、補足文、メインボタン、「無料・登録不要」の注記を、それぞれ`Reveal`で包む。「すでに試算した方は」の区切り線とテキストリンクは、まとめて1つの`Reveal` |

### 4-1. レイアウトが崩れやすい箇所（実装時に必ず確認）
1. **グリッドの子を包むとき**：包んだ`Reveal`がグリッドの子になる。カードの高さが揃わなくなる場合は、`Reveal`に`h-full`、中の要素に`h-full`（`[&>*]:h-full`など）を付けて、元と同じ高さの揃い方にする。
2. **ツールのカード（`Link`）**：`Link`をそのまま包むと`a`がインライン要素になり、`border-y`と`hover:bg-white`の見え方が変わる。`Link`に`block`（必要なら`h-full`）を付けて、元の見た目と一致させる。
3. **ケーススタディの行**：`<a>`（リンクあり）と`<div>`（近日公開）が混在している。包んだあとも、区切り線（`divide-y`）と`hover:bg-white/60`の見え方が変わらないことを確認する。`<a>`には`block`が必要になる可能性がある。
4. **ホバーの挙動**：カードやボタンにある`transition-all`と`hover:`の挙動が、`Reveal`の`transition`と干渉しないこと。`Reveal`は、ホバー用の要素とは**別の要素**（外側）に付けること。
5. **最終的なレイアウトは1pxも変えない。** 演出が終わった状態は、今と完全に同じ見た目であること。

---

## 5. 検証

375, 390, 768, 799, 800, 1024, 1280, 1366, 1440, 1920の各幅で確認する。

### 5-1. 見た目が変わっていないこと
- **注意**：フルページのスクリーンショットは、スクロールしていない位置の要素が非表示のまま写る。撮影は、`prefers-reduced-motion: reduce`をエミュレートした状態で行い、**変更前（`main`）と変更後を比較**して、差分がないことを確認する。
- 差分がある場合は、どこがどう違うかを報告する。

### 5-2. 演出の動き
- 各セクションが、画面に入ったときに一度だけ現れる。上下にスクロールを往復しても、再生し直さない。
- 3カラム、2列カード、4列カード、ケーススタディの行、CTAが、DOM順に時間差で現れる。
- 最大の遅れ（4番目の要素）が、0.12×4＋0.9＝約1.4秒以内であること。
- Hero、`HeroDemo`、カルーセル、資産管理の右のデモが、変更前と同じ動きであること（カウントアップが従来どおり動く）。

### 5-3. 安全性
- **JSを無効にして開き、全内容が表示されている。**
- **「動きを減らす」設定（DevToolsのエミュレート）で、全内容が最初から表示されている。**
- ページの途中まで進んだ状態でリロードしても、内容が消えたままにならない。
- ハイドレーション関連の警告、コンソールエラーが出ていない。
- 4秒の保険が働く場合の挙動を、確認できる範囲で確認する（例：`Reveal`のマウントを一時的に止めて、4秒後に全内容が表示されるか）。

### 5-4. 他ページへの影響
- 一人法人LP（`/hitori-hojin`）、`/tools`、`/concerns`の表示が、変更前と同じであること（共有コンポーネントに手を入れたため、必ず確認）。

### 5-5. ビルド
- `npm run build`（`prebuild`の`check-raw-html-in-blog.js`を含む）が通る。

---

## 6. 完了報告の形式

1. 変更したファイルの一覧（新規と既存を分ける）
2. `Reveal`の最終的な数値（距離・時間・時間差・threshold）と、`layout.tsx`のスクリプトの内容
3. 4-1の各項目で、どう対処したか
4. 5の各項目の結果（5-1は、変更前後の差分がないことを示す）
5. `npm run build`の結果
6. 気づいた点があれば別枠で記載。**修正はせず、報告のみ**

commit・pushは、KENZOの明示的な指示があってから行う。
