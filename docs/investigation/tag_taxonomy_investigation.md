# タグ実態調査 + 孤立ツールのブログリンク調査レポート

作成日:2026-08-01
種別:調査専用(コード変更なし)。`instruction_nav_tags_orphan_tools.md`のタスク2・タスク4への回答。

---

# タスク2:ブログ・Toolsのタグ実態調査

## 1. ブログ13記事の`category`・`tags`実値一覧

| 記事slug | category | tags |
|---|---|---|
| 4percent-rule | FIRE基礎知識 | 4%ルール, 取り崩し戦略 |
| compound-interest-rate-vs-years | シミュレーター活用 | 複利計算, 利回り, 積立シミュレーション |
| dual-income-couple-fire | シミュレーター活用 | 共働き夫婦, 退職タイミング |
| education-cost-fire-simulation | シミュレーター活用 | 教育費, 私立公立, 子育て世帯 |
| fire-checklist | FIRE基礎知識 | FIRE計画, チェックリスト, 見落とし |
| fire-inflation-sensitivity | シミュレーター活用 | インフレ率, 資産寿命 |
| ideco-nisa | FIRE基礎知識 | NISA, iDeCo |
| montecarlo-simulation | FIRE基礎知識 | モンテカルロシミュレーション, 破綻確率 |
| nisa-achievement-age | シミュレーター活用 | *(フィールドなし)* |
| nisa-monthly-investment | シミュレーター活用 | *(フィールドなし)* |
| pension-timing | シミュレーター活用 | *(フィールドなし)* |
| semi-retirement-blank-period | シミュレーター活用 | セミリタイア, 早期退職, 年金 |
| withdrawal-strategy-comparison | シミュレーター活用 | 取り崩し戦略, NISA, モンテカルロ |

**指示書の前提との差異:** 指示書は「`tags`が存在しない2記事」としていたが、実際に`grep`で確認したところ**3記事**(`nisa-achievement-age`「新NISA、今のペースで積み立てたら何歳で3,000万円に届く?」・`nisa-monthly-investment`「新NISAは毎月いくら積み立てればいい?目標資産から逆算する方法」・`pension-timing`「年金は繰り上げ・繰り下げどっちが得?損益分岐年齢と『運用した場合』まで試算」)に`tags`フィールドがなかった。

`category`は**2値のみ**:「FIRE基礎知識」(4記事)・「シミュレーター活用」(9記事)。

---

## 2. 関連記事コンポーネントのマッチングロジック(詳細)

実装は`src/lib/blog.ts`の`getRelatedPosts()`:

```ts
export function getRelatedPosts(currentSlug: string, category: string, limit = 3): BlogPostMeta[] {
  return getAllPosts()
    .filter((p) => p.slug !== currentSlug && p.category === category)
    .slice(0, limit);
}
```

呼び出し元は`src/app/blog/[slug]/page.tsx`の`getRelatedPosts(post.slug, post.category)`(limit省略=3件のまま)。

- **マッチング条件:`category`の完全一致のみ。**`tags`はこの関数内で一切参照されていない(コード上に`tags`という文字列自体が登場しない)。
- **型定義:**`tags`は`BlogPostMeta`インターフェース(`src/lib/blog.ts`)に`tags?: string[]`として**既に型として定義済み**。frontmatter上だけに値があってコード側の型にない、という状態ではない。`getAllPosts()`・`getPostBySlug()`双方の返り値オブジェクトで`tags: data.tags`として正しくマッピングされている。ただし「型があって値も読み込まれているのに、どこにも使われていない」状態(死んだフィールド)。
- **表示件数の上限:**`limit`引数のデフォルト値`3`。呼び出し側で上書きしていないため常に最大3件。
- **ソート順:**`getRelatedPosts()`自体には明示的なソート処理はないが、内部で呼んでいる`getAllPosts()`が`date`降順(新しい順)でソート済みの配列を返すため、結果的に**同一カテゴリ内の新しい記事順**になる。関連度スコアリングのような仕組みはない。

---

## 3. Toolsページの型定義・メタデータ構造

- 7ツールのカード情報(タイトル・説明・href・アイコン・グループ)は`src/app/tools/page.tsx`の**`TOOLS`配列1箇所に集約**されている(ツールごとに分散していない)。

```ts
interface ToolItem {
  title: string;
  description: string;
  href: string;
  Icon: Icon;
  group: ToolGroup; // 'accumulate' | 'receive' | 'optimize'
}
```

- `group`(3値:資産を増やす/資産を受け取る/税金・家計を最適化する)が、テーマ分類に最も近い既存フィールド。ただしこれは一覧ページの見出し分け用の粗い3分類であり、ブログの`tags`(NISA・iDeCo・教育費等の具体的トピック)とは粒度が異なる。制度名レベルの構造化データ(例:「NISA」「iDeCo」「退職金」等のタグ)は現状存在しない。
- **注意点:** 各ツール個別の`page.tsx`(7ファイル)にも、SEO用に`title`/`description`(+今回追加した`canonical`)が**別途重複して定義されている**。`TOOLS`配列側のtitle/descriptionと文言が完全一致している保証はない(実装時に確認が必要)。新規`tags`/`topics`フィールドを追加する場合、**`TOOLS`配列1箇所への追加で足りる**(個別`page.tsx`7ファイルへの追加は不要)。

---

## 4. 改修規模の再評価:小〜中(前回「中」から一部下方修正)

**Tools側の見積もりを下方修正した理由:** 前回レポートでは「Tools側7ページ分にtagsを新規追加」を改修コストとして見込んでいたが、実際には`TOOLS`配列が1ファイル1箇所に集約されているため、**Tools側のデータ追加は7ファイルではなく1ファイル(`tools/page.tsx`)で完結する**。この部分は当初想定より軽い。

**それでも「中」寄りに留まる理由:**
- `getRelatedPosts()`は`BlogPostMeta[]`専用の実装(引数・戻り値ともブログ固有の形)。Toolsを混在させるには、両者を包含する共通型(例:`{ title, href, kind: 'blog' | 'tool', topics: string[] }`)への設計変更が必要で、これは新規設計が要る。
- マッチングロジックを`category`完全一致から、タグ交差数によるスコアリング等へ変更する必要がある。
- レンダリング側が2箇所に分かれている:ブログ記事の「関連記事」セクション(`blog/[slug]/page.tsx`に直書き)と、Tools側の`RelatedArticles`コンポーネント(`src/components/tools/RelatedArticles.tsx`、現状ブログ記事のみをハードコードした`articles`配列で受け取る設計)。これらを共通化するか、両方individually改修するかの設計判断が要る。
- ブログ13記事中3記事に`tags`がなく、埋めるための編集作業も発生する。

**総合評価:小〜中。** データの器(型・配列構造)はほぼ揃っており、Tools側の追加は当初想定より軽いが、マッチングロジック・型統合・2箇所のレンダリング統一という設計判断の要る作業が残るため、「小」と言い切るには根拠不足。「中の下」くらいの位置づけが実態に近い。

---

# タスク4:孤立2ツール(`retirement-tax`・`ideco-withdrawal`)のブログリンク調査

## 方法

13記事全てで`grep`により「退職金」「iDeCo」の言及箇所を洗い出し、該当箇所の前後文脈を確認して「自然に繋がるか」を判定した(タイトル・リード文だけでなく、本文の該当段落まで確認)。

## `retirement-tax`(退職金手取り計算ツール)の判定

**自然に繋がる記事あり:**

1. **`semi-retirement-blank-period`(55歳で早期退職したら資産はどうなる?)** — 最有力候補。記事の前提プロファイルに「退職金(55歳時):1,500万円」という具体的な数値が登場し、本文でも「退職金や貯蓄はあっても、公的年金がもらえる65歳までは、収入がゼロになる期間が発生します」「あなたの退職年齢・資産・退職金を入力すれば…確認できます」と、退職金の**額面**には触れているが**手取り額**には一切触れていない。「この退職金1,500万円、実際の手取りはいくら?」という自然な問いを埋める形でリンクできる。
2. **`4percent-rule`(4%ルールは日本でも通用する?)** — 「退職金:勤続年数によって退職所得控除が変わり、税負担が大きく変動する」と、まさに`retirement-tax`ツールが計算する内容そのものを文章で説明している箇所がある。ここに具体的な試算ツールへの導線を足すのは自然。

**弱い候補(無理につなげない方がよいと判断):**
- `dual-income-couple-fire`・`fire-checklist`・`withdrawal-strategy-comparison`は「退職金」への言及はあるが、プロファイル上の数値や制度の存在に触れる程度で、税額・手取りという文脈までは踏み込んでいない。
- `nisa-monthly-investment`・`montecarlo-simulation`・`compound-interest-rate-vs-years`は「NISA・iDeCo・退職金・年金など日本の制度に対応」という定型の機能紹介文での言及のみで、文脈的なつながりが薄い。

## `ideco-withdrawal`(iDeCo/DC出口戦略シミュレーター)の判定

**自然に繋がる記事あり(かなり強い適合):**

1. **`ideco-nisa`(iDeCoとNISA、どう組み合わせる?)** — 指示書は「積立時のiDeCo/NISA比較が主眼」と想定していたが、実際に読むと**記事の後半(「資産シミュレーターで検証する:受取方法によって資産はどう変わるか」節)が丸ごと、iDeCoの一時金受取 vs 年金受取の手取り比較に割かれている**(田中さんのケースで一時金1,494万円・年金1,707万円、差額213万円という具体的な試算まで掲載済み)。この記事は`ideco-withdrawal`ツールが計算する内容を、記事内で本格シミュレーター経由で再現している状態であり、「同じ比較を30秒で試したい方はこちら」という形で`ideco-withdrawal`ツールへ誘導するのはきわめて自然。むしろ現状リンクが無いことの方が不自然に見えるレベル。
2. **`withdrawal-strategy-comparison`(FIRE後の資産はどの順番で取り崩すべき?)** — FAQに「Q. iDeCoは取り崩し戦略の比較に含まれていますか?」という設問があり、回答で「iDeCo自体の受給開始年齢や受取方式(一時金・年金)は、この3戦略とは関係なく、iDeCoの設定だけで決まります」と説明している。ここは「その受取方式の比較については別ツールで」と自然に誘導できる箇所。

**弱い候補:**
- `pension-timing`は「想定利回りはNISA・iDeco・特定口座すべて共通」という前提条件レベルの言及のみで、受取方式の話には踏み込んでおらず、無理に繋げない方がよい。

## 判定結果まとめ

| ツール | 判定 | 候補記事(強い順) |
|---|---|---|
| retirement-tax | **自然に繋がる記事あり** | ① semi-retirement-blank-period(退職金1,500万円の言及箇所) ② 4percent-rule(退職所得控除の説明箇所) |
| ideco-withdrawal | **自然に繋がる記事あり(強)** | ① ideco-nisa(受取方法比較の節がほぼ丸ごと同一テーマ) ② withdrawal-strategy-comparison(iDeCo受取方式のFAQ回答) |

両ツールとも「将来記事の企画候補として保留」ではなく、**既存記事内に自然にリンクを追加できる箇所が見つかった**。次回の実装指示書での対応候補として報告する。

---

## 参考:主なソースファイル

- `src/lib/blog.ts`(`getRelatedPosts()`・`BlogPostMeta`型定義)
- `src/app/blog/[slug]/page.tsx`(関連記事セクションの呼び出し元)
- `src/app/tools/page.tsx`(`TOOLS`配列・`ToolItem`型定義)
- `src/components/tools/RelatedArticles.tsx`
- `src/content/blog/*.md`(frontmatter・本文中の「退職金」「iDeCo」言及箇所)
