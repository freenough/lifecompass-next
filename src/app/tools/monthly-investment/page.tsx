import type { Metadata } from 'next';
import MonthlyInvestmentTool from '@/components/tools/MonthlyInvestmentTool';

export const metadata: Metadata = {
  title: '積立額シミュレーター|新NISAは毎月いくら積み立てればいい? | FREENOUGH 資産シミュレーター',
  description: '目標資産・現在の資産・想定利回りを入力するだけで、目標達成に必要な毎月の積立額を試算できる無料ツールです。',
};

export default function MonthlyInvestmentPage() {
  return <MonthlyInvestmentTool />;
}
