# 調査指示書:asset-simulator/sitemap.xml ベースURLバグ

## 背景

Search Console上で `https://freenough.com/asset-simulator/sitemap.xml` が
正常に送信・取得成功(19ページ検出、2026/07/27最終読み込み)しているにも
かかわらず、実際にこのURLへブラウザでアクセスすると、中身の `<loc>` が
すべて `https://freenough.com/lifecompass/...` という**旧ドメイン・旧パス
構造**のURLになっていることが判明した。

例(実際に取得された内容の一部):
```xml
<url>
  <loc>https://freenough.com/lifecompass/blog/pension-timing</loc>
  <lastmod>2026-07-28T09:18:01.230Z</lastmod>
</url>
```

`lastmod` が当日日付になっていたり、直近公開したブログ記事
(`pension-timing`など)まで含まれていることから、**古いファイルの残骸
ではなく、現在も稼働中のサイトマップ生成コードが誤ったベースURLで
URLを組み立て続けている**と考えられる。

これにより、Googleが正規のサイトマップとして `/lifecompass/*` の
URL群を継続的に発見・再クロールしてしまい、旧コードネーム
「LifeCompass」を含むURLが検索エンジンに露出し続ける実害が
生じている。

## 関連する既知の制約(プロジェクト共通ルール)

- 開発コードネーム「LifeCompass」はユーザー向けテキスト・URLに
  一切出してはならない(既存ルール)
- 本番ドメインは `freenough.com`(および `www.freenough.com`)、
  シミュレーターは `lifecompass-next` リポジトリ、
  `/asset-simulator` basePathでデプロイされている

## 調査してほしいこと(このフェーズは調査のみ、実装はしない)

1. **サイトマップ生成箇所の特定**
   - `lifecompass-next` リポジトリ内で `sitemap.xml` を生成している
     コードを特定する(想定:`app/sitemap.ts` または
     `app/asset-simulator/sitemap.ts` 等、Next.js App Routerの
     sitemap生成ファイル)
   - 静的ファイルとして配置されている可能性(`public/sitemap.xml`)も
     念のため確認する

2. **ベースURLのハードコード箇所の特定**
   - URLを組み立てている箇所で、ベースURLがどこから来ているか確認
     (ハードコード文字列か、環境変数か、設定ファイルか)
   - `lifecompass` という文字列がどこに残っているか、
     リポジトリ全体で grep して洗い出す
     (`grep -r "lifecompass" --include="*.ts" --include="*.tsx"` 等)
   - 特に環境変数(例:`NEXT_PUBLIC_BASE_URL` やそれに類するもの)が
     複数箇所で定義されていて、サイトマップ生成部分だけ古い値を
     参照している、という可能性を疑う

3. **なぜページ本体は正しくリダイレクトされているのに、
   サイトマップの中身だけ古いベースURLなのか、原因の切り分け**
   - リダイレクト設定(`next.config.js`の`redirects()`または
     `middleware.ts`)とは別経路でサイトマップが生成されている
     ことの確認
   - サイトマップ生成コード自体がいつ最後に更新されたか
     (git blame/git log でドメイン移行のタイミングと前後関係を確認)

4. **ルート直下 `https://www.freenough.com/sitemap.xml` が404である
     ことについても、原因だけ簡単に確認**
   - こちらはFREENOUGHトップページ側(別デプロイ)の話。
     サイトマップ生成自体が未実装なのか、パスが違うだけなのか、
     現状把握のみ行う(このフェーズでは修正しない。TOP側の対応は
     `asset-simulator`側の修正完了後に別途着手する)

## 期待するアウトプット

- サイトマップ生成コードの該当ファイルパス・関数名
- ベースURLがどこでどう定義され、なぜ `/lifecompass` になって
  しまっているのかの原因説明
- 修正方針の提案(このフェーズでは実装しないが、次フェーズの
  実装指示書を作成するための材料として、修正すべき箇所・
  想定される修正内容を報告書に含めること)
- ルート直下サイトマップ404の原因についての簡単な所見
  (詳細調査は次回でよい)

## 注意事項

- このフェーズは**調査のみ**。ファイルの変更・コミットは行わないこと
- `simulate.ts` / `analyze.ts` には一切触れないこと(本タスクとは
  無関係だが、念のため既存ルールとして明記)
- 完了報告には、該当する関数名・コンポーネント名を明記すること
  (行番号は編集中にずれるため使用しない)

---

## 調査結果(2026-07-28)

### 1. サイトマップ生成箇所

`src/app/sitemap.ts`(`export default function sitemap()`)。Next.js App Routerの
`MetadataRoute.Sitemap`APIを使った動的生成で、`public/sitemap.xml`のような
静的ファイルは存在しない(確認済み・重複や競合なし)。

`sitemap()`内では`SITE_URL`(`@/lib/siteConfig`からimport)を使い、
`` `${SITE_URL}${p}` ``・`` `${SITE_URL}/blog/${post.slug}` ``という形でURLを
組み立てている(`staticEntries`・`postEntries`の両方)。

### 2. ベースURLのハードコード箇所・原因

`src/lib/siteConfig.ts`:
```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://freenough-lifecompass.vercel.app${BASE_PATH}`;
```

**原因は環境変数`NEXT_PUBLIC_SITE_URL`(Vercelプロジェクト設定側)が、
basePathを`/lifecompass`から`/asset-simulator`へ改名した際に更新されず、
今も古い値(`https://freenough.com/lifecompass`と推定)を保持し続けている
ことだと考えられる。**

根拠(git履歴で裏付け):
- コミット`484e34d`(2026-07-18、「Multi Zones移行 basePath実装」)時点で
  `BASE_PATH = '/lifecompass'`・コメントに「Multi Zones移行後は
  freenough.com/lifecompass配下が実際の公開場所になる」と明記。
  `SITE_URL`のコード側フォールバックはVercelの`.vercel.app`ドメインのみで
  `freenough.com`は含まれないため、実際に観測されている
  `https://freenough.com/lifecompass/...`というURLが出るには、この時点で
  Vercel環境変数`NEXT_PUBLIC_SITE_URL`が`https://freenough.com/lifecompass`
  に明示設定されていたはずである
- コミット`998da97`(2026-07-21、「LIFECOMPASS文言変更対応①」)で
  `next.config.mjs`の`basePath`と`siteConfig.ts`の`BASE_PATH`定数を
  `/lifecompass`→`/asset-simulator`へ**コードレベルでは正しく更新済み**
  (該当コメントも「freenough.com/asset-simulator配下が実際の公開場所」に
  修正されている)
- しかし**Vercelの環境変数はリポジトリの外側(Vercelダッシュボード)で
  管理されており、このコミットの範囲には含まれない**。`??`演算子は
  環境変数が「設定されている」限り常にそちらを優先するため、環境変数の
  更新漏れがあると、コード側がいくら正しく修正されていても
  `SITE_URL`は古い値のまま返り続ける

### 3. なぜページ本体は正常で、サイトマップだけ古いのか

- ページ本体のルーティング・リダイレクトは`next.config.mjs`の
  `basePath: '/asset-simulator'`と`redirects()`が担っており、これは
  **ビルド時にコードから直接読み込まれる**ため、環境変数の状態に
  関係なく常に最新のコード内容(`/asset-simulator`)で動作する
- 一方、`sitemap.ts`・`robots.ts`(下記参照)・OGP/canonicalタグ・RSSは
  すべて`SITE_URL`という**共通の1変数**を経由しており、この変数だけが
  環境変数優先(`??`)の設計のため、環境変数側の更新漏れの影響を
  受ける経路が完全に分離している

**この調査で新たに判明した点(指示書の想定より影響範囲が広い)**:
`SITE_URL`を参照している箇所は`sitemap.ts`だけではなく、以下の
7ファイルすべてに及ぶ(`grep -rl "SITE_URL"`で確認):

| ファイル | 用途 | 影響 |
|---|---|---|
| `src/app/sitemap.ts` | サイトマップの`<loc>` | 報告のあった症状そのもの |
| `src/app/robots.ts` | `robots.txt`の`Sitemap:`行 | 誤ったサイトマップURLをクローラーに案内している |
| `src/app/layout.tsx` | `metadataBase`(全ページ共通のOGP/canonical解決基準) | サイト全体のOGP画像・相対URL解決に影響 |
| `src/app/blog/[slug]/page.tsx` | 各記事の`og:url`・`canonical` | ブログ記事の正規URLがすべて`/lifecompass/blog/...`になっている可能性が高い |
| `src/app/rss.xml/route.ts` | RSSフィードの各アイテムURL | RSS購読者・フィードリーダー経由でも旧URLが露出 |
| `src/lib/blog.ts` | 記事本文中の`.vercel.app`直リンクを正規ドメインへ統一する後処理 | 統一先自体が`SITE_URL`(古い値)のため、統一後も古いURLになる |
| `src/lib/siteConfig.ts` | `SITE_URL`定義そのもの | (原因箇所) |

**特にcanonicalタグ(`blog/[slug]/page.tsx`)への影響は、サイトマップよりも
深刻である可能性が高い**。Googleは一般にサイトマップより`canonical`タグの
シグナルを重視するため、記事ページ自身が「自分の正規URLは
`/lifecompass/blog/...`だ」と申告し続けている構造だとすると、
サイトマップだけを直しても`/lifecompass`系URLの露出が解消しない
おそれがある。次フェーズの実装指示書では、環境変数の修正と合わせて
canonical/OGPの実機確認も範囲に含めることを推奨する。

### 4. ルート直下 `https://www.freenough.com/sitemap.xml` 404について(所見のみ)

このリポジトリ(`lifecompass-next`)はMulti Zones構成における
`/asset-simulator`ゾーンの担当のみで、ルート直下(`freenough.com/`)を
担当しているのは別リポジトリ(コミットメッセージ中に「B-2/B-3
(freenough-main側)は別リポジトリのため未着手」と明記されている
「freenough-main」)である。このリポジトリには当該コードが存在しないため、
実装を直接確認することはできない。

推測できる範囲での所見:
- ルートドメイン側(freenough-main)に`sitemap.ts`相当の実装が
  そもそも存在しない可能性
- Multi Zonesのrewrite設定で、ルート直下の`/sitemap.xml`リクエストが
  どちらのゾーンにも正しくルーティングされていない可能性

いずれもfreenough-main側リポジトリの調査が必要なため、詳細は次回に
持ち越すのが妥当。

### 5. 修正方針の提案(次フェーズ向け・このフェーズでは未実装)

1. **Vercelダッシュボード側の対応(コード変更ではない)**:
   `lifecompass-next`プロジェクトの環境変数`NEXT_PUBLIC_SITE_URL`を
   `https://freenough.com/asset-simulator`に更新し、再デプロイする。
   これが根本原因への直接対応であり、最優先で行うべき修正
2. **コード側の保険(任意・推奨)**:
   環境変数が将来また更新漏れを起こした場合に備え、`SITE_URL`の
   値が現在の`BASE_PATH`を含んでいるかを検証する仕組み(例:
   ビルド時または起動時に`SITE_URL.endsWith(BASE_PATH)`を確認し、
   一致しなければビルドを失敗させる、または警告ログを出す)を
   検討する。環境変数由来の値を無条件に信頼する現在の設計は、
   今回のような「コードは直したが環境変数を直し忘れる」というヒューマン
   エラーを構造的に防げない
3. **確認範囲の拡大**: 修正後は`sitemap.xml`だけでなく、
   `robots.txt`・任意のブログ記事の`<link rel="canonical">`・
   `og:url`・`/rss.xml`の実機確認を実装指示書のチェック項目に含める
4. **freenough-main側の別調査**: ルート直下`sitemap.xml`の404は
   別リポジトリの調査が必要なため、`asset-simulator`側の修正完了後に
   別タスクとして着手する(指示書の想定通り)
