'use client';

import { calcTotalEducationCost, calcPeakYear, type ChildInput } from '@/lib/educationCostCalc';
import EducationCostChart from './EducationCostChart';

interface EducationCostResultProps {
  kids: ChildInput[];
}

function fmtMan(yen: number): string {
  return Math.round(yen / 10_000).toLocaleString('ja-JP');
}

export default function EducationCostResult({ kids }: EducationCostResultProps) {
  const count = kids.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">現在{count}人分で計算中</p>

      {count === 0 ? (
        <p className="mt-3 text-sm text-slate-400">学年を選択すると結果が表示されます。</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-accent bg-blue-50 p-3">
              <p className="text-xs font-medium text-slate-500">教育費総額</p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                {fmtMan(calcTotalEducationCost(kids))}<span className="text-xs font-medium ml-0.5">万円</span>
              </p>
            </div>
            {(() => {
              const peak = calcPeakYear(kids);
              return (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">ピーク時の年間負担額({peak.yearOffset}年後)</p>
                  <p className="mt-1 text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                    {fmtMan(peak.amount)}<span className="text-xs font-medium ml-0.5">万円</span>
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">年次推移</p>
            <EducationCostChart kids={kids} />
          </div>

          <p className="mt-4 text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
            文部科学省「令和5年度子供の学習費調査」・日本政策金融公庫「令和3年度教育費負担の実態調査結果」に基づく概算です。
            実際の費用は学年・時期により変動します。インフレ・学費改定は考慮していません。
          </p>
        </>
      )}
    </div>
  );
}
