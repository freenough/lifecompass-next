'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { calcFutureValue } from '@/lib/financeCore';
import CompoundInterestForm, { type CompoundInterestFormValues } from '@/components/tools/CompoundInterestForm';
import CompoundInterestResult from '@/components/tools/CompoundInterestResult';
import CompoundInterestSensitivityTable from '@/components/tools/CompoundInterestSensitivityTable';
import CompoundInterestCta from '@/components/tools/CompoundInterestCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

const DEFAULT_VALUES: CompoundInterestFormValues = {
  currentAssets: 0,
  monthlyContribution: 10,
  ratePct: 5,
  years: 20,
};

export default function CompoundInterestTool() {
  const [values, setValues] = useState<CompoundInterestFormValues>(DEFAULT_VALUES);

  const futureValue = useMemo(
    // calcFutureValueは%表記の利回りをそのまま受け取る（内部で/100する設計のため、
    // UI側での%↔小数変換は不要）。
    () => calcFutureValue(values.currentAssets, values.monthlyContribution, values.years, values.ratePct),
    [values.currentAssets, values.monthlyContribution, values.years, values.ratePct]
  );

  // 元本合計はUI側で算出（積立額×期間+現在資産）。運用益は将来評価額-元本合計。
  const principal = values.monthlyContribution * 12 * values.years + values.currentAssets;

  const handleChange = (patch: Partial<CompoundInterestFormValues>) => {
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
          積立(複利)計算機
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          現在の資産・毎月の積立額・想定利回り・積立期間を入力すると、将来の資産額を試算します。
        </p>
      </div>

      <CompoundInterestForm values={values} onChange={handleChange} />

      <CompoundInterestResult
        years={values.years}
        futureValue={futureValue}
        principal={principal}
      />

      <CompoundInterestSensitivityTable
        currentAssets={values.currentAssets}
        monthlyContribution={values.monthlyContribution}
        years={values.years}
        ratePct={values.ratePct}
      />

      <CompoundInterestCta />
    </div>
  );
}
