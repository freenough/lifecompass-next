import { Fragment } from 'react';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteConfig';

export interface BreadcrumbItem {
  name: string;
  // basePath('/asset-simulator')を含めないルート相対パス（例: '/concerns'）。
  // 表示用リンクはnext/linkがbasePathを自動付与し、JSON-LDはSITE_URL（basePath込み）を前置する。
  href: string;
}

// 記事詳細ページ（blog/[slug]/page.tsx）のBreadcrumbListと同じ組み立て方：ルートはSITE_URLそのもの、
// それ以外はSITE_URL + パス。
function toAbsoluteUrl(href: string): string {
  return href === '/' ? SITE_URL : `${SITE_URL}${href}`;
}

// 表示用パンくずとBreadcrumbListのJSON-LDを同じitems配列から出力し、両者のずれを構造的に防ぐ
// （claude_instruction_index_pages_implementation.md A-3）。
// truncateLast: 最後の項目（記事タイトル等）を1行で省略表示する。JSON-LDには全文を出す
// （claude_instruction_blog_list_implementation.md 8節）。未指定時の見た目は従来のまま。
export default function Breadcrumb({ items, truncateLast = false }: { items: BreadcrumbItem[]; truncateLast?: boolean }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: toAbsoluteUrl(item.href),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="パンくずリスト">
        <ol className={`flex ${truncateLast ? 'flex-nowrap' : 'flex-wrap'} items-center gap-1.5 text-xs sm:text-sm text-slate-500`}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <Fragment key={item.href}>
                {i > 0 && (
                  <li aria-hidden="true" className={truncateLast ? 'shrink-0 text-slate-400' : 'text-slate-400'}>
                    ›
                  </li>
                )}
                <li className={truncateLast ? (isLast ? 'min-w-0' : 'shrink-0 whitespace-nowrap') : undefined}>
                  {isLast ? (
                    <span aria-current="page" className={truncateLast ? 'block truncate' : undefined}>
                      {item.name}
                    </span>
                  ) : (
                    <Link href={item.href} className="hover:text-slate-700 hover:underline">
                      {item.name}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
