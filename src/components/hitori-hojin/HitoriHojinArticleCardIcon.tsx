import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_CATEGORIES } from '@/lib/hitoriHojinCategories';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';

// 画像枠付きカード版(HitoriHojinArticleCard.tsx)の試験的な差し替え版。
// 空のグレー画像枠を、HitoriHojinBlogListRows.tsxと同じ円アイコン(カテゴリ別・単色ネイビー)に
// 置き換える。カード自体の外観(枠線・シャドウ・2カラムグリッド配置)は変更しない
// (docs/fixes/active/instruction_hitorihojin_top_article_cards_circle_icons.md)。
// 気に入らない場合は呼び出し元(HitoriHojinContentSection.tsx)を元のコンポーネントに戻すだけで切り戻せる。
export default function HitoriHojinArticleCardIcon({ post }: { post: HitoriHojinBlogPostMeta }) {
  const CategoryIcon = HITORI_HOJIN_CATEGORIES[post.category].ListIcon;

  return (
    <a
      href={`${HITORI_HOJIN_SITE_URL}/blog/${post.slug}`}
      className="rounded-xl border border-slate-200 bg-white shadow-sm flex overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="w-[190px] shrink-0 self-center flex items-center justify-center py-6">
        <div className="flex aspect-square h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-slate-600">
          <CategoryIcon size={26} className="text-slate-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0 p-[14px] flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-3">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500">{post.excerpt ?? post.description}</p>
      </div>
    </a>
  );
}
