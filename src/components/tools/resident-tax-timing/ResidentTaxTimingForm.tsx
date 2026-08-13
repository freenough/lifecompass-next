'use client';

import { useEffect, useRef, useState } from 'react';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import type { LumpSumPreference } from '@/lib/tax/residentTaxTiming';

export interface ResidentTaxTimingFormValues {
  priorYearIncomeManYen: number;
  retirementMonth: number;
  postRetirementIncomeManYen: number;
  /** true の間だけ priorYearIncomeTwoYearsAgoManYen を calcResidentTaxTiming() に渡す */
  useTwoYearsAgoIncome: boolean;
  priorYearIncomeTwoYearsAgoManYen: number;
  /** true の間だけ retirementYearIncomeOverrideManYen を calcResidentTaxTiming() に渡す */
  useRetirementYearOverride: boolean;
  retirementYearIncomeOverrideManYen: number;
  lumpSumPreference: LumpSumPreference;
}

interface ResidentTaxTimingFormProps {
  values: ResidentTaxTimingFormValues;
  onChange: (patch: Partial<ResidentTaxTimingFormValues>) => void;
}

interface NumberFieldProps {
  label: string;
  id: string;
  value: number;
  suffix: string;
  onChange: (v: number) => void;
  min?: number;
}

/**
 * RetirementTaxForm.tsx の NumberField と同一パターン(入力中の生文字列と確定値を分離し、
 * blur時にのみ親stateへ反映・デフォルトへのフォールバックを行う)。
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

const selectClassName =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white focus:border-accent focus:outline-none';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function ResidentTaxTimingForm({ values, onChange }: ResidentTaxTimingFormProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showTwoYearsAgoField = values.retirementMonth <= 5;
  const showLumpSumToggle = values.retirementMonth >= 6;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NumberField
          label="退職前年の年収(額面・税込)"
          id="priorYearIncomeManYen"
          value={values.priorYearIncomeManYen}
          suffix="万円"
          onChange={v => onChange({ priorYearIncomeManYen: v })}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="retirementMonth" className="text-xs font-medium text-slate-600">
            退職月
          </label>
          <select
            id="retirementMonth"
            value={values.retirementMonth}
            onChange={e => onChange({ retirementMonth: Number(e.target.value) })}
            className={selectClassName}
          >
            {MONTH_OPTIONS.map(m => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <NumberField
            label="退職後、同一年内の給与収入"
            id="postRetirementIncomeManYen"
            value={values.postRetirementIncomeManYen}
            suffix="万円"
            onChange={v => onChange({ postRetirementIncomeManYen: v })}
          />
          <p className="text-xs text-slate-400">
            失業給付・傷病手当金など非課税の給付はここに含めないでください。
          </p>
        </div>
      </div>

      {showLumpSumToggle && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">退職時に残りの住民税をどう納めますか</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ lumpSumPreference: 'installment' })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                values.lumpSumPreference === 'installment' ? 'bg-accent text-white' : 'bg-bg-sub text-slate-600 hover:bg-border'
              }`}
            >
              自分で分割して納める(普通徴収)
            </button>
            <button
              type="button"
              onClick={() => onChange({ lumpSumPreference: 'lump' })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                values.lumpSumPreference === 'lump' ? 'bg-accent text-white' : 'bg-bg-sub text-slate-600 hover:bg-border'
              }`}
            >
              退職時にまとめて天引きしてもらう(一括徴収)
            </button>
          </div>
          <p className="text-xs text-slate-400">原則として、本人の申出がなければ一括徴収されません。</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>より正確に試算する</span>
          <span className="text-slate-400">{detailsOpen ? '▲' : '▼'}</span>
        </button>
        {detailsOpen && (
          <div className="px-3 pb-3 pt-1 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.useRetirementYearOverride}
                  onChange={e => onChange({ useRetirementYearOverride: e.target.checked })}
                  className="rounded"
                />
                退職年の実際の給与収入がわかっている
              </label>
              {values.useRetirementYearOverride && (
                <NumberField
                  label="退職年の給与収入(実額・額面・税込)"
                  id="retirementYearIncomeOverrideManYen"
                  value={values.retirementYearIncomeOverrideManYen}
                  suffix="万円"
                  onChange={v => onChange({ retirementYearIncomeOverrideManYen: v })}
                />
              )}
            </div>

            {showTwoYearsAgoField && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values.useTwoYearsAgoIncome}
                    onChange={e => onChange({ useTwoYearsAgoIncome: e.target.checked })}
                    className="rounded"
                  />
                  現在の住民税の基準となる前々年の所得がわかっている
                </label>
                {values.useTwoYearsAgoIncome && (
                  <NumberField
                    label="前々年の年収"
                    id="priorYearIncomeTwoYearsAgoManYen"
                    value={values.priorYearIncomeTwoYearsAgoManYen}
                    suffix="万円"
                    onChange={v => onChange({ priorYearIncomeTwoYearsAgoManYen: v })}
                  />
                )}
                <p className="text-xs text-slate-400">
                  未入力の場合は「退職前年の年収」で代用して試算します。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
