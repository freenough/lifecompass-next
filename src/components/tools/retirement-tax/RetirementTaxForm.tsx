'use client';

import { useEffect, useRef, useState } from 'react';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

export interface RetirementTaxFormValues {
  incomeManYen: number;
  serviceYears: number;
  isExecutive: boolean;
  hasDisabilityException: boolean;
}

interface RetirementTaxFormProps {
  values: RetirementTaxFormValues;
  onChange: (patch: Partial<RetirementTaxFormValues>) => void;
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
 * 空文字・不正な値の間はonChangeを呼ばない(=inputStrはそのまま自由に編集させる)ことで、
 * 「バックスペースで空にすると即座にmin値へスナップして打ち直せない」問題を防ぐ。
 * 確定(=親stateへの反映・デフォルトへのフォールバック)はblur時にのみ行う。
 */
function NumberField({ label, id, value, suffix, onChange, min }: NumberFieldProps) {
  const [inputStr, setInputStr] = useState(String(value));
  const isFocused = useRef(false);

  // フォーカス中でない間だけ、外部由来のvalue変更(サンプル読込等)を表示に同期する。
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
            // 有効な数値として読める間だけ、計算用の値もリアルタイムに更新する。
            // 空文字・不正値の間は何もしない(=前回の有効値のまま、inputStrだけ自由に編集できる)。
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

export default function RetirementTaxForm({ values, onChange }: RetirementTaxFormProps) {
  // 詳細設定(障害者特例)は初期非表示。KpiGrid.tsxの詳細指標アコーディオンと同じ開閉パターン。
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NumberField
          label="退職金収入額"
          id="incomeManYen"
          value={values.incomeManYen}
          suffix="万円"
          onChange={v => onChange({ incomeManYen: v })}
        />
        <div className="flex flex-col gap-1">
          <NumberField
            label="勤続年数"
            id="serviceYears"
            value={values.serviceYears}
            suffix="年"
            min={1}
            onChange={v => onChange({ serviceYears: v })}
          />
          <p className="text-xs text-slate-400">1年未満の端数は切り上げてご入力ください(例:10年1か月 → 11年)</p>
        </div>
      </div>

      {/* 役員等チェックボックスは勤続5年以下の場合のみ表示(Product Spec 2節) */}
      {values.serviceYears <= 5 && (
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={values.isExecutive}
            onChange={e => onChange({ isExecutive: e.target.checked })}
            className="rounded"
          />
          役員等として退職しますか?
        </label>
      )}

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
          <div className="px-3 pb-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={values.hasDisabilityException}
                onChange={e => onChange({ hasDisabilityException: e.target.checked })}
                className="rounded"
              />
              障害者となったことに直接起因する退職ですか?(控除額+100万円)
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
