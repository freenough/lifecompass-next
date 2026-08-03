# 指示書: ブログ12本目 アフィリエイトリンク追加(パッチ対応)

作成日: 2026-08-01

---

## 背景

ブログ12本目「複利は『利回り×年数』で決まる」
(`src/content/blog/compound-interest-rate-vs-years.md`)が既に公開済みだが、
本文にMatsui証券NISAの`AffiliateLink`コンポーネントが1箇所も含まれていない
まま公開されてしまった(記事作成時の見落とし)。

## 対応内容

### 1. 挿入位置

FAQセクションの「Q. NISAを使うと何が変わりますか?」の回答直後、
「## まとめ」見出しの直前に、Matsui証券NISAのアフィリエイトリンクを
1件挿入する。

### 2. 記法の確認(重要)

このチャット側では正確な記法を把握していないため、**既存の公開記事
(例:9本目のNISA関連記事)で実際に使われている`AffiliateLink`の
記法・propsの指定方法をまず確認し、それに完全に合わせること。**
(参考イメージとしては `<AffiliateLink id="matsui/nisa" />` のような形を
想定しているが、実際の実装(`src/lib/affiliateLinks.ts`の`matsui/nisa`
エントリ・remarkプラグインの構文)を優先する)

### 3. 検証

- [ ] `full-verify.js` 実行、0 FAILであることを確認
- [ ] `check-raw-html-in-blog.js` 実行
- [ ] dev server実機で該当箇所にアフィリエイトリンクが正しく表示され、
      リンク先が正しいことを確認(`rel="sponsored"`が付与されているか含む)
- [ ] 既存の他コンテンツ(検証A/B/C、CTA、他FAQ)に意図しない変更が
      入っていないか確認(diffで挿入箇所以外に変更がないこと)

### 4. デプロイ

検証完了後、コミット・再デプロイまで実行してよい
(今回は公開済み記事への軽微な修正パッチのため)。

## 完了条件

- アフィリエイトリンクが指定位置に正しい記法で挿入されている
- full-verify.js: 0 FAIL
- 本番URL(https://freenough.com/blog/compound-interest-rate-vs-years )で
  表示確認済み
- コミット・デプロイ完了
