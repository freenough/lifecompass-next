'use client';

import { useEffect, useRef, useState } from 'react';
import RetirementTaxForm, { type RetirementTaxFormValues } from '@/components/tools/retirement-tax/RetirementTaxForm';
import RetirementTaxResult from '@/components/tools/retirement-tax/RetirementTaxResult';
import RetirementTaxCta from '@/components/tools/retirement-tax/RetirementTaxCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

// Product Spec 3節・7節の検算例(勤続20年・退職金3,000万円)と同じ値をデフォルトにしておくことで、
// 初回表示の数値がverify-retirement-tax-tool.jsの対応テストケースの期待値と直接突き合わせられる。
const DEFAULT_VALUES: RetirementTaxFormValues = {
  incomeManYen: 3000,
  serviceYears: 20,
  isExecutive: false,
  hasDisabilityException: false,
};

export default function RetirementTaxTool() {
  const [values, setValues] = useState<RetirementTaxFormValues>(DEFAULT_VALUES);

  const handleChange = (patch: Partial<RetirementTaxFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

  // 初回マウント時は「入力が変わった」わけではないため発火しない。
  // 以降は入力停止から500ms後に1回だけ発火し、連続入力での多重発火を防ぐ。
  // 第1〜4弾と完全同一のパラメータ構造(パラメータなし)を踏襲する。
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
          退職金手取り計算ツール
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          退職金の額と勤続年数から、退職所得控除・所得税・住民税を差し引いた手取り額を試算します。
        </p>
      </div>

      <RetirementTaxForm values={values} onChange={handleChange} />

      <RetirementTaxResult
        incomeManYen={values.incomeManYen}
        serviceYears={values.serviceYears}
        isExecutive={values.isExecutive}
        hasDisabilityException={values.hasDisabilityException}
      />

      <RetirementTaxCta />
    </div>
  );
}
