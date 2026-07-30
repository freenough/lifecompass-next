import type { Metadata } from 'next';
import EducationCostTool from '@/components/tools/education-cost/EducationCostTool';

export const metadata: Metadata = {
  title: '教育費シミュレーター | FREENOUGH 資産シミュレーター',
  description: '子供の現在の学年と進学プラン(公立/私立)から、教育費の総額と負担がピークになる時期を無料で試算できます。',
};

export default function EducationCostPage() {
  return <EducationCostTool />;
}
