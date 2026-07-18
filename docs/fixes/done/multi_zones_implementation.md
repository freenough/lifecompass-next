# 指示書: Multi Zones実装(freenough.com/lifecompass 構成)

作成日: 2026-07-19
対象: `lifecompass-next`(Zone側)・`freenough-main`(フロントドア側)
種別: 新規実装(2段階:調査→実装)
前提: 最終的なURL構成は以下の通り

```
freenough.com               ← freenough-main が担当
freenough.com/lifecompass   ← lifecompass-next が担当(Multi Zonesでrewrites)
```

独自のブランドサブドメイン(`lifecompass.freenough.com`)は使わない。裏側では`lifecompass-next`は引き続き`freenough-lifecompass.vercel.app`(Vercelが自動割り当てる既存のURL)としてデプロイされ続け、`freenough-main`側からのrewrites転送先として使われる。

---

## フェーズA:調査のみ(実装しない)

影響範囲が広い変更のため、まず以下を調査し、**変更を加える前に一覧として報告すること**。原因が不明瞭な箇所や設計判断が必要な箇所があれば、実装に進まず先に確認を仰ぐこと。

### A-1. `lifecompass-next`側で洗い出すこと

- `next.config.ts`(または`.js`)の現在の設定内容
- 絶対URLをハードコードしている箇所をすべて洗い出す:
  - `metadataBase`の設定箇所
  - OGP画像・Twitterカード画像の絶対URL指定箇所
  - サイトマップ生成ロジック(`sitemap.xml`または`app/sitemap.ts`等)
  - `robots.txt`生成ロジック
  - その他、`https://freenough-lifecompass.vercel.app`という文字列を直接埋め込んでいる箇所(コード全体を`grep`等で検索すること)
- 画像・静的アセットのパスで、`next/image`や`<Link>`を経由せず、文字列結合や`window.location`で組み立てている箇所がないか確認する
- 現状、Vercelにデプロイされている本番URL(`freenough-lifecompass.vercel.app`)そのものは、Multi Zones移行後も生き続けて問題ないことを前提とする(rewritesの転送先として使うため。このURLへの直接アクセス自体は今後も可能なままでよい)

### A-2. `freenough-main`側で洗い出すこと

- 現在の`next.config.ts`の内容
- `LIFECOMPASS_URL`・`BLOG_URL`・`ABOUT_URL`など、`page.tsx`内でLifeCompassの絶対URLを参照している箇所の一覧(これらは後で`/lifecompass`配下の相対パスに書き換える必要がある)

### A-3. 報告フォーマット(フェーズAの完了時)

```
## 調査報告: Multi Zones移行の影響範囲

### lifecompass-next側
- next.config.tsの現状: (内容)
- 絶対URLハードコード箇所: (ファイルパスと該当箇所の一覧)
- その他懸念点: (あれば)

### freenough-main側
- next.config.tsの現状: (内容)
- LifeCompass関連URLの参照箇所: (一覧)

### 実装方針の確認事項
- (判断が必要な点があればここに記載し、実装(フェーズB)に進む前に確認を仰ぐこと)
```

---

## フェーズB:実装(フェーズAの報告後、確認を経てから着手)

### B-1. `lifecompass-next`側

- `next.config.ts`に`basePath: '/lifecompass'`を追加
- フェーズAで洗い出した絶対URLハードコード箇所を、すべて`https://freenough.com/lifecompass`(または相対パス)に修正する
- サイトマップ・robots.txtが`/lifecompass`配下のURLを正しく生成するよう修正する
- 修正後、ローカルで`npm run build`→`npm run start`し、`/lifecompass`配下ですべてのページ(LP・シミュレーター・ブログ一覧・記事・guide・methodology・法的ページ)が正しく表示されることを確認する

### B-2. `freenough-main`側

- `next.config.ts`に以下のrewritesを追加する(Next.js公式のMulti Zones構成に準拠):

```js
async rewrites() {
  return [
    {
      source: '/lifecompass',
      destination: 'https://freenough-lifecompass.vercel.app/lifecompass',
    },
    {
      source: '/lifecompass/:path*',
      destination: 'https://freenough-lifecompass.vercel.app/lifecompass/:path*',
    },
  ];
},
```

- `page.tsx`内の`LIFECOMPASS_URL`・`BLOG_URL`・`ABOUT_URL`を、`/lifecompass`配下の相対パス(例:`/lifecompass`、`/lifecompass/blog`)に書き換える
  - 注意:`ABOUT_URL`(運営者情報ページ)は`lifecompass-next`側の`/about`ページなので、`/lifecompass/about`になる
- ヘッダーナビの`target="_blank"`(別タブで開く設定)は、同一ドメイン内の遷移になるため、以前の議論を踏まえて同じタブで開く形に変更するかどうかも、この機会に確認すること(必須ではないが、Multi Zones化で「同じサイト内の別ページ」という位置づけが明確になるため)

### B-3. 動作確認

- ローカルで両プロジェクトを同時に起動し(`freenough-main`は`next dev`、`lifecompass-next`も別ポートで起動)、`freenough-main`側から`/lifecompass`にアクセスして正しくrewritesされるか確認する
  - ローカルでのrewrites確認が難しい場合は、両方をVercelにデプロイした状態(プレビュー環境)で確認してもよい
- 本番デプロイ後、`freenough.com/lifecompass`(ドメイン接続後)で実際にアクセスし、LP・シミュレーター・ブログが正しく表示されることを確認する

---

## 受け入れ基準

- [ ] フェーズAの調査報告が提出され、影響範囲が明確になっている
- [ ] `lifecompass-next`に`basePath: '/lifecompass'`が設定され、絶対URL・サイトマップ・robots.txtがすべて`/lifecompass`配下を正しく指すよう修正されている
- [ ] `freenough-main`にrewritesが設定され、`/lifecompass`へのアクセスが正しく`lifecompass-next`の実際のデプロイ先に転送される
- [ ] `freenough-main`側のLifeCompass関連リンクが、すべて相対パス(`/lifecompass`配下)に更新されている
- [ ] 両プロジェクトとも`npm run build`が型エラーなしで通る
- [ ] 実機(ローカルまたはプレビュー環境)で、`/lifecompass`配下の主要ページが正しく表示されることを確認済み

---

## 完了報告フォーマット(フェーズB)

```
## 完了報告: Multi Zones実装

### 変更したファイル
- (ファイルパスと変更概要、lifecompass-next側・freenough-main側それぞれ)

### 実装内容
- (basePath設定内容)
- (rewrites設定内容)
- (絶対URL修正箇所の一覧)

### 確認事項
- npm run build(両プロジェクト): PASS/FAIL
- /lifecompass配下の動作確認: 確認済み/未確認(確認した環境・ページ一覧)

### 不明点・確認が必要な事項
- (あれば記載。確信が持てない場合は実装を止めて確認すること)
```
