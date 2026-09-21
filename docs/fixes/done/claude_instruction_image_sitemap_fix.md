# 指示書: 画像最適化 + サイトマップlastmod修正(実装)

## 位置づけ

先の調査専用指示書「claude_instruction_seo_pitfall_check.md」の結果を受けた実装指示です。
対象は発見事項の③(画像最適化)・①(サイトマップlastmod)・OGP画像の3点。②(記事ごとの更新日フィールド新設)と④(構造化データ)は**今回のスコープ外**です。

## 作業ルール(必ず遵守)

- **見た目に影響する変更のため、mainに直接pushせず専用ブランチ（例: `feature/blog-image-optimization`）で作業し、Vercel Preview URLで確認できる状態にしてから完了報告してください**（ways-of-working.mdのビジュアル変更ブランチ運用ルール準拠）
- コミット・pushはKENZOの明示的指示があるまで行わないでください
- ロックファイル（`blog.ts`, `blogTopics.ts`含む）は今回のタスクでは**変更不要**なはずです。もし変更が必要だと判明した場合は、実装を止めてその旨を先に報告してください（管理された例外としての手続きが必要なため）
- 完了報告にはスクリーンショット・git diff・実測値（before/afterの画像サイズ、ページ総転送量など）を必ず添えてください。証跡のない「問題ありません」報告は受け取りません

---

## A. lifecompass-next の画像を next/image に切り替える

### 対象箇所
- `src/components/blog/BlogListClient.tsx`（ブログ一覧サムネイル）
- `src/app/blog/[slug]/page.tsx`（記事詳細eyecatch）
- `src/app/hitori-hojin/blog/[slug]/page.tsx`（一人法人記事詳細）
- 上記以外にも生`<img>`でブログ関連画像を表示している箇所があれば同様に対応し、報告に列挙してください

### 実装内容
1. 生`<img>`タグを`next/image`の`<Image>`コンポーネントに置き換える
2. 各箇所に適切な`width`/`height`（またはfillレイアウト）・`sizes`属性を指定し、レイアウトシフトが発生しないようにする
3. `next.config.js`（または`.ts`、`.mjs`）の`images`設定を確認し、最適化が有効になっているか報告（無効化されている設定があれば指摘するだけでよく、勝手に変更しない）
4. 変更後、Vercel Previewでブログ一覧ページ・記事詳細ページの表示崩れがないか目視確認

### ソース画像自体の圧縮（サンプル検証してから判断）
- `public/images/blog/`配下のPNG（現状88ファイル、合計105.5MB、平均1,228KB/枚）は、表示サイズ（カード/サムネイル）に対して解像度が過剰です
- まず**3〜5枚だけサンプルとして**、表示に必要な幅（目安: 1000px程度、正確な値はCSSでの実表示サイズを確認して決定）に縮小・再圧縮し、next/image経由での表示品質に問題がないかVercel Previewで確認してください
- サンプルで問題なければ、88ファイル一括の圧縮スクリプトを作成し適用（元ファイルは念のためバックアップを取ってから置き換え）
- 一括処理前に、対象ファイル数・想定される削減後の合計サイズをKENZOに報告し、実行してよいか確認を挟んでください（88ファイル一括変更は影響範囲が大きいため）

---

## B. OGP画像をfreenough-mainの方式に合わせる

### 現状の問題
- lifecompass-nextは全ページ共通で静的`public/images/ogp.png`（1.19MB）を使用しており、記事ごとの個別OGP画像がない
- freenough-mainには`app/opengraph-image.tsx`（`next/og`の`ImageResponse`による動的生成、24.5KB）が既に実装されている

### 実装内容
1. freenough-mainの`app/opengraph-image.tsx`の実装を参考に、lifecompass-next側にも同様の動的OGP画像生成を実装する
2. トップページ・ツールページ用: freenough-mainと同様の軽量な固定デザインのOGP画像に置き換え（現状1.19MBの静的画像は不要になれば削除）
3. ブログ記事ページ用: 記事タイトルを動的に描画する`opengraph-image.tsx`を`src/app/blog/[slug]/`配下に実装し、記事ごとに異なるOGP画像が生成されるようにする（hitori-hojin側のブログも同様に対応するか、まずは通常ブログのみ実装して報告し、KENZOの確認後にhitori-hojin側へ展開するか判断してもよい）
4. `layout.tsx`・記事ページのmetadata内で参照しているOGP画像パスが正しく切り替わっているか確認

---

## C. サイトマップの lastModified を修正する

### 方針（決定済み・理由も記載）
「実際の更新日が分からないページに、ビルド時刻由来の嘘の日付を出し続けるくらいなら、`lastModified`フィールド自体を省略する」という方針を採用します（Googleも不正確なlastmodより省略を推奨）。記事ごとの更新日を追跡する仕組みの新設は今回のスコープ外とし、ブログ記事側（`post.date`を使っている箇所）は現状のままで問題ないため変更不要です。

### 実装内容
1. `lifecompass-next/src/app/sitemap.ts`の28-36行目・44-47行目付近（静的ページ・ツールページ・hitori-hojin index等、`new Date()`を使っている箇所）について、`lastModified`フィールドを削除する（該当エントリから丸ごと除外、他のフィールドはそのまま）
2. 同ファイルの38-41行目・48-51行目付近（`new Date(post.date)`を使っているブログ記事部分）は**変更しないでください**
3. `freenough-main/app/sitemap.ts`の該当URLも同様に`lastModified`フィールドを削除
4. 変更後、ローカルまたはVercel Previewでsitemap.xmlを実際に取得し、該当ページのlastmodフィールドが出力から消えていることを確認

## 完了報告のフォーマット

- A・B・Cそれぞれについて、変更したファイルパス・行番号、Vercel Preview URL、実測値（画像サイズのbefore/after、Lighthouseスコア等が取得できれば尚可）を報告してください
- Aのソース画像一括圧縮を実行する場合は、実行前にKENZOへの確認ステップを必ず挟んでください
