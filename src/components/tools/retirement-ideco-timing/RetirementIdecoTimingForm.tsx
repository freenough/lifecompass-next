'use client';

import { useEffect, useRef, useState } from 'react';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

export interface RetirementIdecoTimingFormValues {
  retireAge: number;
  serviceYears: number;
  retireIncomeManYen: number;
  idecoAge: number;
  idecoYears: number;
  idecoIncomeManYen: number;
}

interface RetirementIdecoTimingFormProps {
  values: RetirementIdecoTimingFormValues;
  onChange: (patch: Partial<RetirementIdecoTimingFormValues>) => void;
}

interface NumberFieldProps {
  label: string;
  id: string;
  value: number;
  suffix: string;
  onChange: (v: number) => void;
  /** 指定した場合、blur時にこの値未満をこの値へ切り上げてフォールバックする(未指定時は0) */
  min?: number;
}

/**
 * 入力中の生文字列(inputStr)と、計算に使う確定値(valueプロップ)を分離する。
 * retirement-tax/RetirementTaxForm.tsxのNumberFieldと同一パターン
 * (バックスペースで空にした際に即座にmin値へスナップして打ち直せなくなる問題を防ぐ)。
 */
function NumberField({ label, id, value, suffix, onChange, min }: NumberFieldProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) setInputStr(String(value));
  }, [value]);

  const fallback = min ?? 0;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={inputStr}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            setInputStr(cleaned);
            if (cleaned === '') return;
            const raw = Number(cleaned);
            if (!isNaN(raw)) {
              onChange(min !== undefined ? Math.max(min, Math.round(raw)) : Math.round(raw));
            }
          }}
          onBlur={() => {
            isFocused.current = false;
            const raw = Number(inputStr);
            const safe = inputStr === '' || isNaN(raw)
              ? fallback
              : (min !== undefined ? Math.max(min, Math.round(raw)) : Math.round(raw));
            setInputStr(String(safe));
            onChange(safe);
          }}
          onFocus={e => { isFocused.current = true; clearZeroOrSelect(e.currentTarget); }}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-base focus:border-accent focus:outline-none"
        />
        <span className="shrink-0 text-sm text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

export default function RetirementIdecoTimingForm({ values, onChange }: RetirementIdecoTimingFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">退職金</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <NumberField
            label="受給年齢"
            id="retireAge"
            value={values.retireAge}
            suffix="歳"
            min={1}
            onChange={v => onChange({ retireAge: v })}
          />
          <NumberField
            label="勤続年数"
            id="serviceYears"
            value={values.serviceYears}
            suffix="年"
            min={1}
            onChange={v => onChange({ serviceYears: v })}
          />
          <NumberField
            label="退職金額"
            id="retireIncomeManYen"
            value={values.retireIncomeManYen}
            suffix="万円"
            onChange={v => onChange({ retireIncomeManYen: v })}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">iDeCo</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <NumberField
            label="受給年齢"
            id="idecoAge"
            value={values.idecoAge}
            suffix="歳"
            min={1}
            onChange={v => onChange({ idecoAge: v })}
          />
          <NumberField
            label="加入期間"
            id="idecoYears"
            value={values.idecoYears}
            suffix="年"
            min={1}
            onChange={v => onChange({ idecoYears: v })}
          />
          <NumberField
            label="一時金額"
            id="idecoIncomeManYen"
            value={values.idecoIncomeManYen}
            suffix="万円"
            onChange={v => onChange({ idecoIncomeManYen: v })}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        年数は1年未満の端数を切り上げてご入力ください(例:10年1か月 → 11年)。受給順序・受給間隔・重複期間・適用ルールは入力から自動算出されます。
      </p>
    </div>
  );
}
