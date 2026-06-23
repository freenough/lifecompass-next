'use client';

import { useMemo } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { profileToSimParams } from '@/lib/profile';
import { simulate, analyze, runMC } from '@/lib';
import type { SimParams, LifeEvent } from '@/lib/types';

function fmt(v: number): string {
  const sign = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 10000) return `${sign}${(v / 10000).toFixed(1)}億円`;
  return `${sign}${Math.round(v).toLocaleString()}万円`;
}

interface ImpactRow {
  label: string;
  assetDelta: number;
  brDelta?: number | null;
}

function buildImpactRows(
  baseP: SimParams, evs: LifeEvent[],
  baseSnaps: ReturnType<typeof simulate>,
  baseLast: number,
  strategy: 'proportional' | 'cash_first' | 'taxable_first',
  withMC: boolean
): ImpactRow[] {
  const rows: ImpactRow[] = [];

  const run = (pAlt: SimParams) => {
    const snaps = simulate(pAlt, evs, strategy);
    const a = analyze(snaps, pAlt);
    let brDelta: number | null = null;
    if (withMC) {
      const mc = runMC(pAlt, evs, [strategy], 300);
      const baseMC = runMC(baseP, evs, [strategy], 300);
      brDelta = (mc.strategies[strategy]?.bankruptcyRate ?? 0)
              - (baseMC.strategies[strategy]?.bankruptcyRate ?? 0);
    }
    return { last: a.last, brDelta };
  };

  // 1. 支出を10%削減
  if (baseP.baseExp > 0) {
    const pAlt = { ...baseP, baseExp: baseP.baseExp * 0.9 };
    const { last, brDelta } = run(pAlt);
    rows.push({ label: '支出を10%削減', assetDelta: last - baseLast, brDelta });
  }

  // 2. 退職を2年延長
  if (baseP.curAge < baseP.retAge) {
    const pAlt = { ...baseP, retAge: baseP.retAge + 2 };
    const { last, brDelta } = run(pAlt);
    rows.push({ label: `退職を2年延長（${baseP.retAge + 2}歳）`, assetDelta: last - baseLast, brDelta });
  }

  // 3. 余剰CF全額投資
  const firstSnap = baseSnaps[0];
  if (firstSnap) {
    const existingCon = (baseP.acct.nisa.con ?? 0) + (baseP.acct.ideco.con ?? 0) + (baseP.acct.tax.con ?? 0);
    const surplus = Math.max(0, Math.round(firstSnap.cashFlow - existingCon));
    if (surplus > 0 && baseP.curAge < baseP.retAge) {
      const pAlt: SimParams = {
        ...baseP,
        acct: {
          ...baseP.acct,
          tax: { ...baseP.acct.tax, con: baseP.acct.tax.con + surplus },
        },
      };
      const { last, brDelta } = run(pAlt);
      rows.push({ label: `余剰CF全額投資（+${surplus}万円/年）`, assetDelta: last - baseLast, brDelta });
    }
  }

  // 4. 現金を特定口座へ転換
  const cashBal = baseP.acct.cash.bal;
  const defenseAmt = baseP.baseExp * 2;
  const surplusCash = cashBal - defenseAmt;
  const transferAmt = surplusCash > 100 ? Math.round(surplusCash * 0.5) : 0;
  if (transferAmt > 0) {
    const pAlt: SimParams = {
      ...baseP,
      acct: {
        ...baseP.acct,
        cash: { bal: baseP.acct.cash.bal - transferAmt },
        tax:  { ...baseP.acct.tax, bal: baseP.acct.tax.bal + transferAmt },
      },
    };
    const { last, brDelta } = run(pAlt);
    rows.push({ label: `現金${transferAmt}万円を特定口座へ転換`, assetDelta: last - baseLast, brDelta });
  }

  return rows;
}

export default function ImpactTable() {
  const { profile, snaps, analysis, mcResult, mode, activeStrategies, setMode, runMonteCarlo, isMcRunning } = useSimulatorStore();
  const strategy = (activeStrategies[0] ?? 'proportional') as 'proportional' | 'cash_first' | 'taxable_first';
  const baseP = profileToSimParams(profile);
  const baseSnaps = snaps[strategy] ?? [];
  const baseA = analysis[strategy];
  const withMC = mode === 'mc' && mcResult != null;

  const rows = useMemo(
    () => baseA ? buildImpactRows(baseP, profile.events, baseSnaps, baseA.last, strategy, withMC) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, strategy, withMC]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">改善案インパクト比較</h3>
        {mode !== 'mc' && (
          <button
            onClick={() => { setMode('mc'); setTimeout(() => runMonteCarlo(), 50); }}
            className="text-xs text-blue-600 hover:underline"
          >
            MCモードで実行
          </button>
        )}
      </div>

      {rows.length === 0 && !baseA ? (
        <p className="text-xs text-slate-400">シミュレーション結果がありません</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1.5 text-slate-500 font-medium">施策</th>
              <th className="text-right py-1.5 text-slate-500 font-medium">最終資産差</th>
              {withMC && <th className="text-right py-1.5 text-slate-500 font-medium">破綻率変化</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{row.label}</td>
                <td className={`py-2 text-right font-medium ${row.assetDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(row.assetDelta)}
                </td>
                {withMC && (
                  <td className={`py-2 text-right font-medium ${(row.brDelta ?? 0) <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {row.brDelta != null ? `${row.brDelta >= 0 ? '+' : ''}${row.brDelta.toFixed(1)}%` : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mode !== 'mc' && (
        <p className="mt-3 text-[10px] text-slate-400">
          MCシミュレーションを実行すると各施策の破綻率への効果も表示されます。
        </p>
      )}
    </div>
  );
}
