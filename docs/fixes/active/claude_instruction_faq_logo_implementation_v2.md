# 指示書: FAQPage構造化データ(AST方式)・Organization logo 実装 v2

## 位置づけ

先の実現可能性調査「claude_instruction_faq_blogts_feasibility_check.md」の結果を受けた実装指示です。**v1（生Markdownへの正規表現方式）は破棄し、こちらのv2（remark ASTベース、`blog.ts`/`hitoriHojinBlog.ts`への追加専用export方式）で進めてください。**

## 作業ルール(必ず遵守)

- 専用ブランチ（例: `feature/faq-schema`）で作業し、Vercel Preview URLで確認できる状態にしてから完了報告してください
- コミット・pushはKENZOの明示的指示があるまで行わないでください
- **今回はロックファイル（`blog.ts`, `hitoriHojinBlog.ts`）への変更を含む「管理された例外」です。** 以下を必ず満たしてください:
  - 既存のexport（関数名・型定義・戻り値の構造）は一切変更しない。新規export関数の追加のみ
  - 新規フィクスチャを追加し、`scripts/check-raw-html-in-blog.js`と同系統（plain fs-based、warn-only）のパターンで`scripts/verify-faq-extraction.js`を作成する
  - 既存の`full-verify.js`に新スクリプトを組み込む
  - 完了報告に、既存の全テスト（`full-verify.js`実行結果）がすべてPASSしたままであることを明記する
- **今回も検証の網羅性を広げてください**: 現在サイトに公開されている全ファイル(通常ブログ21件＋hitori-hojin 8件＝29件、`blog/old/`配下の8件は対象外)について、抽出結果（質問数・各Q&Aのテキスト）を完了報告に添え、Claude Code自身で目視チェックした結果も報告してください

---

## A. FAQ抽出の共有ヘルパー実装

### 新規ファイル

`src/lib/faqExtraction.ts`（ロックファイルではない新規ファイル）に、以下を実装してください。

### 処理方針

1. `remark().use(remarkGfm).parse(markdown)`で生のASTを取得する（`remarkHtml`・カスタムsanitizeスキーマ・アフィリエイトリンク/キャプション用プラグインは不要、bareなparseのみでよい）
2. `## よくある質問`（`(FAQ)`等の表記ゆれを許容）という見出しノードを探す
3. その見出し以降、次の見出し（同level以下）が現れるまで、またはドキュメント末尾までを「FAQセクション」として走査する。`thematicBreak`（`---`）ノードは内容として扱わず、単に読み飛ばす（セクション終端の判定には使わない。終端はあくまで次の見出しかファイル末尾）
4. セクション内の`paragraph`ノードを順に見ていき、**先頭の子ノードが`strong`で、そのテキストが`Q`から始まるもの**を「質問の開始」として検出する
5. 質問の抽出:
   - `strong`ノード配下のインライン要素を再帰的にプレーンテキストへ変換し（`emphasis`・`link`等が入っていても文字だけを取り出す。`link`はリンクテキストのみを残しURLは破棄してよい）、先頭の`Q.`または`Q`プレフィックスを取り除く
6. 回答の抽出（2パターンを両方処理する）:
   - **パターン1（別々のparagraphノード）**: 質問のparagraphノードの次のsibling paragraphノードから、次の質問（`strong`が`Q`で始まるparagraph）が現れるまでを回答として連結する
   - **パターン2（同一paragraphノード内）**: 質問の`strong`ノードの直後に続く同じparagraph内のテキストノード（先頭の改行・空白は除去）を回答の開始とし、同様に後続paragraphがあれば次の質問が現れるまで連結する
   - いずれのパターンでも、回答テキストの先頭に`A. `または`A.`があれば取り除く
   - 回答内のインライン要素（`emphasis`・`link`等）も、質問と同様にプレーンテキストへ変換する（`link`はテキストのみ残す）
7. `{question: string, answer: string}[]`を返す関数としてexportする（関数名は実装しやすいものでよい、例: `extractFaqFromMarkdown(markdown: string): {question: string; answer: string}[]`）

### `blog.ts`・`hitoriHojinBlog.ts`への追加

- それぞれに、新規export関数（例: `getPostFaq(slug: string)`）を追加し、対象記事の生Markdownを読み込んで`faqExtraction.ts`の関数を呼び出す形にしてください
- 生Markdownの読み込みは、既存の内部処理（frontmatter分離等）を流用できる場合はそれに合わせて構いませんが、**既存のexport関数・戻り値・型定義には一切手を加えないでください**
- 同じファイルを複数回読み込む形になりますが、調査結果の通り既存コードも同様のパターン（`page.tsx`が`getPostBySlug`を複数回呼ぶ等）があるため、この点は問題ありません

### ページ側での利用

- `src/app/blog/[slug]/page.tsx`・`src/app/hitori-hojin/blog/[slug]/page.tsx`それぞれで、新規export関数からFAQを取得し、1件以上あればFAQPage JSON-LDを出力してください（0件の場合は出力しない）

### FAQPage JSON-LDのフォーマット

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "(質問文)",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "(回答文、プレーンテキスト)"
      }
    }
  ]
}
```

- 既存のArticle JSON-LDと同じページに、別の`<script type="application/ld+json">`として併記してください

---

## B. Organization logoの追加

`src/lib/siteConfig.ts`の`ORGANIZATION_SCHEMA`（および`freenough-main`側で直書きしているOrganization JSON-LD）に、`logo`フィールドを追加してください。

```json
"logo": "https://www.freenough.com/images/compass_logo.png"
```

- 画像のURLは、実際に`compass_logo.png`が本番でどのパスで配信されているか確認した上で、正しい絶対URLを設定してください
- `lifecompass-next`側のOrganization JSON-LDにも同じ`logo`を追加してください（自リポジトリ内の`compass_logo.png`のURLを使っても構いません）

---

## 完了報告のフォーマット

- A: 実装したファイルパス、`full-verify.js`（新規スクリプト含む）の全件PASS結果、**全29ファイル分の抽出結果一覧**（質問数、パターン1/パターン2それぞれの実例が最低1件ずつ含まれる形で）
- B: 変更ファイルパス・行番号、実際に設定した`logo` URL
- Vercel PreviewでのRich Results Test（FAQPageが正しく検出されるか）またはSchema Markup Validatorの結果
- 対応しきれなかった記法・エッジケースがあれば報告してください（無理に全パターンに対応せず、「その記事はFAQPage対象外」として報告する形で構いません）
