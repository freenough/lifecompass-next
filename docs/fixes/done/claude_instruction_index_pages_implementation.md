# 指示書: お悩み一覧・ツール一覧の幅統一と細部改修（段階A＋B 実装）

## 種別

実装指示。前回の調査報告（一覧ページ事前調査）の結果と、KENZOの判断に基づく。

## 対象ページ

- お悩み一覧（`ConcernsPage`）
- ツール一覧（`ToolsPage`）
- LPのお悩みセクション（`ConcernBlockLP`）：ボタン文言の変更のみ

**ブログ一覧は対象外**。段階Cの再設計とあわせて対応するため、`BlogPage`・`BlogListClient` には触れないこと。

## ブランチ

- `main` から `feature/index-pages-polish` を作成して作業すること
- 前回の調査指示書（`docs/fixes/active/` に残っている未コミットのもの）は `done/` へ移動してよい。commitはしないこと。`active/` フォルダ自体は削除しないこと

## ロックファイル

`concerns.ts`・`ConcernCard.tsx` を含むロックファイルへの差分は**ゼロ**を維持すること。完了報告で、ロックファイル全件に対する `git diff --stat` の結果を提示すること。

---

## 段階A

### A-1. 外側コンテナをLPと統一

- `ConcernsPage`・`ToolsPage` の外側 `<div className="mx-auto max-w-5xl px-6 py-12">` を、`Container`（`size` と `paddingX` はどちらも default）に置き換える
- 縦の余白 `py-12` は維持すること（Containerの内側または外側、構造に合う方でよい）
- 期待値：コンテンツ左端x座標が、1440px幅で **168px**（LPと一致）、768px・375px幅で **24px**

### A-2. 共通 `PageHeader` コンポーネントの新設

- 配置先は `src/components/layout/PageHeader.tsx`
- props：
  - `title: string`（必須）
  - `description?: string`
  - `breadcrumbs?: BreadcrumbItem[]`
- パンくずは見出しの上に表示すること
- スタイル：
  - h1は現在の一覧ページと同じサイズ（`text-2xl sm:text-3xl font-bold leading-snug`）を維持し、**色だけLPに合わせて `text-slate-900` に変更**する
  - 説明文は現状（`mt-2 text-sm text-slate-500 leading-relaxed`）を維持する
- 今回は2ページだけに適用すること。ブログ・使い方ガイド・記事詳細には適用しない

### A-3. 共通 `Breadcrumb` コンポーネントの新設

- 配置先は `src/components/layout/Breadcrumb.tsx`
- 入力は `items: { name: string; href: string }[]` の1つの配列とし、**同じ配列から次の2つを両方出力する**
  - 画面表示用の `<nav aria-label="パンくずリスト">` ＋ `<ol>`
    - 区切りは `›`
    - 最後の項目はリンクにせず、`aria-current="page"` を付ける
    - 文字は `text-xs` から `text-sm` 程度の `text-slate-500`
    - リンクは `next/link` を使う（basePathが自動で付く）
  - BreadcrumbListのJSON-LD
    - `item` は絶対URLにする
    - URLの組み立て方は、記事詳細ページに実装済みのBreadcrumbListと同じ方法（`SITE_URL` 起点）にそろえること
    - `/asset-simulator` が二重にも欠落にもならないよう、出力されたJSONを実データで確認すること
- 各ページの項目：
  - お悩み一覧：`資産シミュレーター`（`/`）› `お悩み一覧`（`/concerns`）
  - ツール一覧：`資産シミュレーター`（`/`）› `かんたん計算ツール`（`/tools`）
- 記事詳細・使い方ガイドの既存のインライン実装は、今回は変更しないこと

---

## 段階B

### B-1. お悩みカードのボタン文言（LPを含めて統一）

- 定数ファイルを新設する（例：`src/lib/concernCtaLabels.ts`）

  ```ts
  export const CONCERN_CTA_LABELS = {
    lightTool: 'かんたんツールで試算',
    fullSimulator: 'シミュレーターで試算',
  } as const;
  ```

- `ConcernsPage` と `ConcernBlockLP` の両方で、`<ConcernCard concern={{ ...concern, ctaLabel: CONCERN_CTA_LABELS[concern.ctaType] }} />` の形で渡す。`concerns.ts`・`ConcernCard.tsx` は無変更
- `concerns.ts` の `ctaLabel` が、上記2か所以外で参照されていないかを確認し、完了報告に記載すること
- 文言が長くなるため、次の2点を実測で確認すること
  - 375px幅で、ボタンと「詳しく読む→」が1行に収まるか
  - ボタン内の文字が折り返さないか

  折り返す場合は実装で吸収せず、スクリーンショットを添えて報告すること

### B-2. セクション見出しの様式（お悩み・ツール共通）

- `SectionHeading.tsx` から、「───」の線（`h-0.5 w-6 bg-slate-300`）を小さな共通部品として切り出す（例：`SectionRule`）
- `SectionHeading` 自身もこの部品を使う形にする。**LPの見た目は1pxも変わらないこと**。変更前後のLPスクリーンショットで確認すること
- 一覧ページ用の見出しコンポーネントを新設する（例：`ListSectionHeading`）
  - 構成：`flex items-center gap-3`。左から線（`SectionRule`）、`h2`（`text-lg font-bold text-slate-900`）の2要素のみ。件数表示は入れない
  - `h2` に `id` を付け、`scroll-mt-20`（80px。固定ヘッダーの59px＋余裕分）を付ける
  - `id` の値：お悩みはステージのキー（`saving` / `deciding` / `receiving` / `drawdown`）、ツールは `GROUP_ORDER` のキー
- お悩み一覧のステージ見出しと、ツール一覧のカテゴリ見出しの両方を、この見出しコンポーネントに置き換える

### B-3. ページ上部のジャンプ用チップ（お悩み・ツール共通）

- 共通コンポーネントを新設する（例：`JumpChips`、props：`items: { id: string; label: string }[]`）
- 配置は `PageHeader` の下、最初のセクションの上
- 各チップは `<a href="#id">` で実装すること。ブログのフィルターチップ（絞り込みのトグル）とは意味が違うため、コンポーネントは流用しない。見た目は、ブログのフィルターチップの**未選択状態**にそろえる
- `flex flex-wrap gap-2` で折り返し可とする
- 375px幅で、チップ行の見た目のスクリーンショットを提示すること
- クリック後、該当見出しが固定ヘッダーに隠れずに表示されることを、両ページ各1か所以上でスクリーンショットで確認すること

### B-4. ツールカードのレイアウト変更

- 角丸：`rounded-xl` を `rounded`（4px）に変更する。実測値を報告すること
- **lg以上（1024px〜）**：横並びにする
  - 左：アイコン（現在の線アイコンとサイズのまま。背景の正方形などは付けない）
  - 中央：`flex-1` でタイトル＋説明文。説明文は `line-clamp-2`
  - 右：シェブロン（›）。既存のアイコンライブラリの右向きシェブロンを使い、16〜20px・`text-slate-400`・縦中央揃え
- **lg未満**：
  - 1行目：アイコン＋タイトル＋シェブロン（`items-center`、シェブロンは右端）
  - 2行目以降：説明文を全幅で表示し、`line-clamp` はかけない
- 768px・1024px幅で、それぞれのレイアウトのテキスト列の幅を実測して報告すること。768px幅で「lg未満」の形が不自然に見える場合は、スクリーンショットを添えて報告すること（独断で切替幅を変えないこと）
- 列数は現状の2列を維持する

### B-5. ツールカードのホバー強化

- まず、現在のホバーのtranslateY・box-shadow・transition時間を報告すること
- 目標値：
  - `hover:-translate-y-1`（4px）
  - `hover:shadow-lg`
  - `hover:border-slate-300`
  - `transition` は200ms程度
  - `motion-reduce:transform-none` を併記する
- 現状値が既に目標と同等以上の場合、この項目は実装せず報告のみとすること
- お悩みカードには適用しない（カード内にボタンがあり、カード全体はリンクではないため）

---

## 検証

### ビルド・静的チェック

- `npm run build` と lint がエラーなしで通ること。結果の出力を提示すること

### スクリーンショット

以下を、変更前後で比較できる形で提示すること。

- お悩み一覧・ツール一覧：375px / 768px / 1440px のファーストビューと、カード部分
- LPトップ：375px / 1440px（お悩みセクションのボタン文言と、`SectionHeading` の見た目が変わっていないこと）

### 実測値

- 2ページの左端x座標（1440px / 768px / 375px）
- ツールカードの角丸
- ホバー時の値（変更前→変更後）

### JSON-LD

- 2ページで出力されたBreadcrumbListの実データを提示すること

---

## 安全ルール（必ず守ること）

- `localStorage.clear()` などの破壊的操作は行わないこと。どうしても必要な場合は、対象オリジンが検証専用であることを確認し、実施前に報告すること。判別できない場合は操作せず、KENZOに確認を求めること
- devサーバーを停止するときは、ポートからPIDを特定し、そのPIDだけを個別に停止すること。`taskkill /F /IM node.exe` のような全プロセス一括終了コマンドは**使用禁止**
- **commit・pushはKENZOの明示的な指示があるまで行わないこと**

## 完了報告のフォーマット

- 変更・新設したファイルは、ファイル名と関数名・コンポーネント名で示すこと（行番号には頼らない）
- ロックファイルの `git diff --stat` の結果を提示すること
- 上記「検証」の全項目を提示すること
- **完了報告にローカルファイルパスは一切含めないこと。** スクリーンショットは、すべてチャットにインライン表示するか、Artifact機能で共有すること
- 「確認した」「問題なし」とテキストで結論だけ述べるのは不可。スクリーンショットと実測値を実際に提示すること
- 指示書の想定と異なる判断をした場合は、その理由と実測の根拠を明記すること
