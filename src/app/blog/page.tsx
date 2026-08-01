import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'ブログ | FREENOUGH 資産シミュレーター',
  description: 'FIREと資産形成に関する記事を発信しています。',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0F2A4A] mb-2">ブログ</h1>
      <p className="text-slate-500 mb-10">FIREと資産形成の情報を発信しています。</p>

      {posts.length === 0 ? (
        <p className="text-slate-400">記事はまだありません。</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <article className="flex gap-3 border border-slate-200 rounded-xl p-3 hover:shadow-md transition-shadow">
                  {/* サムネイル: PC 130×87・タブレット 120×80・モバイル 100×67（すべて3:2固定）。
                      widthのみブレイクポイントで切り替え、aspect-[3/2]で高さを追従させることで
                      同一素材をアスペクト比そのままリサイズするだけで対応できるようにする
                      （LPの「FIREガイド」セクション(page.tsx)と同じ手法）。stretchにすると
                      テキスト量の多寡でサムネ幅まで変動してしまうため、固定サイズ+self-startで
                      高さ方向の変化から独立させる。
                      self-start（上寄せ）を採用: サムネ高さ(aspect-[3/2]で固定)より行(article)の
                      高さがテキスト量で長くなるほど、self-centerだと差分が上下均等の隙間として
                      見えてしまう(blog_card_thumbnail_align_final調査済み・CSSバグではなく仕様上の
                      挙動)。上寄せにすることでサムネ上端をカテゴリタグ・日付行の上端に揃え、
                      余白は下端のみに集約する。 */}
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
                    {/* カテゴリタグ・日付はどちらも短い固定長文字列のため、途中で省略記号を
                        入れると意味を失う（特に日付は一部が欠けると誤読につながる）。
                        shrink-0+whitespace-nowrapで両方とも折り返し・省略なしの1行を維持する。 */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-medium bg-[#EFF6FF] text-[#0F2A4A] px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        {post.category}
                      </span>
                      <time className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{post.date}</time>
                    </div>
                    {/* min-heightは実測値（text-base/16px→line-height22px、sm:text-lg/18px→24.75px、
                        text-sm/14px→line-height22.75px）の2行分。短いタイトル・説明文の記事でも
                        line-clamp-2の最大高さぶんを常に確保し、カード全体の高さを記事間で揃える
                        （blog_card_fixes_round2）。 */}
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
    </main>
  );
}
