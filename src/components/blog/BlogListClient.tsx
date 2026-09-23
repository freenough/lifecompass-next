'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { IconCheck } from '@tabler/icons-react';
import type { BlogPostMeta } from '@/lib/blog';
import { TOPIC_GROUPS, getDisplayGroupsForPost } from '@/lib/blogTopics';
import { STAGE_LABELS, STAGE_ORDER, type ConcernStage } from '@/data/concerns';
import { trackEvent } from '@/lib/gtag';

type StageSelection = ConcernStage | 'all';

// URLクエリ用のテーマのキー。blogTopics.ts（ロックファイル）のTOPIC_GROUPSには表示名（日本語）しかないため、
// 各グループの先頭のtopic（例：'NISA・積立投資' → 'nisa'）をキーとして使う。
// 例：/blog?topics=ideco,pension&stage=receiving
const TOPIC_KEY_BY_LABEL: Record<string, string> = Object.fromEntries(TOPIC_GROUPS.map((g) => [g.label, g.topics[0]]));

// クエリから選択状態を復元する。存在しないテーマ・ステージは無視する。
function parseFilters(searchParams: URLSearchParams): { topics: string[]; stage: StageSelection } {
  const topicKeys = (searchParams.get('topics') ?? '').split(',');
  const topics = TOPIC_GROUPS.map((g) => g.label).filter((label) => topicKeys.includes(TOPIC_KEY_BY_LABEL[label]));
  const stageParam = searchParams.get('stage');
  const stage = STAGE_ORDER.find((s) => s === stageParam) ?? 'all';
  return { topics, stage };
}

// 選択状態をクエリ文字列にする（テーマの並びはTOPIC_GROUPSの順に正規化）。
function serializeFilters(topics: string[], stage: StageSelection): string {
  const params = new URLSearchParams();
  const keys = TOPIC_GROUPS.filter((g) => topics.includes(g.label)).map((g) => g.topics[0]);
  if (keys.length > 0) params.set('topics', keys.join(','));
  if (stage !== 'all') params.set('stage', stage);
  // カンマは読みやすさのためエンコードしない
  return params.toString().replace(/%2C/g, ',');
}

function FilterButton({
  active,
  onClick,
  children,
  showCheck,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  showCheck?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
      }`}
    >
      {showCheck && active && <IconCheck size={14} stroke={2.5} />}
      {children}
    </button>
  );
}

interface BlogListViewProps {
  posts: BlogPostMeta[];
  selectedTopics?: string[];
  selectedStage?: StageSelection;
  onToggleTopic?: (label: string) => void;
  onSelectStage?: (stage: StageSelection) => void;
  onReset?: () => void;
}

// フィルター＋記事一覧の描画。BlogPage（サーバー）がSuspenseのフォールバックとして
// 絞り込みなし（全記事）の状態でも使うため、選択状態とハンドラはすべてpropsで受け取る。
export function BlogListView({
  posts,
  selectedTopics = [],
  selectedStage = 'all',
  onToggleTopic = () => {},
  onSelectStage = () => {},
  onReset = () => {},
}: BlogListViewProps) {
  const filteredPosts = posts.filter(
    (post) =>
      (selectedTopics.length === 0 || getDisplayGroupsForPost(post).some((g) => selectedTopics.includes(g))) &&
      (selectedStage === 'all' || post.stages.includes(selectedStage))
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-slate-400">テーマで絞り込む(複数選択可)</p>
          <div className="flex flex-wrap gap-2">
            {TOPIC_GROUPS.map((group) => (
              <FilterButton
                key={group.label}
                active={selectedTopics.includes(group.label)}
                onClick={() => onToggleTopic(group.label)}
                showCheck
              >
                {group.label}
              </FilterButton>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-slate-400">ステージで絞り込む</p>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={selectedStage === 'all'} onClick={() => onSelectStage('all')}>
              すべて
            </FilterButton>
            {STAGE_ORDER.map((stage) => (
              <FilterButton key={stage} active={selectedStage === stage} onClick={() => onSelectStage(stage)}>
                {STAGE_LABELS[stage]}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400">該当する記事がありません。</p>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 text-sm font-semibold hover:underline"
            style={{ color: '#334155' }}
          >
            フィルタをリセットする
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredPosts.map((post, i) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                onClick={() => trackEvent('blog_post_click', { post_slug: post.slug, location: 'list', position: i + 1 })}
                className="block group"
              >
                {/* 角丸・ホバーはツールカードと同じ定義（claude_instruction_blog_list_implementation.md 5節）。
                    Tailwind v4の-translate-y-*はtranslateプロパティのため、動きを減らす設定ではtranslate-noneで打ち消す。
                    タイトル・説明文の[line-break:strict]は「ー」や小書きの仮名が行頭に来るのを防ぐ和文の禁則処理 */}
                <article className="flex gap-3 border border-slate-200 rounded p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 motion-reduce:hover:translate-none">
                  <div className="relative w-[100px] sm:w-[120px] lg:w-[130px] aspect-[3/2] shrink-0 self-start overflow-hidden rounded bg-slate-100">
                    {post.eyecatch && (
                      <Image
                        src={post.eyecatch}
                        alt={post.title}
                        fill
                        sizes="(min-width: 1024px) 130px, (min-width: 640px) 120px, 100px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-medium bg-[#EFF6FF] text-[#0F2A4A] px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {post.category}
                      </span>
                      <time className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{post.date}</time>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 leading-snug line-clamp-2 [line-break:strict]">
                      {post.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mt-1 [line-break:strict]">{post.description}</p>
                  </div>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// フィルターの選択状態をURLクエリと連動させる（claude_instruction_blog_list_implementation.md 6節）。
// 表示は手元のstateで即座に切り替え、URLはrouter.replace（履歴を積まない・スクロールしない）で追従させる。
// useSearchParamsを使うため、BlogPage側でSuspense境界（フォールバックは全記事のBlogListView）に入れている。
export default function BlogListClient({ posts }: { posts: BlogPostMeta[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(() => parseFilters(searchParams));

  // 戻る・進む、ヘッダーの「ブログ」リンク等でクエリが外から変わったときに選択状態を合わせる
  const searchKey = searchParams.toString();
  useEffect(() => {
    const next = parseFilters(new URLSearchParams(searchKey));
    setFilters((prev) =>
      serializeFilters(prev.topics, prev.stage) === serializeFilters(next.topics, next.stage) ? prev : next
    );
  }, [searchKey]);

  const applyFilters = (topics: string[], stage: StageSelection) => {
    setFilters({ topics, stage });
    const query = serializeFilters(topics, stage);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggleTopic = (label: string) => {
    const isOn = !filters.topics.includes(label);
    trackEvent('blog_filter_click', { filter_type: 'topic', filter_value: TOPIC_KEY_BY_LABEL[label], state: isOn ? 'on' : 'off' });
    applyFilters(isOn ? [...filters.topics, label] : filters.topics.filter((l) => l !== label), filters.stage);
  };

  const selectStage = (stage: StageSelection) => {
    trackEvent('blog_filter_click', { filter_type: 'stage', filter_value: stage, state: 'on' });
    applyFilters(filters.topics, stage);
  };

  return (
    <BlogListView
      posts={posts}
      selectedTopics={filters.topics}
      selectedStage={filters.stage}
      onToggleTopic={toggleTopic}
      onSelectStage={selectStage}
      onReset={() => applyFilters([], 'all')}
    />
  );
}
