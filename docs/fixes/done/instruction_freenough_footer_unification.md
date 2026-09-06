# 実装指示書: 全ページ共通フッターの新規構築

## 背景

`instruction_freenough_hierarchy_navigation.md` のPhase 0調査で判明した通り、現状のフッターは:

- freenough-main:共通コンポーネント化されておらず、`app/page.tsx` にベタ書き。1行構成(About/広告開示/プライバシーポリシー/免責事項/X/Note)。
- lifecompass-next:`src/components/layout/Footer.tsx` は共通コンポーネントだが、こちらも1行構成。

今回のフッター対応は「既存の近い実装を揃える」のではなく、**両リポジトリとも新規に4段構成を作る**規模の変更である。この認識で進める。

## 確定した内容(PC)

```
FIREを考える              一人法人を考える
├ 資産シミュレーター        ├ 一人法人トップ
├ ツール                    └ 一人法人ブログ
├ お悩み
└ ブログ

シミュレーター / 資産管理ツール / 使い方ガイド / 計算ロジック / Note

Freenoughについて / 広告開示 / プライバシーポリシー / 免責事項 / 運営者情報

© 2026 FREENOUGH
```

4段:①2カラムのコンテンツ列 ②共有機能行 ③ポリシー等の行 ④コピーライト。この構成をfreenough-main・lifecompass-next両方に、見た目が完全に一致するように実装する。

## 確定した内容(モバイル、A案)

2カラム構成は維持したまま、フォントサイズ・行間・余白を圧縮して1画面に収める。アコーディオン化(見出しタップで展開)は採用しない。既存プロジェクトのブレークポイント(Tailwindの`sm:`等、既存コードで使われている基準)に合わせて縮小してよい。

## 各リンクの行き先(表)

| 表示ラベル | 行き先 | 備考 |
|---|---|---|
| 資産シミュレーター | `/asset-simulator`(ハブLP) | |
| ツール | `/asset-simulator/tools` | |
| お悩み | `/asset-simulator/concerns` | |
| ブログ | `/asset-simulator/blog` | |
| 一人法人トップ | `/hitori-hojin` | **【重要】lifecompass-next側では絶対URL(`<a>`+`HITORI_HOJIN_SITE_URL`)で実装。次項参照** |
| 一人法人ブログ | `/hitori-hojin/blog` | 同上 |
| シミュレーター | `/asset-simulator/app` | |
| 資産管理ツール | `ASSET_MANAGEMENT_PATH`定数(`src/lib/assetManagement/routes.ts`) | |
| 使い方ガイド | `/asset-simulator/guide` | |
| 計算ロジック | `/asset-simulator/methodology` | |
| Note | `https://note.com/freenough` | 外部リンク |
| Freenoughについて | `https://www.freenough.com/`(TOP) | lifecompass-next側からは常に絶対URL(TOPはlifecompass-nextの管轄外のため) |
| 広告開示 | `/asset-simulator/disclosure` | |
| プライバシーポリシー | `/asset-simulator/privacy-policy` | |
| 免責事項 | `/asset-simulator/disclaimer` | |
| 運営者情報 | `/asset-simulator/about` | |

## 【最重要】basePathによるURL巻き戻りバグの再発防止

これまで2回(URLクリーンURL化対応、ヘッダー実装時)、同じ原因のバグが発生している:lifecompass-next は `basePath: '/asset-simulator'` 固定のため、`next/link` に渡した `href` には自動的に `/asset-simulator` が付与される。これは `/asset-simulator/*` へのリンクでは正しい挙動だが、**`/hitori-hojin/*` へのリンクに使うと、クリーンURL表示中でもクリック1回で `/asset-simulator/hitori-hojin/...` に巻き戻ってしまう。**

今回のフッターは lifecompass-next 側で「資産シミュレーターページ上」でも「一人法人ページ上」でも同じフッターコンポーネントとして描画される想定のため、**「一人法人トップ」「一人法人ブログ」の2つのリンクは、フッターがどちらのページに描画されていても、必ず絶対URL付きの `<a>` タグ(`HITORI_HOJIN_SITE_URL`使用)で実装すること。** `next/link` は使わない。

同様に「Freenoughについて」(TOPへのリンク)も、lifecompass-next側では常に絶対URL(`https://www.freenough.com/`)を使うこと(TOPはlifecompass-nextのルーティング外のため、相対パスでは到達できない)。

それ以外のリンク(資産シミュレーター、ツール、お悩み、ブログ、シミュレーター、資産管理ツール、使い方ガイド、計算ロジック、広告開示、プライバシーポリシー、免責事項、運営者情報)は、いずれも `/asset-simulator/*` が最終的な正しい行き先であり、クリーンURLの別名を持たないため、通常の `next/link`(basePath自動付与を利用)で問題ない。

freenough-main側では basePath の制約がないため、この問題自体が発生しない想定だが、**Phase 0で実際にそうであることを確認すること**(推測で進めない)。

## Phase 0: 調査(必須、ここで止まって報告)

1. 両リポジトリで、フッターに必要な各ページ(お悩み・使い方ガイド・計算ロジック・disclosure・privacy-policy・disclaimer・about等)の実際のパスが上記の表と一致するか確認する。異なる場合は実際の値を報告する。
2. freenough-main側で、`/hitori-hojin` や `/asset-simulator/*` へのリンクをどう記述するのが正しいか(相対パスで良いか、絶対URLが必要か)を確認する。
3. lifecompass-next側で、フッターコンポーネントが現在どのレイアウト階層で描画されているか(ルートlayout.tsxで一括描画か、ページごとか)を確認し、「資産シミュレーターページ上のフッター」と「一人法人ページ上のフッター」が同一コンポーネントになる実装方針を確認する。
4. 上記いずれもロックファイルに該当しないか確認する。

## Phase 1: 実装

- Phase 0の結果を踏まえ、両リポジトリのフッターを上記のPC/モバイル仕様・リンク表・basePath対応方針に従って新規実装する。
- 見た目(フォント・余白・区切り線等)は既存サイトのトーンから大きく逸脱しない範囲で実装してよい(細部の意匠は次フェーズで調整可能)。

## Phase 2: 検証(証跡必須)

- 資産シミュレーター側の任意ページ、一人法人側の任意ページ、TOPページ、それぞれでフッターが表示され、内容が3ページで完全に一致していることを確認。
- フッターの「一人法人トップ」「一人法人ブログ」を、**資産シミュレーター側ページ上のフッターから**クリックし、`/hitori-hojin/...`のクリーンURLのまま遷移することを確認(巻き戻りがないこと)。
- フッターの「資産シミュレーター」「ツール」等を、**一人法人側ページ上のフッターから**クリックし、正しく`/asset-simulator/...`に遷移することを確認。
- モバイル幅(既存のブレークポイントでの確認でよい)で、2カラム構成が崩れずに表示されることをスクリーンショットで確認。
- 「Freenoughについて」をlifecompass-next側ページのフッターからクリックし、TOP(`https://www.freenough.com/`)に正しく遷移することを確認。

## スコープ外

- フッターの細かい意匠(色・フォント・区切り線のスタイル等)の最終調整。
- ヘッダー・ロゴ・TOPカード(前回対応済み)。

## やってはいけないこと

- 一人法人へのリンクに`next/link`(basePath自動付与)を使わないこと。
- Phase 0の報告なしにPhase 1へ進まないこと。
- 証跡なしの完了報告をしないこと。

---

## 実施結果(2026-09-07・完了)

### Phase 0調査結果
- 各ページの実パスは指示書の表と完全一致（既存Header/Footerの`href`値と照合済み）。
- freenough-mainはbasePath制約がなく、`/hitori-hojin`・`/asset-simulator/*`とも相対パスの
  素の`<a>`で正しく機能する（絶対URL化不要）ことを確認。
- lifecompass-next側`Footer.tsx`はルートlayout.tsxから全ルート共通で描画されており、
  フッター内容自体はセクション間で差がないため、Header.tsxのような`usePathname()`分岐は不要。
  「一人法人トップ」「一人法人ブログ」「Freenoughについて」の3リンクのみ常に絶対URLの
  `<a>`にすれば要件を満たせると判断。
- 「資産管理ツール」の行き先定数(`ASSET_MANAGEMENT_PATH`)はリポジトリを跨いで共有できない
  ため、freenough-main側は値をハードコード（`/asset-simulator/assets`）。
- ロックファイル依存なし。

### 実装内容
- `src/components/layout/Footer.tsx`（lifecompass-next）・`app/components/Footer.tsx`
  （freenough-main、新規作成）を、指示書通りの4段構成（①2カラムのコンテンツ列
  ②共有機能行 ③ポリシー行 ④コピーライト）に刷新。クラス名・構造を両リポジトリで揃えた。
- 「一人法人トップ」「一人法人ブログ」は`HITORI_HOJIN_SITE_URL`ベースの絶対URL付き`<a>`、
  freenough-main側は相対パス`<a>`（basePath制約がないため）。
- 「Freenoughについて」はlifecompass-next側で絶対URL＋`target="_blank"`（既存踏襲）、
  freenough-main側は`/`への相対リンク。
- モバイル（A案）はアコーディオン化せず、`grid-cols-2`を固定し`sm:`プレフィックスで
  フォント・余白のみ拡大する実装（base=圧縮版、`sm:`以上=通常版）。
- 実装途中でfreenough-main旧フッターの「X」リンクが新リンク表に含まれておらず一度削除したが、
  ユーザー指示により共有機能行の「Note」直前に復元（URLは削除前の実装値
  `https://x.com/freenough`をそのまま再利用、新規調査はしていない）。

### Phase 2検証結果（本番実機）
- TOP・資産シミュレーター側・一人法人側（クリーンURL`/hitori-hojin`）の3ページで
  フッターの表示ラベル・リンク先（絶対URL/相対パスの表記違いはあれど最終的な行き先）が
  完全一致することをcurlで機械的に比較し確認。
- 資産シミュレーター側ページのフッターから「一人法人トップ」をクリック →
  `https://www.freenough.com/hitori-hojin`のクリーンURLのまま遷移（巻き戻りなし）。
- 一人法人側ページ（`/hitori-hojin`）のフッターから「資産シミュレーター」をクリック →
  `https://www.freenough.com/asset-simulator`に正しく遷移。
- 「Freenoughについて」をlifecompass-next側ページのフッターからクリック →
  新規タブで`https://www.freenough.com/`が開くことを確認。
- 「X」リンクのhrefが`https://x.com/freenough`であることを確認。
- モバイル幅（ブラウザ自動化ツールのwindow最小幅545px、Tailwindの`sm`ブレークポイント
  640px未満のため実質的にモバイル表示）で2カラムが崩れずfont-sizeが12px（圧縮版）に
  切り替わっていることを実機確認（`getComputedStyle`で検証）。
