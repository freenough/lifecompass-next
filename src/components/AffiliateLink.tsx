import { getAffiliateLink } from '@/lib/affiliateLinks';

interface AffiliateLinkProps {
  provider: string;
  landing: string;
  onClick?: () => void;
}

/**
 * ブログ記事内 `<AffiliateLink provider="..." landing="..." />` のReact版。
 * 同じ affiliateLinks.ts の対応表を参照するため、リンク先・文言は常に一致する。
 * 未登録の provider/landing はブログ側と同様にコンソール警告を出し、何もレンダリングしない。
 */
export default function AffiliateLink({ provider, landing, onClick }: AffiliateLinkProps) {
  const entry = getAffiliateLink(provider, landing);
  if (!entry) {
    console.warn(`[AffiliateLink] 未登録の provider="${provider}" landing="${landing}" が指定されています。`);
    return null;
  }
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="hover:underline"
      onClick={onClick}
    >
      {entry.text}
    </a>
  );
}
