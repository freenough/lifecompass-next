# 確認指示書:NEXT_PUBLIC_SITE_URL修正後の関連箇所 実機確認

## 背景

`investigation_sitemap_baseurl_bug.md`の調査で判明した通り、
Vercelの環境変数`NEXT_PUBLIC_SITE_URL`が旧basePath
(`https://freenough.com/lifecompass`)のまま残っていたことが
sitemap.xmlのURL誤りの原因だった。

本日、Vercelダッシュボード上で`NEXT_PUBLIC_SITE_URL`を
`https://www.freenough.com/asset-simulator`に修正し、再デプロイ済み。
実機で`https://freenough.com/asset-simulator/sitemap.xml`を確認したところ、
全19件のURLが正しく`https://www.freenough.com/asset-simulator/*`に
なっていることを確認済み。

調査報告書によれば、`NEXT_PUBLIC_SITE_URL`(またはそれを参照する
`SITE_URL`定数)を使用している箇所はsitemap.tsだけでなく他に6ファイル
あるとのことだった。今回はそれらが環境変数修正後、正しく反映されて
いるかの実機確認を行ってほしい。

## 確認してほしいこと(調査のみ、コード変更は不要)

以下それぞれについて、本番環境で実際にURLへアクセスし、
`freenough.com/lifecompass`という文字列が一切残っていないことを確認する。

1. **ブログ記事のcanonicalタグ**
   - `src/app/blog/[slug]/page.tsx`で生成されるページのうち、
     最低2〜3記事(例:`pension-timing`、`4percent-rule`)で
     実際にページソースを取得し、`<link rel="canonical">`タグの
     href値を確認する
   - 同様に`<meta property="og:url">`の値も確認する

2. **layout.tsxのmetadataBase**
   - トップページ・シミュレーターページ等、複数ページで
     `metadataBase`が影響するmetaタグ(og:image等の絶対URL化含む)
     が正しいドメイン・パスになっているか確認する

3. **robots.txt**
   - `https://freenough.com/asset-simulator/robots.txt`を実際に
     取得し、Sitemap案内行(`Sitemap: https://...`)が正しい
     URLになっているか確認する

4. **rss.xml**
   - `rss.xml/route.ts`で生成されるRSSフィードを実際に取得し、
     `<link>`や各記事の`<guid>`等のURLが正しいドメイン・パスに
     なっているか確認する

## 期待するアウトプット

- 上記4項目それぞれについて、確認したURL・取得した実際の値
  (該当箇所のみ抜粋)・正常/異常の判定を報告書にまとめる
- もし1つでも`lifecompass`という文字列が残っている箇所が
  見つかった場合は、該当ファイル・関数名を明記し、この
  フェーズでは修正せず報告のみとする(修正は別途指示書を作成)
- 全て正常であれば、その旨を明記して完了報告とする

## 注意事項

- このフェーズは実機確認のみ。ファイルの変更・コミットは行わないこと
- `simulate.ts` / `analyze.ts`には触れないこと
- 完了報告には関数名・コンポーネント名を明記し、行番号は使用しないこと

---

## 確認結果(2026-07-28・本番環境に実際にアクセスして確認)

**結論:4項目すべて正常。`freenough.com/lifecompass`という文字列は
どこにも残っていない。**

### 1. ブログ記事のcanonicalタグ・og:url(`src/app/blog/[slug]/page.tsx`)

3記事で確認(指示の2〜3記事の上限で実施):

| 記事 | `<link rel="canonical">` | `<meta property="og:url">` |
|---|---|---|
| pension-timing | `https://www.freenough.com/asset-simulator/blog/pension-timing` | 同左 |
| 4percent-rule | `https://www.freenough.com/asset-simulator/blog/4percent-rule` | 同左 |
| nisa-achievement-age | `https://www.freenough.com/asset-simulator/blog/nisa-achievement-age` | 同左 |

いずれも正しい新ドメイン・新basePathで一致。

### 2. layout.tsxのmetadataBase(og:image等の絶対URL化)

トップページ(`/asset-simulator`)・シミュレーターページ(`/asset-simulator/app`)の
2ページで確認。両方とも:
```
og:image: https://www.freenough.com/asset-simulator/images/ogp.png
og:url:   https://www.freenough.com/asset-simulator (または /app)
```
正しく解決されている。

### 3. robots.txt

`https://www.freenough.com/asset-simulator/robots.txt`を実際に取得:
```
User-Agent: *
Allow: /

Sitemap: https://www.freenough.com/asset-simulator/sitemap.xml
```
Sitemap案内行は正しいURL。

### 4. rss.xml

`https://www.freenough.com/asset-simulator/rss.xml`を実際に取得。
`<link>`(チャンネル・各記事)・`<guid>`とも全件
`https://www.freenough.com/asset-simulator/blog/...`形式で正しい
(pension-timing・nisa-achievement-age・nisa-monthly-investment・
dual-income-couple-fire等、全記事分を確認)。

### 補足確認

- `sitemap.xml`自体も再確認:`<loc>`が20件、全件新ドメイン・新basePath
  (前回調査時の19件から、本タスク中の記事追加等で20件に変化した
  可能性があるが、件数自体は本確認の対象外)
- 上記6ページ(記事3本・トップ・app・rss.xml)+sitemap.xmlのレスポンス
  本文全体に対して`grep -ic "lifecompass"`を実行し、すべて0件(該当なし)
  であることを機械的にも確認済み

異常は1件も見つからなかったため、修正指示書の作成は不要。
