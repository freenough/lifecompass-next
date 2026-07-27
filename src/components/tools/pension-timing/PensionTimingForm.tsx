'use client';

import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import { MIN_AGE, MAX_AGE } from '@/lib/pensionCore';

export interface PensionTimingFormValues {
  basicAmount: number;
  employeesAmount: number;
  isNewRate: boolean;
  targetAge: number;
  compareEndAge: number;
}

interface PensionTimingFormProps {
  values: PensionTimingFormValues;
  onChange: (patch: Partial<PensionTimingFormValues>) => void;
}

interface NumberFieldProps {
  label: string;
  id: string;
  value: number;
  suffix: string;
  onChange: (v: number) => void;
}

function NumberField({ label, id, value, suffix, onChange }: NumberFieldProps) {
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
          value={value}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const raw = e.target.valueAsNumber;
            onChange(isNaN(raw) ? 0 : Math.round(raw));
          }}
          onBlur={e => {
            const raw = e.target.valueAsNumber;
            const safe = isNaN(raw) ? 0 : Math.round(raw);
            if (safe !== value) onChange(safe);
            e.target.value = String(safe);
          }}
          onFocus={e => clearZeroOrSelect(e.currentTarget)}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-base focus:border-accent focus:outline-none"
        />
        <span className="shrink-0 text-sm text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

const TARGET_AGE_OPTIONS = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

const COMPARE_END_AGE_OPTIONS = [80, 85, 90, 95, 100];

const selectClassName =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white focus:border-accent focus:outline-none';

export default function PensionTimingForm({ values, onChange }: PensionTimingFormProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <NumberField
        label="老齢基礎年金(65歳時点・年額)"
        id="basicAmount"
        value={values.basicAmount}
        suffix="万円"
        onChange={v => onChange({ basicAmount: v })}
      />
      <NumberField
        label="老齢厚生年金(65歳時点・年額)"
        id="employeesAmount"
        value={values.employeesAmount}
        suffix="万円"
        onChange={v => onChange({ employeesAmount: v })}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">1962年4月2日以降生まれですか?</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ isNewRate: true })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              values.isNewRate ? 'bg-accent text-white' : 'bg-bg-sub text-slate-600 hover:bg-border'
            }`}
          >
            はい
          </button>
          <button
            type="button"
            onClick={() => onChange({ isNewRate: false })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              !values.isNewRate ? 'bg-accent text-white' : 'bg-bg-sub text-slate-600 hover:bg-border'
            }`}
          >
            いいえ
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="targetAge" className="text-xs font-medium text-slate-600">
          検討中の受給開始年齢
        </label>
        <select
          id="targetAge"
          value={values.targetAge}
          onChange={e => onChange({ targetAge: Number(e.target.value) })}
          className={selectClassName}
        >
          {TARGET_AGE_OPTIONS.map(age => (
            <option key={age} value={age}>{age}歳</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 lg:col-span-2">
        <label htmlFor="compareEndAge" className="text-xs font-medium text-slate-600">
          比較終了年齢(寿命の目安)
        </label>
        <select
          id="compareEndAge"
          value={values.compareEndAge}
          onChange={e => onChange({ compareEndAge: Number(e.target.value) })}
          className={`${selectClassName} lg:w-1/2`}
        >
          {COMPARE_END_AGE_OPTIONS.map(age => (
            <option key={age} value={age}>{age}歳</option>
          ))}
        </select>
      </div>
    </div>
  );
}
