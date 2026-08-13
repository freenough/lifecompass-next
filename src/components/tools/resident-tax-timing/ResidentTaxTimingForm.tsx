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
  /** 40歳以上65歳未満か(介護保険料を社会保険料控除の概算料率に含めるかどうか) */
  isAge40OrOver: boolean;
  /** true の間だけ socialInsuranceRateOverridePercent を calcResidentTaxTiming() に渡す */
  useSocialInsuranceRateOverride: boolean;
  socialInsuranceRateOverridePercent: number;
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
  /** 1未満のステップを指定すると小数入力を許可する(例:0.1で14.6%のような値を扱える)。デフォルト1(整数のみ)。 */
  step?: number;
}

/**
 * RetirementTaxForm.tsx の NumberField と同一パターン(入力中の生文字列と確定値を分離し、
 * blur時にのみ親stateへ反映・デフォルトへのフォールバックを行う)。stepが1未満の場合は
 * PrepayVsInvestForm.tsxのNumberFieldと同様、小数を保持したまま丸めない。
 */
function NumberField({ label, id, value, suffix, onChange, min, step = 1 }: NumberFieldProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const isFocused = useRef(false);
  const isIntegerStep = Number.isInteger(step);
  const roundValue = (raw: number) => (isIntegerStep ? Math.round(raw) : raw);

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
          step={step}
          value={inputStr}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            setInputStr(cleaned);
            if (cleaned === '') return;
            const raw = Number(cleaned);
            if (!isNaN(raw)) {
              onChange(min !== undefined ? Math.max(min, roundValue(raw)) : roundValue(raw));
            }
          }}
          onBlur={() => {
            isFocused.current = false;
            const raw = Number(inputStr);
            const safe = inputStr === '' || isNaN(raw)
              ? fallback
              : (min !== undefined ? Math.max(min, roundValue(raw)) : roundValue(raw));
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
  // 1〜5月退職:波2の所得基準=退職前年の年収(priorYearIncomeで入力済み)。
  //   retirementYearIncomeOverride(「退職年の実際の給与収入」)は波2の計算に一切使われないため不要。
  // 6〜12月退職:波2の所得基準=退職年の所得(月割り推計)。retirementYearIncomeOverrideが
  //   実額の上書き先として意味を持つ(residentTaxTiming.tsのcalcNextYearTax()参照)。
  const showRetirementYearOverrideField = values.retirementMonth >= 6;

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
            {showRetirementYearOverrideField && (
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
            )}

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

            <div className="flex flex-col gap-2">
              <label
                className={`flex items-center gap-2 text-sm ${
                  values.useSocialInsuranceRateOverride ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={values.isAge40OrOver}
                  onChange={e => onChange({ isAge40OrOver: e.target.checked })}
                  disabled={values.useSocialInsuranceRateOverride}
                  className="rounded disabled:cursor-not-allowed"
                />
                40歳以上65歳未満(介護保険料を含む)
              </label>
              {values.useSocialInsuranceRateOverride && (
                <p className="text-xs text-slate-400">
                  社会保険料率を直接入力しているため、この項目は使用されません。
                </p>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.useSocialInsuranceRateOverride}
                  onChange={e => onChange({ useSocialInsuranceRateOverride: e.target.checked })}
                  className="rounded"
                />
                社会保険料率が分かっている
              </label>
              {values.useSocialInsuranceRateOverride && (
                <NumberField
                  label="社会保険料率(本人負担分の合計)"
                  id="socialInsuranceRateOverridePercent"
                  value={values.socialInsuranceRateOverridePercent}
                  suffix="%"
                  step={0.1}
                  onChange={v => onChange({ socialInsuranceRateOverridePercent: v })}
                />
              )}
              <p className="text-xs text-slate-400">
                未入力の場合は概算料率(40歳未満14.6%、40歳以上65歳未満15.4%)で試算します。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
