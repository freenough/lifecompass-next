import Link from 'next/link';
import { IconBook2 } from '@tabler/icons-react';

interface RelatedArticle {
  title: string;
  href: string;
}

/**
 * ツールのCta内、CTAボックスの下に置く「あわせて読みたい」ブロック。
 * CTAボックス(bg-slate-50)とは別の白背景+ボーダーの箱として分離し、
 * サムネイル・日付・カテゴリタグは付けず最小限の構成にしている。
 */
export default function RelatedArticles({ articles }: { articles: RelatedArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs text-slate-400 text-center mb-3">あわせて読みたい</p>
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="flex items-start gap-2.5 sm:gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <IconBook2 size={20} className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            <span>
              <span className="block text-[10px] sm:text-[11px] text-slate-400">次に読む</span>
              <span className="block text-[13px] sm:text-sm font-semibold text-slate-900 leading-snug">{article.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
