# 指示書:LP「FIREガイド」セクション追加

## 背景・目的

LP(`src/app/page.tsx`)の「特徴3つ」セクションと「あなたはどのタイプ?」セクションの間に、
ブログ記事への導線となる「FIREガイド」セクションを新設する。

**配置順序(確定):**
```
Hero
↓
特徴3つ
↓
FIREガイド ← 今回追加
↓
あなたはどのタイプ?
↓
シミュレーター
```

「あなたはどのタイプ?」と同じ2×2グリッド構成にすることで、LP全体の視覚的リズムを崩さない。

---

## 作業前の確認(重要)

実装に入る前に、以下を確認して報告すること。既存実装と食い違う場合は、
このファイルの指示より実際のコードベースを優先し、KENZOに差分を報告してから進める。

1. ブログ記事の実体(`.md`ファイル)がどこに置かれているか(`content/blog/` 等を想定)
2. frontmatterのパースに`gray-matter`が既に使われているか、`lib/posts.ts`のようなローダーが存在するか
3. `src/app/blog/page.tsx` と `src/app/blog/[slug]/page.tsx` の現状実装(骨格のみとのことなので、frontmatter型が定義されているか要確認)
4. 「あなたはどのタイプ?」セクションのキャラクターカードの実測値(padding・line-height・`min-height`相当)。FIREガイドのカードをこれに合わせる

---

## 1. frontmatterスキーマの確定・既存3記事への追記

対象記事: `4percent-rule.md` / `ideco-nisa.md` / `montecarlo-simulation.md`

以下のフィールドを追記(既存フィールドは維持):

```yaml
---
title: "(記事タイトル、既存のものを流用)"
slug: "(既存のslugを流用)"
excerpt: "(30〜40字程度の一言説明。3記事分、下記参照)"
eyecatch: "(既存のeyecatch画像パスを流用。なければ /images/blog/eyecatch-<slug>.png)"

category: "FIRE基礎知識"
tags: [...]  # 記事内容に応じて設定。例: ["4%ルール", "取り崩し戦略"]

featured: true
priority: 1  # 4percent-rule=1, ideco-nisa=2, montecarlo-simulation=3

publishedAt: "(既存の日付があれば流用、なければ実際の公開日)"
updatedAt: "(既存の日付があれば流用)"

readingTime: 3
---
```

**excerpt(暫定案。文言はKENZO確認の上で調整可):**
- 4percent-rule: 「日本の税制・インフレを踏まえた検証」
- ideco-nisa: 「制度の違いと使い分けの考え方」
- montecarlo-simulation: 「1,000通りの試行が意味すること」

**注意:** `priority`の数値は将来記事が増えた際もKENZOが手動で管理する。自動採番はしない。

---

## 2. `lib/posts.ts` に `getFeaturedPosts()` を追加

既存の記事一覧取得ロジック(`getAllPosts()`相当の関数)がある場合はそれを利用し、
ない場合は同じ場所に新規作成する。

```typescript
export function getFeaturedPosts(): BlogPost[] {
  return getAllPosts()
    .filter(post => post.featured === true)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}
```

**注意点:**
- 「最新順」でのソートは行わない(SEO記事が増えた際にLPの見え方が弱くなるため、意図的に不採用)
- `featured: false` または未設定の記事はLPに一切表示されない

`BlogPost`型に `featured?: boolean` `priority?: number` `readingTime?: number` `tags?: string[]` `category?: string` `eyecatch?: string` `excerpt?: string` が無ければ `types.ts` (または該当箇所)に追加する。

---

## 3. `page.tsx` に「FIREガイド」セクションを追加

`getFeaturedPosts()` で取得した最大3件 + 静的プレースホルダー1件、計4枚を2×2グリッドで表示する。

**セクション構成:**

```tsx
<section>
  <div className="text-center mb-6">
    <h2>FIREガイド</h2>
    <p>シミュレーターをより活用するための解説記事を公開しています</p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {featuredPosts.map(post => (
      <a key={post.slug} href={`/blog/${post.slug}`} className="...card...">
        <div className="w-[60px] h-[60px] rounded-lg overflow-hidden flex-shrink-0">
          {/* eyecatch画像。60px角。image-fit: cover */}
          <img src={post.eyecatch} alt="" />
        </div>
        <div>{post.title}</div>
        <p>{post.excerpt}</p>
        <div>{post.readingTime}分で読む →</div>
      </a>
    ))}

    {/* プレースホルダー(4枚目・記事未公開) */}
    <div className="...card... cursor-default">
      <span className="badge-gray">近日公開</span>
      <div className="w-[60px] h-[60px] rounded-lg bg-gray-100 flex-shrink-0" />
      <div>FIRE達成に必要な資産額の計算方法</div>
      <p>(準備中)</p>
    </div>
  </div>

  <div className="text-center mt-6 pt-4 border-t">
    <p className="text-sm text-muted">FIRE・資産形成・NISA・iDeCoの記事一覧</p>
    <a href="/blog">記事一覧を見る →</a>
  </div>
</section>
```

**実装上の注意:**
- カードのスタイル(padding・border・radius・min-height)は「あなたはどのタイプ?」のキャラクターカードと視覚的に揃える(作業前の確認1〜4を踏まえて数値を合わせること)
- **サムネイル仕様(確定):** 既存3枚のeyecatch画像は全て1536×1024px(3:2比率)で統一されている(確認済み)。この比率をそのままサムネ枠に適用することで、`object-fit: cover`でも意味のある部分が切り抜かれる事故を避ける。

  ```css
  /* カード本体:paddingは持たせない。テキスト側にだけpaddingを持たせる */
  .fireguide-card {
    display: flex;
    padding: 0;
    overflow: hidden;
    border-radius: 12px;
    /* border等は既存タイプ診断カードに準拠 */
  }

  /* サムネイル:width固定ではなく、カードの高さに自動でストレッチさせて
     aspect-ratioから幅を逆算させる。これにより高さが変わっても常に
     「隙間なくカード端まで埋まる」状態を維持できる */
  .fireguide-thumb {
    aspect-ratio: 3 / 2;
    flex-shrink: 0;
    align-self: stretch;   /* flexの初期値でもあるが明示。高さ=カードの高さ */
    overflow: hidden;
  }
  .fireguide-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;     /* 比率が一致しているため実質的な切り抜きは発生しない */
    display: block;
  }

  /* テキスト側だけにpaddingを持たせる */
  .fireguide-content {
    padding: 14px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .fireguide-content .excerpt {
    font-size: 12px;   /* タイトルより一段小さく。前回の実装でタイトルと同程度に
                          見えていたため、明確に差をつける */
    color: var(--text-secondary);
  }
  ```

  - カードはアイコン+テキストの縦積みではなく、**サムネイル(左・カード高さいっぱい)+テキスト(右・paddingあり)の横並び**レイアウトにする
  - サムネイルの`border-radius`はカード左側の角(左上・左下)のみに丸みをつけ、カードの角と揃える(`overflow: hidden`をカード本体にかけていれば、内側の要素は自動的に切り取られるので個別指定は不要な場合が多い。実装時に見た目を確認)
  - プレースホルダーカード(4枚目)のみサムネイル領域を `background: var(--bd2)` 等のグレー無地にする(画像が存在しないため)
  - 念のため:将来記事が増えて`eyecatch`の比率が3:2でない画像が使われた場合、この方式では意味のある部分が切れる可能性がある。記事執筆時のeyecatch生成プロンプトに「1536×1024(3:2)で生成する」旨を明記しておくことを推奨(このセクションはKENZOへの申し送り事項であり、Claude Codeの実装対象ではない)
- プレースホルダーカードは`<a>`ではなく`<div>`でラップし、リンクなし・`cursor-default`(田中さん以外のキャラクターカードと同じ非活性パターンを流用)
- CTAリンクの色は既存LP方針に合わせ `#334155`(`style={{ backgroundColor: '#334155' }}` または `color: '#334155'`)
- レスポンシブ:モバイルは1カラム、タブレット以上で2×2

**将来の記事公開時の運用:**
「FIRE達成に必要な資産額の計算方法」が公開されたら、該当frontmatterに `featured: true` / `priority: 4` を設定するだけで自動的に本カードに差し替わる。プレースホルダーの静的JSXは手動で削除する。

---

## 4. 完了確認(必須)

1. `node scripts/full-verify.js` で全fixture(山本・中村・田中・佐々木)がPASSすること。特に**田中シリーズの数値(破綻率25.4%等)が変化していないこと**を確認
2. `npx tsc --noEmit` で型エラーがないこと
3. `/` (LP)をブラウザで確認し、FIREガイドセクションが「特徴3つ」と「あなたはどのタイプ?」の間に正しく表示されること
4. 3枚のカードがpriority順(4%ルール→iDeCo/NISA→モンテカルロ)で並んでいること
5. 4枚目のプレースホルダーが正しく「近日公開」表示・非リンクであること
6. モバイル表示で崩れがないこと

**Claude Codeの「完了」報告を鵜呑みにせず、上記を実ファイル・実画面で独立検証すること。**

---

## 5. 完了後

問題なければ:
```
git add -A
git commit -m "feat: LPにFIREガイドセクションを追加(featured/priority frontmatter対応)"
vercel --prod
```
