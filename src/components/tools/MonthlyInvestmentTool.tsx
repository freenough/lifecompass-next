'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { calcRequiredMonthlyContribution } from '@/lib/financeCore';
import MonthlyInvestmentForm, { type MonthlyInvestmentFormValues } from '@/components/tools/MonthlyInvestmentForm';
import MonthlyInvestmentResult from '@/components/tools/MonthlyInvestmentResult';
import SensitivityTable from '@/components/tools/SensitivityTable';
import MonthlyInvestmentCta from '@/components/tools/MonthlyInvestmentCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

const DEFAULT_VALUES: MonthlyInvestmentFormValues = {
  curAge: 35,
  targetAge: 55,
  currentAssets: 100,
  targetAssets: 3000,
  ratePct: 5,
};

export default function MonthlyInvestmentTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<MonthlyInvestmentFormValues>(DEFAULT_VALUES);

  const years = values.targetAge - values.curAge;

  const result = useMemo(
    () => calcRequiredMonthlyContribution(values.currentAssets, values.targetAssets, years, values.ratePct),
    [values.currentAssets, values.targetAssets, years, values.ratePct]
  );

  const handleChange = (patch: Partial<MonthlyInvestmentFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

  // 初回マウント時は「入力が変わった」わけではないため発火しない。
  // 以降は入力停止から500ms後に1回だけ発火し、連続入力での多重発火を防ぐ。
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
          新NISAは毎月いくら積み立てればいい?
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          目標資産・現在の資産・想定利回りを入力すると、必要な毎月の積立額を試算します。
        </p>
      </div>

      <MonthlyInvestmentForm values={values} onChange={handleChange} />

      <MonthlyInvestmentResult
        curAge={values.curAge}
        targetAge={values.targetAge}
        years={years}
        targetAssets={values.targetAssets}
        ratePct={values.ratePct}
        result={result}
      />

      {years > 0 && (
        <SensitivityTable
          currentAssets={values.currentAssets}
          targetAssets={values.targetAssets}
          years={years}
          ratePct={values.ratePct}
        />
      )}

      <MonthlyInvestmentCta relatedArticles={relatedArticles} />
    </div>
  );
}
