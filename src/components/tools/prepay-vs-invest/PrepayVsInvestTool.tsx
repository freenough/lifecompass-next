'use client';

import { useEffect, useRef, useState } from 'react';
import PrepayVsInvestForm, { type PrepayVsInvestFormValues } from '@/components/tools/prepay-vs-invest/PrepayVsInvestForm';
import PrepayVsInvestResult from '@/components/tools/prepay-vs-invest/PrepayVsInvestResult';
import PrepayVsInvestComparisonTable from '@/components/tools/prepay-vs-invest/PrepayVsInvestComparisonTable';
import PrepayVsInvestCta from '@/components/tools/prepay-vs-invest/PrepayVsInvestCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

const DEFAULT_VALUES: PrepayVsInvestFormValues = {
  balance: 3000,
  rate: 1.0,
  remainingYears: 25,
  prepayAmount: 100,
  prepayType: 'shorten',
  investRate: 7,
};

export default function PrepayVsInvestTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<PrepayVsInvestFormValues>(DEFAULT_VALUES);

  const handleChange = (patch: Partial<PrepayVsInvestFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

  // 初回マウント時は「入力が変わった」わけではないため発火しない。
  // 以降は入力停止から500ms後に1回だけ発火し、連続入力での多重発火を防ぐ。
  // 既存ツール群と完全同一のパラメータ構造（パラメータなし）を踏襲する。
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => trackEvent('tool_calculate'), CALCULATE_EVENT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [values]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] leading-snug">
          繰上返済 vs 投資 比較シミュレーター
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          住宅ローンの繰上返済と投資、どちらが適しているかの判断材料を比較します。
        </p>
      </div>

      <PrepayVsInvestForm values={values} onChange={handleChange} />

      <PrepayVsInvestResult
        balance={values.balance}
        rate={values.rate}
        remainingYears={values.remainingYears}
        prepayAmount={values.prepayAmount}
        prepayType={values.prepayType}
        investRate={values.investRate}
      />

      <PrepayVsInvestComparisonTable
        balance={values.balance}
        rate={values.rate}
        remainingYears={values.remainingYears}
        prepayAmount={values.prepayAmount}
        prepayType={values.prepayType}
        investRate={values.investRate}
      />

      <PrepayVsInvestCta relatedArticles={relatedArticles} />
    </div>
  );
}
