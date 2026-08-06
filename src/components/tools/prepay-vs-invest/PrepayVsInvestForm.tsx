'use client';

import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import type { PrepayType } from '@/lib/mortgagePrepayCore';

export interface PrepayVsInvestFormValues {
  balance: number;
  rate: number;
  remainingYears: number;
  prepayAmount: number;
  prepayType: PrepayType;
  investRate: number;
}

interface PrepayVsInvestFormProps {
  values: PrepayVsInvestFormValues;
  onChange: (patch: Partial<PrepayVsInvestFormValues>) => void;
}

interface NumberFieldProps {
  label: string;
  id: string;
  value: number;
  suffix: string;
  step?: number;
  onChange: (v: number) => void;
}

function NumberField({ label, id, value, suffix, step = 1, onChange }: NumberFieldProps) {
  const isIntegerStep = Number.isInteger(step);
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
          value={value}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const raw = e.target.valueAsNumber;
            if (isNaN(raw)) { onChange(0); return; }
            onChange(isIntegerStep ? Math.round(raw) : raw);
          }}
          onBlur={e => {
            const raw = e.target.valueAsNumber;
            const safe = isNaN(raw) ? 0 : (isIntegerStep ? Math.round(raw) : raw);
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

const selectClassName =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white focus:border-accent focus:outline-none';

const INVEST_RATE_OPTIONS = [5, 7, 9];

export default function PrepayVsInvestForm({ values, onChange }: PrepayVsInvestFormProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <NumberField
        label="ローン残高"
        id="balance"
        value={values.balance}
        suffix="万円"
        onChange={v => onChange({ balance: v })}
      />
      <NumberField
        label="金利"
        id="rate"
        value={values.rate}
        suffix="%"
        step={0.1}
        onChange={v => onChange({ rate: v })}
      />
      <NumberField
        label="残年数"
        id="remainingYears"
        value={values.remainingYears}
        suffix="年"
        onChange={v => onChange({ remainingYears: v })}
      />
      <NumberField
        label="比較する金額"
        id="prepayAmount"
        value={values.prepayAmount}
        suffix="万円"
        onChange={v => onChange({ prepayAmount: v })}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">繰上返済タイプ</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ prepayType: 'shorten' })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              values.prepayType === 'shorten' ? 'bg-accent text-white' : 'bg-bg-sub text-slate-600 hover:bg-border'
            }`}
          >
            期間短縮型
          </button>
          <button
            type="button"
            onClick={() => onChange({ prepayType: 'reduce' })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              values.prepayType === 'reduce' ? 'bg-accent text-white' : 'bg-bg-sub text-slate-600 hover:bg-border'
            }`}
          >
            返済額軽減型
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="investRate" className="text-xs font-medium text-slate-600">
          投資利回り（NISA枠内・非課税前提）
        </label>
        <select
          id="investRate"
          value={values.investRate}
          onChange={e => onChange({ investRate: Number(e.target.value) })}
          className={selectClassName}
        >
          {INVEST_RATE_OPTIONS.map(r => (
            <option key={r} value={r}>年率{r}%</option>
          ))}
        </select>
      </div>
    </div>
  );
}
