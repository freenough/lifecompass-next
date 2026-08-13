/**
 * ブログ一覧のフィルタUI表示用に、topics(14種、blog.tsのgetRelatedPosts()・
 * getRelatedPostsForTopics()が使うスコアリング専用フィールド)を5つの表示グループへ
 * 集約する静的対応表。スコアリング側のtopicsは一切変更しない
 * （investigation_blog_filter_redesign.mdの「第3の選択肢」を採用。frontmatter・
 * BlogPostMeta型への変更なしで表示用グルーピングだけを追加する）。
 *
 * blog.ts（fs・gray-matter等に依存するサーバー専用モジュール）とは別ファイルにしている。
 * クライアントコンポーネント（BlogListClient.tsx）からも安全にimportできるようにするため。
 */
export interface TopicGroup {
  label: string;
  topics: string[];
}

export const TOPIC_GROUPS: TopicGroup[] = [
  { label: 'NISA・積立投資', topics: ['nisa', 'compound_interest'] },
  { label: 'iDeCo・退職金', topics: ['ideco', 'retirement_tax'] },
  { label: '年金・老後の資産計画', topics: ['pension', 'withdrawal', 'dual_income', 'resident_tax_timing'] },
  { label: '教育費', topics: ['education_cost'] },
  { label: 'シミュレーションの考え方', topics: ['montecarlo', 'fire_basics', 'inflation', 'fire_age'] },
  { label: '住宅・ローン', topics: ['housing_loan'] },
];

const TOPIC_TO_GROUP_LABEL: Record<string, string> = TOPIC_GROUPS.reduce((acc, group) => {
  group.topics.forEach((topic) => { acc[topic] = group.label; });
  return acc;
}, {} as Record<string, string>);

/**
 * 記事のtopicsから、該当する表示グループのラベル集合を返す（重複除去済み）。
 * 1記事のtopicsが複数グループにまたがる場合は複数ラベルを返す（stage軸の`.includes()`判定と同じ多対多の考え方）。
 */
export function getDisplayGroupsForPost(post: { topics: string[] }): string[] {
  const labels = new Set<string>();
  post.topics.forEach((topic) => {
    const label = TOPIC_TO_GROUP_LABEL[topic];
    if (label) labels.add(label);
  });
  return Array.from(labels);
}
