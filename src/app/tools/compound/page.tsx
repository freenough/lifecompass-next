import type { Metadata } from 'next';
import CompoundInterestTool from '@/components/tools/CompoundInterestTool';
import { SITE_URL } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: '積立(複利)計算機 | FREENOUGH 資産シミュレーター',
  description: '現在の資産・毎月の積立額・想定利回り・積立期間を入力すると、将来の資産額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/compound`,
  },
};

export default function CompoundInterestPage() {
  return <CompoundInterestTool />;
}
