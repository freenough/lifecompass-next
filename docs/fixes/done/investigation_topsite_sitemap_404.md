# 調査指示書:ルート直下 sitemap.xml 404 調査(freenough-main)

## 背景

`https://www.freenough.com/sitemap.xml`(ドメインルート直下、
FREENOUGH トップページを担当する`freenough-main`リポジトリ側)に
アクセスすると404が返る。

これとは別に、`/asset-simulator`配下(`lifecompass-next`リポジトリ)の
sitemap.xmlは別件で修正済み・正常稼働中。今回の調査対象は
`freenough-main`側のみで、`lifecompass-next`とは無関係。

Vercel上のプロジェクト構成としては、Multi Zonesで
`freenough-main`(ルート`/`)と`freenough-lifecompass`
(`/asset-simulator`配下)が別プロジェクト・別リポジトリとして
運用されている。

## 調査してほしいこと(このフェーズは調査のみ、実装はしない)

1. **サイトマップ生成コードの有無を確認**
   - `freenough-main`リポジトリ内に`app/sitemap.ts`
     (Next.js App Routerのsitemap生成ファイル)、または
     `public/sitemap.xml`のような静的ファイルが存在するか確認する
   - 存在しない場合は「未実装」と判断し、次のステップに進む

2. **未実装の場合:トップページのURL構成を洗い出す**
   - `freenough-main`が担当するページを一通り洗い出す
     (想定:トップページ本体、規約・プライバシーポリシー等の
     固定ページ、その他あれば列挙)
   - 各ページのURLと、更新頻度の目安(静的ページか、
     更新されうるページか)をリストアップする

3. **実装はあるが動いていない場合:原因を特定**
   - もし`sitemap.ts`等が既に存在するなら、なぜ404になるのか
     (ビルドエラー、ルーティング設定ミス、環境変数依存の
     不備など)を特定する
   - `lifecompass-next`側で見つかった`NEXT_PUBLIC_SITE_URL`のような
     環境変数依存の問題が、同様にこちらにも存在しないか確認する
     (Vercelダッシュボードの環境変数一覧を直接見ることはできない
     前提のため、コード側の参照箇所の確認にとどめる)

4. **robots.txtの状況確認**
   - `https://www.freenough.com/robots.txt`が正常に取得できるか、
     その中にSitemap案内行が存在するか(存在するなら、
     存在しないsitemap.xmlを案内してしまっている矛盾がないか)
     を確認する

## 期待するアウトプット

- サイトマップが「未実装」なのか「実装はあるが壊れている」のか
  の判定
- 未実装の場合:新規実装のための材料(URL一覧、想定される
  実装方針の提案)
- 実装はあるが壊れている場合:原因箇所(ファイル名・関数名)と
  修正方針の提案
- robots.txtの現状確認結果

このフェーズの報告内容をもとに、次フェーズで実装指示書
(新規実装 または 修正)を作成する。

## 注意事項

- このフェーズは**調査のみ**。ファイルの変更・コミットは行わないこと
- `lifecompass-next`側のファイルには一切触れないこと(担当リポジトリが異なる)
- `simulate.ts` / `analyze.ts`はこのリポジトリには無関係だが、
  念のため既存ルールとして明記(万一共有コードがあれば触れないこと)
- 完了報告には関数名・コンポーネント名を明記し、行番号は使用しないこと

---

## 調査結果(2026-07-28)

### 1. サイトマップ生成コードの有無

`freenough-main`リポジトリ内に`app/sitemap.ts`は存在しない。
`public/sitemap.xml`のような静的ファイルも存在しない。
リポジトリ全体を検索しても`sitemap`という名称のファイルは一件もなく、
**「未実装」**と判定できる。

同様に`app/robots.ts`・`public/robots.txt`も存在しない。実機で
`https://www.freenough.com/robots.txt`を確認したところ、こちらも
404が返っており、「存在しないsitemapを案内してしまっている矛盾」
どころか、**robots.txt自体が未実装**という状態だった(4章で詳述)。

このリポジトリの`app`配下の全ファイルは以下のみで、ページ生成用の
ルートファイル(`page.tsx`)・レイアウト(`layout.tsx`)・アイコン類・
OGP画像生成(`opengraph-image.tsx`)のみが存在し、メタデータ生成系の
特殊ファイルはOGP画像以外実装されていない。

- `app/layout.tsx`(ルートレイアウト、`RootLayout`)
- `app/page.tsx`(トップページ本体、`Home`)
- `app/opengraph-image.tsx`
- `app/apple-icon.png` / `app/icon.png`

### 2. トップページのURL構成の洗い出し

`freenough-main`が実体として担当しているページは**ルート `/` 一本のみ**
(`Home`コンポーネント、`app/page.tsx`)。規約・プライバシーポリシー等の
固定ページはこのリポジトリ内には存在しない(grep済み、該当なし)。

`Home`コンポーネント内のナビゲーションからは以下のリンクが張られて
いるが、いずれも**このリポジトリの担当外**:

| リンク先 | 内容 | 担当 |
|---|---|---|
| `/asset-simulator` | 資産シミュレーター本体 | `next.config.ts`の`rewrites()`で`freenough-lifecompass.vercel.app`へ転送(＝`lifecompass-next`リポジトリ) |
| `/asset-simulator/blog` | ブログ一覧 | 同上 |
| `/asset-simulator/about` | Aboutページ | 同上 |
| `https://x.com/freenough` | 外部SNS | 対象外 |
| `https://note.com/freenough` | 外部note | 対象外 |

つまり`freenough-main`側で新規にサイトマップを実装する場合、
含めるべきURLは実質的に`/`(トップページ)のみであり、
`/asset-simulator`配下は既に`lifecompass-next`側の
`app/sitemap.ts`(`sitemap()`関数、`SITE_URL`ベース)で別途
カバーされている(背景記載の通り、こちらは別件で修正済み)。
更新頻度の目安は、トップページは静的に近い(頻繁な更新はない)
コーポレート/LPページ。

### 3. 実装はあるが動いていない、というケースには該当せず

`sitemap.ts`・`robots.ts`のいずれも存在しないため、「ビルドエラー」
「ルーティング設定ミス」で404になっているのではなく、単純に
**コードが存在しないために404になっている**(Next.js App Routerは
`sitemap.ts`/`robots.ts`が無ければそのルートを生成しない)。

`lifecompass-next`側で見つかった`NEXT_PUBLIC_SITE_URL`依存の問題
(環境変数の更新漏れでベースURLが古いパスになる不具合)についても、
このリポジトリのコードには同様の依存箇所は存在しない。
`app/layout.tsx`の`RootLayout`内`metadata`では

```ts
metadataBase: new URL("https://freenough.com"),
```

のように**ハードコードされた文字列**が使われており、環境変数
(`NEXT_PUBLIC_SITE_URL`等)への参照は`.env.local`・アプリコードの
どちらにも存在しない(`.env.local`の中身は`VERCEL_OIDC_TOKEN`のみ)。
そのため「環境変数の値がずれてsitemapが壊れる」という`asset-simulator`
側と同種の不具合は、そもそもコードが存在しないこのリポジトリには
発生しえない。

なお余談として、`metadataBase`は`https://freenough.com`
(wwwなし)がハードコードされている一方、実際にユーザーがアクセスして
404を確認したのは`https://www.freenough.com/...`(www付き)。
次フェーズで`sitemap.ts`を新規実装する際は、`<loc>`に使うドメインを
`metadataBase`や実際の正規ドメイン(www有無どちらが正規かVercel側の
リダイレクト設定を含めて確認)と一致させる必要がある。

### 4. robots.txtの状況確認

実機で`https://www.freenough.com/robots.txt`を確認した結果、
**404 Not Found**だった。リポジトリ側にも`app/robots.ts`・
`public/robots.txt`のいずれも存在しないため、コードと実機の状態は
一致している。

「存在しないsitemap.xmlをrobots.txtが案内してしまっている」という
懸念については、robots.txt自体が未実装(404)のため該当せず。
むしろ**sitemap.xmlとrobots.txtの両方が未実装**という状態。

### 5. 判定・次フェーズへの申し送り

- **判定: 未実装**(sitemap.xml・robots.txtともに、実装自体が
  存在しないための404。バグや設定ミスではない)
- 新規実装のための材料:
  - 含めるURLは`/`のみ(固定ページなし)
  - `app/sitemap.ts`を新規追加し、Next.js App Routerの
    `MetadataRoute.Sitemap`型を返す関数を実装する方針を推奨
  - 併せて`app/robots.ts`を新規追加し、`Sitemap:`行で上記
    `sitemap.xml`を案内する実装も合わせて行うのが自然
    (指示書の対象は主にsitemapだが、robots.txtも同時に未実装のため
    次フェーズの実装指示書に含めるかは要判断)
  - ベースURLは`metadataBase`(`https://freenough.com`)と揃えるか、
    実際の正規ドメイン(www有無)を確認した上で決定する
- 実装はあるが壊れている、というケースではなかったため、
  「原因箇所(ファイル名・関数名)の特定」は対象外

