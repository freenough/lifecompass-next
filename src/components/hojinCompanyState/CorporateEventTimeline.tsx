'use client';

// LifeEventTimeline.tsx（src/components/simulator/、ロック対象外だがUIパターンの複製元）の
// UIパターンを複製する（5.1節）。種別は「事業利益」「取崩」の2種類のみに絞り、個人側のような
// 多数のsubtype・住宅ローン・繰上返済・対象者（配偶者）等は持たない。
// 状態管理はuseCompanyStateStore（法人専用の新規ストア）のみを使用し、useSimulatorStoreには
// 一切依存しない。

import { useState } from 'react';
import { useCompanyStateStore } from '@/lib/hojinCompanyState/companyStateStore';
import type { CorporateEventKind, CorporateLifeEvent } from '@/lib/hojinCompanyState/types';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

const KIND_OPTIONS: { value: CorporateEventKind; label: string }[] = [
  { value: 'business_profit', label: '事業利益' },
  { value: 'withdrawal',      label: '取崩' },
];
const KIND_LABEL = Object.fromEntries(KIND_OPTIONS.map(o => [o.value, o.label])) as Record<CorporateEventKind, string>;

const inputCls  = 'text-xs border border-slate-300 rounded px-1 py-1 text-right bg-white';
const selectCls = 'text-xs border border-slate-300 rounded px-1 py-1 bg-white text-left';

interface FormState {
  kind: CorporateEventKind;
  label: string;
  startAge: number;
  years: number;
  amount: number;
}

function blankForm(): FormState {
  return { kind: 'business_profit', label: '', startAge: 40, years: 1, amount: 0 };
}

function eventToForm(ev: CorporateLifeEvent): FormState {
  return { kind: ev.kind, label: ev.label, startAge: ev.startAge, years: ev.years, amount: ev.amount };
}

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formToEvent(f: FormState, existingId?: string): CorporateLifeEvent {
  return {
    id: existingId ?? newId(),
    kind: f.kind,
    label: f.label,
    startAge: f.startAge,
    years: f.years,
    amount: f.amount,
  };
}

export default function CorporateEventTimeline() {
  const events = useCompanyStateStore(s => s.state.events);
  const updateEvents = useCompanyStateStore(s => s.updateEvents);

  const [open, setOpen] = useState(false);
  // null = 閉じている, -1 = 新規追加中, 0以上 = 編集中インデックス
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

  const openAdd = () => {
    setForm(blankForm());
    setEditIdx(-1);
  };

  const openEdit = (i: number) => {
    setForm(eventToForm(events[i]));
    setEditIdx(i);
  };

  const closeForm = () => setEditIdx(null);

  const save = () => {
    if (editIdx === -1) {
      updateEvents([...events, formToEvent(form)]);
    } else if (editIdx !== null) {
      updateEvents(events.map((e, i) => i === editIdx ? formToEvent(form, e.id) : e));
    }
    closeForm();
  };

  const remove = (i: number) => {
    if (editIdx === i) closeForm();
    updateEvents(events.filter((_, idx) => idx !== i));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <span>事業タイムライン ({events.length}件)</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          {events.length === 0 && editIdx === null && (
            <p className="text-xs text-slate-400 mb-3">イベントなし</p>
          )}

          {events.map((ev, i) => (
            <div key={ev.id}>
              <div className="flex items-center justify-between border-b border-slate-100 py-2 text-xs">
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${ev.kind === 'business_profit' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {KIND_LABEL[ev.kind]}
                  </span>
                  <span className="font-medium text-slate-700 truncate">{ev.label || KIND_LABEL[ev.kind]}</span>
                  <span className="text-slate-400 shrink-0">
                    {ev.startAge}歳{ev.years > 1 ? `〜${ev.startAge + ev.years - 1}歳` : ''} / {ev.amount.toLocaleString()}万
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
                <EventForm form={form} setForm={setForm} onSave={save} onCancel={closeForm} isEdit />
              )}
            </div>
          ))}

          {editIdx === -1 ? (
            <EventForm form={form} setForm={setForm} onSave={save} onCancel={closeForm} isEdit={false} />
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

interface NumberFieldProps {
  label: string;
  value: number;
  onValueChange: (v: number) => void;
  suffix: string;
  min?: number;
}

function NumberField({ label, value, onValueChange, suffix, min }: NumberFieldProps) {
  return (
    <div className="flex gap-2 items-center justify-between">
      <label className="text-xs text-slate-500 w-16 shrink-0 leading-tight">{label}</label>
      <div className="flex gap-1 items-center">
        <input
          type="number"
          value={value}
          min={min}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const raw = e.target.valueAsNumber;
            onValueChange(isNaN(raw) ? 0 : Math.round(raw));
          }}
          onBlur={e => {
            const raw = e.target.valueAsNumber;
            const safe = isNaN(raw) ? (value || 0) : Math.round(raw);
            if (safe !== value) onValueChange(safe);
            e.target.value = String(safe);
          }}
          onFocus={e => clearZeroOrSelect(e.currentTarget)}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          className={`w-24 ${inputCls}`}
        />
        <span className="shrink-0 text-left text-xs text-slate-400 whitespace-nowrap">{suffix}</span>
      </div>
    </div>
  );
}

function EventForm({
  form, setForm, onSave, onCancel, isEdit,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <select
        value={form.kind}
        onChange={e => setForm(f => ({ ...f, kind: e.target.value as CorporateEventKind }))}
        className={selectCls}
      >
        {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <input
        placeholder="名称（省略可）"
        value={form.label}
        onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
        className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
      />

      <NumberField label="開始年齢" value={form.startAge} onValueChange={v => setForm(f => ({ ...f, startAge: v }))} suffix="歳" />
      <NumberField label="期間" value={form.years} onValueChange={v => setForm(f => ({ ...f, years: v }))} suffix="年" min={1} />
      <NumberField label="金額" value={form.amount} onValueChange={v => setForm(f => ({ ...f, amount: v }))} suffix="万円/年" />

      <div className="flex gap-2 mt-1">
        <button onClick={onSave} className="flex-1 rounded py-1 text-xs text-white bg-slate-800 hover:bg-slate-700">
          {isEdit ? '更新' : '追加'}
        </button>
        <button onClick={onCancel} className="flex-1 rounded border border-slate-300 py-1 text-xs text-slate-600 hover:bg-slate-50">
          キャンセル
        </button>
      </div>
    </div>
  );
}
