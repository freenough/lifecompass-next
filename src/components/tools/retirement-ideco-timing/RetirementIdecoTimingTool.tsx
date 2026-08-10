'use client';

import { useEffect, useRef, useState } from 'react';
import RetirementIdecoTimingForm, { type RetirementIdecoTimingFormValues } from '@/components/tools/retirement-ideco-timing/RetirementIdecoTimingForm';
import RetirementIdecoTimingResult from '@/components/tools/retirement-ideco-timing/RetirementIdecoTimingResult';
import RetirementIdecoTimingCta from '@/components/tools/retirement-ideco-timing/RetirementIdecoTimingCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

// 受給間隔5年(19年ルール・重複排除の対象)のケースをデフォルトにしておくことで、
// 初回表示から「先に受け取った方は変更なし・後に受け取った方は控除額を減額計算する」という
// 本ツールの中心的な挙動(duplicate_adjustmentモード)がそのまま確認できる。
const DEFAULT_VALUES: RetirementIdecoTimingFormValues = {
  retireAge: 60,
  serviceYears: 35,
  retireIncomeManYen: 2000,
  idecoAge: 65,
  idecoYears: 20,
  idecoIncomeManYen: 1500,
};

export default function RetirementIdecoTimingTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<RetirementIdecoTimingFormValues>(DEFAULT_VALUES);

  const handleChange = (patch: Partial<RetirementIdecoTimingFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

  // 初回マウント時は「入力が変わった」わけではないため発火しない。
  // 以降は入力停止から500ms後に1回だけ発火し、連続入力での多重発火を防ぐ。
  // 既存ツール群と完全同一のパラメータ構造(パラメータなし)を踏襲する。
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
          退職金×iDeCo 受給タイミング比較
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          退職金とiDeCo一時金を、何歳でどちらを先に受け取るかによって、
          退職所得控除の重複排除ルール(19年・10年ルール)が適用され、手取り額が変わる場合があります。
        </p>
      </div>

      <RetirementIdecoTimingForm values={values} onChange={handleChange} />

      <RetirementIdecoTimingResult values={values} />

      <RetirementIdecoTimingCta relatedArticles={relatedArticles} />
    </div>
  );
}
