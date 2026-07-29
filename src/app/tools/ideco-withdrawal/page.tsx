import type { Metadata } from 'next';
import IdecoWithdrawalTool from '@/components/tools/ideco-withdrawal/IdecoWithdrawalTool';

export const metadata: Metadata = {
  title: 'iDeCo/DC出口戦略シミュレーター | FREENOUGH 資産シミュレーター',
  description: 'iDeCo/DC残高を一時金・年金・併用のどの方法で受け取るかで、手取り総額がどう変わるかを比較できる無料ツールです。',
};

export default function IdecoWithdrawalPage() {
  return <IdecoWithdrawalTool />;
}
