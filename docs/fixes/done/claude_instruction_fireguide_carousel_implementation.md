# 実装指示：FIREガイドセクションの横スクロールカルーセル化

作成日：2026-09-21
種別：**実装（新規UI）**
関連：`claude_instruction_fireguide_carousel_investigation.md`（本指示の前提となる調査結果）

---

## 背景

LPトップの「FIREガイド」セクション（現状：`getFeaturedPosts().slice(0,4)`による4記事を2×2グリッド表示）を、横スクロール（CSS Scroll Snap）のカルーセルUIに変更する。

目的：
1. 公開記事21件（調査で確認済み。前回指示書の「29件」は誤記のため訂正）のうち固定4件のグリッド表示だけだと更新頻度・コンテンツの厚みが伝わらないため、横スクロールで「まだ続きがある」ことを可視化する
2. LP内で「お悩み」「FIREガイド」「ケーススタディ」の3セクションが同一の2×2グリッド型で連続しており単調なため、1箇所の型を変えてリズムを作る

調査の結果、以下が判明済み：
- `getFeaturedPosts()`（frontmatter `featured: true` + priority順）が現行4記事の選定ロジック。slugは`4percent-rule`・`ideco-nisa`・`montecarlo-simulation`・`fire-checklist`
- `getAllPosts()`だけで必要なデータは揃っており、`blog.ts`への新規export追加は不要
- `SectionHeading.tsx`（「記事一覧を見る→」）は共通コンポーネントとして既に4セクションで使われており無改修で流用可能
- FIREガイドのサムネイルだけ`next/image`移行から漏れており、生の`<img alt="">`＋eslint-disableが残っている
- `/blog`一覧ページでは、カテゴリバッジ（軽い背景色のpill）＋日付が、サムネイルとタイトルの間に既にDOM要素として実装されている。カテゴリ値は`FIRE基礎知識`／`シミュレーター活用`の2種のみ
- `/blog`の「テーマで絞り込む」（NISA・積立投資等）は`category`とは別のフィルター用タグ軸であり、今回のLPカードには持ち込まない

---

## 1. 表示記事の選定ロジック

- 既存の`getFeaturedPosts().slice(0,4)`をそのまま維持し、先頭4記事とする（`4percent-rule`・`ideco-nisa`・`montecarlo-simulation`・`fire-checklist`）
- `getAllPosts()`から上記4件のslugを除外し、`date`降順で並べた先頭2件を取得する
- 上記4件＋2件、計6件を配列として結合し、カルーセルへ渡す
- `blog.ts`・`getFeaturedPosts()`・`getAllPosts()`自体の改修は一切行わないこと（ロックファイル）

---

## 2. カード表示内容

- **サムネイル**：`next/image`（`<Image>`コンポーネント）に置き換え、`alt={post.title}`を設定する。現状の生`<img alt="">`＋eslint-disableコメントは削除する
- **カテゴリバッジ＋日付**：`/blog`一覧ページで既に使われているバッジ（軽い背景色のpill）＋日付表示のスタイルをそのまま流用する。共有コンポーネント（例：`PostMeta`のような形で切り出されているもの）が既に存在すればそれをimportして再利用し、単一コンポーネントとして切り出されていない場合のみ、同一の見た目（色・フォントサイズ・余白）を複製して実装する。新規の配色・デザインは追加しないこと
  - 日付表記は`/blog`一覧と同じ書式（例：`2026-08-14`）で統一する。今回追加する新しい2記事だけでなく、既存の4記事にも同じ日付表示を出すこと（表示ルールをカードごとに変えない）
  - 「テーマで絞り込む」のタグ（NISA・積立投資等）はLPカードには表示しない。`category`バッジと日付のみ
- **タイトル・抜粋**：現行のLPカードが使っている短文フィールド（`description`ではなく既存の抜粋用フィールド）をそのまま使う。変更不要

---

## 3. レイアウト・カルーセル実装

- セクションのコンテナは既存の`max-w-5xl px-6`を維持する（他セクションとの統一を崩さない）
- カード幅は固定pxではなく、コンテナ幅に対する比率＋min-widthで指定し、「次のカードが少し見える」状態を作る：
  ```css
  .carousel-card {
    flex: 0 0 30%;
    min-width: 260px;
  }
  ```
  目安として、デスクトップで3枚＋次のカードの一部が見える程度、モバイルで1.1〜1.2枚程度が見える幅とすること（具体的なブレークポイント値は実装時に微調整して構わない）
- 実装はCSS Scroll Snapのみで行い、カルーセル用ライブラリ（Embla・Swiper等）は導入しないこと：
  ```css
  .carousel-track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .carousel-track::-webkit-scrollbar { display: none; }
  .carousel-card {
    scroll-snap-align: start;
  }
  ```
- 右端フェードグラデーション（`linear-gradient(to right, transparent, white)`相当）をトラック右端に重ね、スクロール可能であることを示唆する
- **矢印ボタンは今回実装しない**。右端の見切れ＋フェードのみで様子を見る（将来必要になれば別指示で追加検討）
- **末尾の「もっと見る」カードは追加しない**。「記事一覧を見る→」は既存の`SectionHeading`（セクション見出し右上）にそのまま任せ、無改修で流用する

---

## 4. アクセシビリティ

- トラック要素に`role="region" aria-label="FIREガイド記事一覧"`を付与する
- `overflow-x: auto`な要素はキーボード操作のため`tabindex="0"`を付与する
- `prefers-reduced-motion: reduce`環境では`scroll-behavior: smooth`を無効化する：
  ```css
  @media (prefers-reduced-motion: reduce) {
    .carousel-track { scroll-behavior: auto; }
  }
  ```

---

## 5. 遵守事項

- ロックファイル（`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`・`simulate.ts`・`analyze.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`）への依存・変更は一切ゼロを維持すること
- `SectionHeading.tsx`自体は変更しないこと（他3セクションへの影響を避けるため）
- 本変更はビジュアル・主観判断を伴うため、`main`へ直接pushせず専用ブランチ（例：`feature/lp-visual-refresh`）で作業し、Vercel Preview URLで実機確認してからマージすること
- 既存テスト（`scripts/verify-*.js`、`full-verify.js`）が全てPASSすることを維持する
- 完了報告には必ず実際のコード抜粋・実機スクリーンショット（デスクトップ幅・モバイル幅の両方、カード見切れが視認できるもの）を添付すること（推測や文章のみの報告は不可）

---

## 6. 完了報告フォーマット

- 変更したファイル一覧
- 記事選定ロジック（4件＋最新2件を結合する箇所のコード抜粋）
- カルーセルのマークアップ・CSS（Scroll Snap実装箇所の抜粋）
- カテゴリバッジ＋日付の実装箇所（既存コンポーネントを再利用したか、複製実装したかを明記した上でコード抜粋）
- `next/image`化・`alt={post.title}`修正箇所の抜粋（修正前後）
- テスト結果（PASS/FAIL件数）
- 実機ブラウザでの動作確認：①デスクトップ幅で3枚＋次のカードの一部が見えること、②モバイル幅で1枚強＋次のカードが見切れること、③横スクロールでスナップが効くこと、④右端までスクロールした際の見え方、⑤カテゴリバッジ・日付が全6枚のカードに統一表示されていること、の5点は必ずスクリーンショットを添付すること
