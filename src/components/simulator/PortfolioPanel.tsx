'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { ASSET_CLASSES, calcMu, calcAggregatedSigma } from '@/lib/profile';
import type { AssetRow } from '@/lib/profile';

type Phase = 'current' | 'working' | 'retirement';
type Acct  = 'nisa' | 'ideco' | 'tax';
type SpAcct = 'spNisa' | 'spIdeco' | 'spTax';

const ACCT_LABELS: Record<Acct, string> = { nisa: 'NISA', ideco: 'iDeCo', tax: '特定口座' };

const SP_ACCT: Record<Acct, SpAcct> = {
  nisa:  'spNisa',
  ideco: 'spIdeco',
  tax:   'spTax',
};

interface AssetCardProps {
  phase: Phase;
  acct: Acct;
  rows: AssetRow[];
  spRows?: AssetRow[];
  autoFieldId?: string;
  autoVal?: number;
  isManual?: boolean;
}

function AssetCard({ phase, acct, rows, spRows, autoFieldId, autoVal, isManual }: AssetCardProps) {
  const { updatePortfolio, updateSpousePortfolio, profile, updateProfile } = useSimulatorStore();
  const [spOpen, setSpOpen] = useState(false);
  const isCurrent = phase === 'current';

  // ── main rows ────────────────────────────────────────────────
  const update = (newRows: AssetRow[]) => updatePortfolio(phase, acct, newRows);

  const setClass  = (i: number, val: string) =>
    update(rows.map((r, idx) => idx === i ? { ...r, assetClass: val } : r));
  const setAmount = (i: number, val: number) =>
    update(rows.map((r, idx) => idx === i ? { ...r, amount: val } : r));
  const setPct    = (i: number, val: number) =>
    update(rows.map((r, idx) => idx === i ? { ...r, pct: val } : r));
  const addRow = () => update([...rows, isCurrent
    ? { assetClass: '全世界株', pct: 0, amount: 0 }
    : { assetClass: '全世界株', pct: 0 }
  ]);
  const delRow = (i: number) => update(rows.filter((_, idx) => idx !== i));

  // ── spouse rows ──────────────────────────────────────────────
  const sp = spRows ?? [];
  const updateSp = (newRows: AssetRow[]) => updateSpousePortfolio(SP_ACCT[acct], newRows);

  const setSpClass  = (i: number, val: string) =>
    updateSp(sp.map((r, idx) => idx === i ? { ...r, assetClass: val } : r));
  const setSpAmount = (i: number, val: number) =>
    updateSp(sp.map((r, idx) => idx === i ? { ...r, amount: val } : r));
  const addSpRow = () => updateSp([...sp, { assetClass: '全世界株', pct: 0, amount: 0 }]);
  const delSpRow = (i: number) => updateSp(sp.filter((_, idx) => idx !== i));

  // ── derived values ───────────────────────────────────────────
  const mu = calcMu(rows);
  const mainTotal = isCurrent ? rows.reduce((s, r) => s + (r.amount ?? 0), 0) : 0;
  const spTotal   = isCurrent ? sp.reduce((s, r) => s + (r.amount ?? 0), 0) : 0;
  const totalAmount = mainTotal + spTotal;

  const handleManualEdit = (fieldId: string, val: number) => {
    const flags = { ...profile.params.pfManualFlags, [fieldId]: true };
    updateProfile({ pfManualFlags: flags, [fieldId]: val } as Record<string, unknown> as Partial<typeof profile.params>);
  };

  const handleRevert = (fieldId: string, autoValue: number) => {
    const flags = { ...profile.params.pfManualFlags, [fieldId]: false };
    updateProfile({ pfManualFlags: flags, [fieldId]: autoValue } as Record<string, unknown> as Partial<typeof profile.params>);
  };

  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      {/* header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{ACCT_LABELS[acct]}</span>
        {isCurrent
          ? <span className="text-xs text-slate-400">合計: {totalAmount.toLocaleString()}万円</span>
          : <span className="text-xs text-slate-400">μ: {mu.toFixed(1)}%</span>
        }
      </div>

      {/* main rows */}
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 items-center">
          <select
            value={row.assetClass}
            onChange={e => setClass(i, e.target.value)}
            className="flex-1 text-xs border border-slate-300 rounded px-1 py-1"
          >
            {ASSET_CLASSES.map(a => (
              <option key={a.key} value={a.key}>{a.key}</option>
            ))}
          </select>
          {isCurrent ? (
            <>
              <input
                type="number"
                value={row.amount ?? 0}
                onFocus={e => e.target.select()} onChange={e => { const n = e.target.valueAsNumber; setAmount(i, isNaN(n) ? 0 : n); }}
                min={0}
                className="w-16 text-xs border border-slate-300 rounded px-1 py-1 text-right"
              />
              <span className="text-xs text-slate-400">万円</span>
            </>
          ) : (
            <>
              <input
                type="number"
                value={row.pct}
                onFocus={e => e.target.select()} onChange={e => { const n = e.target.valueAsNumber; setPct(i, isNaN(n) ? 0 : n); }}
                min={0}
                max={100}
                className="w-14 text-xs border border-slate-300 rounded px-1 py-1 text-right"
              />
              <span className="text-xs text-slate-400">%</span>
            </>
          )}
          {rows.length > 1 && (
            <button onClick={() => delRow(i)} className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
          )}
        </div>
      ))}

      <button
        onClick={addRow}
        className="text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded py-1"
      >
        + 追加
      </button>

      {/* spouse collapsible — current phase only */}
      {isCurrent && (
        <div className="-mx-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => setSpOpen(o => !o)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-700"
          >
            <span>配偶者の{ACCT_LABELS[acct]}</span>
            <span>{spOpen ? '▲' : '▼'}</span>
          </button>
          {spOpen && (
            <div className="flex flex-col gap-2 px-3 pb-3">
              {sp.map((row, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <select
                    value={row.assetClass}
                    onChange={e => setSpClass(i, e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded px-1 py-1"
                  >
                    {ASSET_CLASSES.map(a => (
                      <option key={a.key} value={a.key}>{a.key}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.amount ?? 0}
                    onChange={e => { const n = e.target.valueAsNumber; setSpAmount(i, isNaN(n) ? 0 : n); }}
                    onFocus={e => e.target.select()}
                    min={0}
                    className="w-16 text-xs border border-slate-300 rounded px-1 py-1 text-right"
                  />
                  <span className="text-xs text-slate-400">万円</span>
                  <button onClick={() => delSpRow(i)} className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
                </div>
              ))}
              <button
                onClick={addSpRow}
                className="text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded py-1"
              >
                + 追加
              </button>
            </div>
          )}
        </div>
      )}

      {/* auto rate block — working / retirement phases only */}
      {autoFieldId && autoVal !== undefined && (
        <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-100">
          <span className={`text-[10px] rounded px-1.5 py-0.5 ${isManual ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
            {isManual ? '手動' : '自動'}
          </span>
          <span className="text-xs text-slate-500 flex-1">rW: </span>
          <input
            type="number"
            value={profile.params[autoFieldId as keyof typeof profile.params] as number}
            onFocus={e => e.target.select()} onChange={e => { const n = e.target.valueAsNumber; handleManualEdit(autoFieldId, isNaN(n) ? 0 : n); }}
            step={0.1}
            className="w-16 text-xs border border-slate-300 rounded px-1 py-0.5 text-right"
          />
          <span className="text-xs text-slate-400">%</span>
          {isManual && (
            <button onClick={() => handleRevert(autoFieldId, autoVal)} className="text-[10px] text-blue-600 hover:underline ml-1">
              自動に戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  label: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
  subAction?: React.ReactNode;
}

function Section({ label, badge, badgeColor, children, subAction }: SectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1 px-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-1 items-center gap-2 py-2 text-left hover:bg-slate-50 rounded"
        >
          <span className={`text-[10px] font-semibold rounded px-2 py-0.5 ${badgeColor}`}>{badge}</span>
          <span className="text-xs font-medium text-slate-700 flex-1">{label}</span>
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="py-2 px-1 text-slate-400 text-xs hover:bg-slate-50 rounded shrink-0"
        >
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && subAction && (
        <div className="px-1 pb-1">{subAction}</div>
      )}
      {open && <div className="flex flex-col gap-3 pb-3 px-1">{children}</div>}
    </div>
  );
}

export default function PortfolioPanel() {
  const { profile, setSameAsWorking, copyCurrentToWorking } = useSimulatorStore();
  const p = profile.params;
  const pf = profile.portfolio;
  const flags = p.pfManualFlags;

  // 口座残高: currentのamount合計を優先、未入力ならprofile.paramsの残高を使う
  const bNisaCur  = pf.current.nisa.reduce((s, r) => s + (r.amount ?? 0), 0);
  const bIdecoCur = pf.current.ideco.reduce((s, r) => s + (r.amount ?? 0), 0);
  const bTaxCur   = pf.current.tax.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalCurBal = bNisaCur + bIdecoCur + bTaxCur;
  const bNisa  = totalCurBal > 0 ? bNisaCur  : p.bNisa;
  const bIdeco = totalCurBal > 0 ? bIdecoCur : p.bIdeco;
  const bTax   = totalCurBal > 0 ? bTaxCur   : p.bTax;

  // σ表示: 残高加重集計
  const sigmaW = calcAggregatedSigma(
    [pf.working.nisa, pf.working.ideco, pf.working.tax],
    [bNisa, bIdeco, bTax],
  ) ?? 0;

  const retNisaRows  = pf.retirement.sameAsWorking ? pf.working.nisa  : pf.retirement.nisa;
  const retIdecoRows = pf.retirement.sameAsWorking ? pf.working.ideco : pf.retirement.ideco;
  const retTaxRows   = pf.retirement.sameAsWorking ? pf.working.tax   : pf.retirement.tax;
  const sigmaR = calcAggregatedSigma(
    [retNisaRows, retIdecoRows, retTaxRows],
    [bNisa, bIdeco, bTax],
  ) ?? 0;

  // μ表示: 残高加重平均
  const totalBal = bNisa + bIdeco + bTax;
  const wN = totalBal > 0 ? bNisa / totalBal : 1 / 3;
  const wI = totalBal > 0 ? bIdeco / totalBal : 1 / 3;
  const wT = totalBal > 0 ? bTax / totalBal : 1 / 3;
  const muW = calcMu(pf.working.nisa) * wN
            + calcMu(pf.working.ideco) * wI
            + calcMu(pf.working.tax) * wT;
  const muR = calcMu(retNisaRows) * wN
            + calcMu(retIdecoRows) * wI
            + calcMu(retTaxRows) * wT;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-1">
      <h2 className="text-sm font-bold text-slate-800 mb-2">ポートフォリオ</h2>

      <Section label="現在のPF" badge="① 現在" badgeColor="bg-slate-100 text-slate-600">
        <AssetCard phase="current" acct="nisa"  rows={pf.current.nisa}  spRows={pf.current.spNisa  ?? []} />
        <AssetCard phase="current" acct="ideco" rows={pf.current.ideco} spRows={pf.current.spIdeco ?? []} />
        <AssetCard phase="current" acct="tax"   rows={pf.current.tax}   spRows={pf.current.spTax   ?? []} />
      </Section>

      <Section
        label="シミュレーションPF"
        badge="② 積立期"
        badgeColor="bg-blue-100 text-blue-700"
        subAction={
          <button
            onClick={copyCurrentToWorking}
            className="text-[10px] border border-slate-300 rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-50 whitespace-nowrap"
          >
            ①の比率をコピー
          </button>
        }
      >
        <AssetCard
          phase="working" acct="nisa" rows={pf.working.nisa}
          autoFieldId="rWNisa" autoVal={calcMu(pf.working.nisa)} isManual={!!flags['rWNisa']}
        />
        <AssetCard
          phase="working" acct="ideco" rows={pf.working.ideco}
          autoFieldId="rWIdeco" autoVal={calcMu(pf.working.ideco)} isManual={!!flags['rWIdeco']}
        />
        <AssetCard
          phase="working" acct="tax" rows={pf.working.tax}
          autoFieldId="rWTax" autoVal={calcMu(pf.working.tax)} isManual={!!flags['rWTax']}
        />
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex gap-4">
          <span className="text-slate-500">全口座集計</span>
          <span>μ: <strong>{muW.toFixed(1)}%</strong></span>
          <span>σ: <strong>{sigmaW.toFixed(1)}%</strong></span>
        </div>
      </Section>

      <Section label="シミュレーションPF" badge="③ 取崩期" badgeColor="bg-green-100 text-green-700">
        <div className="flex items-center gap-2 mb-1">
          <input
            id="sameAsWorking"
            type="checkbox"
            checked={pf.retirement.sameAsWorking}
            onChange={e => setSameAsWorking(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="sameAsWorking" className="text-xs text-slate-600">積立期と同じPFを使う</label>
        </div>
        {!pf.retirement.sameAsWorking && (
          <>
            <AssetCard
              phase="retirement" acct="nisa" rows={pf.retirement.nisa}
              autoFieldId="rRNisa" autoVal={calcMu(pf.retirement.nisa)} isManual={!!flags['rRNisa']}
            />
            <AssetCard
              phase="retirement" acct="ideco" rows={pf.retirement.ideco}
              autoFieldId="rRIdeco" autoVal={calcMu(pf.retirement.ideco)} isManual={!!flags['rRIdeco']}
            />
            <AssetCard
              phase="retirement" acct="tax" rows={pf.retirement.tax}
              autoFieldId="rRTax" autoVal={calcMu(pf.retirement.tax)} isManual={!!flags['rRTax']}
            />
          </>
        )}
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex gap-4">
          <span className="text-slate-500">全口座集計</span>
          <span>μ: <strong>{muR.toFixed(1)}%</strong></span>
          <span>σ: <strong>{sigmaR.toFixed(1)}%</strong></span>
        </div>
      </Section>
    </div>
  );
}
