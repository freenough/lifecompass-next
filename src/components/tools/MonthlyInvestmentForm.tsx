'use client';

import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

const RATE_PRESETS = [3, 5, 7];

export interface MonthlyInvestmentFormValues {
  curAge: number;
  targetAge: number;
  currentAssets: number;
  targetAssets: number;
  ratePct: number;
}

interface MonthlyInvestmentFormProps {
  values: MonthlyInvestmentFormValues;
  onChange: (patch: Partial<MonthlyInvestmentFormValues>) => void;
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
          value={value}
          step={step}
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

export default function MonthlyInvestmentForm({ values, onChange }: MonthlyInvestmentFormProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <NumberField
        label="現在の年齢"
        id="curAge"
        value={values.curAge}
        suffix="歳"
        onChange={v => onChange({ curAge: v })}
      />
      <NumberField
        label="目標達成年齢"
        id="targetAge"
        value={values.targetAge}
        suffix="歳"
        onChange={v => onChange({ targetAge: v })}
      />
      <NumberField
        label="現在の資産額"
        id="currentAssets"
        value={values.currentAssets}
        suffix="万円"
        onChange={v => onChange({ currentAssets: v })}
      />
      <NumberField
        label="目標資産額"
        id="targetAssets"
        value={values.targetAssets}
        suffix="万円"
        onChange={v => onChange({ targetAssets: v })}
      />
      <div className="flex flex-col gap-1 lg:col-span-2">
        <label htmlFor="ratePct" className="text-xs font-medium text-slate-600">
          想定利回り(年率)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="ratePct"
            type="number"
            inputMode="decimal"
            step={0.1}
            value={values.ratePct}
            onChange={e => {
              const cleaned = stripLeadingZero(e.target.value);
              if (cleaned !== e.target.value) e.target.value = cleaned;
              const raw = e.target.valueAsNumber;
              onChange({ ratePct: isNaN(raw) ? 0 : raw });
            }}
            onBlur={e => {
              const raw = e.target.valueAsNumber;
              const safe = isNaN(raw) ? 0 : raw;
              if (safe !== values.ratePct) onChange({ ratePct: safe });
              e.target.value = String(safe);
            }}
            onFocus={e => clearZeroOrSelect(e.currentTarget)}
            onClick={e => clearZeroOrSelect(e.currentTarget)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-base focus:border-accent focus:outline-none"
          />
          <span className="shrink-0 text-sm text-slate-500">%</span>
          <div className="flex shrink-0 gap-1">
            {RATE_PRESETS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ ratePct: preset })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  values.ratePct === preset
                    ? 'bg-accent text-white'
                    : 'bg-bg-sub text-slate-600 hover:bg-border'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
