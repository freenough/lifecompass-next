'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { calcAchievementAge } from '@/lib/financeCore';
import FireAgeForm, { type FireAgeFormValues } from '@/components/tools/FireAgeForm';
import FireAgeResult from '@/components/tools/FireAgeResult';
import FireAgeSensitivityTable from '@/components/tools/FireAgeSensitivityTable';
import FireAgeCta from '@/components/tools/FireAgeCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

const DEFAULT_VALUES: FireAgeFormValues = {
  curAge: 35,
  currentAssets: 500,
  targetAssets: 3000,
  monthlyContribution: 10,
  ratePct: 5,
};

export default function FireAgeTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<FireAgeFormValues>(DEFAULT_VALUES);

  const result = useMemo(
    () => calcAchievementAge(
      values.curAge,
      values.currentAssets,
      values.targetAssets,
      values.monthlyContribution,
      values.ratePct // %表記の数値そのまま渡す(小数に変換しない)。financeCore.ts側で/100する設計。
    ),
    [values.curAge, values.currentAssets, values.targetAssets, values.monthlyContribution, values.ratePct]
  );

  const handleChange = (patch: Partial<FireAgeFormValues>) => {
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
          目標資産到達年齢シミュレーター
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          今の積立額を続けたら、目標資産にいつ到達するかが分かります。FIREを目指す
          資産形成期間の目安としてもご活用いただけます。
        </p>
      </div>

      <FireAgeForm values={values} onChange={handleChange} />

      <FireAgeResult curAge={values.curAge} result={result} />

      <FireAgeSensitivityTable
        curAge={values.curAge}
        currentAssets={values.currentAssets}
        targetAssets={values.targetAssets}
        monthlyContribution={values.monthlyContribution}
      />

      <FireAgeCta relatedArticles={relatedArticles} />
    </div>
  );
}
