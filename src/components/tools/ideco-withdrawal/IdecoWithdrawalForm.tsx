'use client';

import { useEffect, useRef, useState } from 'react';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

export type ReceiveMethod = 'lump' | 'pension' | 'mixed';

export interface IdecoWithdrawalFormValues {
  idecoBalanceManYen: number;
  idecoYrs: number;
  receiveAge: number;
  publicPensionAnnualManYen: number;
  receiveMethod: ReceiveMethod;
  annuityYears: number;
  lumpSumRatioPct: number;
  severanceManYen: number;
  sevYrs: number;
  otherIncomeManYen: number;
}

interface IdecoWithdrawalFormProps {
  values: IdecoWithdrawalFormValues;
  onChange: (patch: Partial<IdecoWithdrawalFormValues>) => void;
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
 * 第5弾ツール(RetirementTaxForm.tsx)と同一のパターン
 * (バックスペースで空にすると即座にmin値へスナップして打ち直せない問題を防ぐ)。
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

const RECEIVE_AGE_OPTIONS = Array.from({ length: 75 - 60 + 1 }, (_, i) => 60 + i);
const ANNUITY_YEARS_OPTIONS = [5, 10, 15, 20];
const RECEIVE_METHOD_OPTIONS: { key: ReceiveMethod; label: string }[] = [
  { key: 'lump', label: '一時金' },
  { key: 'pension', label: '年金' },
  { key: 'mixed', label: '併用' },
];

const selectClassName =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white focus:border-accent focus:outline-none';

export default function IdecoWithdrawalForm({ values, onChange }: IdecoWithdrawalFormProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NumberField
          label="iDeCo/DC残高"
          id="idecoBalanceManYen"
          value={values.idecoBalanceManYen}
          suffix="万円"
          onChange={v => onChange({ idecoBalanceManYen: v })}
        />
        <NumberField
          label="iDeCo/DC加入年数"
          id="idecoYrs"
          value={values.idecoYrs}
          suffix="年"
          min={1}
          onChange={v => onChange({ idecoYrs: v })}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="receiveAge" className="text-xs font-medium text-slate-600">
            受取開始年齢
          </label>
          <select
            id="receiveAge"
            value={values.receiveAge}
            onChange={e => onChange({ receiveAge: Number(e.target.value) })}
            className={selectClassName}
          >
            {RECEIVE_AGE_OPTIONS.map(age => (
              <option key={age} value={age}>{age}歳</option>
            ))}
          </select>
        </div>

        <NumberField
          label="公的年金の年間受給見込み額"
          id="publicPensionAnnualManYen"
          value={values.publicPensionAnnualManYen}
          suffix="万円"
          onChange={v => onChange({ publicPensionAnnualManYen: v })}
        />
      </div>
      <p className="text-xs text-slate-400 -mt-2">厚生年金・国民年金など、iDeCo以外に受け取る年金の年額です。</p>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">注目する受取方法</label>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
          {RECEIVE_METHOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange({ receiveMethod: opt.key })}
              className={`flex-1 px-3 py-2 ${
                values.receiveMethod === opt.key ? 'bg-accent text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">3パターンは常に比較表示されます。ここでは下の内訳に表示するパターンを選べます。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="annuityYears" className="text-xs font-medium text-slate-600">
            年金受給期間
          </label>
          <select
            id="annuityYears"
            value={values.annuityYears}
            onChange={e => onChange({ annuityYears: Number(e.target.value) })}
            className={selectClassName}
          >
            {ANNUITY_YEARS_OPTIONS.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="lumpSumRatioPct" className="text-xs font-medium text-slate-600">
            併用時の一時金割合:{values.lumpSumRatioPct}%
          </label>
          <input
            id="lumpSumRatioPct"
            type="range"
            min={0}
            max={100}
            step={10}
            value={values.lumpSumRatioPct}
            onChange={e => onChange({ lumpSumRatioPct: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>
      </div>
      <p className="text-xs text-slate-400 -mt-2">
        iDeCo標準的な受給期間を代表値としています。企業型DCは運営管理機関により異なる場合があります。
      </p>

      <div className="rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>詳細設定</span>
          <span className="text-slate-400">{detailsOpen ? '▲' : '▼'}</span>
        </button>
        {detailsOpen && (
          <div className="px-3 pb-3 flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NumberField
                label="会社の退職金額"
                id="severanceManYen"
                value={values.severanceManYen}
                suffix="万円"
                onChange={v => onChange({ severanceManYen: v })}
              />
              <NumberField
                label="会社の勤続年数"
                id="sevYrs"
                value={values.sevYrs}
                suffix="年"
                onChange={v => onChange({ sevYrs: v })}
              />
            </div>
            <p className="text-xs text-slate-400 -mt-2">
              同一年に会社の退職金を受け取る場合、iDeCo/DC一時金と退職所得控除の枠を共有します。
            </p>
            <NumberField
              label="年金以外の所得(概算)"
              id="otherIncomeManYen"
              value={values.otherIncomeManYen}
              suffix="万円"
              onChange={v => onChange({ otherIncomeManYen: v })}
            />
            <p className="text-xs text-slate-400 -mt-2">
              給与所得・事業所得など、年金以外の所得額です(収入額そのままではありません)。分からない場合は0円のままで概算できます。
              退職後も収入がある方は、この項目の入力を推奨します。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
