'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { SAMPLE_PROFILE, getEffectiveRW, getEffectiveRR, getEffectiveMcStd, getEffectiveMcStdR } from '@/lib/profile';
import type { ProfileV3 } from '@/lib/profile';
import type { LifeEvent } from '@/lib/types';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import PortfolioPanel from '@/components/simulator/PortfolioPanel';
import LifeEventTimeline from '@/components/simulator/LifeEventTimeline';

type RateFieldKey = 'rWNisa' | 'rWIdeco' | 'rWTax' | 'rRNisa' | 'rRIdeco' | 'rRTax' | 'mcStd' | 'mcStdR';

const CASHFLOW_EXPENSE_TYPES = new Set(['education', 'care', 'renovation', 'mortgage', 'other_exp']);

function calcAnnualEventExpense(events: LifeEvent[], curAge: number): number {
  return events
    .filter(ev =>
      ev.category === 'expense' &&
      CASHFLOW_EXPENSE_TYPES.has(ev.subtype) &&
      curAge >= ev.age &&
      curAge < ev.age + ev.years
    )
    .reduce((s, ev) => s + (ev.amount ?? 0), 0);
}

function calcAnnualSurplus(
  baseInc: number, spInc: number, spRetAge: number, spCurAge: number,
  baseExp: number, curAge: number, events: LifeEvent[]
): number {
  const spActive = spCurAge < spRetAge;
  const income = baseInc + (spActive ? spInc : 0);
  const evTotal = calcAnnualEventExpense(events, curAge);
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
  tooltip?: string;
}

function Field({ label, id, value, onChange, min, max, step = 1, suffix, disabled, tooltip }: FieldProps) {
  const isIntegerStep = Number.isInteger(step);
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-32 shrink-0 text-xs text-slate-600 flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      {/* 入力欄(shrink-0固定幅)・単位(shrink-0)ともに縮めない。数値の桁数に応じて幅が変動しないよう固定する。 */}
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          value={value}
          onChange={e => {
            // 先頭の余分な0除去（type="number"はselectionが不安定なためonChange側でも正規化する）
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const raw = e.target.valueAsNumber;
            if (isNaN(raw)) { onChange(0); return; }
            const next = isIntegerStep ? Math.round(raw) : raw;
            onChange(next);
            // ブラウザ側のDOM表示が丸め後の値と食い違う場合に備えて強制同期
            if (isIntegerStep && raw !== next) {
              e.target.value = String(next);
            }
          }}
          onBlur={e => {
            const raw = e.target.valueAsNumber;
            const safe = isNaN(raw) ? (value || 0) : (isIntegerStep ? Math.round(raw) : raw);
            if (safe !== value) onChange(safe);
            e.target.value = String(safe);
          }}
          onFocus={e => clearZeroOrSelect(e.currentTarget)}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-24 shrink-0 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-slate-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {suffix && <span className="shrink-0 text-xs text-slate-500 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

interface DisplayFieldProps {
  label: string;
  value: string;
  suffix?: string;
  tooltip?: string;
  valueClassName?: string;
  bold?: boolean;
}

/** 読み取り専用の「ラベル+値+単位」行。Fieldと同じ幅配分ロジックを共有し、単位が欠けないようにする。 */
function DisplayField({ label, value, suffix, tooltip, valueClassName, bold }: DisplayFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label className={`w-32 shrink-0 text-xs flex items-center gap-1 ${bold ? 'font-medium text-slate-600' : 'text-slate-600'}`}>
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      <div className="flex items-center gap-1">
        <span className={`w-24 shrink-0 truncate rounded border px-2 py-1 text-right text-sm bg-slate-50 border-slate-200 ${bold ? 'font-medium' : ''} ${valueClassName ?? 'text-slate-700'}`}>
          {value}
        </span>
        {suffix && <span className="shrink-0 text-xs text-slate-500 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

interface MiniToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  disabled?: boolean;
}

/** 省スペースなON/OFFスイッチ。ラベルは持たず title でツールチップのみ表示する。 */
function MiniToggle({ checked, onChange, title, disabled }: MiniToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

interface RateFieldProps {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  linked: boolean;
  onToggleLinked: (linked: boolean) => void;
  rowDisabled?: boolean;
  min?: number;
  max?: number;
  toggleTitle?: string;
}

/** 利回り設定・MC設定の1項目。PF計算値を使う場合は読み取り専用、OFFなら直接編集できる。1行に収める省スペースレイアウト。 */
function RateField({
  label, id, value, onChange, linked, onToggleLinked, rowDisabled,
  min = 0, max = 20, toggleTitle = 'ONでポートフォリオの計算値を使用します',
}: RateFieldProps) {
  const inputDisabled = rowDisabled || linked;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-32 shrink-0 text-xs text-slate-600 truncate">{label}</label>
      {/* %入力は最大でも「16.0」程度の桁数のため、Fieldの数値欄より狭い固定幅(60px前後)で足りる。
          disabledは opacity ではなく明示的な文字色(text-slate-500)にして、数値が視認できなくなるのを防ぐ。 */}
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          value={value}
          onFocus={e => clearZeroOrSelect(e.currentTarget)}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          onChange={e => {
            // 先頭の余分な0除去（type="number"はselectionが不安定なためonChange側でも正規化する）
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const raw = e.target.valueAsNumber;
            onChange(isNaN(raw) ? 0 : raw);
          }}
          onBlur={e => {
            const raw = e.target.valueAsNumber;
            const safe = isNaN(raw) ? (value || 0) : raw;
            if (safe !== value) onChange(safe);
            e.target.value = String(safe);
          }}
          min={min}
          max={max}
          step={0.1}
          disabled={inputDisabled}
          className="w-16 shrink-0 rounded border border-slate-300 px-1 py-1 text-right text-sm text-slate-900 focus:border-slate-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
        <span className="shrink-0 text-xs text-slate-500">%</span>
      </div>
      <MiniToggle
        checked={linked}
        onChange={onToggleLinked}
        disabled={rowDisabled}
        title={toggleTitle}
      />
    </div>
  );
}

/** KpiGridのKpiCardと同じ「?」アイコン+クリックで吹き出し表示するツールチップ。 */
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setShow(v => !v); }}
        className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-slate-300"
        aria-label="説明を表示"
      >
        ?
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setShow(false); }} />
          <div className="absolute left-0 top-6 z-20 w-52 rounded-lg bg-slate-800 text-white text-xs p-3 shadow-xl leading-relaxed normal-case font-normal tracking-normal">
            <div className="absolute -top-1.5 left-1 w-3 h-3 bg-slate-800 rotate-45" />
            {text}
          </div>
        </>
      )}
    </span>
  );
}

interface SectionProps {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, tooltip, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-1 items-center py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 text-left"
        >
          {title}
        </button>
        {tooltip && <InfoTooltip text={tooltip} />}
        <button
          onClick={() => setOpen(o => !o)}
          className="py-2 pl-1 text-xs text-slate-500 hover:text-slate-700 shrink-0"
        >
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && <div className="flex flex-col gap-2 pb-3">{children}</div>}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1 -mx-4 border-y border-slate-100 bg-slate-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
      >
        {title}
        <span>▼</span>
      </button>
      {open && <div className="flex flex-col gap-2 px-4 pb-3">{children}</div>}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{children}</p>;
}

function Divider() {
  return <div className="my-1 border-t border-slate-100" />;
}

export default function SimulatorForm() {
  const { profile, updateProfile, loadProfile, setRateSameAsWorking, setSigmaSameAsWorking } = useSimulatorStore();
  const p = profile.params;
  const up = (patch: Partial<typeof p>) => updateProfile(patch);
  // 利回り側「取崩期は積立期と同じ利回りを使う」。PF側・σ側のsameAsWorkingとは独立したフラグ。
  const rateSameAsWorking = p.rateSameAsWorking;
  // MC設定側「取崩期は積立期と同じ標準偏差を使う」。PF側・利回り側のsameAsWorkingとは独立したフラグ。
  const sigmaSameAsWorking = p.sigmaSameAsWorking;

  const setLinked = (fieldKey: RateFieldKey, linked: boolean) => {
    if (linked) {
      up({ pfManualFlags: { ...p.pfManualFlags, [fieldKey]: false } });
      return;
    }
    let seed: number;
    if (fieldKey === 'mcStd') {
      seed = getEffectiveMcStd(profile);
    } else if (fieldKey === 'mcStdR') {
      seed = getEffectiveMcStdR(profile);
    } else {
      const acct = fieldKey.slice(2) as 'Nisa' | 'Ideco' | 'Tax';
      seed = fieldKey.startsWith('rW') ? getEffectiveRW(profile, acct) : getEffectiveRR(profile, acct);
    }
    updateProfile({
      pfManualFlags: { ...p.pfManualFlags, [fieldKey]: true },
      [fieldKey]: seed,
    } as Partial<ProfileV3['params']>);
  };
  const annualEvExp = calcAnnualEventExpense(profile.events, p.curAge);
  const annualCF = calcAnnualSurplus(
    p.baseInc, p.spInc, p.spRetAge, p.spCurAge, p.baseExp, p.curAge, profile.events
  );
  const totalBal = p.bNisa + p.bIdeco + p.bTax + p.bCash +
    (p.spNisaBal ?? 0) + (p.spIdecoBal ?? 0) + (p.spTaxBal ?? 0) + (p.spCashBal ?? 0);

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

      {/* ① ライフプラン */}
      <Section title="ライフプラン">
        <Field label="現在年齢"     id="curAge"   value={p.curAge}   onChange={v => up({ curAge: v })}   min={20} max={80} suffix="歳" />
        <Field label="退職年齢"     id="retAge"   value={p.retAge}   onChange={v => up({ retAge: v })}   min={p.curAge + 1} max={80} suffix="歳" />
        <Field label="年金受給開始" id="penAge"   value={p.penAge}   onChange={v => up({ penAge: v })}   min={60} max={75} suffix="歳" />
        <Field label="余命(終端年齢)" id="lifeEx" value={p.lifeEx}  onChange={v => up({ lifeEx: v })}   min={60} max={120} suffix="歳" />
        <SubSection title="配偶者を入力する">
          <Field label="現在年齢"     id="spCurAge" value={p.spCurAge} onChange={v => up({ spCurAge: v })} min={20} suffix="歳" />
          <Field label="退職年齢"     id="spRetAge" value={p.spRetAge} onChange={v => up({ spRetAge: v })} min={20} suffix="歳" />
          <Field label="年金受給開始" id="spPenAge" value={p.spPenAge} onChange={v => up({ spPenAge: v })} min={60} suffix="歳" />
        </SubSection>
      </Section>

      {/* ② 家計 */}
      <Section title="家計">
        <SubHeading>収入</SubHeading>
        <Field
          label="年間手取り収入" id="baseInc" value={p.baseInc} onChange={v => up({ baseInc: v })}
          min={0} step={0.1} suffix="万円/年"
          tooltip="社会保険料・税金控除後の金額です。シミュレーション上、収入は現在価格のまま固定されます。"
        />
        <Field label="年金受給額" id="penAmtVal" value={p.penAmtVal} onChange={v => up({ penAmtVal: v, penAmt: v })} min={0} step={0.1} suffix="万円/年" />

        <Divider />
        <SubHeading>支出</SubHeading>
        <Field
          label="年間生活費" id="baseExp" value={p.baseExp} onChange={v => up({ baseExp: v })}
          min={0} step={0.1} suffix="万円/年"
          tooltip="食費・光熱費など恒久的な生活費です。シミュレーション上、毎年インフレ率に応じて増加します。住宅ローン・教育費はライフイベントで登録してください。"
        />
        <Field label="インフレ率" id="inflR" value={p.inflR} onChange={v => up({ inflR: v })} min={0} max={10} step={0.1} suffix="%" />
        <DisplayField
          label="年間支出合計"
          value={(p.baseExp + annualEvExp).toLocaleString()}
          suffix="万円/年"
          tooltip="年間生活費と、現在進行中の継続支出（住宅ローンなど）を合算した、今年時点での年間支出額です。シミュレーションでは、ここから毎年インフレ率に応じて増加します。"
        />

        <Divider />
        <DisplayField
          label="年間余剰CF"
          value={`${annualCF >= 0 ? '+' : ''}${annualCF.toLocaleString()}`}
          suffix="万円/年"
          tooltip="収入 − 生活費 − イベント支出"
          valueClassName={annualCF >= 0 ? 'text-green-700' : 'text-red-600'}
        />

        <Divider />
        <SubHeading>ライフイベント</SubHeading>
        <LifeEventTimeline />

        <SubSection title="配偶者を入力する">
          <Field label="年間収入" id="spInc"    value={p.spInc}    onChange={v => up({ spInc: v })}    min={0} step={0.1} suffix="万円/年" />
          <Field label="年金額"   id="spPenAmt" value={p.spPenAmt} onChange={v => up({ spPenAmt: v })} min={0} step={0.1} suffix="万円/年" />
        </SubSection>
      </Section>

      {/* ③ 資産 */}
      <Section title="資産">
        <SubHeading>保有資産</SubHeading>
        <Field label="NISA残高"       id="bNisa"   value={p.bNisa}   onChange={v => up({ bNisa: v })}   min={0} step={0.1} suffix="万円" />
        <Field label="NISA積立"       id="cNisa"   value={p.cNisa}   onChange={v => up({ cNisa: v })}   min={0} step={0.1} suffix="万円/年" />
        <Field label="NISA積立終了"   id="cNisaTo" value={p.cNisaTo} onChange={v => up({ cNisaTo: v })} min={p.curAge} max={100} suffix="歳" />
        <Field label="iDeCo残高"      id="bIdeco"  value={p.bIdeco}  onChange={v => up({ bIdeco: v })}  min={0} step={0.1} suffix="万円" />
        <Field label="iDeCo積立"      id="cIdeco"  value={p.cIdeco}  onChange={v => up({ cIdeco: v })}  min={0} step={0.1} suffix="万円/年" />
        <Field label="iDeCo積立終了"  id="cIdecoTo" value={p.cIdecoTo} onChange={v => up({ cIdecoTo: v })} min={p.curAge} max={60} suffix="歳" />
        <Field label="iDeCo加入年数"  id="idecoYrs"  value={p.idecoYrs}  onChange={v => up({ idecoYrs: v })}  min={1} max={40} suffix="年" />
        <Field label="特定口座残高"   id="bTax"    value={p.bTax}    onChange={v => up({ bTax: v })}    min={0} step={0.1} suffix="万円" />
        <Field label="特定口座積立"   id="cTax"    value={p.cTax}    onChange={v => up({ cTax: v })}    min={0} step={0.1} suffix="万円/年" />
        <Field label="特定口座積立終了" id="cTaxTo" value={p.cTaxTo} onChange={v => up({ cTaxTo: v })} min={p.curAge} max={100} suffix="歳" />
        <Field label="現金残高"       id="bCash"   value={p.bCash}   onChange={v => up({ bCash: v })}   min={0} step={0.1} suffix="万円" />

        <Divider />
        <SubHeading>受け取り設定</SubHeading>
        <Field label="勤続年数(退職金控除)" id="sevYrs" value={p.sevYrs} onChange={v => up({ sevYrs: v })} min={1} max={45} suffix="年" />
        <div className="flex items-center gap-2 mt-1">
          <label htmlFor="idecoReceiveType" className="w-32 shrink-0 text-xs text-slate-600">iDeCo受取方式</label>
          <select
            id="idecoReceiveType"
            value={p.idecoReceiveType}
            onChange={e => up({ idecoReceiveType: e.target.value as 'lump' | 'pension' | 'split' })}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="lump">一時金</option>
            <option value="pension">年金</option>
            <option value="split">併用</option>
          </select>
        </div>
        {p.idecoReceiveType === 'split' && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2">
              <label htmlFor="idecoSplitRatio" className="w-32 shrink-0 text-xs text-slate-600">一時金割合</label>
              <input
                type="number"
                id="idecoSplitRatio"
                min={10} max={90} step={10}
                value={p.idecoSplitRatio ?? 50}
                onFocus={e => clearZeroOrSelect(e.currentTarget)}
                onClick={e => clearZeroOrSelect(e.currentTarget)}
                onChange={e => {
                  const cleaned = stripLeadingZero(e.target.value);
                  if (cleaned !== e.target.value) e.target.value = cleaned;
                  up({ idecoSplitRatio: Math.min(90, Math.max(10, Number(cleaned))) });
                }}
                className="w-20 rounded border border-slate-300 px-2 py-1 text-sm text-right"
              />
              <span className="text-xs text-slate-500">%</span>
            </div>
            <p className="text-[11px] text-slate-400 pl-[9.5rem]">
              一時金 {p.idecoSplitRatio ?? 50}% ／ 年金 {100 - (p.idecoSplitRatio ?? 50)}%
            </p>
          </div>
        )}
        {(p.idecoReceiveType === 'pension' || p.idecoReceiveType === 'split') && (
          <Field label="年金受取年数" id="idecoReceiveYears" value={p.idecoReceiveYears} onChange={v => up({ idecoReceiveYears: v })} min={1} max={20} suffix="年" />
        )}
        <Field label="iDeCo受取開始" id="idecoStartAge" value={p.idecoStartAge} onChange={v => up({ idecoStartAge: v })} min={60} max={75} suffix="歳" />

        <SubSection title="配偶者を入力する">
          <Field label="NISA残高"          id="spNisaBal"   value={p.spNisaBal  ?? 0} onChange={v => up({ spNisaBal: v })}  min={0} step={0.1} suffix="万円" />
          <Field label="NISA積立"          id="spNisaCon"   value={p.spNisaCon  ?? 0} onChange={v => up({ spNisaCon: v })}  min={0} step={0.1} suffix="万円/年" />
          <Field label="NISA積立終了"      id="spNisaTo"    value={p.spNisaTo   ?? (p.spRetAge || 60)} onChange={v => up({ spNisaTo: v })}  min={20} max={100} suffix="歳" />
          <Field label="iDeCo残高"         id="spIdecoBal"  value={p.spIdecoBal ?? 0} onChange={v => up({ spIdecoBal: v })} min={0} step={0.1} suffix="万円" />
          <Field label="iDeCo積立"         id="spIdecoCon"  value={p.spIdecoCon ?? 0} onChange={v => up({ spIdecoCon: v })} min={0} step={0.1} suffix="万円/年" />
          <Field label="iDeCo積立終了"     id="spIdecoTo"   value={p.spIdecoTo  ?? (p.spRetAge || 60)} onChange={v => up({ spIdecoTo: v })}  min={20} max={60}  suffix="歳" />
          <Field label="iDeCo加入年数"     id="spIdecoYrs"  value={p.spIdecoYrs ?? 0} onChange={v => up({ spIdecoYrs: v })} min={1} max={40} suffix="年" />
          <Field label="特定口座残高"      id="spTaxBal"    value={p.spTaxBal   ?? 0} onChange={v => up({ spTaxBal: v })}  min={0} step={0.1} suffix="万円" />
          <Field label="特定口座積立"      id="spTaxCon"    value={p.spTaxCon   ?? 0} onChange={v => up({ spTaxCon: v })}  min={0} step={0.1} suffix="万円/年" />
          <Field label="特定口座積立終了"  id="spTaxTo"     value={p.spTaxTo    ?? (p.spRetAge || 60)} onChange={v => up({ spTaxTo: v })}   min={20} max={100} suffix="歳" />
          <Field label="現金残高"          id="spCashBal"   value={p.spCashBal  ?? 0} onChange={v => up({ spCashBal: v })} min={0} step={0.1} suffix="万円" />
          <Field label="勤続年数(退職金控除)" id="spSevYrs" value={p.spSevYrs ?? 0} onChange={v => up({ spSevYrs: v })} min={1} max={45} suffix="年" />
          <div className="flex items-center gap-2 mt-1">
            <label htmlFor="spIdecoReceiveType" className="w-32 shrink-0 text-xs text-slate-600">iDeCo受取方式</label>
            <select
              id="spIdecoReceiveType"
              value={p.spIdecoReceiveType ?? 'lump'}
              onChange={e => up({ spIdecoReceiveType: e.target.value as 'lump' | 'pension' })}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="lump">一括受取</option>
              <option value="pension">年金受取</option>
            </select>
          </div>
          <Field label="iDeCo受取開始" id="spIdecoStartAge" value={p.spIdecoStartAge ?? 60} onChange={v => up({ spIdecoStartAge: v })} min={60} max={75} suffix="歳" />
        </SubSection>

        <div className="pt-2 mt-1 border-t border-slate-200">
          <DisplayField label="総資産合計" value={totalBal.toLocaleString()} suffix="万円" bold />
        </div>
      </Section>

      {/* ④ 運用方針・リスク */}
      <Section title="運用方針・リスク">
        <PortfolioPanel />

        <Section
          title="利回り設定"
          defaultOpen={false}
          tooltip="積立期（rW）/ 取崩期（rR）・スイッチONでPF計算値を使用"
        >
          <RateField
            label="NISA rW" id="rWNisa"
            value={getEffectiveRW(profile, 'Nisa')} onChange={v => up({ rWNisa: v })}
            linked={!p.pfManualFlags['rWNisa']} onToggleLinked={linked => setLinked('rWNisa', linked)}
          />
          <RateField
            label="NISA rR" id="rRNisa"
            value={getEffectiveRR(profile, 'Nisa')} onChange={v => up({ rRNisa: v })}
            linked={rateSameAsWorking || !p.pfManualFlags['rRNisa']} onToggleLinked={linked => setLinked('rRNisa', linked)}
            rowDisabled={rateSameAsWorking}
          />
          <RateField
            label="iDeCo rW" id="rWIdeco"
            value={getEffectiveRW(profile, 'Ideco')} onChange={v => up({ rWIdeco: v })}
            linked={!p.pfManualFlags['rWIdeco']} onToggleLinked={linked => setLinked('rWIdeco', linked)}
          />
          <RateField
            label="iDeCo rR" id="rRIdeco"
            value={getEffectiveRR(profile, 'Ideco')} onChange={v => up({ rRIdeco: v })}
            linked={rateSameAsWorking || !p.pfManualFlags['rRIdeco']} onToggleLinked={linked => setLinked('rRIdeco', linked)}
            rowDisabled={rateSameAsWorking}
          />
          <RateField
            label="特定 rW" id="rWTax"
            value={getEffectiveRW(profile, 'Tax')} onChange={v => up({ rWTax: v })}
            linked={!p.pfManualFlags['rWTax']} onToggleLinked={linked => setLinked('rWTax', linked)}
          />
          <RateField
            label="特定 rR" id="rRTax"
            value={getEffectiveRR(profile, 'Tax')} onChange={v => up({ rRTax: v })}
            linked={rateSameAsWorking || !p.pfManualFlags['rRTax']} onToggleLinked={linked => setLinked('rRTax', linked)}
            rowDisabled={rateSameAsWorking}
          />
          <div className="flex items-center gap-2 mt-1">
            <input
              id="rateSameAsWorking"
              type="checkbox"
              checked={rateSameAsWorking}
              onChange={e => setRateSameAsWorking(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="rateSameAsWorking" className="text-xs text-slate-600">取崩期は積立期と同じ利回りを使う</label>
          </div>
        </Section>

        <Section
          title="MC設定"
          defaultOpen={false}
          tooltip="積立期（σ）/ 取崩期（σ）・スイッチONでPF計算値を使用"
        >
          <RateField
            label="積立期σ" id="mcStd"
            value={getEffectiveMcStd(profile)} onChange={v => up({ mcStd: v })}
            linked={!p.pfManualFlags['mcStd']} onToggleLinked={linked => setLinked('mcStd', linked)}
            min={0} max={50}
          />
          <RateField
            label="取崩期σ" id="mcStdR"
            value={getEffectiveMcStdR(profile)} onChange={v => up({ mcStdR: v })}
            linked={sigmaSameAsWorking || !p.pfManualFlags['mcStdR']} onToggleLinked={linked => setLinked('mcStdR', linked)}
            rowDisabled={sigmaSameAsWorking}
            min={0} max={50}
          />
          <div className="flex items-center gap-2 mt-1">
            <input
              id="sigmaSameAsWorking"
              type="checkbox"
              checked={sigmaSameAsWorking}
              onChange={e => setSigmaSameAsWorking(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="sigmaSameAsWorking" className="text-xs text-slate-600">取崩期は積立期と同じ標準偏差を使う</label>
          </div>
        </Section>
      </Section>

    </div>
  );
}
