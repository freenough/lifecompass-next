'use client';

import { useEffect, useRef, useState } from 'react';
import PensionTimingForm, { type PensionTimingFormValues } from '@/components/tools/pension-timing/PensionTimingForm';
import PensionTimingResult from '@/components/tools/pension-timing/PensionTimingResult';
import PensionTimingComparisonTable from '@/components/tools/pension-timing/PensionTimingComparisonTable';
import PensionTimingCta from '@/components/tools/pension-timing/PensionTimingCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

// spec 7章の検算ケースと同じ値をデフォルトにしておくことで、初回表示の数値が
// verify-pension-timing.jsの対応テストケースの期待値と直接突き合わせられる。
const DEFAULT_VALUES: PensionTimingFormValues = {
  basicAmount: 78,
  employeesAmount: 120,
  isNewRate: true,
  targetAge: 70,
  compareEndAge: 90,
};

export default function PensionTimingTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<PensionTimingFormValues>(DEFAULT_VALUES);

  const handleChange = (patch: Partial<PensionTimingFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

  // 初回マウント時は「入力が変わった」わけではないため発火しない。
  // 以降は入力停止から500ms後に1回だけ発火し、連続入力での多重発火を防ぐ。
  // 第1〜3弾と完全同一のパラメータ構造（パラメータなし）を踏襲する。
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
          年金 繰上げ・繰下げ 比較シミュレーター
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          65歳時点の年金見込額から、受給開始年齢を早める・遅らせる場合の年額・損益分岐年齢を試算します。
        </p>
      </div>

      <PensionTimingForm values={values} onChange={handleChange} />

      <PensionTimingResult
        basicAmount={values.basicAmount}
        employeesAmount={values.employeesAmount}
        isNewRate={values.isNewRate}
        targetAge={values.targetAge}
        compareEndAge={values.compareEndAge}
      />

      <PensionTimingComparisonTable
        basicAmount={values.basicAmount}
        employeesAmount={values.employeesAmount}
        isNewRate={values.isNewRate}
        targetAge={values.targetAge}
        compareEndAge={values.compareEndAge}
      />

      <PensionTimingCta relatedArticles={relatedArticles} />
    </div>
  );
}
