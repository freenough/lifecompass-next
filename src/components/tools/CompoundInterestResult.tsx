import ToolCard from '@/components/tools/ui/ToolCard';

interface CompoundInterestResultProps {
  years: number;
  futureValue: number;
  principal: number;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ja-JP');
}

export default function CompoundInterestResult({ years, futureValue, principal }: CompoundInterestResultProps) {
  // 表示丸めは最終フィールドのみ（内部の計算値自体は丸めない。第1弾で確立した規則を踏襲）。
  const gain = futureValue - principal;

  return (
    <ToolCard variant="result">
      <div className="rounded-lg border border-accent bg-blue-50 p-4">
        <p className="text-sm font-medium text-slate-500">{years}年後の資産(概算)</p>
        <p className="mt-1 text-4xl sm:text-5xl font-bold text-slate-800 leading-none [text-wrap:balance]">
          {fmt(futureValue)}
          <span className="ml-1 text-xl sm:text-2xl font-bold">万円</span>
        </p>
      </div>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        {years}年後、資産は{fmt(futureValue)}万円になります
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs font-medium text-slate-500">元本合計</p>
          <p className="mt-1 text-lg font-semibold text-slate-700">{fmt(principal)}万円</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">運用益</p>
          <p className="mt-1 text-lg font-semibold text-slate-700">{fmt(gain)}万円</p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed">
        <p>この計算は、入力された利回りで毎年一定に運用できたと仮定した概算です。</p>
        <p>実際の相場は変動するため、この通りに資産が増えるとは限りません。</p>
        <p>税金・手数料は考慮していません。</p>
        <p>NISA等の非課税制度を前提としたツールではありません。非課税枠の上限は考慮していません。</p>
        <p>本ツールはインフレ(物価上昇)を考慮しません。入力した利回りをそのまま複利計算するだけの試算です。入力する利回りが名目か実質かによって、将来の金額の意味合いが変わります。</p>
        <p>将来の運用成果を保証するものではありません。</p>
      </div>
    </ToolCard>
  );
}
