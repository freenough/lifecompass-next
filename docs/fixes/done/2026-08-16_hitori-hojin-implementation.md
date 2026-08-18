# 実装タスク：/hitori-hojin LP・ブログ 初期実装(記事8本 + LP + ブログ一覧)

## 位置づけ
これは実装タスクです。以下の設計判断はすべて確定済み(調査・壁打ち完了)のため、その通りに実装してください。
判断に迷う点があれば、実装を止めて確認を求めてください(自己判断で仕様を変更しないこと)。

**commit/pushは行わないこと。実装・ビルド確認まで完了したら、変更内容を報告して指示を待つこと。**

---

## 0. 最重要:将来の切り出しやすさを最優先した名前空間設計

将来的に`/hitori-hojin`関連コードを`apps/hitori-hojin`として独立させるモノレポ移行を計画しています(現時点では未着手・将来予定)。今回の実装が、その将来の切り出し作業を困難にしないよう、以下を徹底してください。

### 徹底事項
1. **新規ファイルはすべて`hojin`という名前空間プレフィックスで統一する**
   - `src/lib/hojinBlog.ts`、`src/lib/hojinCategories.ts`
   - `src/components/hojin/`配下にコンポーネントを集約(`HojinContentSection.tsx`、`HojinArticleCard.tsx`、`HojinBlogListClient.tsx`)
   - `src/app/hojin/`配下にルーティングを集約
   - `src/content/hojin-blog/`配下にMarkdownコンテンツを集約

2. **既存の`asset-simulator`側コードへの一方向依存のみを許可する**
   - hojin側のコードから、既存の`src/lib/blog.ts`・`src/lib/blogTopics.ts`・`src/data/concerns.ts`・`src/components/concerns/*`への**import・参照は一切行わないこと**(調査済み・確定方針)。処理ロジックはすべて`hojinBlog.ts`/`hojinCategories.ts`内に独立して実装する(既存コードのコピー&改変であっても、importではなく独立ファイルとして複製すること)
   - `/asset-simulator`へのリンクは、コード上のimportではなく、**単なるURL文字列としてのリンク**にとどめること(例:CTAの`href="/asset-simulator?..."`)。これはコード結合ではなくコンテンツ上の参照なので問題ない
   - `src/lib/simulate.ts`・`src/lib/analyze.ts`は今回一切使用しない(CompanyStateが未実装のため)。将来的にhojin側がこれらを使う場合も、直接importではなく、将来のモノレポ移行時に`packages/simulation-engine`経由で参照する設計にする前提を崩さないこと(今回は該当なしなので触れないだけでよい)

3. **既存ファイルへの変更は、追記のみの2箇所に限定する**(下記6・7節)
   - `src/app/sitemap.ts`:hojin関連URLの追加(既存ロジックへの変更ではなく、新規エントリの追加)
   - `freenough-main/next.config.ts`:rewrite1行の追加

4. **Header/Footerは現時点では共通のまま使用してよい**(既存の`src/app/layout.tsx`をそのまま利用、hojin側で個別実装しない)。これは意図的な結合であり、将来ブランドを分離する場合にのみ見直す(今回は対応不要)

この4点を守ることで、将来`src/app/hojin/`・`src/lib/hojin*.ts`・`src/components/hojin/`・`src/content/hojin-blog/`のディレクトリごと`apps/hitori-hojin`に移動するだけで切り出しが完了する状態を保てます。

---

## 1. 新規作成するファイル一覧

### コンテンツ
- `src/content/hojin-blog/hitori-hojin-01-what-is.md`
- `src/content/hojin-blog/hitori-hojin-02-middle-ground.md`
- `src/content/hojin-blog/hitori-hojin-03-tax-social-insurance.md`
- `src/content/hojin-blog/hitori-hojin-04-compensation.md`
- `src/content/hojin-blog/hitori-hojin-05-allocation.md`
- `src/content/hojin-blog/hitori-hojin-06-maintenance-cost.md`
- `src/content/hojin-blog/hitori-hojin-07-transition.md`
- `src/content/hojin-blog/hitori-hojin-08-timing.md`

(本文は別途KENZOが添付する8つのMarkdownファイルを使用。**各ファイル冒頭のHTMLコメント`<!-- 【運用メモ・公開前に確認】... -->`ブロックは公開用ファイルには含めないこと**(内部レビュー用メモのため削除)。それ以外の本文は基本的にそのまま使用してよいが、以下2点を実施すること:
  1. 冒頭に下記「2. frontmatterスキーマ」に従ったYAML frontmatterを追加する
  2. 本文中の記事間内部リンク(`/asset-simulator/blog/hitori-hojin-XX-slug`という暫定形式で記載されている箇所)を、実際のURLパスに置換する。実際のパスは`/asset-simulator/hojin/blog/[slug]`という内部パス(basePath適用後)になる想定だが、**下記6節のbasePath付与処理を実装した上で、Markdown内では`/hojin/blog/[slug]`という相対パス(basePathなし)で記述し、レンダリング時に自動でbasePathが付与される設計にすること**(後述の既知バグを再発させないため))

### コード
- `src/lib/hojinBlog.ts` — ブログ記事の取得・パース関数群
- `src/lib/hojinCategories.ts` — 「知る」「考える」のキュレーション分類の静的対応表
- `src/components/hojin/HojinContentSection.tsx` — 汎用ブロックコンポーネント
- `src/components/hojin/HojinArticleCard.tsx` — 記事カードUI
- `src/components/hojin/HojinBlogListClient.tsx` — ブログ一覧(seriesフィルタ対応)
- `src/app/hojin/page.tsx` — LP本体
- `src/app/hojin/blog/page.tsx` — ブログ一覧ページ
- `src/app/hojin/blog/[slug]/page.tsx` — 記事詳細ページ

---

## 2. frontmatterスキーマ

`hojinBlog.ts`内に以下の型を定義してください(既存`BlogPostMeta`とは独立した新規型):

```typescript
export interface HojinBlogPostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: 'knowledge' | 'consider'; // 知る=knowledge, 考える=consider
  series?: string;       // シリーズ記事のみ設定。値は 'hitori-hojin-intro'
  seriesOrder?: number;  // シリーズ内の並び順(1始まり)
  excerpt?: string;
  eyecatch?: string;
}
```

各記事のfrontmatter値:

| ファイル(slug) | title | category | seriesOrder |
|---|---|---|---|
| hitori-hojin-01-what-is | 一人法人って、そもそも何？ | knowledge | 1 |
| hitori-hojin-02-middle-ground | 完全リタイアしなくても、FIREって目指せる？ | consider | 2 |
| hitori-hojin-03-tax-social-insurance | 税金・社会保険はどう変わる？ | knowledge | 3 |
| hitori-hojin-04-compensation | 役員報酬は、いくらにすればいい？ | consider | 4 |
| hitori-hojin-05-allocation | 法人に残す？個人に移す？ | consider | 5 |
| hitori-hojin-06-maintenance-cost | 実際、維持コストはいくら？ | knowledge | 6 |
| hitori-hojin-07-transition | 会社員から一人法人へ。何が変わった？ | consider | 7 |
| hitori-hojin-08-timing | 一人法人は、いつ作ればいい？ | consider | 8 |

全記事に`series: 'hitori-hojin-intro'`を設定すること。`date`は実際の公開日(未定の場合は実装日でよい、後で変更可)。`description`は下表のカード説明文をそのまま使用してよい。

---

## 3. hojinCategories.ts の内容

```typescript
export const HOJIN_CATEGORIES = {
  knowledge: {
    label: '一人法人を知る',
    subtitle: 'まずは基本を知りたい方へ',
  },
  consider: {
    label: '一人法人を考える',
    subtitle: '自分に合うかどうかを考えたい方へ',
  },
} as const;
```

(既存`blogTopics.ts`の`TOPIC_GROUPS`とは無関係の独立ファイルであること。importしないこと)

---

## 4. hojinBlog.ts の要件

- `src/lib/blog.ts`の`getAllPosts()`と同様、`gray-matter`でfrontmatterをパースする(importは`gray-matter`パッケージのみ、`blog.ts`自体はimportしない)
- `POSTS_DIR = path.join(process.cwd(), 'src/content/hojin-blog')`
- `getAllHojinPosts(): HojinBlogPostMeta[]` — 全記事取得、日付降順ソート(既存`getAllPosts()`と同じデフォルト挙動)
- `getHojinPostsBySeries(series: string): HojinBlogPostMeta[]` — 指定シリーズの記事を`seriesOrder`昇順で取得
- `getHojinPostBySlug(slug: string)` — 個別記事取得(本文HTML変換含む)
- **重要(既知バグの再発防止)**:`src/lib/blog.ts`の`applyBasePathToHtml()`は画像`src`のみbasePathを付与し、リンク`href`には付与しないというバグが既知の問題として記録されている(`docs/fixes/`参照)。`hojinBlog.ts`側で同等の関数を実装する際は、**`src`と`href`の両方にbasePathを自動付与する**ように最初から正しく実装すること

---

## 5. コンポーネント要件

### HojinContentSection.tsx
```typescript
interface HojinContentSectionProps {
  title: string;
  subtitle?: string;
  items: HojinBlogPostMeta[];
  footerLink?: { label: string; href: string }; // 「①から順番に読みたい方はこちら」用
}
```
`HojinArticleCard`を`.map()`で描画する汎用コンポーネント。将来「計算する」「管理する」ブロックもこのコンポーネントで実装できるよう、`items`の中身がツールでも記事でも表示できる程度の汎用性を持たせること(今回は記事のみのため、過度な抽象化はしなくてよい)。

### HojinArticleCard.tsx
- 参考実装:`src/app/page.tsx`の200〜231行目付近にある「FIREガイド」記事グリッドのインラインJSX(サムネイル・タイトル・抜粋・Linkの構成)
- 既存`ConcernCard.tsx`はimportしないこと(構造的に不適合と判断済み)

### HojinBlogListClient.tsx
- `'use client'`コンポーネント
- クエリパラメータ方式:`?series=hitori-hojin-intro`が付与された場合、該当シリーズの記事のみを`seriesOrder`昇順で表示する
- クエリパラメータがない場合は全記事を日付降順で表示(デフォルトのブログ一覧)
- 既存`BlogListClient.tsx`の`FilterButton`はexportされていないため、直接importせず、必要であれば同等のUIを独立実装すること

---

## 6. ページ実装

### src/app/hojin/page.tsx (LP)
以下のセクションを縦に配置する構成とする(`src/app/page.tsx`の「セクションを縦に積む」パターンを踏襲。抽象化されたLPビルダーは使わず、素朴な構成でよい):

1. **Hero**
   - 見出し:「一人法人を、FIREの選択肢に。」
   - サブコピー:「これから法人化を考える人にも、すでに一人法人を運営している人にも。税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。」

2. **Intro**
   ```
   FIREというと、「完全に働くのをやめること」だけをイメージしがちです。でも、完全リタイアと会社員の間には、仕事を続けながら働き方や収入の持ち方を変え、資産形成を続けるという選択肢もあります。その選択肢の一つとして、一人法人があります。

   このシリーズでは、「法人化すれば得をする」という切り口ではなく、税金・社会保険・役員報酬・資産の置き場所といった一人法人特有の論点を、自分のFIRE計画の中でどう位置づけるかという視点で整理します。
   ```

3. **「一人法人を知る」ブロック**(`HojinContentSection`、`getHojinPostsBySeries()`等でcategory='knowledge'の記事を`seriesOrder`昇順抽出)

4. **「一人法人を考える」ブロック**(category='consider'の記事を`seriesOrder`昇順抽出。`footerLink`に「①から順番に読みたい方はこちら」→`/hojin/blog?series=hitori-hojin-intro`を設定)

5. **[今回は実装しない]** 計算する/管理するブロック

6. **ブログ一覧への導線**(`/hojin/blog`へのリンクセクション。一覧ページ自体は別ページなので、LPには「すべての記事を見る」程度の導線でよい)

7. **FIRE資産シミュレーターへのCTA**
   ```
   一人法人を考える前に、まずは自分の必要資産額を確認してみてください。一人法人はFIREを実現するための選択肢の一つです。
   ```
   → `/asset-simulator`へのリンク

8. **[今回は実装しない]** NOTEブロック

### src/app/hojin/blog/page.tsx
`HojinBlogListClient`を描画。`getAllHojinPosts()`を渡す。

### src/app/hojin/blog/[slug]/page.tsx
`src/app/blog/[slug]/page.tsx`を参考に新規実装(importはしない、複製)。CTA文言は「FREENOUGH資産シミュレーターで試算する」的な既存文言を流用せず、各記事内に既に書かれているCTA文(`/asset-simulator?utm_source=blog&utm_medium=referral&utm_campaign=hitori_hojin_*`のリンク)をそのまま活かす形にすること。

---

## 7. sitemap.ts への追記

`src/app/sitemap.ts`に、以下を**既存ロジックに影響しない形で追加**してください:
- `/hojin`(LP)
- `/hojin/blog`(一覧)
- `getAllHojinPosts()`から動的生成する各記事URL

既存の`postEntries`等のロジックは変更せず、`hojinPostEntries`のような別変数を作り、返り値配列に結合する形にすること。

---

## 8. freenough-main側の変更

`freenough-main/next.config.ts`の`rewrites()`に以下を追加:
```typescript
{
  source: '/hitori-hojin/:path*',
  destination: 'https://freenough-lifecompass.vercel.app/asset-simulator/hojin/:path*',
}
```
(既存の`/asset-simulator/:path*`のrewriteルールと同じ記述パターンに合わせること。実際のdestination先ドメインは既存ルールの記述を確認して合わせること)

---

## 9. 検証

- `tsc`が通ることを確認
- `full-verify.js`を実行し、既存機能に影響がないことを確認
- ローカルビルドで`/hojin`・`/hojin/blog`・`/hojin/blog/hitori-hojin-01-what-is`等が正常表示されることを確認
- 記事内の内部リンク(`href`)が正しくbasePath付きで生成されているか、実際にリンクをクリックして確認(既知バグの再発がないか)

---

## 10. 厳守事項(再掲)

- `src/lib/blog.ts`・`src/lib/blogTopics.ts`・`src/data/concerns.ts`・`src/components/concerns/*`・`src/lib/simulate.ts`・`src/lib/analyze.ts`は一切変更しないこと
- `docs/fixes/active/`フォルダは空でも`rmdir`しないこと
- 指示にない範囲のファイル・フォルダ操作を自己判断で行わないこと
- commit/pushは行わず、実装完了後は報告のみ行うこと
- 本ファイルに明記のない仕様判断が必要になった場合は、自己判断で決めず質問すること
