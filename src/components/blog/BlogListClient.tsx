'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { IconCheck } from '@tabler/icons-react';
import type { BlogPostMeta } from '@/lib/blog';
import { TOPIC_GROUPS, getDisplayGroupsForPost } from '@/lib/blogTopics';
import { STAGE_LABELS, STAGE_ORDER, type ConcernStage } from '@/data/concerns';

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

export default function BlogListClient({ posts }: { posts: BlogPostMeta[] }) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<ConcernStage | 'all'>('all');

  const toggleTopic = (label: string) => {
    setSelectedTopics((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const filteredPosts = posts.filter(
    (post) =>
      (selectedTopics.length === 0 || getDisplayGroupsForPost(post).some((g) => selectedTopics.includes(g))) &&
      (selectedStage === 'all' || post.stages.includes(selectedStage))
  );

  const resetFilters = () => {
    setSelectedTopics([]);
    setSelectedStage('all');
  };

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
                onClick={() => toggleTopic(group.label)}
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
            <FilterButton active={selectedStage === 'all'} onClick={() => setSelectedStage('all')}>
              すべて
            </FilterButton>
            {STAGE_ORDER.map((stage) => (
              <FilterButton key={stage} active={selectedStage === stage} onClick={() => setSelectedStage(stage)}>
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
            onClick={resetFilters}
            className="mt-4 text-sm font-semibold hover:underline"
            style={{ color: '#334155' }}
          >
            フィルタをリセットする
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredPosts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <article className="flex gap-3 border border-slate-200 rounded-xl p-3 hover:shadow-md transition-shadow">
                  <div className="relative w-[100px] sm:w-[120px] lg:w-[130px] aspect-[3/2] shrink-0 self-start overflow-hidden rounded-lg bg-slate-100">
                    {post.eyecatch && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.eyecatch}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
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
                    <h2 className="text-base sm:text-lg font-bold text-[#0F2A4A] group-hover:text-blue-700 leading-snug line-clamp-2 min-h-[44px] sm:min-h-[49.5px]">
                      {post.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mt-1 min-h-[45.5px]">{post.description}</p>
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
