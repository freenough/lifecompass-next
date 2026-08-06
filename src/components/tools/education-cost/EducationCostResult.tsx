'use client';

import { calcTotalEducationCost, calcPeakYear, type ChildInput } from '@/lib/educationCostCalc';
import EducationCostChart from './EducationCostChart';
import DetailsAccordion from '@/components/tools/DetailsAccordion';
import ToolCard from '@/components/tools/ui/ToolCard';

interface EducationCostResultProps {
  kids: ChildInput[];
}

function fmtMan(yen: number): string {
  return Math.round(yen / 10_000).toLocaleString('ja-JP');
}

export default function EducationCostResult({ kids }: EducationCostResultProps) {
  const count = kids.length;

  return (
    <ToolCard variant="result">
      <p className="text-sm font-medium text-slate-500">現在{count}人分で計算中</p>

      {count === 0 ? (
        <p className="mt-3 text-sm text-slate-400">学年を選択すると結果が表示されます。</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-accent bg-blue-50 p-3">
              <p className="text-xs font-medium text-slate-500">教育費総額</p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
                {fmtMan(calcTotalEducationCost(kids))}<span className="text-xs font-medium ml-0.5">万円</span>
              </p>
            </div>
            {(() => {
              const peak = calcPeakYear(kids);
              return (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">ピーク時の年間負担額({peak.yearOffset}年後)</p>
                  <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
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

          <DetailsAccordion label="計算根拠を見る" className="mt-4">
            <p>
              本ツールは、文部科学省「令和5年度子供の学習費調査」(幼稚園・小学校・中学校・高校)
              および日本政策金融公庫「令和3年度教育費負担の実態調査結果」(大学)の統計データに基づき、
              学校教育費と学校外活動費(塾・習い事等)の合計額を、選択いただいた学年・進路パターンに
              沿って積み上げ計算しています。
            </p>
            <p>ただし、以下は反映していません:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                学校給食費(公立・私立を問わず発生する食費に近い性質のため、教育の選択による
                追加費用という本ツールの趣旨から除外しています)
              </li>
              <li>
                学年ごとの費用差(受験費用・入学一時金等の一時的な支出)。各ステージの年額は
                均等に按分して表示しています(大学の入学費用のみ、初年度に一括計上しています)
              </li>
              <li>留年・浪人等による就学期間の延長(標準的な就学年齢を前提としています)</li>
              <li>世帯年収・地域による費用差(統計データは全国平均です)</li>
              <li>物価上昇(インフレ)・将来の学費改定</li>
            </ul>
            <p>
              「一人暮らし」をONにした場合の仕送り額は、日本政策金融公庫の同調査における
              自宅外通学者への平均仕送り額(年間約95.8万円)を初期値としています。実際の
              仕送り額は各家庭の判断によるものであり、金額は自由に編集できます。
            </p>
            <p className="pt-2 border-t border-slate-100">
              実際の教育費は、進学先・地域・世帯の状況により大きく異なります。本ツールは
              大まかな傾向を把握するための目安としてご利用ください。
            </p>
          </DetailsAccordion>
        </>
      )}
    </ToolCard>
  );
}
