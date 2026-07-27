import type { Metadata } from 'next';
import PensionTimingTool from '@/components/tools/pension-timing/PensionTimingTool';

export const metadata: Metadata = {
  title: '年金 繰上げ・繰下げ 比較シミュレーター | FREENOUGH 資産シミュレーター',
  description: '65歳時点の年金見込額から、受給開始年齢を早める・遅らせる場合の年額・損益分岐年齢を試算できる無料ツールです。',
};

export default function PensionTimingPage() {
  return <PensionTimingTool />;
}
