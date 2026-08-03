# 指示書: ブログ12本目「複利は『利回り×年数』で決まる」配置

作成日: 2026-08-01

---

## 背景

複利計算ツール(`/tools/compound`)を題材にしたブログ記事12本目。
本文・数値はこのチャット(planning側)で作成済み。数値の算出根拠は
`scripts/blog12-compound-numbers.js` から `financeCore.ts` の
`calcFutureValue()` を直接実行したもの(独自再実装なし)。

画像3枚は既に配置済み(KENZOが手動配置):
- `public/images/blog/compound-interest-rate-vs-years-eyecatch.png`
- `public/images/blog/compound-interest-rate-vs-years-01-simple-vs-compound.png`
- `public/images/blog/compound-interest-rate-vs-years-02-rate-years-matrix.png`

## 対応内容

### 1. frontmatter構造の確認(最優先)

新規記事を配置する前に、**直近公開済みの記事(11本目:
`education-cost-fire-simulation.md`)のfrontmatter構造を確認**し、
以下を完全に一致させること。

- フィールド名(タイトル・スラッグ・日付・description・アイキャッチ画像
  パスのキー名など)
- 日付フォーマット
- アイキャッチ画像パスの記法(過去に `eyecatch-{slug}.png` と
  `{slug}-eyecatch.png` の取り違えが発生した経緯があるため、
  実際に使われているキー名・パス形式を必ず既存記事から確認すること。
  このチャットで用意した草稿のfrontmatterは参考程度とし、既存記事の
  構造を優先する)

不一致があれば、このチャットで用意した草稿側を既存記事の構造に
合わせて修正すること(サイト側の型を変更しない)。

### 2. 記事本文の配置

添付の草稿(本メッセージと共有される想定、または直前のチャットでの
やり取りを参照)を `src/content/blog/compound-interest-rate-vs-years.md`
に配置する。

- 本文中の画像参照パスが、実際に配置済みの3ファイルと一致しているか確認
- スラッグは `compound-interest-rate-vs-years`

### 3. 検証

以下をすべて実施し、完了報告に結果を明記すること。

- [ ] `full-verify.js` 実行、0 FAILであることを確認
- [ ] `check-raw-html-in-blog.js` 実行
- [ ] 「LifeCompass」「FIRE達成」の文言混入チェック(grep)
- [ ] 本文中・CTA内のリンクが実際に機能するか確認
      (特に `https://freenough.com/asset-simulator/tools/compound` への
      リンクが正しいURLか。UTMパラメータ
      `utm_source=blog&utm_medium=referral&utm_campaign=compound_interest_years_blog`
      が付与されていることも確認)
- [ ] 画像3枚がすべて正しく表示されるか(パスの大文字小文字・拡張子含む)
- [ ] アイキャッチが1536×1024px(3:2)であることを確認

### 4. デプロイについて

**このセッションではコミット・デプロイを実行しないこと。** 検証まで
完了した時点で完了報告を出し、デプロイの実行はKENZOの明示的な指示を
待つこと(過去のブログ11本目のワークフローと同様)。

## 完了条件

- frontmatter構造が既存公開記事と一致していることの確認結果を報告
- full-verify.js: 0 FAIL
- 上記チェックリストすべて完了
- 数値の算出方法(本番関数経由)を完了報告に明記
- コミット・デプロイは未実行のまま報告
