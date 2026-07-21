# 指示書: URLパス変更(/lifecompass → /asset-simulator、/simulator → /app)

作成日: 2026-07-19
対象: `lifecompass-next`・`freenough-main`
種別: 新規実装(2段階:調査→実装)。サービス名称変更(LifeCompass→FREENOUGH 資産シミュレーター)は完了済みで、今回はURLパスの変更。

---

## 前提・全体構成

```
変更前: freenough.com/lifecompass/simulator
変更後: freenough.com/asset-simulator/app
```

- `basePath`を`/lifecompass`から`/asset-simulator`に変更する
- シミュレーター本体のルートを`/simulator`から`/app`に変更する(basePath名との重複を避けるため)
- 旧URL(`/lifecompass/*`)から新URL(`/asset-simulator/*`)への**301リダイレクト(redirects)** を設定する。これはMulti Zonesで使う`rewrites`(裏側だけ転送、URLは変わらない)とは別物であることに注意する
- 加えて、`/asset-simulator/simulator`(内部リンク修正漏れや手入力でのアクセス)へのアクセスも、`/asset-simulator/app`へ301リダイレクトする保険を設ける
- 301リダイレクトを設定する主目的はSEO評価の引き継ぎではなく、**note・SNS・チャット履歴等に残っている可能性のある、把握しきれていない旧URLへのアクセスを救うため**である

---

## フェーズA:調査のみ(実装しない)

### A-1. `lifecompass-next`側

- 現在の`next.config.mjs`の内容(`basePath`設定箇所)
- `basePath`・絶対URLに依存している箇所の再洗い出し(前回のMulti Zones移行時に修正した`src/lib/siteConfig.ts`・`layout.tsx`・`blog.ts`等が、今回のパス変更でも同様に機能するか確認する)
- `/simulator`ルートへの内部リンク参照箇所をすべて洗い出す(ヘッダー・フッター・LP内のCTAボタン・ブログ記事内のリンク等)
- JSON-LD(`WebApplication`)のURLフィールドで`/lifecompass`を含む箇所を洗い出す(前回の調査でJSON-LD自体は未実装と判明しているため、該当なしであればその旨を報告する)
- sitemap生成ロジック(`app/sitemap.ts`)・robots生成ロジック(`app/robots.ts`)の現状

### A-2. `freenough-main`側

- 現在の`next.config.ts`のrewrites設定内容
- `page.tsx`内のLifeCompass関連URL定数(`LIFECOMPASS_URL`・`BLOG_URL`・`ABOUT_URL`)の一覧

### A-3. 報告フォーマット

```
## 調査報告: URLパス変更の影響範囲

### lifecompass-next側
- basePath関連の現状: (内容)
- /simulatorへの内部リンク参照箇所: (一覧)
- JSON-LD・sitemap・robotsの現状: (内容)

### freenough-main側
- rewritesの現状: (内容)
- URL定数の一覧: (内容)

### 実装方針の確認事項
- (判断が必要な点があれば記載)
```

---

## フェーズB:実装(フェーズAの報告後、確認を経てから着手)

### B-1. `lifecompass-next`側

1. `next.config.mjs`の`basePath`を`/lifecompass`から`/asset-simulator`に変更
2. `/simulator`ルート(フォルダ)を`/app`にリネームし、内部リンク参照箇所をすべて`/app`に更新
3. 絶対URL・サイトマップ・robots.txtが、すべて新しいbasePath(`/asset-simulator`)を反映するよう修正
4. **旧パスからの301リダイレクトを設定する**(`next.config.mjs`の`redirects()`を使用):

```js
async redirects() {
  return [
    {
      source: '/lifecompass/simulator/:path*',
      destination: '/asset-simulator/app/:path*',
      permanent: true,
    },
    {
      source: '/lifecompass/:path*',
      destination: '/asset-simulator/:path*',
      permanent: true,
    },
    // 保険: 新basePath配下で旧ルート名(/simulator)にアクセスされた場合の転送
    {
      source: '/asset-simulator/simulator/:path*',
      destination: '/asset-simulator/app/:path*',
      permanent: true,
    },
  ];
},
```

   - ルールの順序(より具体的なパターンを先に評価すること)に注意する。実装時にNext.jsのredirects評価順序を確認し、意図通りに動作するか検証すること

### B-2. `freenough-main`側

1. `next.config.ts`のrewritesを、新しいbasePath(`/asset-simulator`)に向けて更新:

```js
async rewrites() {
  return [
    {
      source: '/asset-simulator',
      destination: 'https://freenough-lifecompass.vercel.app/asset-simulator',
    },
    {
      source: '/asset-simulator/:path*',
      destination: 'https://freenough-lifecompass.vercel.app/asset-simulator/:path*',
    },
  ];
},
```

2. `page.tsx`内のURL定数(`LIFECOMPASS_URL`等)を、新しいパスに更新

### B-3. 動作確認

- 新URL(`freenough.com/asset-simulator`・`freenough.com/asset-simulator/app`)が正しく表示されること
- 旧URL(`freenough.com/lifecompass`・`freenough.com/lifecompass/simulator`)にアクセスした際、301で正しく新URLへ転送されること(ブラウザのアドレスバーが新URLに変わることを確認)
- note記事に貼ってある旧URL(`freenough.com/lifecompass/?utm_source=note&...`)を実際に開き、UTMパラメータを維持したまま新URLへリダイレクトされることを確認する
- sitemap・robots・canonical・OGPが、すべて新URLで正しく生成されていることを確認する

---

## 受け入れ基準

- [ ] フェーズAの調査報告が提出されている
- [ ] `basePath`が`/asset-simulator`に変更され、`/simulator`ルートが`/app`にリネームされている
- [ ] 旧URL(`/lifecompass/*`・`/lifecompass/simulator/*`)から新URLへの301リダイレクトが機能している
- [ ] 新basePath配下での`/simulator`アクセスも`/app`へ301される
- [ ] `freenough-main`のrewritesが新パスに更新されている
- [ ] sitemap・robots・canonical・OGPがすべて新URLを反映している
- [ ] note記事のリンク(UTMパラメータ付き)が、リダイレクト経由で正しく新URLに到達することを確認済み
- [ ] 両リポジトリとも`npm run build`が型エラーなしで通る

---

## 完了報告フォーマット(フェーズB)

```
## 完了報告: URLパス変更実装

### 変更したファイル
- (lifecompass-next側・freenough-main側それぞれ)

### 実装内容
- basePath・ルートリネームの内容
- redirects設定の内容
- rewrites更新の内容

### 確認事項
- npm run build(両リポジトリ): PASS/FAIL
- 301リダイレクトの動作確認: 確認済み/未確認(確認したURLパターン一覧)
- note記事リンクの動作確認: 確認済み/未確認

### 不明点・確認が必要な事項
- (あれば記載)
```
