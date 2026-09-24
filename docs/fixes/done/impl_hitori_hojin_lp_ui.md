# 実装指示：一人法人LP（`/hitori-hojin`）本文部分のUI改修

作成日：2026-09-24
種別：**実装**
対象リポジトリ：`lifecompass-next`
関連：`investigation_hitori_hojin_lp_ui.md`（調査済み。本指示の前提）

---

## 背景と方針

調査の結果、一人法人LPの本文部分は、本体（資産シミュレーター側）でそろえた基準からほぼ全面的に外れていた。特に、記事カードのアイコン列が190pxで固定されているため、375pxではテキストに約109pxしか残らず、タイトルが「…」で切れている。

今回は、**Hero以外の本文部分**を本体の基準にそろえる。Heroと配色（`#0F2A4A`・`#EFF6FF`）は、別途デザインを検討するため対象外とする。

---

## 0. 作業前の確認

1. `git status` と `git branch --show-current` を報告に貼る
   - 想定：`main`。未追跡は `docs/fixes/active/` の調査指示書・本指示書・`hitori-hojin-lp-ui/`（スクリーンショット）
   - それ以外の未commitの変更があれば、作業を始めずにファイル名だけ報告して止まること
2. 作業ブランチを作る
   ```
   git switch -c feature/hitori-hojin-lp-ui
   ```
3. **変更前の比較用スクリーンショット**を撮っておく
   - 一人法人LP：1440・768・375px
   - 本体LP（`/asset-simulator`）の `SectionHeading` を使っている全セクション：1440・375px（2節の変更で見た目が変わっていないことを確かめるため）

---

## 1. 対象外（触らないもの）

- Heroセクション（文言・配色・サイズを含め一切変更しない）
- ヘッダー・フッター（`Header.tsx`・`HeaderLogo.tsx`・`Footer.tsx`）
- 一人法人ブログ一覧・記事詳細
- `hitoriHojinBlog.ts` の記事の取得・絞り込み・並び順のロジック
- ロックファイル（`simulate.ts`・`analyze.ts`・`montecarlo.ts`・`types.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`・`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`）
- 本体LP・記事詳細・`SimulatorCtaCard` などにある「無料・登録不要…」の直書き（今回は定数を作るだけで、置き換えは別タスク）

---

## 2. `SectionHeading` に「同じタブで開く `<a>`」の選択肢を追加

現状の `SectionHeading` のリンクは、`next/link`（basePathが付く）か、`linkExternal` による別タブの `<a>` の2択しかない。一人法人LPから一人法人ブログ（`https://www.freenough.com/hitori-hojin/blog`）へ、**同じタブで**移動できるようにする。

- 同じタブで開く `<a>`（`target` なし）を描画する選択肢を、引数で1つ追加する。名前・形は既存の `linkExternal` との整合を見て決めてよい
- **引数を指定しない既存の呼び出し元の出力（HTML・見た目）は、1文字も変えないこと**
- 見出し部分の見た目（線・ラベル・h2・説明文・リンクの位置と色）は既存のまま

確認：本体LPの `SectionHeading` を使う全セクションについて、0節で撮ったスクリーンショットと比べて差分がないこと。

---

## 3. 本文の幅と導入文

1. Hero以外の本文セクションで直書きしている `mx-auto max-w-5xl px-6` 等を、`Container`（default）に置き換える
   - 1440pxで本文の左端が168px、768px・375pxで24pxになること（本体LPと同じ）
2. 導入文（2段落）
   - `max-w-2xl`（1行およそ40字）に絞る。左寄せのまま
   - `[line-break:strict]` を付ける
   - 文字サイズ・行間・色は変えない

---

## 4. 記事一覧セクションの再構成

### 4-1. 見出し

「一人法人を知る」「一人法人を考える」の2つの見出しをやめ、**セクション全体の見出しを `SectionHeading` で1つ**にする。2節で追加した「同じタブで開く `<a>`」を使う。

| 要素 | 文言（**仮**。PreviewでKENZOが確認して変更する可能性あり） |
|---|---|
| ラベル | 一人法人ガイド |
| h2 | 一人法人を、知る・考える |
| 説明文 | 法人化の基本から、自分に合うかどうかの判断まで、FIREの視点で整理しています |
| リンク | 記事一覧を見る（行き先：`${HITORI_HOJIN_SITE_URL}/blog`、同じタブ） |

リンクの矢印の付け方は、本体の「記事一覧を見る→」と同じにする（`SectionHeading` の既存の描画に従う）。

セクションの背景色（現状の薄いグレー）は変えない。

### 4-2. 「知る」「考える」の2グループ

- lg（1024px）以上：2列のgridで、左に「知る」、右に「考える」を並べる。**`items-start`** を指定し、件数の少ない側が引き伸ばされないようにする
- lg未満：上下に積む（「知る」が上）
- 各グループの先頭に、小見出し（**h3**）と補足文を置く
  - 「一人法人を知る」／「まずは基本を知りたい方へ」
  - 「一人法人を考える」／「自分に合うかどうかを考えたい方へ」
  - h3は16〜18px・600・slate-900、補足文は14px・slate-500。中央寄せにはしない

### 4-3. 記事の一覧（パネル＋罫線の行）

1件ずつ独立したカードをやめ、**グループごとに1枚のパネルの中へ、罫線で区切った行を並べる**形にする。

**パネル**
- 背景：白、枠線：1px slate-200、角丸：**4px**（`rounded`）
- 行と行の間：1pxの罫線（slate-200程度）。パネルの左右の端までは伸ばさず、行の内側の余白の位置で止める（`divide-y` を内側の要素に掛ける等）
- 影は付けない

**行（1行が1記事で、行全体がリンク）**
- 構成：左に小さなアイコン、中央にタイトルと説明文、右にシェブロン
- アイコン
  - 本またはノートのアイコンを全行共通で使う（`@tabler/icons-react` の既存アイコンから選ぶ。例：`IconFileText`・`IconBook2`）
  - 18px程度、色は slate-400、円や背景は付けない、`aria-hidden`
  - **タイトルの1行目の高さにそろえる**（行の上下中央ではない。タイトルが2行になってもアイコンは1行目の横に留まる）
  - アイコンとテキストの間は12px程度
  - **アイコンは任意の引数にする**（渡さなければアイコンなしで描画され、テキストが左に詰まる）。あとでアイコンをやめたり、記事ごとに変えたりするため
- タイトル：16px・600・slate-900
- 説明文：**14px**・slate-500（現状の12pxから上げる）
- タイトル・説明文とも `[line-break:strict]`。**`line-clamp` は外す**（全文を表示する）
- シェブロン：`IconChevronRight` 18px・slate-400、行の上下中央
- 行の余白：上下16〜20px・左右20px程度
- ホバー：行の背景を slate-50 にする（浮き上がり・影は付けない）。`transition-colors duration-200`
- キーボード操作：`focus-visible` でリングを表示する
- リンク：現状どおり `<a href={`${HITORI_HOJIN_SITE_URL}/blog/${post.slug}`}>`（絶対URL・同じタブ）。`next/link` にしない
- マークアップ：各グループは `<ul>`／`<li>`。記事タイトルは見出し要素にしない（h3は4-2の小見出しだけ）

データの取得（`getHitoriHojinPostsBySeries`・category での絞り込み・並び順）は変えない。説明文は現状どおり `post.excerpt ?? post.description`。

### 4-4. コンポーネント

- 新しい行・パネルのコンポーネントは `src/components/hitori-hojin/` に作る。名前は任せる
- 置き換え後に `HitoriHojinContentSection.tsx`・`HitoriHojinArticleCardIcon.tsx` が使われなくなる場合は、6節の整理コミットで削除する

---

## 5. 法人資産ブロックと下部CTA

### 5-1. 文言の定数ファイルを新設

`src/lib/ctaCopy.ts`（名前は任せる）を作り、次をまとめる。

- シミュレーターへのボタン文言：**`CONCERN_CTA_LABELS.fullSimulator` から値を取る**（「シミュレーターで試算」。同じ文字列を二重に書かない）
- 「無料・登録不要・データは端末内に保存」

**今回この定数を使うのは一人法人LPだけ**。本体LP・記事詳細・`AssetManagementPromoSection`・`SimulatorCtaCard` の直書きは置き換えない。

### 5-2. 法人資産ブロック（`HitoriHojinManageSection.tsx`）

- 外枠（角丸12px・枠線・`p-8 sm:p-10`）をやめ、`Container` に載せる（本体の `AssetManagementPromoSection` と同じ扱い）。内側の2カラムの構成・プレビューの図・特徴リストは変えない
- ボタン
  - 角丸を **4px** にする。**背景色 `#0F2A4A` は変えない**
  - 文言「法人資産管理ツールを開く →」は変えない
  - リンク先を `/hitori-hojin/assets`（リダイレクトを1回はさむ）から **`/assets`** に直接変える（`next/link` のまま。basePathが付いて `/asset-simulator/assets` になるのが正しい）
- 注記「無料・登録不要・データは端末内に保存」は、5-1の定数に置き換える（表示は同じ）
- 見出しh2のサイズ・色は変えない

### 5-3. 下部CTA（`page.tsx`）

- ボタン文言：「資産シミュレーターで試算する →」→ **5-1の定数（「シミュレーターで試算」）**。矢印を付けるかどうかは、本体の `SimulatorCtaCard` のボタンに合わせる
- リンク先：`/?utm_source=hojin_lp&…` → **`/app?utm_source=hojin_lp&…`**（utmのパラメータはすべて現状のまま引き継ぐ）
- ボタンの角丸を **4px** にする。**背景色 `#0F2A4A` は変えない**
- 説明文：`max-w-xl` 程度に絞り、`[line-break:strict]` を付ける。375・768・1440pxのいずれでも、最終行が「肢の一つです。」のような1語だけにならないこと。文言は変えない

### 5-4. `<main>` の入れ子の解消

`src/app/hitori-hojin/page.tsx` が返している `<main>` を、`<div>` 等に変える（ルートレイアウトの `<main>` だけが残るようにする）。一人法人ブログ一覧・記事詳細にも同じ入れ子があれば、**直さずに報告する**。

---

## 6. 使われていないファイルの削除（別コミット）

次を削除する。削除の前に `git grep` で、どこからもimportされていないことを確認して報告に貼ること。

- `src/components/hitori-hojin/HitoriHojinArticleCard.tsx`（画像枠版）
- `src/components/hitori-hojin/HitoriHojinBlogListClient.tsx`（画像版一覧）
- 4節の置き換えで使われなくなったもの（`HitoriHojinContentSection.tsx`・`HitoriHojinArticleCardIcon.tsx` 等）

`hitoriHojinCategories.ts` は、ブログ一覧・記事詳細でも使われているので**削除しない**。削除によって、カテゴリの `ListIcon` など使われなくなる項目が出ても、今回は定義を残す。

---

## 7. 確認

**GA4・AdSenseへの通信を遮断したうえで**、開発サーバーで確認する。

1. 一人法人LPの1440・768・375pxのスクリーンショット（変更前と並べる）
2. 375pxで次を確認する
   - 記事のタイトル・説明文が「…」で切れていないこと、1文字〜2文字だけの行がないこと
   - アイコンがタイトルの1行目の横にあること
   - 横スクロールが発生しないこと（`scrollWidth` と `innerWidth` の一致）
   - 法人資産ボタンが内側の余白からはみ出していないこと
3. リンクの行き先（クリックして実際に移動した先のURLを記録）
   - 記事の行：`https://www.freenough.com/hitori-hojin/blog/<slug>`（同じタブ）
   - 「記事一覧を見る」：`https://www.freenough.com/hitori-hojin/blog`（同じタブ）
   - 法人資産ボタン：`/asset-simulator/assets`（リダイレクトをはさまない）
   - 下部CTA：`/asset-simulator/app?utm_source=hojin_lp&…`（utmが欠けていない）
4. 見出しの階層：H1（Hero）→ H2（一人法人を、知る・考える）→ H3（知る・考える）→ H2（法人の資産も…）の順になっていること
5. キーボード（Tab）で各行にフォーカスが移り、リングが表示されること
6. 動きを減らす設定（`prefers-reduced-motion`）でも表示が崩れないこと
7. 本体LPの `SectionHeading` を使う全セクションが、変更前と一致すること（2節の確認）
8. `npx tsc --noEmit` がエラーなく終わること。既存の検証スクリプト（`scripts/verify-*.js` 等）がすべてPASSすること
9. `tsconfig.tsbuildinfo`・`next-env.d.ts` が書き換わっていたら `git restore` で戻す

---

## 8. コミットとPreview

コミットはファイルを個別に指定する（`git add -A`・`git add .` は禁止）。次の単位に分ける。

1. `SectionHeading` に同じタブで開くリンクの選択肢を追加
2. 一人法人LP本文部分のUI改修（幅・記事一覧の再構成・法人資産ブロック・下部CTA・文言定数・`<main>` の入れ子）
3. 一人法人の未使用コンポーネントを削除
4. 処理済みの指示書を `done/` へ移動（`investigation_hitori_hojin_lp_ui.md` と本指示書）

- `docs/fixes/active/hitori-hojin-lp-ui/`（調査時のスクリーンショット）と、今回撮ったスクリーンショットは**コミットしない**。完了報告で置き場所を伝え、扱いはKENZOの判断を待つ
- `feature/hitori-hojin-lp-ui` をpushし、PreviewのURLを報告する
- **mainへのマージはしない**（KENZOがPreviewを確認してから自分で行う）

---

## 完了報告の形式

- 各節の変更内容の要約と、主要な差分の抜粋
- 7節の各確認項目の結果（スクリーンショットは変更前と並べる）
- 5-4で見つかった、一人法人ブログ一覧・記事詳細の `<main>` の入れ子の有無
- `git log --oneline main..feature/hitori-hojin-lp-ui` と、最終の `git status`
- PreviewのURL
