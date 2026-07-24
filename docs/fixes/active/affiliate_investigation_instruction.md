# 調査指示書:ブログ記事内アフィリエイトリンクの実装方式決定

## 背景
ブログ記事(Markdown)内に、汎用的に呼び出せるアフィリエイトリンク
（例: `<AffiliateLink provider="matsui" landing="nisa" />`）を実装したい。
将来的にボタンデザイン変更・文言変更・ASP変更・GA4イベント追加を
1箇所で完結させたいため。

同一ASP・同一提携先でも遷移先ランディングページが複数存在する
（例: 松井証券は「NISA口座開設ページ」と「通常口座開設ページ」の
2種類がある）ため、コンポーネントは `provider` に加えて `landing`
のようなpropでリンク先を切り替えられる設計にする想定。

現時点で判明している松井証券のリンク一覧（参考・調査完了後に実装で使用）:
- NISA文脈用: a8mat=4B8791+7118VM+3XCC+69HAA（NISA口座開設ページへ遷移）
- 汎用文脈用: a8mat=4B8791+7118VM+3XCC+64C3M（通常口座開設ページへ遷移、EPC最高）

## 調査してほしいこと

1. **現在のMarkdownレンダリングパイプラインを特定する**
   - `src/app/blog/[slug]/page.tsx` がMarkdownをどう処理しているか確認
   - 使用ライブラリを特定（例: `remark`, `remark-html`, `react-markdown`,
     `next-mdx-remote`, `@next/mdx` など。package.jsonのdependenciesも確認）
   - `rehype-raw` や `allowDangerousHtml: true` 相当の設定が入っているか確認

2. **現状で生HTMLがMarkdown内に書けるか実験する**
   - テスト用に一時的な`.md`ファイルに `<a href="https://example.com">test</a>` を
     埋め込み、実際にレンダリングしてhrefが機能するかブラウザで確認
   - 機能する/しないを完了報告に明記

3. **JSXコンポーネント埋め込みが可能かどうかの判定**
   - 現状が純粋なremark（MDXでない）の場合、`<AffiliateLink />`のような
     Reactコンポーネントをmarkdown内に直接書いても機能しないことを確認する
   - MDX化（`next-mdx-remote`導入等）にどの程度の変更規模が必要になるか、
     影響範囲（既存記事ファイルの互換性含む）を調査する

## 完了報告に含めてほしい内容
- 現在の実装方式（ライブラリ名・設定内容）
- 生HTML埋め込みの可否（実験結果つき）
- MDX化した場合の想定変更規模（大まかな見積もりでよい）
- 上記を踏まえた推奨実装方式の意見（あれば）

## 注意
この指示書は調査のみが目的です。実装（AffiliateLinkコンポーネントの
作成やMarkdown内容の書き換え）はまだ行わないでください。
