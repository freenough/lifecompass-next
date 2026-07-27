interface MonthlyInvestmentResultProps {
  curAge: number;
  targetAge: number;
  years: number;
  targetAssets: number;
  ratePct: number;
  result: number | null;
}

function fmtMonthly(v: number): string {
  return v.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
}

export default function MonthlyInvestmentResult({
  curAge, targetAge, years, targetAssets, ratePct, result,
}: MonthlyInvestmentResultProps) {
  if (years <= 0) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        目標達成年齢は現在の年齢より後に設定してください。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-sm text-slate-600 leading-relaxed">
        {curAge}歳から{targetAge}歳({years}年間)で {targetAssets.toLocaleString('ja-JP')}万円 に到達するには
      </p>

      {result === 0 ? (
        <p className="mt-3 text-xl font-bold text-green-700 leading-tight">
          既に目標資産に到達しています。積立は必要ありません。
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-slate-500">毎月の積立額(概算)</p>
          <p className="mt-1 text-4xl sm:text-5xl font-bold text-accent leading-none [text-wrap:balance]">
            {fmtMonthly(result as number)}
            <span className="ml-1 text-xl sm:text-2xl font-bold">万円</span>
          </p>
        </>
      )}

      <p className="mt-4 text-xs text-slate-400 leading-relaxed">
        ※年率{ratePct}%で複利運用した場合の試算です。実際の運用成果を保証するものではありません。
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed">
        <p>この計算は、入力された利回りで毎年一定に運用できたと仮定した概算です。</p>
        <p>実際の相場は変動するため、この通りに資産が増えるとは限りません。</p>
        <p>税金・NISA非課税枠の上限は考慮していません。</p>
        <p>本ツールはインフレ(物価上昇)を考慮しません。入力した利回りをそのまま複利計算するだけの試算です。入力する利回りが名目か実質かによって、将来の金額の意味合いが変わります。</p>
        <p>より詳しい条件で試算したい場合は、資産シミュレーターをご利用ください。</p>
      </div>
    </div>
  );
}
