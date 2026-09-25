'use client';

import type { MouseEvent, ReactNode } from 'react';
import { trackEvent } from '@/lib/gtag';

// 記事本文（生HTMLの<article>）の中のサイト内リンクのクリックを、GA4イベント article_link_click で計測する。
// 本文はMarkdownから生成したHTMLのため、リンクごとにonClickを付けられない。本文を囲む要素でクリックを受け取る
// （イベント委譲）。サイト内リンクにはutmを付けない方針のため、記事からツール・シミュレーター等への移動は
// このイベントで計測する（docs/fixes の internal-utm-to-ga4-event）。
//
// 対象外：新しいタブで開くリンク（外部サイト・アフィリエイト）、http(s)以外（mailto:など）、
// 同じページ内のアンカー（#…への移動）、別ドメインへのリンク。
// 本文のリンクは生の<a>でページの再読み込みを伴うため、beaconで送る。

const SITE_HOSTS = ['www.freenough.com'];
const LINK_TEXT_MAX = 40;

export type ArticleSection = 'blog' | 'hitori_hojin';

export default function ArticleLinkTracker({
  postSlug,
  section,
  children,
}: {
  postSlug: string;
  section: ArticleSection;
  children: ReactNode;
}) {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as Element).closest?.('a[href]');
    if (!(anchor instanceof HTMLAnchorElement) || !e.currentTarget.contains(anchor)) return;
    if (anchor.target && anchor.target !== '_self') return;

    let url: URL;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    const isSite = url.origin === window.location.origin || SITE_HOSTS.includes(url.hostname);
    if (!isSite) return;
    // 同じページ内のアンカー（目次など）は移動を伴わないため送らない
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

    const text = (anchor.textContent ?? '').replace(/\s+/g, ' ').trim();
    trackEvent(
      'article_link_click',
      {
        post_slug: postSlug,
        link_path: url.pathname,
        link_text: text.length > LINK_TEXT_MAX ? text.slice(0, LINK_TEXT_MAX) : text,
        section,
      },
      { beacon: true },
    );
  };

  return <div onClick={handleClick}>{children}</div>;
}
