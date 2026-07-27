interface FireAgeResultProps {
  curAge: number;
  result: number | null;
}

export default function FireAgeResult({ curAge, result }: FireAgeResultProps) {
  if (result === null) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        現在の条件では目標資産への到達は見込めません。積立額を増やす、目標資産を見直す、運用期間を延ばす、などをご検討ください。
      </div>
    );
  }

  if (result === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xl font-bold text-green-700 leading-tight">
          すでに目標資産に到達しています。
        </p>
      </div>
    );
  }

  // 年末積立方式との整合性・法務的な保守性のため、四捨五入ではなく切り捨て(floor)で整数化する
  // （financeCore.tsのcalcAchievementAge()のJSDocに明記された方針）。
  const achievedAge = Math.floor(result);
  const yearsFromNow = achievedAge - curAge;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">目標資産到達年齢</p>
      <p className="mt-1 text-4xl sm:text-5xl font-bold text-accent leading-none [text-wrap:balance]">
        {achievedAge}
        <span className="ml-1 text-xl sm:text-2xl font-bold">歳</span>
      </p>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        目標資産に到達するのは{achievedAge}歳です(現在から約{yearsFromNow}年後)
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
