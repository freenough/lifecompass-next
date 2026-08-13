'use client';

import { useEffect, useRef, useState } from 'react';
import ResidentTaxTimingForm, { type ResidentTaxTimingFormValues } from '@/components/tools/resident-tax-timing/ResidentTaxTimingForm';
import ResidentTaxTimingResult from '@/components/tools/resident-tax-timing/ResidentTaxTimingResult';
import ResidentTaxTimingComparisonTable from '@/components/tools/resident-tax-timing/ResidentTaxTimingComparisonTable';
import ResidentTaxTimingCta from '@/components/tools/resident-tax-timing/ResidentTaxTimingCta';
import { isEarlyYearRetirement, type ResidentTaxTimingInput } from '@/lib/tax/residentTaxTiming';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

const DEFAULT_VALUES: ResidentTaxTimingFormValues = {
  priorYearIncomeManYen: 600,
  retirementMonth: 9,
  postRetirementIncomeManYen: 0,
  useTwoYearsAgoIncome: false,
  priorYearIncomeTwoYearsAgoManYen: 600,
  useRetirementYearOverride: false,
  retirementYearIncomeOverrideManYen: 600,
  lumpSumPreference: 'installment',
  isAge40OrOver: false,
  useSocialInsuranceRateOverride: false,
  socialInsuranceRateOverridePercent: 14.6,
};

export default function ResidentTaxTimingTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<ResidentTaxTimingFormValues>(DEFAULT_VALUES);

  const handleChange = (patch: Partial<ResidentTaxTimingFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

  // RetirementTaxTool.tsxと同一パターン(初回マウントでは発火しない、500ms後に1回だけ発火)。
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => trackEvent('tool_calculate'), CALCULATE_EVENT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [values]);

  const input: ResidentTaxTimingInput = {
    priorYearIncome: values.priorYearIncomeManYen * 10_000,
    retirementMonth: values.retirementMonth,
    postRetirementIncome: values.postRetirementIncomeManYen * 10_000,
    priorYearIncomeTwoYearsAgo: values.useTwoYearsAgoIncome
      ? values.priorYearIncomeTwoYearsAgoManYen * 10_000
      : undefined,
    retirementYearIncomeOverride: values.useRetirementYearOverride
      ? values.retirementYearIncomeOverrideManYen * 10_000
      : undefined,
    lumpSumPreference: values.lumpSumPreference,
    isAge40OrOver: values.isAge40OrOver,
    socialInsuranceRateOverride: values.useSocialInsuranceRateOverride
      ? values.socialInsuranceRateOverridePercent
      : undefined,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] leading-snug">
          退職後の住民税キャッシュフロー試算
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          退職月・退職前年の年収から、住民税がいつ・いくら発生するかを試算します。
        </p>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          {isEarlyYearRetirement(values.retirementMonth) ? (
            <>
              住民税は「前の年の所得」をもとに翌年課税される仕組みのため、退職すると、
              ①退職前から進行中だった住民税の残り と ②退職前年の所得をもとにした今年の新しい住民税、
              という2つのタイミングでお金が必要になります。
            </>
          ) : (
            <>
              住民税は「前の年の所得」をもとに翌年課税される仕組みのため、退職すると、
              ①退職前から進行中だった住民税の残り と ②退職した年の所得をもとにした翌年の新しい住民税、
              という2つのタイミングでお金が必要になります。
            </>
          )}
        </p>
      </div>

      <ResidentTaxTimingForm values={values} onChange={handleChange} />

      <ResidentTaxTimingResult input={input} />

      <ResidentTaxTimingComparisonTable
        priorYearIncomeManYen={values.priorYearIncomeManYen}
        targetMonth={values.retirementMonth}
      />

      <ResidentTaxTimingCta relatedArticles={relatedArticles} />
    </div>
  );
}
