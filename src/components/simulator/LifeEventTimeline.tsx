'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import type { LifeEvent, IncomeSubtype, ExpenseSubtype } from '@/lib/types';
import { UNIT_WIDTH_CLASS } from '@/components/simulator/formLayout';
import InfoTooltip from '@/components/simulator/InfoTooltip';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import { calcMortgage, calcMortgageMonthly, calcMortgageBalance, calcMortgageTermFromPayment } from '@/lib/helpers';

const INCOME_SUBTYPES: { value: IncomeSubtype; label: string }[] = [
  { value: 'reemploy',    label: '再雇用' },
  { value: 'sidejob',     label: '副業' },
  { value: 'rental',      label: '不動産収入' },
  { value: 'inheritance', label: '相続' },
  { value: 'severance',   label: '退職金' },
  { value: 'inc_change',  label: '収入変更' },
  { value: 'other_inc',   label: 'その他収入' },
];

const EXPENSE_SUBTYPES: { value: ExpenseSubtype; label: string }[] = [
  { value: 'education',        label: '教育費' },
  { value: 'care',             label: '介護費' },
  { value: 'renovation',       label: 'リフォーム' },
  { value: 'mortgage',         label: '住宅ローン' },
  { value: 'base_change',      label: '生活費変更' },
  { value: 'nisa_con_change',  label: 'NISA積立変更' },
  { value: 'ideco_con_change', label: 'iDeCo積立変更' },
  { value: 'tax_con_change',   label: '特定口座積立変更' },
  { value: 'other_exp',        label: 'その他支出' },
];

const SUBTYPE_LABEL = Object.fromEntries(
  [...INCOME_SUBTYPES, ...EXPENSE_SUBTYPES].map(s => [s.value, s.label])
);

interface FormState {
  category: 'income' | 'expense';
  subtype: string;
  name: string;
  age: number;
  years: number;
  amount: number;
  owner: 'self' | 'spouse';
  // 住宅ローン専用フィールド
  principal: number;
  rate: number;
  termYears: number;
  // 繰上返済(単発)専用フィールド
  prepayEnabled: boolean;
  prepayAge: number;
  prepayAmount: number;
  prepayType: 'shorten' | 'reduce';
}

const DEFAULT_MORTGAGE = { principal: 3000, rate: 1.0, termYears: 30 }
const DEFAULT_PREPAY = { prepayEnabled: false, prepayAge: 0, prepayAmount: 0, prepayType: 'shorten' as const };

// 繰上返済セクションの入力バリデーション。prepayEnabled=false時は常にエラーなし
// （formToEvent側でprepay系フィールドをundefinedにするため、値そのものは検証不要）。
function getPrepayErrors(f: FormState): { age?: string; amount?: string } {
  if (!f.prepayEnabled) return {};
  const errors: { age?: string; amount?: string } = {};
  const minAge = f.age + 1;
  const maxAge = f.age + f.termYears - 1;
  if (!(f.prepayAge > f.age && f.prepayAge < f.age + f.termYears)) {
    errors.age = `繰上返済年齢は${minAge}〜${maxAge}歳の範囲で入力してください`;
  }
  if (!(f.prepayAmount > 0)) {
    errors.amount = '繰上返済額は0より大きい値を入力してください';
  } else if (f.prepayAmount > f.principal) {
    errors.amount = '繰上返済額は借入額を超えないようにしてください';
  }
  return errors;
}

// EventForm・NumberField共通のスタイル（EventForm内ローカル定数だったものをモジュールスコープへ
// 昇格。NumberFieldからも参照するため）
const inputCls  = 'text-xs border border-slate-300 rounded px-1 py-1 text-right bg-white';
const selectCls = 'text-xs border border-slate-300 rounded px-1 py-1 bg-white text-left';

// These subtypes take effect from a given age onward — no "years" field needed
const POINT_CHANGE_SUBTYPES = new Set([
  'base_change', 'inc_change', 'nisa_con_change', 'ideco_con_change', 'tax_con_change',
]);

// Subtypes that can belong to a spouse
const OWNER_SUBTYPES = new Set([
  'severance', 'nisa_con_change', 'ideco_con_change', 'tax_con_change',
]);

const CHANGE_AMT_LABEL: Record<string, string> = {
  base_change:      '変更後の年間生活費（万円・現在価格）',
  inc_change:       '変更後の年間手取り収入（万円）',
  nisa_con_change:  '変更後のNISA年間積立額（万円）',
  ideco_con_change: '変更後のiDeCo年間積立額（万円）',
  tax_con_change:   '変更後の特定口座年間積立額（万円）',
};;

function blankForm(retAge: number): FormState {
  return {
    category: 'income', subtype: 'reemploy', name: '', age: retAge, years: 1, amount: 0,
    owner: 'self',
    ...DEFAULT_MORTGAGE,
    ...DEFAULT_PREPAY,
  };
}

function eventToForm(ev: LifeEvent): FormState {
  const base: FormState = {
    category: ev.category, subtype: ev.subtype, name: ev.name,
    age: ev.age, years: ev.years, amount: ev.amount,
    owner: ev.owner ?? 'self',
    ...DEFAULT_MORTGAGE,
    ...DEFAULT_PREPAY,
  };
  if (ev.category === 'expense' && ev.subtype === 'mortgage') {
    const principal = ev.principal ?? DEFAULT_MORTGAGE.principal;
    const rate      = ev.rate      ?? DEFAULT_MORTGAGE.rate;
    const termYears = ev.termYears ?? DEFAULT_MORTGAGE.termYears;
    // 繰上返済フィールドを持たない既存イベントはprepayEnabled=false・関連欄は空(0)のまま
    const prepayEnabled = ev.prepayAge != null && ev.prepayAmount != null && ev.prepayAmount > 0;
    return {
      ...base, principal, rate, termYears,
      prepayEnabled,
      prepayAge: ev.prepayAge ?? 0,
      prepayAmount: ev.prepayAmount ?? 0,
      prepayType: ev.prepayType ?? DEFAULT_PREPAY.prepayType,
    };
  }
  return base;
}

function formToEvent(f: FormState): LifeEvent {
  const owner = OWNER_SUBTYPES.has(f.subtype) && f.owner === 'spouse' ? 'spouse' : undefined;
  if (f.category === 'expense' && f.subtype === 'mortgage') {
    // チェックOFF、または範囲外入力時はprepay系フィールドを全てundefinedにする
    // （simulate.ts側のhasPrepayガードが確実にfalseになるようにするため）。
    const prepayValid = f.prepayEnabled && Object.keys(getPrepayErrors(f)).length === 0;
    return {
      category: 'expense',
      subtype: 'mortgage' as ExpenseSubtype,
      name: f.name,
      age: f.age,
      years: f.termYears,
      amount: calcMortgage(f.principal, f.rate, f.termYears),
      principal: f.principal,
      rate: f.rate,
      termYears: f.termYears,
      ...(prepayValid ? { prepayAge: f.prepayAge, prepayAmount: f.prepayAmount, prepayType: f.prepayType } : {}),
    };
  }
  const isChange = POINT_CHANGE_SUBTYPES.has(f.subtype);
  return f.category === 'income'
    ? { category: 'income',  subtype: f.subtype as IncomeSubtype,  name: f.name, age: f.age, years: isChange ? 1 : f.years, amount: f.amount, ...(owner ? { owner } : {}) }
    : { category: 'expense', subtype: f.subtype as ExpenseSubtype, name: f.name, age: f.age, years: isChange ? 1 : f.years, amount: f.amount, ...(owner ? { owner } : {}) };
}

export default function LifeEventTimeline() {
  const { profile, updateEvents } = useSimulatorStore();
  const events = profile.events;
  const spRetAge = profile.params.spRetAge || undefined;
  const [open, setOpen] = useState(false);
  // null = form closed, -1 = adding new, >=0 = editing that index
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(blankForm(profile.params.retAge));

  const openAdd = () => {
    setForm(blankForm(profile.params.retAge));
    setEditIdx(-1);
  };

  const openEdit = (i: number) => {
    setForm(eventToForm(events[i]));
    setEditIdx(i);
  };

  const closeForm = () => setEditIdx(null);

  const save = () => {
    const ev = formToEvent(form);
    if (editIdx === -1) {
      updateEvents([...events, ev]);
    } else if (editIdx !== null) {
      updateEvents(events.map((e, i) => i === editIdx ? ev : e));
    }
    closeForm();
  };

  const remove = (i: number) => {
    if (editIdx === i) closeForm();
    updateEvents(events.filter((_, idx) => idx !== i));
  };

  const setCategory = (cat: 'income' | 'expense') => {
    setForm(f => ({ ...f, category: cat, subtype: cat === 'income' ? 'reemploy' : 'education' }));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <span>タイムライン ({events.length}件)</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          {events.length === 0 && editIdx === null && (
            <p className="text-xs text-slate-400 mb-3">イベントなし</p>
          )}

          {events.map((ev, i) => (
            <div key={i}>
              <div className="flex items-center justify-between border-b border-slate-100 py-2 text-xs">
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${ev.category === 'income' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {ev.category === 'income' ? '収入' : '支出'}
                  </span>
                  <span className="font-medium text-slate-700 truncate">{ev.name || SUBTYPE_LABEL[ev.subtype] || ev.subtype}</span>
                  {ev.owner === 'spouse' && (
                    <span className="shrink-0 rounded border border-slate-300 px-1 py-0.5 text-[10px] text-slate-500">配偶者</span>
                  )}
                  <span className="text-slate-400 shrink-0">
                    {ev.age}歳{ev.years > 1 ? `〜${ev.age + ev.years - 1}歳` : ''} / {ev.amount.toLocaleString()}万
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => editIdx === i ? closeForm() : openEdit(i)}
                    className={`text-[11px] px-1.5 py-0.5 rounded border ${editIdx === i ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-400'}`}
                  >
                    編集
                  </button>
                  <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 px-1">×</button>
                </div>
              </div>

              {editIdx === i && (
                <EventForm
                  form={form}
                  setForm={setForm}
                  setCategory={setCategory}
                  onSave={save}
                  onCancel={closeForm}
                  isEdit
                  spRetAge={spRetAge}
                />
              )}
            </div>
          ))}

          {editIdx === -1 ? (
            <EventForm
              form={form}
              setForm={setForm}
              setCategory={setCategory}
              onSave={save}
              onCancel={closeForm}
              isEdit={false}
              spRetAge={spRetAge}
            />
          ) : (
            <button
              onClick={openAdd}
              className="mt-3 w-full rounded border border-dashed border-slate-300 py-2 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
            >
              + イベントを追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface EventFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setCategory: (cat: 'income' | 'expense') => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
  spRetAge?: number;
}

interface NumberFieldProps {
  label: React.ReactNode;
  value: number;
  onValueChange: (v: number) => void;
  suffix: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  /** suffixの後ろに追加で表示する要素（開始年齢欄のInfoTooltip等）。連動ロジックは持たない疎結合な受け皿。 */
  after?: React.ReactNode;
}

/**
 * ラベル+数値入力+単位をまとめた行コンポーネント。前0バグ修正
 * （SimulatorForm.tsx の Field と同じ onChange/onFocus/onClick/onBlur の4段構え、
 * src/lib/numberInput.ts の stripLeadingZero/clearZeroOrSelect）をそのまま踏襲する。
 * 住宅ローンの連動計算（principal/rate/termYears→years/amountの再計算）は関知せず、
 * パース済みの数値をonValueChangeで返すだけの疎結合な作り（呼び出し元がupdateMortgage()
 * 経由か単純setForm()かを選ぶ）。
 */
function NumberField({ label, value, onValueChange, suffix, step = 1, min, max, className = 'w-24', after }: NumberFieldProps) {
  const isIntegerStep = Number.isInteger(step);
  return (
    <div className="flex gap-2 items-center justify-between">
      <label className="text-xs text-slate-500 w-16 shrink-0 leading-tight">{label}</label>
      <div className="flex gap-1 items-center">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const raw = e.target.valueAsNumber;
            if (isNaN(raw)) { onValueChange(0); return; }
            const next = isIntegerStep ? Math.round(raw) : raw;
            onValueChange(next);
            if (isIntegerStep && raw !== next) e.target.value = String(next);
          }}
          onBlur={e => {
            const raw = e.target.valueAsNumber;
            const safe = isNaN(raw) ? (value || 0) : (isIntegerStep ? Math.round(raw) : raw);
            if (safe !== value) onValueChange(safe);
            e.target.value = String(safe);
          }}
          onFocus={e => clearZeroOrSelect(e.currentTarget)}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          className={`${className} ${inputCls}`}
        />
        <span className={`${UNIT_WIDTH_CLASS} shrink-0 text-left text-xs text-slate-400 whitespace-nowrap`}>{suffix}</span>
        {after}
      </div>
    </div>
  );
}

function EventForm({ form, setForm, setCategory, onSave, onCancel, isEdit, spRetAge }: EventFormProps) {
  const isMortgage    = form.subtype === 'mortgage';
  const isPointChange = POINT_CHANGE_SUBTYPES.has(form.subtype);
  const hasOwner      = OWNER_SUBTYPES.has(form.subtype);
  const isSpouseEvent = hasOwner && form.owner === 'spouse';

  const updateMortgage = (patch: { principal?: number; rate?: number; termYears?: number }) => {
    setForm(f => {
      const p = patch.principal ?? f.principal;
      const r = patch.rate      ?? f.rate;
      const t = patch.termYears ?? f.termYears;
      return { ...f, ...patch, years: t, amount: calcMortgage(p, r, t) };
    });
  };

  const handleSubtypeChange = (subtype: string) => {
    if (subtype === 'mortgage') {
      const p = form.principal || DEFAULT_MORTGAGE.principal;
      const r = form.rate      || DEFAULT_MORTGAGE.rate;
      const t = form.termYears || DEFAULT_MORTGAGE.termYears;
      setForm(f => ({ ...f, subtype, principal: p, rate: r, termYears: t, years: t, amount: calcMortgage(p, r, t), ...DEFAULT_PREPAY }));
    } else {
      setForm(f => ({ ...f, subtype }));
    }
  };

  const annual  = isMortgage ? calcMortgage(form.principal, form.rate, form.termYears) : 0;
  const monthly = isMortgage ? calcMortgageMonthly(form.principal, form.rate, form.termYears) : 0;
  const total   = isMortgage ? Math.round(annual * form.termYears) : 0;

  // 繰上返済(単発)：入力バリデーション + 試算表示用の派生値
  const prepayErrors = isMortgage ? getPrepayErrors(form) : {};
  const prepayHasError = !!(prepayErrors.age || prepayErrors.amount);
  const prepayReady = isMortgage && form.prepayEnabled && !prepayHasError;

  let prepayNewAnnual = 0, prepayNewMonthly = 0;
  let prepayNewTermYears: number | null = null;
  let prepayOriginalPayoffAge = 0, prepayNewPayoffAge = 0, prepayShortenedYears = 0;
  if (prepayReady) {
    const elapsed = form.prepayAge - form.age;
    const balance = calcMortgageBalance(form.principal, form.rate, form.termYears, elapsed);
    const newPrincipal = Math.max(0, balance - form.prepayAmount);
    if (form.prepayType === 'shorten') {
      const originalMonthly = calcMortgageMonthly(form.principal, form.rate, form.termYears);
      prepayNewTermYears = calcMortgageTermFromPayment(newPrincipal, form.rate, originalMonthly);
      prepayOriginalPayoffAge = form.age + form.termYears;
      if (prepayNewTermYears != null) {
        prepayNewPayoffAge = form.prepayAge + prepayNewTermYears;
        prepayShortenedYears = Math.max(0, Math.round(prepayOriginalPayoffAge - prepayNewPayoffAge));
      }
    } else {
      const remainingYears = form.termYears - elapsed;
      prepayNewAnnual  = calcMortgage(newPrincipal, form.rate, remainingYears);
      prepayNewMonthly = calcMortgageMonthly(newPrincipal, form.rate, remainingYears);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {/* カテゴリ・種別 */}
      <div className="flex gap-2">
        <select
          value={form.category}
          onChange={e => setCategory(e.target.value as 'income' | 'expense')}
          className={selectCls}
        >
          <option value="income">収入</option>
          <option value="expense">支出</option>
        </select>
        <select
          value={form.subtype}
          onChange={e => handleSubtypeChange(e.target.value)}
          className={`flex-1 ${selectCls}`}
        >
          {(form.category === 'income' ? INCOME_SUBTYPES : EXPENSE_SUBTYPES).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* 名称 */}
      <input
        placeholder="名称（省略可）"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
      />

      {/* 対象者（owner対応subtypeのみ） */}
      {hasOwner && (
        <div className="flex gap-1 items-center">
          <span className="text-xs text-slate-500 w-16 shrink-0">対象者</span>
          {(['self', 'spouse'] as const).map(o => (
            <button
              key={o}
              onClick={() => setForm(f => ({ ...f, owner: o }))}
              className={`px-3 py-0.5 text-xs rounded border ${form.owner === o ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
            >
              {o === 'self' ? '本人' : '配偶者'}
            </button>
          ))}
        </div>
      )}

      {/* 開始年齢（共通）。他行とのクラスタ総幅一致のため内側gapはgap-1に統一（配偶者の場合の
          ツールチップ?ボタンは例外として幅計算に含めない）。 */}
      <NumberField
        label="開始年齢"
        value={form.age}
        onValueChange={v => setForm(f => ({ ...f, age: v }))}
        suffix="歳"
        after={isSpouseEvent && <InfoTooltip text="配偶者の年齢で入力してください" />}
      />

      {isMortgage ? (
        <>
          {/* 住宅ローン専用フィールド */}
          <NumberField
            label="借入額"
            value={form.principal}
            onValueChange={v => updateMortgage({ principal: v })}
            suffix="万円"
            min={0}
          />
          <NumberField
            label="金利"
            value={form.rate}
            onValueChange={v => updateMortgage({ rate: v })}
            suffix="% / 年"
            step={0.1}
            min={0}
            max={10}
          />
          <NumberField
            label="返済年数"
            value={form.termYears}
            onValueChange={v => updateMortgage({ termYears: v })}
            suffix="年"
            min={1}
            max={50}
          />

          {/* リアルタイム試算 */}
          {form.principal > 0 && form.termYears > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs">
              <p className="font-medium text-blue-700 mb-1">試算（元利均等返済）</p>
              <div className="flex gap-4 text-slate-600 flex-wrap">
                <span>月次 <strong>{monthly.toLocaleString()}万円</strong></span>
                <span>年次 <strong>{(Math.round(annual * 10) / 10).toLocaleString()}万円</strong></span>
                <span>総返済 <strong>{total.toLocaleString()}万円</strong></span>
              </div>
            </div>
          )}

          {/* 繰上返済(単発) */}
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.prepayEnabled}
              onChange={e => {
                const checked = e.target.checked;
                setForm(f => ({
                  ...f,
                  prepayEnabled: checked,
                  // 初回ONで未入力(0)のときだけ、有効範囲内の目安値を補ってあげる
                  prepayAge: checked && f.prepayAge === 0 ? f.age + Math.max(1, Math.floor(f.termYears / 2)) : f.prepayAge,
                }));
              }}
            />
            繰上返済を設定する
          </label>

          {form.prepayEnabled && (
            <div className="flex flex-col gap-2 pl-2 border-l-2 border-blue-100">
              <NumberField
                label="繰上返済年齢"
                value={form.prepayAge}
                onValueChange={v => setForm(f => ({ ...f, prepayAge: v }))}
                suffix="歳"
                min={form.age + 1}
                max={form.age + form.termYears - 1}
              />
              {prepayErrors.age && <p className="text-[10px] text-red-500 -mt-1">{prepayErrors.age}</p>}
              <NumberField
                label="繰上返済額"
                value={form.prepayAmount}
                onValueChange={v => setForm(f => ({ ...f, prepayAmount: v }))}
                suffix="万円"
                min={0}
                max={form.principal}
              />
              {prepayErrors.amount && <p className="text-[10px] text-red-500 -mt-1">{prepayErrors.amount}</p>}
              <div className="flex gap-2 items-center justify-between">
                <span className="text-xs text-slate-500 w-16 shrink-0">方式</span>
                <select
                  value={form.prepayType}
                  onChange={e => setForm(f => ({ ...f, prepayType: e.target.value as 'shorten' | 'reduce' }))}
                  className={`flex-1 ${selectCls}`}
                >
                  <option value="shorten">期間短縮型</option>
                  <option value="reduce">返済額軽減型</option>
                </select>
              </div>

              {prepayReady && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs">
                  <p className="font-medium text-green-700 mb-1">
                    繰上返済後（{form.prepayAge}歳・{form.prepayAmount.toLocaleString()}万円・{form.prepayType === 'shorten' ? '期間短縮型' : '返済額軽減型'}）
                  </p>
                  {form.prepayType === 'shorten' ? (
                    prepayNewTermYears == null ? (
                      <p className="text-slate-600">
                        この条件では期間短縮の効果がありません。返済額軽減型への切り替え、または繰上返済額の見直しをご検討ください。
                      </p>
                    ) : (
                      <p className="text-slate-600">
                        完済年齢: <strong>{prepayOriginalPayoffAge}歳</strong> → <strong>{Math.round(prepayNewPayoffAge)}歳</strong>（{prepayShortenedYears}年短縮）
                      </p>
                    )
                  ) : (
                    <div className="flex gap-4 text-slate-600 flex-wrap">
                      <span>月次 <strong>{monthly.toLocaleString()}万円 → {prepayNewMonthly.toLocaleString()}万円</strong></span>
                      <span>年次 <strong>{(Math.round(annual * 10) / 10).toLocaleString()}万円 → {(Math.round(prepayNewAnnual * 10) / 10).toLocaleString()}万円</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 leading-relaxed">
            元利均等返済のみ対応。繰上返済(単発)に対応。ボーナス払いは非対応。返済額は名目固定額です。金利変動リスクは別途イベントで登録してください。
          </p>
        </>
      ) : (
        <>
          {/* 通常イベントの期間（変更系は非表示） */}
          {!isPointChange && (
            <NumberField
              label="期間"
              value={form.years}
              onValueChange={v => setForm(f => ({ ...f, years: v }))}
              suffix="年"
              min={1}
            />
          )}
          <NumberField
            label={isPointChange ? '変更後' : '金額'}
            value={form.amount}
            onValueChange={v => setForm(f => ({ ...f, amount: v }))}
            suffix={`万円${isPointChange ? '' : '/年'}`}
          />
          {isPointChange && CHANGE_AMT_LABEL[form.subtype] && (
            <p className="text-[10px] text-slate-400 -mt-1 leading-relaxed">
              {CHANGE_AMT_LABEL[form.subtype]}
            </p>
          )}
        </>
      )}

      {/* 保存・キャンセル */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onSave}
          disabled={isMortgage && prepayHasError}
          className={`flex-1 rounded py-1 text-xs text-white ${isMortgage && prepayHasError ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          {isEdit ? '更新' : '追加'}
        </button>
        <button onClick={onCancel} className="flex-1 rounded border border-slate-300 py-1 text-xs text-slate-600 hover:bg-slate-50">
          キャンセル
        </button>
      </div>
    </div>
  );
}
