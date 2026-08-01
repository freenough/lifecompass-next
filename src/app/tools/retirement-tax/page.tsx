import type { Metadata } from 'next';
import RetirementTaxTool from '@/components/tools/retirement-tax/RetirementTaxTool';
import { SITE_URL } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: '退職金手取り計算ツール | FREENOUGH 資産シミュレーター',
  description: '退職金の額と勤続年数から、退職所得控除・所得税・住民税を差し引いた手取り額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/retirement-tax`,
  },
};

export default function RetirementTaxPage() {
  return <RetirementTaxTool />;
}
