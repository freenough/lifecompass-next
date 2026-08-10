# 指示書:ブログ記事「在職老齢年金」公開配置

## 対象記事

- タイトル:60代で働くと年金はいくら減る?在職老齢年金65万円を試算
- meta description:2026年4月、在職老齢年金の基準額が65万円に引き上げ。
  60代で働きながら年金を受け取る場合、実際にいくら減るのかを5パターンで
  試算しました。
- カテゴリ想定:基本記事(制度解説)
- topic group(`blogTopics.ts`):既存の「年金・老後の資産計画」グループに
  該当すると思われるが、既存記事(繰り上げ・繰り下げ記事等)がどのグループ
  スラッグを使っているか確認し、それに合わせること

## 添付ファイル

1. `draft_zaishoku_rourei_nenkin.md` — 記事本文(確定版)
   - 冒頭のHTMLコメント内に確定タイトル・meta description・使用画像を明記済み
   - 本文にH1見出し・アイキャッチ埋め込みタグは含めていない(frontmatterから
     自動レンダリングされる設計のため)
   - 本文中の画像参照(`/images/blog/inline-zaishoku-rourei-beforeafter.png`)は
     仮のパスなので、実際の配置先に合わせて修正すること
2. `eyecatch-zaishoku-rourei-nenkin.png` — アイキャッチ画像(1536×1024px、3:2)
3. `inline-zaishoku-rourei-beforeafter.png` — 本文中図版(1536×1024px、3:2)

## 作業内容

### 1. frontmatterの確定

既存の公開済みMDファイル(直近では9記事目の退職金×iDeCo記事)のfrontmatter
スキーマを確認し、以下のフィールド名を過去の不整合(`image`→`eyecatch`、
`meta_description`→`description`)を踏まえて正しく設定すること。

- title: 60代で働くと年金はいくら減る?在職老齢年金65万円を試算
- eyecatch: (画像配置後のパス)
- description: 2026年4月、在職老齢年金の基準額が65万円に引き上げ。60代で
  働きながら年金を受け取る場合、実際にいくら減るのかを5パターンで試算しました。
- date: (公開日、KENZOに確認するか本日日付)
- category/topic group: 既存記事のスキーマに合わせて設定

### 2. スラッグの決定

既存記事の命名パターン(`nisa-monthly-investment`、`ideco-nisa`等)に
合わせて、この記事のスラッグ案を提示すること。例:
`zaishoku-rourei-nenkin` または `zaishoku-rourei-nenkin-2026`

### 3. 画像配置

- `public/images/blog/`配下(過去の不整合修正で確定した正しいパス)に
  2画像を配置
- ファイル名は添付のまま、または既存記事の命名規則があればそれに合わせる
- 本文中の画像参照パスを、実際の配置後のパスに更新すること

### 4. 本文中リンクの確認

本文中に以下のツールリンクが2箇所(中盤・終盤)ある。UTMパラメータが
`utm_source=blog&utm_medium=referral&utm_campaign=zaishoku_rourei_blog`
という命名規則(`blog_article_template.md`のUTM規則)に沿っているか確認:

```
https://www.freenough.com/asset-simulator/tools/pension-timing?utm_source=blog&utm_medium=referral&utm_campaign=zaishoku_rourei_blog
```

`pension-timing`ツールのURLスラッグが実際にこれで合っているか、
`toolMetadata.ts`のTOOLS配列と突き合わせて確認すること。

### 5. concerns.tsへの追加要否

今回は住宅ローンの前例と異なり、記事公開に伴う`concerns.ts`への新規
concernカード追加は必須指示していない。追加するかどうかは判断が必要な
場合、KENZOに確認すること(強制はしない)。

## 検証

- `full-verify.js`をパスすること
- `check-raw-html-in-blog.js`をパスすること
- `tsc`クリーンを確認すること
- ローカルビルドで実際にページが表示され、画像2枚が正しく表示される
  ことを確認すること
- 本文中のツールリンクをクリックし、実際に`pension-timing`ツールへ
  正しく遷移することを確認すること

## 注意事項

- 記事本文の数値はすべて独自再現(公式計算式の手計算・Decimal型検算)に
  よるものであり、資産シミュレーター本体の出力ではない。この点を誤って
  「資産シミュレーターで試算した」等に書き換えないこと
- コミット・プッシュは行わず、実装・配置・ローカル確認までで留め、
  KENZOの承認を待つこと
