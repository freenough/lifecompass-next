import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';

// page.tsx はクライアントコンポーネント('use client')のため metadata を直接export できない。
// canonicalタグ追加のためだけに、このルートセグメント専用のサーバーコンポーネントlayoutを設ける。
export const metadata: Metadata = {
  alternates: {
    canonical: `${SITE_URL}/app`,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
