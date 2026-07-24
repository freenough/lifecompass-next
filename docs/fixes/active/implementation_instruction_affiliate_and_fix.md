# 実装指示書:AffiliateLinkショートコード実装 + 既存CTA欠落バグ修正

調査(前回セッション)を踏まえ、実装方式が決定しました。以下2件を実施してください。

---

## 作業1:AffiliateLinkのremarkカスタムプラグイン実装

### 方針
MDX化は行わない。現行の `remark().use(remarkGfm).use(remarkHtml)` パイプラインに、
独自のremarkプラグインを1つ追加し、`<AffiliateLink provider="..." landing="..." />`
という記法をMarkdown内で認識して、通常の `<a>` タグ(href・rel="sponsored"付き)の
mdast/hastノードに変換する。

### 実装対象
`src/lib/blog.ts`(または適切なlibファイル)に、remarkプラグインを追加する。

**プラグインの動作:**
1. Markdown本文中の `<AffiliateLink provider="matsui" landing="nisa" />` という
   パターンをテキストノード内で検出する
2. 検出したノードを、以下の対応表に基づいて実際の `<a>` タグのHTML文字列に置換する
   (mdast の html ノードとして生成し、既存の remarkHtml パイプラインを通す)

**対応表(provider × landing → URL):**

| provider | landing | URL |
|---|---|---|
| matsui | nisa | `https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+69HAA` |
| matsui | general | `https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+64C3M` |

**生成するHTML(例: provider="matsui" landing="nisa" の場合):**
```html
<a href="https://px.a8.net/svt/ejp?a8mat=4B8791+7118VM+3XCC+69HAA" target="_blank" rel="sponsored noopener noreferrer">NISA口座開設先の一例として、松井証券の情報はこちら</a>
```

- リンクテキストは `landing` の値によって切り替える:
  - `landing="nisa"` → 「NISA口座開設先の一例として、松井証券の情報はこちら」
  - `landing="general"` → 「証券口座開設先の一例として、松井証券の情報はこちら」
- `rel="sponsored noopener noreferrer"` は固定
- `target="_blank"` は固定

**対応表・リンクテキストは設定オブジェクトとして1箇所(例: `src/lib/affiliateLinks.ts` 等)に
まとめ、将来 provider や landing を追加しやすい形にすること。**

### 未知のprovider/landingが指定された場合
存在しない組み合わせ(例: `provider="rakuten"` がまだ未登録)が指定された場合は、
ビルド時にコンソール警告を出し、該当箇所は何もレンダリングしない(サイレントに
壊れたリンクを出さない)。

### 完了報告に含めてほしい内容
- 実装したプラグインのコード
- `<AffiliateLink provider="matsui" landing="nisa" />` を記事に埋め込んだ状態で
  実際にビルド・表示確認した結果(スクリーンショットまたはHTML出力)
- 既存9記事のビルドが壊れていないことの確認(`npm run build` 通過)

---

## 作業2:fire-inflation-sensitivity.md の中間CTA欠落バグ修正

### 問題
`src/content/blog/fire-inflation-sensitivity.md` 内の以下の生HTMLブロックが、
現行のremark(sanitizeデフォルト)パイプラインで完全に消えており、ライブページ上に
一切表示されていないことを確認済み(本番URLで直接確認済み)。

```html
<div class="cta-inline">
ここまで読んで「自分の場合はどうなる?」と思った方は、一度試算してみてください。
<a href="https://freenough-lifecompass.vercel.app/simulator?utm_source=blog&utm_medium=referral&utm_campaign=fire-inflation-sensitivity&utm_content=mid">資産シミュレーターで試算する →</a>
</div>
```

### 修正内容
同記事内で正常に機能している `bottom` CTAと同じ、通常のMarkdownリンク構文に
書き換える。

**修正後:**
```markdown
ここまで読んで「自分の場合はどうなる?」と思った方は、一度試算してみてください。

[資産シミュレーターで試算する →](https://freenough-lifecompass.vercel.app/simulator?utm_source=blog&utm_medium=referral&utm_campaign=fire-inflation-sensitivity&utm_content=mid)
```

(URLはリポジトリ内の実際の値をそのまま使用。上記は現行mdファイルからの転記)

### 注意
他の記事にも同様の生HTML CTAが紛れていないか、`src/content/blog/`配下を
`grep -l 'cta-inline\|<div\|<a href' `等で横断チェックし、同じ問題がないか確認する。
見つかった場合は同様に修正し、完了報告に対象ファイル名を明記すること。

### 完了報告に含めてほしい内容
- 修正後、実際にビルドしてリンクが表示されることを確認した結果
- 他記事の横断チェック結果(問題があったファイル一覧、なければ「なし」)

---

## 実施順序
作業2(バグ修正)を先に完了させてから、作業1(AffiliateLink実装)に着手すること。
理由:作業2は既存の実害修正であり独立して完結できるため。
