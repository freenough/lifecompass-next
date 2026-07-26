import type { Metadata } from 'next';
import FireAgeTool from '@/components/tools/FireAgeTool';

export const metadata: Metadata = {
  title: '目標資産到達年齢シミュレーター | FREENOUGH 資産シミュレーター',
  description: '今の積立額を続けたら、目標資産に何歳で到達するかを計算する無料ツールです。FIREを目指す資産形成期間の目安としてもご活用いただけます。',
};

export default function FireAgePage() {
  return <FireAgeTool />;
}
