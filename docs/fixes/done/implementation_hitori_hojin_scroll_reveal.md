# 実装指示書：一人法人LPへのスクロール表示演出（Reveal）の展開

作成日：2026-10-01
種別：**実装指示**（対象：`lifecompass-next`リポジトリ、一人法人LP＝`src/app/hitori-hojin/page.tsx`）
前提：資産シミュレーターLPへのReveal（`implementation_lp_scroll_reveal.md`と`..._fallback_guard.md`）は本番反映・確認済み。今回は**同じ`Reveal`と同じ数値（24px／0.9秒／時間差0.12秒）をそのまま一人法人LPへ展開する。**

---

## 0. 今回の内容

一人法人LPの各セクションに、既存の`Reveal`コンポーネントを適用する。

- `Reveal.tsx`、`globals.css`、`layout.tsx`のスクリプトは**変更しない**（すべて既存のものをそのまま使う）。数値は`globals.css`の`--rv-*`をLPと共有する（片方だけ変えることはしない）。
- 新しい依存は追加しない。
- 演出が終わった状態の見た目は、今と1pxも変えない。

## 1. 作業上の絶対ルール

1. 最新の`main`から`feature/hitori-hojin-scroll-reveal`ブランチを作って作業する。
2. **第1段階はローカル確認・報告のみ。commit・pushはKENZOの明示的な指示があってから。**
3. セッション開始時に、`main`に無関係な未コミット変更が残っていたら、ファイル一覧を報告して確認を得るまで手を付けない。
4. `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す。
5. 推測で値を決めない。迷ったら実物の挙動を確認し、判断理由を完了報告に書く。
6. 気づいた点は、**修正せず報告だけ**にする。

## 2. スコープ

### 対象ファイル（この3つだけ）
- `src/app/hitori-hojin/page.tsx`
- `src/components/hitori-hojin/HitoriHojinGuideSection.tsx`
- `src/components/hitori-hojin/HitoriHojinManageSection.tsx`

### 対象外（触らない）
- **Hero**（見出し、説明文、`HitoriHojinForkDiagram`、Hero内のCTA）。資産シミュレーターLPと同じく演出なし。
- `HojinCompositionDemo`（右側のデモ。既存の画面内検知とカウントアップをそのまま使う）。
- `HitoriHojinArticleList`の中身（行ごとには演出しない。記事数が増えても遅れが伸びないようにするため）。
- `HitoriHojinBlogListRows`、`/hitori-hojin/blog`、`/hitori-hojin/assets`、`/hitori-hojin/simulate`。
- `SectionHeading`本体（`/tools`、`/concerns`、資産シミュレーターLPでも使用）。**呼び出し側で`Reveal`で包む。**
- 資産シミュレーターLP、`freenough-main`。

### 共有の確認（調査済み）
`HitoriHojinGuideSection`、`HitoriHojinManageSection`、`HitoriHojinSimulatorCta`、`HitoriHojinForkDiagram`は、`/hitori-hojin`のページからしか使われていない。そのため、これらのファイルに`Reveal`を直接入れてよい（propの追加は不要）。実装前に、`grep`でもう一度確認すること。

---

## 3. 適用箇所

| セクション | 適用 |
|---|---|
| Hero | **なし** |
| 導入（2段落） | 外側の`<div className="text-base text-slate-700 leading-relaxed space-y-4 [line-break:strict]">`を、**1つの`<Reveal className="…同じクラス…">`に置き換える**（段落ごとには分けない。`space-y-4`の間隔を変えないため） |
| 一人法人ガイド（`HitoriHojinGuideSection`） | `<SectionHeading>`を`<Reveal>`で包む。`lg:grid-cols-2`の2つのグループ（見出しh3・説明文・記事リスト）を、それぞれ`<Reveal>`にする（`<div key={key}>`を`<Reveal key={key}>`に置き換える） |
| 管理する（`HitoriHojinManageSection`） | 左の文章列（`flex-1 flex flex-col items-center text-center lg:items-start lg:text-left`）全体を**1つの`<Reveal className="…同じクラス…">`**に置き換える。右のデモカード（`HojinCompositionDemo`）は触らない |
| 下部CTA | 説明文の`<p>`を`<Reveal as="p" className="…同じクラス…">`に置き換える。`HitoriHojinSimulatorCta`は`<Reveal>`で包む（ボタンのホバー用の`transition-opacity`と干渉しないよう、`Reveal`は外側に付ける） |

`.rv`の要素数は、ページ全体で**7個**になる想定（導入1、ガイド見出し1、ガイドのグループ2、管理1、下部CTAの説明文1、下部CTAのボタン1）。実装後に数えて、数が違えば理由を報告する。

### 3-1. レイアウトが崩れやすい箇所（実装時に必ず確認）
1. **ガイドの2つのグループ**：`grid items-start`の子が`Reveal`になる。`items-start`が効いたまま、件数の少ない側が引き伸ばされないこと。`lg`未満の縦積みの間隔（`gap-10`）も変わらないこと。
2. **下部CTA**：`text-center`の中で、ボタンが中央に残ること。説明文の`<br />`と`PhraseBreak`の折り返しが変わらないこと。
3. **`-mb-16`**：下部CTAのセクションの`-mb-16`と背景色が、フッターとの間に白い隙間を作らないこと（変更前と同じ）。
4. **管理セクションの左列**：`flex-1`と`lg:items-start`の挙動、右カードとの縦の中央揃え（`lg:items-center`）が変わらないこと。デモ読み込み中の枠（`h-[162px]`）による高さの確保も、そのまま。

---

## 4. 検証

375, 390, 768, 799, 800, 1024, 1280, 1366, 1440, 1920の各幅で確認する。ローカルのURLは`/asset-simulator/hitori-hojin`（basePathあり）。

### 4-1. 見た目が変わっていないこと
- 「動きを減らす」設定をエミュレートした状態で、変更前（`main`）と変更後のスクリーンショットを比較し、**差分がないこと**。
- この設定では、`HojinCompositionDemo`も最初から最終状態で表示されるため、差分は0になる想定。差分が出た場合は、場所と原因を報告する。

### 4-2. 演出の動き
- 7個の要素が、画面に入ったときに一度だけ現れる。往復スクロールで再生し直さない。
- ガイドの2つのグループが、横並び（lg以上）のときに、同時に入って時間差で現れる。
- 右のデモカードは、従来どおり自分の検知でカウントアップする（`Reveal`の影響を受けない）。
- Heroは、変更前と同じく何も動かない。

### 4-3. 安全性（前回と同じ項目を、一人法人LPで確認）
- JSを無効にして、全7要素が表示されている。
- 「動きを減らす」設定で、DOMContentLoadedの時点から、全7要素が表示されている。
- 途中までスクロールしてリロードしても、内容が消えたままにならない。
- 全JSチャンクをブロックしてハイドレーションを失敗させ、約3.5秒では非表示、約5.5秒では`js-reveal`が外れて全要素が表示される。
- コンソールに、ハイドレーションの警告やエラーがない。

### 4-4. 他ページ
- `/`（資産シミュレーターLP）、`/tools`、`/concerns`、`/hitori-hojin/blog`が、変更前と**0ピクセル差**であること（1つの幅でよい）。資産シミュレーターLPは、動きを減らす設定で比較する（`HeroDemo`のチャートの差分は、これまでどおり許容）。
- 資産シミュレーターLPのReveal（29個）が、これまでどおり動くこと。

### 4-5. ビルド
- `npm run build`（`prebuild`を含む）が通る。

---

## 5. 完了報告の形式

1. 変更したファイルの一覧
2. `.rv`の要素数（想定は7個）と、3-1の各項目をどう確認したか
3. 4の各項目の結果（4-1は、変更前後の差分がないことを示す）
4. `npm run build`の結果
5. 気づいた点があれば別枠で記載。修正はせず報告のみ

commit・pushは、KENZOの明示的な指示があってから行う。

---

## 6. 補足（KENZO向け・Claude Codeには関係なし）

- 一人法人LPの本番URLは`https://www.freenough.com/hitori-hojin`。デプロイ後は、そのURLで確認する（Previewは`/asset-simulator/hitori-hojin`）。
- 動きの強さを変えたくなった場合は、`globals.css`の`--rv-*`が資産シミュレーターLPと共通のため、両方に効く。
