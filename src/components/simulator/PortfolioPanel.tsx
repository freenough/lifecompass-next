'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { ASSET_CLASSES, calcMu, calcPortfolioMetrics } from '@/lib/profile';
import type { AssetRow } from '@/lib/profile';

type Phase = 'current' | 'working' | 'retirement';
type Acct  = 'nisa' | 'ideco' | 'tax';

const ACCT_LABELS: Record<Acct, string> = { nisa: 'NISA', ideco: 'iDeCo', tax: '特定口座' };

/**
 * 複数口座のrows + 口座残高から、残高加重で正しいグローバルσを計算する（表示用）。
 * simulatorStore.tsのcalcAggregatedSigmaと同等ロジック。
 */
function calcAggregatedSigma(acctRows: AssetRow[][], acctBals: number[]): number {
  const total = acctBals.reduce((s, b) => s + b, 0);
  const weights = total > 0
    ? acctBals.map(b => b / total)
    : acctBals.map(() => 1 / acctBals.length);

  const map: Record<string, number> = {};
  let hasAnyRow = false;
  for (let i = 0; i < acctRows.length; i++) {
    const rows = acctRows[i];
    const w = weights[i];
    if (w === 0) continue;
    for (const row of rows) {
      if (!row.assetClass || !(row.pct > 0)) continue;
      map[row.assetClass] = (map[row.assetClass] ?? 0) + (row.pct / 100) * w;
      hasAnyRow = true;
    }
  }
  if (!hasAnyRow) return 0;

  const aggWeights: AssetRow[] = Object.entries(map).map(([assetClass, frac]) => ({
    assetClass,
    pct: frac * 100,
  }));
  return calcPortfolioMetrics(aggWeights).sigma;
}

interface AssetCardProps {
  phase: Phase;
  acct: Acct;
  rows: AssetRow[];
  autoFieldId?: string;
  autoVal?: number;
  isManual?: boolean;
}

function AssetCard({ phase, acct, rows, autoFieldId, autoVal, isManual }: AssetCardProps) {
  const { updatePortfolio, profile, updateProfile } = useSimulatorStore();
  const isCurrent = phase === 'current';

  const update = (newRows: AssetRow[]) => updatePortfolio(phase, acct, newRows);

  const setClass = (i: number, val: string) =>
    update(rows.map((r, idx) => idx === i ? { ...r, assetClass: val } : r));

  const setPct = (i: number, val: number) =>
    update(rows.map((r, idx) => idx === i ? { ...r, pct: val } : r));

  const setAmount = (i: number, val: number) =>
    update(rows.map((r, idx) => idx === i ? { ...r, amount: val } : r));

  const addRow = () => update([...rows, isCurrent
    ? { assetClass: '全世界株', pct: 0, amount: 0 }
    : { assetClass: '全世界株', pct: 0 }
  ]);

  const delRow = (i: number) => update(rows.filter((_, idx) => idx !== i));

  const mu = calcMu(rows);

  // 現在PFの合計金額
  const totalAmount = isCurrent
    ? rows.reduce((s, r) => s + (r.amount ?? 0), 0)
    : 0;

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
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{ACCT_LABELS[acct]}</span>
        {isCurrent
          ? <span className="text-xs text-slate-400">合計: {totalAmount.toLocaleString()}万円</span>
          : <span className="text-xs text-slate-400">μ: {mu.toFixed(1)}%</span>
        }
      </div>

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
                onChange={e => setAmount(i, parseFloat(e.target.value) || 0)}
                min={0}
                className="w-20 text-xs border border-slate-300 rounded px-1 py-1 text-right"
              />
              <span className="text-xs text-slate-400">万円</span>
            </>
          ) : (
            <>
              <input
                type="number"
                value={row.pct}
                onChange={e => setPct(i, parseFloat(e.target.value) || 0)}
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

      {autoFieldId && autoVal !== undefined && (
        <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-100">
          <span className={`text-[10px] rounded px-1.5 py-0.5 ${isManual ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
            {isManual ? '手動' : '自動'}
          </span>
          <span className="text-xs text-slate-500 flex-1">rW: </span>
          <input
            type="number"
            value={profile.params[autoFieldId as keyof typeof profile.params] as number}
            onChange={e => handleManualEdit(autoFieldId, parseFloat(e.target.value) || 0)}
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
  action?: React.ReactNode;
}

function Section({ label, badge, badgeColor, children, action }: SectionProps) {
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
          <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
        </button>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
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

  // σ表示: 残高加重集計（修正済み）
  const sigmaW = calcAggregatedSigma(
    [pf.working.nisa, pf.working.ideco, pf.working.tax],
    [bNisa, bIdeco, bTax],
  );

  const retNisaRows  = pf.retirement.sameAsWorking ? pf.working.nisa  : pf.retirement.nisa;
  const retIdecoRows = pf.retirement.sameAsWorking ? pf.working.ideco : pf.retirement.ideco;
  const retTaxRows   = pf.retirement.sameAsWorking ? pf.working.tax   : pf.retirement.tax;
  const sigmaR = calcAggregatedSigma(
    [retNisaRows, retIdecoRows, retTaxRows],
    [bNisa, bIdeco, bTax],
  );

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

      <Section label="現在のPF（任意・分析用）" badge="① 現在" badgeColor="bg-slate-100 text-slate-600">
        <AssetCard phase="current" acct="nisa"  rows={pf.current.nisa}  />
        <AssetCard phase="current" acct="ideco" rows={pf.current.ideco} />
        <AssetCard phase="current" acct="tax"   rows={pf.current.tax}   />
      </Section>

      <Section
        label="シミュレーションPF（積立期）"
        badge="② 積立期"
        badgeColor="bg-blue-100 text-blue-700"
        action={
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

      <Section label="シミュレーションPF（取崩期）" badge="③ 取崩期" badgeColor="bg-green-100 text-green-700">
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
