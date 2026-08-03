# 実装指示書:内部リンク追加・タグタクソノミー導入

作成日:2026-08-01
種別:実装可(企画チャット側で設計確定済み)
前提:`link_matrix_report.md`・`tag_taxonomy_investigation.md`(調査済み)を受けての実装

---

## パートA:孤立2ツールへの内部リンク追加(コンテンツ編集のみ)

既存の文中CTAパターン(通常のMarkdownリンク、ボタン化しない)に準拠し、
以下4記事の該当箇所に1文ずつリンクを追加する。新規UIコンポーネントは作らない。
UTM命名規則は既存の`utm_source=blog&utm_medium=referral&utm_campaign={topic}_blog`を使用。

### A-1. `ideco-nisa`記事 → `ideco-withdrawal`ツール
「資産シミュレーターで検証する:受取方法によって資産はどう変わるか」節、
田中さんのケース(一時金1,494万円・年金1,707万円、差額213万円)の試算を
書き終えた直後の段落末に追加。

文言例(確定):
> この比較をご自身の条件で試したい方は、[iDeCo受取シミュレーター](リンク)で確認できます。

(※「30秒ほどで」のような所要時間の言及は入れない)

### A-2. `withdrawal-strategy-comparison`記事 → `ideco-withdrawal`ツール
既存FAQ「iDeCoは取り崩し戦略の比較に含まれていますか?」の回答文末に追加。

文言例(確定):
> 受取方式(一時金・年金)による手取りの違いは、[iDeCo受取シミュレーター](リンク)で試算できます。

### A-3. `semi-retirement-blank-period`記事 → `retirement-tax`ツール
「退職金(55歳時):1,500万円」プロファイル説明、または収入ゼロ期間の説明段落の後に追加。

文言例(確定):
> この退職金の手取り額が気になる方は、[退職金手取り計算ツール](リンク)で試算できます。

### A-4. `4percent-rule`記事 → `retirement-tax`ツール
退職所得控除・税負担変動の説明文の直後に追加。

文言例(確定):
> 具体的な手取り額は、[退職金手取り計算ツール](リンク)で確認できます。

各記事につき追加は1箇所のみ。過剰な誘導にならないよう注意すること。

---

## パートB:tags欠落3記事の補完(コンテンツ編集のみ)

以下3記事のfrontmatterに`tags`を追加する(既存の日本語自由記述形式を踏襲):

| slug | 追加するtags |
|---|---|
| nisa-achievement-age | ["NISA", "積立シミュレーション", "達成年齢"] |
| nisa-monthly-investment | ["NISA", "積立シミュレーション", "逆算"] |
| pension-timing | ["年金", "繰り上げ受給", "繰り下げ受給"] |

---

## パートC:タグタクソノミー(`primaryTopic`・`topics`)の導入

### C-1. 型定義の拡張

`src/lib/blog.ts`の`BlogPostMeta`インターフェースに以下を追加:

```ts
interface BlogPostMeta {
  // ...既存フィールド維持(category, tagsも変更なし)
  primaryTopic: string;
  topics: string[];
}
```

`src/app/tools/page.tsx`の`ToolItem`インターフェースに以下を追加:

```ts
interface ToolItem {
  // ...既存フィールド維持(group等も変更なし)
  primaryTopic: string;
  topics: string[];
}
```

topicsの許容値(12種、今回はこの範囲のみ使用。将来語彙が増えても型はstring[]のまま
拡張可能なため、今回は型に列挙型制約をかけない):

```
nisa, ideco, pension, withdrawal, montecarlo, education_cost,
compound_interest, fire_basics, fire_age, retirement_tax,
dual_income, inflation
```

### C-2. データ投入

以下の対応表通り、13記事のfrontmatterと`TOOLS`配列(`src/app/tools/page.tsx`)に
`primaryTopic`・`topics`を追加する。

**ブログ13記事:**

| slug | primaryTopic | topics |
|---|---|---|
| 4percent-rule | withdrawal | [withdrawal, fire_basics] |
| compound-interest-rate-vs-years | compound_interest | [compound_interest] |
| dual-income-couple-fire | dual_income | [dual_income, fire_basics] |
| education-cost-fire-simulation | education_cost | [education_cost] |
| fire-checklist | fire_basics | [fire_basics] |
| fire-inflation-sensitivity | inflation | [inflation] |
| ideco-nisa | ideco | [nisa, ideco] |
| montecarlo-simulation | montecarlo | [montecarlo] |
| nisa-achievement-age | nisa | [nisa, fire_age] |
| nisa-monthly-investment | nisa | [nisa] |
| pension-timing | pension | [pension] |
| semi-retirement-blank-period | pension | [retirement_tax, pension] |
| withdrawal-strategy-comparison | withdrawal | [withdrawal, nisa, ideco, montecarlo] |

**Tools 7種:**

| ツール(href末尾) | primaryTopic | topics |
|---|---|---|
| monthly-investment | compound_interest | [nisa, compound_interest] |
| fire-age | fire_age | [fire_age] |
| compound | compound_interest | [compound_interest] |
| pension-timing | pension | [pension] |
| retirement-tax | retirement_tax | [retirement_tax] |
| ideco-withdrawal | ideco | [ideco, withdrawal] |
| education-cost | education_cost | [education_cost] |

### C-3. マッチングロジックの改修

`getRelatedPosts()`(`src/lib/blog.ts`)を、`category`完全一致から
以下のスコアリング方式に変更する:

1. 自分自身(`currentSlug`)を除外
2. 各候補について「共有topics数」をスコアとして計算(交差する要素数)
3. 共有topics数が同じ場合、`primaryTopic`が一致する方を優先(タイブレーク)
4. さらに同順位の場合、`date`降順(新しい記事優先、既存動作を維持)
5. 上位`limit`件(デフォルト3、既存動作を維持)を返す
6. 共有topicsが0件の候補は除外する(無関係なコンテンツを無理に表示しない)

シグネチャ変更例(参考、実装はClaude Codeの判断で調整可):

```ts
export function getRelatedPosts(currentSlug: string, primaryTopic: string, topics: string[], limit = 3): BlogPostMeta[]
```

呼び出し元(`src/app/blog/[slug]/page.tsx`)も新シグネチャに合わせて更新すること。
`category`フィールド自体は削除しない(表示用・将来用に残す)。

### C-4. ブログ⇄Tools横断表示への拡張

現状、ブログの「関連記事」セクションと、Tools側の`RelatedArticles`コンポーネント
(`src/components/tools/RelatedArticles.tsx`)は別実装・別データソース。

今回のスコープでは、**両者を1つの共通コンポーネント/関数に統合するところまでは行わない。**
理由:設計変更の範囲が広く、他の見送り項目(タグページ等)と合わせて別途検討する方が
安全なため。今回は以下の**最小限の拡張**に留める:

- ブログ記事の関連記事セクション:引き続きブログ記事のみを対象とするが、
  マッチングロジックはC-3のtopicsベースに変更する
- `RelatedArticles`コンポーネント(Tools側):現状ハードコードされた`articles`配列を、
  当該ツールの`primaryTopic`/`topics`と交差するブログ記事を`topics`ベースで
  動的に取得する形に変更する(ここが実質的な「Tools→ブログ」導線の実装箇所)
  - 各ツールページ側で、自身の`topics`を使って関連ブログ記事を検索・表示する
  - 表示件数は既存の`RelatedArticles`コンポーネントの仕様を踏襲(変更不要な場合はそのまま)

「ブログ→Tools」方向(記事の関連コンテンツ欄にツールも出す)は、
**今回はスコープに含めない**(パートAの手動リンクで当面対応済みのため)。
将来、記事数・ツール数がさらに増えたタイミングで別途検討する。

---

## 確認事項

- `full-verify.js`が0件失敗であること
- 「LifeCompass」文字列のgrep確認
- `category`・`tags`(日本語表示用)フィールドは維持されており、既存の表示箇所
  (もしあれば)が壊れていないこと
- 3記事のtags補完後、`getAllPosts()`等の型チェックでエラーが出ないこと
- Tools側`RelatedArticles`が実際に該当ブログ記事を表示することを実機確認
  (対象:`retirement-tax`ページで`semi-retirement-blank-period`・`4percent-rule`が
  出るか、`ideco-withdrawal`ページで`ideco-nisa`・`withdrawal-strategy-comparison`が
  出るか)

## 完了報告に含めること

- 変更ファイル一覧
- パートAの4リンクが実際にどの位置に入ったか(該当段落の前後数行を報告に含める)
- パートC-4で実装した「Tools→ブログ」動的表示の実際の出力例(スクリーンショットまたは
  取得された記事タイトルのリスト)
- 改修中に発見した想定外の事項があれば報告
