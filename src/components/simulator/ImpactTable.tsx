'use client';

import { useMemo } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { profileToSimParams } from '@/lib/profile';
import { simulate, analyze, runMC } from '@/lib';
import type { SimParams, LifeEvent, WithdrawalStrategy } from '@/lib/types';
import { buildRetirementExtension } from '@/lib/improvement-search';
import { useDisplayMcResult } from '@/lib/hojinCompanyState/useDisplayMcResult';
import { runMonteCarloWithCorporateAwareness } from '@/components/hojinCompanyState/CorporateSettingsSection';
import { useCompanyStateStore } from '@/lib/hojinCompanyState/companyStateStore';
import { runCombinedMcForStrategy } from '@/lib/hojinCompanyState/mc';
import { simulateCorporateAssets } from '@/lib/hojinCompanyState/corporateGrowth';
import type { CompanyStateSettings, CorporatePortfolio, CorporateLifeEvent } from '@/lib/hojinCompanyState/types';
import CorporateCombinedBadge from '@/components/hojinCompanyState/CorporateCombinedBadge';

function fmt(v: number): string {
  const sign = v >= 0 ? '+' : '';
  if (Math.abs(v) >= 10000) return `${sign}${(v / 10000).toFixed(1)}億円`;
  return `${sign}${Math.round(v).toLocaleString()}万円`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

// 「最終資産差」「破綻率変化」共通のcombinedバッジ表示ロジック。個人単独側と合算側の
// 表示テキストが一致する（＝ユーザーの目には差が見えない）場合は色付きバッジをやめ、
// 控えめなグレーの「法人合算：変化なし」に差し替える。乖離する場合のみ、実際の差分を
// 色付きバッジで表示する（2026-08-23追加）。
function CorporateCombinedDeltaNote({ primaryText, combinedText }: { primaryText: string; combinedText: string }) {
  if (primaryText === combinedText) {
    return <p className="mt-1 text-[11px] text-slate-400">法人合算：変化なし</p>;
  }
  return (
    <CorporateCombinedBadge className="mt-1 inline-block">
      法人合算: {combinedText}
    </CorporateCombinedBadge>
  );
}

interface ImpactRow {
  label: string;
  assetDelta: number;
  // UI仕上げ指示書0章の定義に基づき、brDeltaは常にpersonalOnly側（法人トグルON時は
  // extraEvents込み・個人口座のみの判定）。他列（最終資産差）と同じ土俵の数値にする
  // （2026-08-22修正：以前はcombined側を主表示にしていたが、定義を明確化した上で修正）。
  brDelta?: number | null;
  // combined側（法人合算＝個人口座+法人残存資産の合計で判定）は補足バッジとして添える。
  brDeltaCombined?: number | null;
  // 「最終資産差」列（固定計算）の法人合算バッジ用。列の定義（最終資産の差分）に合わせ、
  // 「破綻率変化」列のbrDeltaCombinedと同じくデルタとして算出する
  // （2026-08-21最終チェックリスト5番で修正：以前は絶対額を表示しており指示と不一致だった）。
  // 注：4施策とも法人側の設定（退職年齢・PF等）を一切変更しないため、法人側の最終残高は
  // base/alt間で完全に同じ値になり、結果としてこのデルタは数値上assetDeltaと常に一致する
  // （法人側の残高が差分計算の中で相殺されるため）。それでも列の定義に合わせデルタとして
  // 算出・表示する。
  assetDeltaCombined?: number | null;
}

interface CorporateContext {
  settings: CompanyStateSettings;
  portfolio: CorporatePortfolio;
  events: CorporateLifeEvent[];
}

interface BankruptcyRates {
  personalOnly: number;
  combined: number | null;
}

// withMC時の破綻率算出：法人トグルONならrunCombinedMcForStrategy（personalOnly・combined両方）、
// OFFなら従来通りrunMC（個人単独のみ）を使う。1戦略のみの軽量版を使うことで、施策の数だけ
// 3戦略ぶんの無駄な計算をしないようにする（mc.ts側で共有ロジック化済み）。
function calcBankruptcyRates(
  p: SimParams, evs: LifeEvent[], strategy: WithdrawalStrategy, corporate: CorporateContext | null,
): BankruptcyRates {
  if (corporate) {
    const result = runCombinedMcForStrategy(p, evs, strategy, corporate.settings, corporate.portfolio, corporate.events, 300);
    return { personalOnly: result.personalOnly.bankruptcyRate, combined: result.combined.bankruptcyRate };
  }
  return { personalOnly: runMC(p, evs, [strategy], 300).strategies[strategy]?.bankruptcyRate ?? 0, combined: null };
}

function buildImpactRows(
  baseP: SimParams, evs: LifeEvent[],
  baseSnaps: ReturnType<typeof simulate>,
  baseLast: number,
  strategy: WithdrawalStrategy,
  withMC: boolean,
  corporate: CorporateContext | null,
): ImpactRow[] {
  const rows: ImpactRow[] = [];

  // ベースライン（施策なし）の破綻率は全施策で共通のため1回だけ計算する
  // （従来はrun()の呼び出しごとに毎回再計算しており、施策数ぶん無駄だった）。
  const base = withMC ? calcBankruptcyRates(baseP, evs, strategy, corporate) : null;

  // 法人資産の年次成長は個人側のシナリオ変更（支出削減・退職延長等）に一切依存しないため
  // （corporateSettings.retirementAgeは個人側retAgeと独立、4施策ともcorporateには触れない）、
  // 固定計算モードでの法人最終残高は施策によらず一定＝1回だけ計算すればよい。
  const corpFinalTotal = corporate
    ? simulateCorporateAssets(corporate.settings, baseP.curAge, baseP.lifeEx, corporate.portfolio, corporate.events, null).at(-1)?.total ?? 0
    : null;
  const baseCombinedTotal = corpFinalTotal != null ? baseLast + corpFinalTotal : null;

  const run = (pAlt: SimParams, extraEvents: LifeEvent[] = []) => {
    const evsAlt = extraEvents.length > 0 ? [...evs, ...extraEvents] : evs;
    const snaps = simulate(pAlt, evsAlt, strategy);
    const a = analyze(snaps, pAlt);
    let brDelta: number | null = null;
    let brDeltaCombined: number | null = null;
    if (withMC && base != null) {
      const alt = calcBankruptcyRates(pAlt, evsAlt, strategy, corporate);
      brDelta = alt.personalOnly - base.personalOnly;
      if (alt.combined != null && base.combined != null) brDeltaCombined = alt.combined - base.combined;
    }
    const assetDeltaCombined = (corpFinalTotal != null && baseCombinedTotal != null)
      ? (a.last + corpFinalTotal) - baseCombinedTotal
      : null;
    return { last: a.last, brDelta, brDeltaCombined, assetDeltaCombined };
  };

  // 1. 支出を10%削減
  if (baseP.baseExp > 0) {
    const pAlt = { ...baseP, baseExp: baseP.baseExp * 0.9 };
    const { last, brDelta, brDeltaCombined, assetDeltaCombined } = run(pAlt);
    rows.push({ label: '支出を10%削減', assetDelta: last - baseLast, brDelta, brDeltaCombined, assetDeltaCombined });
  }

  // 2. 退職を2年延長
  if (baseP.curAge < baseP.retAge) {
    const { params: pAlt, extraEvents } = buildRetirementExtension(baseP, 2);
    const { last, brDelta, brDeltaCombined, assetDeltaCombined } = run(pAlt, extraEvents);
    rows.push({ label: `退職を2年延長（${baseP.retAge + 2}歳）`, assetDelta: last - baseLast, brDelta, brDeltaCombined, assetDeltaCombined });
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
      const { last, brDelta, brDeltaCombined, assetDeltaCombined } = run(pAlt);
      rows.push({ label: `余剰CF全額投資（+${surplus}万円/年）`, assetDelta: last - baseLast, brDelta, brDeltaCombined, assetDeltaCombined });
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
    const { last, brDelta, brDeltaCombined, assetDeltaCombined } = run(pAlt);
    rows.push({ label: `現金${transferAmt}万円を特定口座へ転換`, assetDelta: last - baseLast, brDelta, brDeltaCombined, assetDeltaCombined });
  }

  return rows;
}

export default function ImpactTable() {
  const { profile, snaps, analysis, mode, displayStrategy, setMode, isMcRunning } = useSimulatorStore();
  const rawMcResult = useSimulatorStore(s => s.mcResult);
  // 2026-08-22修正：法人トグルON時はrunMonteCarlo()ではなくrunMonteCarloWithCorporateAwareness()が
  // 実行されるため、simulatorStore.mcResultを直接見るとこの欄の「破綻確率変化」列が
  // 永久に表示されない不具合があった。useDisplayMcResultで法人合算後の値に切り替える。
  const mcResult = useDisplayMcResult(rawMcResult);
  const strategy = (displayStrategy ?? 'proportional') as WithdrawalStrategy;
  const baseP = profileToSimParams(profile);
  const baseSnaps = snaps[strategy] ?? [];
  const baseA = analysis[strategy];
  const withMC = mode === 'mc' && mcResult != null;

  // 2026-08-22追加：法人トグルON時は各施策の破綻率変化(brDelta)も法人合算対応で計算する
  // （runCombinedMcForStrategy、1戦略のみの軽量版）。主表示はpersonalOnly、combinedは補足バッジ。
  const includeInPersonalSimulator = useCompanyStateStore(s => s.state.settings.includeInPersonalSimulator);
  const companyState = useCompanyStateStore(s => s.state);

  const rows = useMemo(
    () => {
      // corporateはuseMemoの外で組み立てると毎レンダー新規オブジェクトになりメモ化が効かなくなるため、
      // ここで組み立てる。依存配列はcompanyState（ストアの参照、実際に更新された時だけ変わる）と
      // includeInPersonalSimulatorのみにする。
      const corporate: CorporateContext | null = includeInPersonalSimulator
        ? { settings: companyState.settings, portfolio: companyState.portfolio, events: companyState.events }
        : null;
      return baseA ? buildImpactRows(baseP, profile.events, baseSnaps, baseA.last, strategy, withMC, corporate) : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, strategy, withMC, includeInPersonalSimulator, companyState]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">改善案インパクト比較</h3>
        {mode !== 'mc' && (
          <button
            onClick={() => { setMode('mc'); setTimeout(() => runMonteCarloWithCorporateAwareness(), 50); }}
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
                <td className="py-2 text-right">
                  <div className={`font-medium ${row.assetDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {fmt(row.assetDelta)}
                  </div>
                  {row.assetDeltaCombined != null && (
                    <CorporateCombinedDeltaNote primaryText={fmt(row.assetDelta)} combinedText={fmt(row.assetDeltaCombined)} />
                  )}
                </td>
                {withMC && (
                  <td className="py-2 text-right">
                    <div className={`font-medium ${(row.brDelta ?? 0) <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {row.brDelta != null ? `${row.brDelta >= 0 ? '+' : ''}${row.brDelta.toFixed(1)}%` : '—'}
                    </div>
                    {row.brDeltaCombined != null && (
                      <CorporateCombinedDeltaNote
                        primaryText={fmtPct(row.brDelta ?? 0)}
                        combinedText={fmtPct(row.brDeltaCombined)}
                      />
                    )}
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
