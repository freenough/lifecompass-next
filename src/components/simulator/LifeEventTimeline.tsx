'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import type { LifeEvent, IncomeSubtype, ExpenseSubtype } from '@/lib/types';

const INCOME_SUBTYPES: { value: IncomeSubtype; label: string }[] = [
  { value: 'reemploy',    label: '再雇用' },
  { value: 'sidejob',     label: '副業' },
  { value: 'rental',      label: '不動産収入' },
  { value: 'inheritance', label: '相続' },
  { value: 'severance',   label: '退職金' },
  { value: 'other_inc',   label: 'その他収入' },
];

const EXPENSE_SUBTYPES: { value: ExpenseSubtype; label: string }[] = [
  { value: 'education',   label: '教育費' },
  { value: 'care',        label: '介護費' },
  { value: 'renovation',  label: 'リフォーム' },
  { value: 'mortgage',    label: '住宅ローン' },
  { value: 'other_exp',   label: 'その他支出' },
  { value: 'base_change', label: '生活費変更' },
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
}

function blankForm(retAge: number): FormState {
  return { category: 'income', subtype: 'reemploy', name: '', age: retAge, years: 1, amount: 0 };
}

function eventToForm(ev: LifeEvent): FormState {
  return { category: ev.category, subtype: ev.subtype, name: ev.name, age: ev.age, years: ev.years, amount: ev.amount };
}

function formToEvent(f: FormState): LifeEvent {
  return f.category === 'income'
    ? { category: 'income',  subtype: f.subtype as IncomeSubtype,  name: f.name, age: f.age, years: f.years, amount: f.amount }
    : { category: 'expense', subtype: f.subtype as ExpenseSubtype, name: f.name, age: f.age, years: f.years, amount: f.amount };
}

export default function LifeEventTimeline() {
  const { profile, updateEvents } = useSimulatorStore();
  const events = profile.events;
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
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <span>ライフイベント ({events.length}件)</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
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
                  <span className="text-slate-400 shrink-0">{ev.age}歳{ev.years > 1 ? `〜${ev.age + ev.years - 1}歳` : ''} / {ev.amount.toLocaleString()}万</span>
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
}

function EventForm({ form, setForm, setCategory, onSave, onCancel, isEdit }: EventFormProps) {
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex gap-2">
        <select
          value={form.category}
          onChange={e => setCategory(e.target.value as 'income' | 'expense')}
          className="text-xs border rounded px-1 py-1 bg-white"
        >
          <option value="income">収入</option>
          <option value="expense">支出</option>
        </select>
        <select
          value={form.subtype}
          onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))}
          className="flex-1 text-xs border rounded px-1 py-1 bg-white"
        >
          {(form.category === 'income' ? INCOME_SUBTYPES : EXPENSE_SUBTYPES).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <input
        placeholder="名称（省略可）"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="w-full text-xs border rounded px-2 py-1 bg-white"
      />
      <div className="flex gap-2 items-center">
        <label className="text-xs text-slate-500 w-14 shrink-0">開始年齢</label>
        <input
          type="number"
          value={form.age}
          onChange={e => setForm(f => ({ ...f, age: +e.target.value }))}
          className="w-16 text-xs border rounded px-1 py-1 text-right bg-white"
        />
        <label className="text-xs text-slate-500 w-8 shrink-0">期間</label>
        <input
          type="number"
          value={form.years}
          onChange={e => setForm(f => ({ ...f, years: +e.target.value }))}
          min={1}
          className="w-14 text-xs border rounded px-1 py-1 text-right bg-white"
        />
        <span className="text-xs text-slate-400">年</span>
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-xs text-slate-500 w-14 shrink-0">金額</label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
          className="w-24 text-xs border rounded px-1 py-1 text-right bg-white"
        />
        <span className="text-xs text-slate-400">万円/年</span>
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={onSave} className="flex-1 rounded bg-slate-800 py-1 text-xs text-white hover:bg-slate-700">
          {isEdit ? '更新' : '追加'}
        </button>
        <button onClick={onCancel} className="flex-1 rounded border border-slate-300 py-1 text-xs text-slate-600 hover:bg-slate-50">
          キャンセル
        </button>
      </div>
    </div>
  );
}
