'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { SAMPLE_PROFILE } from '@/lib/profile';
import type { LifeEvent } from '@/lib/types';

const CASHFLOW_EXPENSE_TYPES = new Set(['education', 'care', 'renovation', 'mortgage', 'other_exp']);

function calcAnnualSurplus(
  baseInc: number, spInc: number, spRetAge: number, spCurAge: number,
  baseExp: number, curAge: number, events: LifeEvent[]
): number {
  const spActive = spCurAge < spRetAge;
  const income = baseInc + (spActive ? spInc : 0);
  const evTotal = events
    .filter(ev =>
      ev.category === 'expense' &&
      CASHFLOW_EXPENSE_TYPES.has(ev.subtype) &&
      curAge >= ev.age &&
      curAge < ev.age + ev.years
    )
    .reduce((s, ev) => s + (ev.amount ?? 0), 0);
  return Math.round(income - baseExp - evTotal);
}

interface FieldProps {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}

function Field({ label, id, value, onChange, min, max, step = 1, suffix, disabled }: FieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-36 shrink-0 text-xs text-slate-600">{label}</label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-slate-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
      >
        {title}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="flex flex-col gap-2 pb-3">{children}</div>}
    </div>
  );
}

export default function SimulatorForm() {
  const { profile, updateProfile, loadProfile } = useSimulatorStore();
  const p = profile.params;
  const up = (patch: Partial<typeof p>) => updateProfile(patch);
  const sameRate = profile.portfolio.retirement.sameAsWorking;
  const annualCF = calcAnnualSurplus(
    p.baseInc, p.spInc, p.spRetAge, p.spCurAge, p.baseExp, p.curAge, profile.events
  );

  const [spouseOn, setSpouseOn] = useState(p.spInc > 0 || p.spPenAmt > 0);

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-slate-800">入力パラメータ</h2>
        <button
          onClick={() => loadProfile(SAMPLE_PROFILE)}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          サンプル
        </button>
      </div>

      <Section title="基本情報">
        <Field label="現在年齢"     id="curAge"   value={p.curAge}   onChange={v => up({ curAge: v })}   min={20} max={80} suffix="歳" />
        <Field label="手取り収入"   id="baseInc"  value={p.baseInc}  onChange={v => up({ baseInc: v })}  min={0}  suffix="万円/年" />
        <Field label="年間生活費"   id="baseExp"  value={p.baseExp}  onChange={v => up({ baseExp: v })}  min={0}  suffix="万円/年" />
        <Field label="インフレ率"   id="inflR"    value={p.inflR}    onChange={v => up({ inflR: v })}    min={0}  max={10} step={0.5} suffix="%" />
        <Field label="余命(終端年齢)" id="lifeEx" value={p.lifeEx}  onChange={v => up({ lifeEx: v })}   min={60} max={120} suffix="歳" />
        <div className="flex items-center gap-2">
          <span className="w-36 shrink-0 text-xs text-slate-600">年間余剰CF</span>
          <div className="flex items-center gap-1">
            <span className={`w-24 rounded border px-2 py-1 text-right text-sm bg-slate-50 border-slate-200 ${annualCF >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {annualCF >= 0 ? '+' : ''}{annualCF.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">万円/年</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 -mt-1 pl-[9.5rem]">収入 − 生活費 − イベント支出</p>
      </Section>

      <Section title="口座残高・積立">
        <Field label="NISA残高"       id="bNisa"   value={p.bNisa}   onChange={v => up({ bNisa: v })}   min={0} suffix="万円" />
        <Field label="NISA積立"       id="cNisa"   value={p.cNisa}   onChange={v => up({ cNisa: v })}   min={0} suffix="万円/年" />
        <Field label="NISA積立終了"   id="cNisaTo" value={p.cNisaTo} onChange={v => up({ cNisaTo: v })} min={p.curAge} suffix="歳" />
        <Field label="iDeCo残高"      id="bIdeco"  value={p.bIdeco}  onChange={v => up({ bIdeco: v })}  min={0} suffix="万円" />
        <Field label="iDeCo積立"      id="cIdeco"  value={p.cIdeco}  onChange={v => up({ cIdeco: v })}  min={0} suffix="万円/年" />
        <Field label="特定口座残高"   id="bTax"    value={p.bTax}    onChange={v => up({ bTax: v })}    min={0} suffix="万円" />
        <Field label="特定口座積立"   id="cTax"    value={p.cTax}    onChange={v => up({ cTax: v })}    min={0} suffix="万円/年" />
        <Field label="現金残高"       id="bCash"   value={p.bCash}   onChange={v => up({ bCash: v })}   min={0} suffix="万円" />
      </Section>

      <Section title="退職・年金">
        <Field label="退職年齢"     id="retAge"     value={p.retAge}     onChange={v => up({ retAge: v })}     min={p.curAge + 1} max={80} suffix="歳" />
        <Field label="年金受給開始" id="penAge"     value={p.penAge}     onChange={v => up({ penAge: v })}     min={60} max={75} suffix="歳" />
        <Field label="年金受給額"   id="penAmtVal"  value={p.penAmtVal}  onChange={v => up({ penAmtVal: v, penAmt: v })} min={0} suffix="万円/年" />
        <Field label="勤続年数(退職金控除)" id="sevYrs" value={p.sevYrs} onChange={v => up({ sevYrs: v })} min={1} max={45} suffix="年" />
        <Field label="iDeCo加入年数"  id="idecoYrs"  value={p.idecoYrs}  onChange={v => up({ idecoYrs: v })}  min={1} max={40} suffix="年" />
        <div className="flex items-center gap-2 mt-1">
          <label htmlFor="idecoReceiveType" className="w-36 shrink-0 text-xs text-slate-600">iDeCo受取方式</label>
          <select
            id="idecoReceiveType"
            value={p.idecoReceiveType}
            onChange={e => up({ idecoReceiveType: e.target.value as 'lump' | 'pension' })}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="lump">一括受取</option>
            <option value="pension">年金受取</option>
          </select>
        </div>
        {p.idecoReceiveType === 'pension' && (
          <Field label="年金受取年数" id="idecoReceiveYears" value={p.idecoReceiveYears} onChange={v => up({ idecoReceiveYears: v })} min={1} max={20} suffix="年" />
        )}
        <Field label="iDeCo受取開始" id="idecoStartAge" value={p.idecoStartAge} onChange={v => up({ idecoStartAge: v })} min={60} max={75} suffix="歳" />
      </Section>

      <Section title="利回り設定" defaultOpen={false}>
        <p className="text-xs text-slate-400 mb-1">積立期（rW）/ 取崩期（rR）</p>
        <Field label="NISA rW"   id="rWNisa"  value={p.rWNisa}  onChange={v => up({ rWNisa: v })}  min={0} max={20} step={0.5} suffix="%" />
        <Field label="NISA rR"   id="rRNisa"  value={sameRate ? p.rWNisa  : p.rRNisa}  onChange={v => up({ rRNisa: v })}  min={0} max={20} step={0.5} suffix="%" disabled={sameRate} />
        <Field label="iDeCo rW"  id="rWIdeco" value={p.rWIdeco} onChange={v => up({ rWIdeco: v })} min={0} max={20} step={0.5} suffix="%" />
        <Field label="iDeCo rR"  id="rRIdeco" value={sameRate ? p.rWIdeco : p.rRIdeco} onChange={v => up({ rRIdeco: v })} min={0} max={20} step={0.5} suffix="%" disabled={sameRate} />
        <Field label="特定 rW"   id="rWTax"   value={p.rWTax}   onChange={v => up({ rWTax: v })}   min={0} max={20} step={0.5} suffix="%" />
        <Field label="特定 rR"   id="rRTax"   value={sameRate ? p.rWTax   : p.rRTax}   onChange={v => up({ rRTax: v })}   min={0} max={20} step={0.5} suffix="%" disabled={sameRate} />
        <div className="flex items-center gap-2 mt-1">
          <input
            id="sameAsWorking"
            type="checkbox"
            checked={sameRate}
            onChange={e => {
              // Update portfolio separately — requires direct store manipulation
              const { profile: pr, loadProfile } = useSimulatorStore.getState();
              loadProfile({
                ...pr,
                portfolio: {
                  ...pr.portfolio,
                  retirement: { ...pr.portfolio.retirement, sameAsWorking: e.target.checked },
                },
              });
            }}
            className="rounded"
          />
          <label htmlFor="sameAsWorking" className="text-xs text-slate-600">取崩期は積立期と同じ利回りを使う</label>
        </div>
      </Section>

      <Section title="MC設定" defaultOpen={false}>
        <Field label="積立期 標準偏差" id="mcStd"  value={p.mcStd}  onChange={v => up({ mcStd: v })}  min={0} max={50} step={1} suffix="%" />
        <Field label="取崩期 標準偏差" id="mcStdR" value={p.mcStdR} onChange={v => up({ mcStdR: v })} min={0} max={50} step={1} suffix="%" />
      </Section>

      <Section title="配偶者" defaultOpen={spouseOn}>
        <div className="flex items-center gap-2">
          <input id="spouseOn" type="checkbox" checked={spouseOn} onChange={e => setSpouseOn(e.target.checked)} className="rounded" />
          <label htmlFor="spouseOn" className="text-xs text-slate-600">配偶者あり</label>
        </div>
        {spouseOn && (
          <>
            <Field label="配偶者現在年齢" id="spCurAge"  value={p.spCurAge}  onChange={v => up({ spCurAge: v })}  min={20} suffix="歳" />
            <Field label="配偶者収入"     id="spInc"     value={p.spInc}     onChange={v => up({ spInc: v })}     min={0} suffix="万円/年" />
            <Field label="配偶者退職年齢" id="spRetAge"  value={p.spRetAge}  onChange={v => up({ spRetAge: v })}  min={20} suffix="歳" />
            <Field label="配偶者年金開始" id="spPenAge"  value={p.spPenAge}  onChange={v => up({ spPenAge: v })}  min={60} suffix="歳" />
            <Field label="配偶者年金"     id="spPenAmt"  value={p.spPenAmt}  onChange={v => up({ spPenAmt: v })}  min={0} suffix="万円/年" />
          </>
        )}
      </Section>
    </div>
  );
}
