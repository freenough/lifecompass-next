'use client';

import { useEffect, useRef, useState } from 'react';
import IdecoWithdrawalForm, { type IdecoWithdrawalFormValues } from '@/components/tools/ideco-withdrawal/IdecoWithdrawalForm';
import IdecoWithdrawalResult from '@/components/tools/ideco-withdrawal/IdecoWithdrawalResult';
import IdecoWithdrawalCta from '@/components/tools/ideco-withdrawal/IdecoWithdrawalCta';
import { trackEvent } from '@/lib/gtag';

const CALCULATE_EVENT_DEBOUNCE_MS = 500;

// scripts/verify-ideco-withdrawal-tool.js の代表ケースと同じ値をデフォルトにしておくことで、
// 初回表示の数値が検証スクリプトの期待値と直接突き合わせられる。
const DEFAULT_VALUES: IdecoWithdrawalFormValues = {
  idecoBalanceManYen: 2000,
  idecoYrs: 20,
  receiveAge: 65,
  publicPensionAnnualManYen: 150,
  receiveMethod: 'lump',
  annuityYears: 10,
  lumpSumRatioPct: 50,
  severanceManYen: 0,
  sevYrs: 0,
  otherIncomeManYen: 0,
};

export default function IdecoWithdrawalTool({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  const [values, setValues] = useState<IdecoWithdrawalFormValues>(DEFAULT_VALUES);

  const handleChange = (patch: Partial<IdecoWithdrawalFormValues>) => {
    setValues(v => ({ ...v, ...patch }));
  };

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
          iDeCo/DC出口戦略シミュレーター
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          iDeCo/DC残高を「一時金」「年金」「併用」のどの方法で受け取るかで、手取り総額がどう変わるかを比較します。
        </p>
      </div>

      <IdecoWithdrawalForm values={values} onChange={handleChange} />

      <IdecoWithdrawalResult values={values} />

      <IdecoWithdrawalCta relatedArticles={relatedArticles} />
    </div>
  );
}
