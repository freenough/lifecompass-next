'use client';

// 予実比較ビュー（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 5節）。
// 計画（PlanSnapshot、固定モードのcurve／MCモードのpercentiles）と実績（AssetSnapshot、個人のみ・
// displayScopeは無視）を、ageToYearMonth()でカレンダー年月に揃えたうえで同一グラフに重ねる。
// 帯グラフ（p10〜p90）の描画テクニックはsrc/components/simulator/AssetChart.tsxの既存パターン
// （Area p90→Area p10を白塗りで重ねる）を踏襲する（ロック対象外・変更なし、技法のみ流用）。

import { useMemo, useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AssetSnapshot } from '@/lib/assetManagement/types';
import type { PlanSnapshot } from '@/lib/planSnapshot/types';
import { ageToYearMonth } from '@/lib/planSnapshot/alignment';
import { deletePlan, renamePlan } from '@/lib/planSnapshot/storage';
import PlanManagerPanel from './PlanManagerPanel';

interface PlanComparisonSectionProps {
  plans: PlanSnapshot[];
  /** 現在プロファイルの個人のみの実績。displayScope（個人のみ／合算）は無視して常にこれを使う。 */
  personalSnapshots: AssetSnapshot[];
  onPlansChanged: () => void;
  /** claude_instruction_phase2_yojitsu_polish.md 2節：計画の保存操作をこのドロワーへ統合する
   * （プロファイル管理ドロワーと同じパターン）ため、PlanManagerPanelをここで描画する。 */
  currentProfileId: string;
  linkedSimulatorProfileId: number | null;
}

interface ChartRow {
  yearMonth: string;
  planTotal?: number;
  planP10?: number;
  planP50?: number;
  planP90?: number;
  actualTotal?: number;
}

// claude_instruction_phase2_yojitsu_chart_style_planA.md：計画側の線に使う点線パターン
// （実績側の細い実線と明確に区別するため）。p10/p90帯の縁取り用の細かい点線（"1 3"）とは
// 別の、線グラフとして視認しやすい粗いパターンにする。
const PLAN_LINE_DASH = '6 4';

// RechartsのLegendはデフォルトでは各系列のstrokeDasharrayをアイコンに反映しない（色のみ）ため、
// 実績=実線・計画=点線であることが凡例からも分かるよう、線見本を自前でSVG描画するcontentを渡す。
interface LegendEntry {
  value: string;
  color: string;
  dashArray?: string;
}

function renderDashAwareLegend(items: LegendEntry[]) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-4 text-[11px] mt-1 list-none p-0">
      {items.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="20" y2="4" stroke={entry.color} strokeWidth={2} strokeDasharray={entry.dashArray} />
          </svg>
          <span className="text-slate-600">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PlanComparisonSection({
  plans,
  personalSnapshots,
  onPlansChanged,
  currentProfileId,
  linkedSimulatorProfileId,
}: PlanComparisonSectionProps) {
  const sortedPlans = useMemo(() => [...plans].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)), [plans]);
  const latestPlan = sortedPlans.length > 0 ? sortedPlans[sortedPlans.length - 1] : null;

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [mode, setMode] = useState<'fixed' | 'mc'>('fixed');
  const [managerOpen, setManagerOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const selectedPlan = sortedPlans.find((p) => p.id === selectedPlanId) ?? latestPlan;

  // claude_instruction_phase2_yojitsu_chart_style_planA.md：凡例は「計画」「実績」の2項目のみ
  // （p10/p90帯はlegendType="none"で既に除外済み、中央値ラインの凡例ラベルはモードに応じて変える）。
  const legendPayload: LegendEntry[] = [
    { value: mode === 'mc' ? '計画(中央値)' : '計画', color: '#2a78d6', dashArray: PLAN_LINE_DASH },
    { value: '実績', color: '#475569' },
  ];

  const data: ChartRow[] = useMemo(() => {
    const rows = new Map<string, ChartRow>();
    const get = (ym: string): ChartRow => rows.get(ym) ?? { yearMonth: ym };

    if (selectedPlan) {
      if (mode === 'fixed') {
        for (const pt of selectedPlan.fixed.curve) {
          const ym = ageToYearMonth(selectedPlan, pt.age);
          rows.set(ym, { ...get(ym), planTotal: pt.totalAssets });
        }
      } else if (selectedPlan.mc) {
        for (const pt of selectedPlan.mc.percentiles) {
          const ym = ageToYearMonth(selectedPlan, pt.age);
          rows.set(ym, { ...get(ym), planP10: pt.p10, planP50: pt.p50, planP90: pt.p90 });
        }
      }
    }
    for (const s of personalSnapshots) {
      rows.set(s.date, { ...get(s.date), actualTotal: s.totalAmount });
    }
    return Array.from(rows.values()).sort((a, b) => (a.yearMonth < b.yearMonth ? -1 : a.yearMonth > b.yearMonth ? 1 : 0));
  }, [selectedPlan, mode, personalSnapshots]);

  const handleDelete = (planId: string, name: string) => {
    const confirmed = window.confirm(`計画「${name}」を削除します。この操作は取り消せません。よろしいですか？`);
    if (!confirmed) return;
    deletePlan(planId);
    if (selectedPlanId === planId) setSelectedPlanId(null);
    onPlansChanged();
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameInput(currentName);
  };

  const commitRename = (id: string) => {
    const name = renameInput.trim();
    if (name) renamePlan(id, name);
    setRenamingId(null);
    onPlansChanged();
  };

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">予実比較</h2>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
        >
          計画を管理
        </button>
      </div>

      {sortedPlans.length === 0 ? (
        <p className="text-xs text-slate-400">まだ計画が保存されていません。「計画を管理」から作成してください。</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select
              value={selectedPlan?.id ?? ''}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              {sortedPlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setMode('fixed')}
                className={`px-3 py-1 ${mode === 'fixed' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                固定
              </button>
              <button
                type="button"
                onClick={() => setMode('mc')}
                disabled={!selectedPlan?.mc}
                className={`px-3 py-1 ${mode === 'mc' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                MC
              </button>
            </div>
            {mode === 'mc' && !selectedPlan?.mc && (
              <span className="text-[11px] text-slate-400">この計画にはMC結果がありません</span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()}万円`, name]} labelFormatter={(ym) => `${ym}`} />
              <Legend content={() => renderDashAwareLegend(legendPayload)} />
              {/* Recharts（ComposedChart）はFragment（<>...</>）で束ねた子要素を内部の
                  グラフィック要素検出でうまく拾えないことがあるため（AssetChart.tsxの
                  corporateMcCombinedの分岐と同じ理由）、三項演算子でFragmentを返さず、
                  条件ごとに独立した`&&`の直接の子要素として並べる。 */}
              {mode === 'mc' && (
                <Area dataKey="planP90" legendType="none" fill="#93c5fd" fillOpacity={0.25} stroke="#93c5fd" strokeWidth={1} strokeDasharray="1 3" name="計画(p90)" />
              )}
              {mode === 'mc' && (
                <Area dataKey="planP10" legendType="none" fill="#ffffff" fillOpacity={1} stroke="#93c5fd" strokeWidth={1} strokeDasharray="1 3" name="計画(p10)" />
              )}
              {mode === 'mc' && (
                <Line dataKey="planP50" stroke="#2a78d6" strokeWidth={2} strokeDasharray={PLAN_LINE_DASH} dot={false} name="計画(中央値)" legendType="none" />
              )}
              {mode === 'fixed' && (
                <Line dataKey="planTotal" stroke="#2a78d6" strokeWidth={2} strokeDasharray={PLAN_LINE_DASH} dot={false} name="計画" legendType="none" />
              )}
              {/* claude_instruction_phase2_yojitsu_chart_style_planA.md（案A）：実績は実線のまま
                  維持する。計画（点線）とは線種で明確に区別する。実績データは月次の記録があった
                  月だけ値を持つ疎な系列のため、connectNullsを付けないと点同士が線で結ばれない。
                  凡例は自前描画（legendPayload/renderDashAwareLegend）に一本化するため、
                  Rechartsの自動凡例生成には乗せない（legendType="none"）。 */}
              <Line
                dataKey="actualTotal"
                stroke="#475569"
                strokeWidth={1.5}
                dot={{ r: 2, fill: '#475569', stroke: '#475569' }}
                connectNulls
                name="実績"
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}

      {managerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setManagerOpen(false)} />
          <div className="relative ml-auto w-80 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">計画を管理</h2>
              <button onClick={() => setManagerOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <PlanManagerPanel
                  currentProfileId={currentProfileId}
                  linkedSimulatorProfileId={linkedSimulatorProfileId}
                  onSaved={onPlansChanged}
                />
              </div>

              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">保存済み計画</h3>
              {sortedPlans.length === 0 && <p className="text-xs text-slate-400">計画はまだありません。</p>}
              {sortedPlans.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-slate-100 py-2 gap-2">
                  <div className="min-w-0">
                    {renamingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={renameInput}
                          onChange={(e) => setRenameInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && commitRename(p.id)}
                          className="text-xs border border-slate-300 rounded px-1 py-0.5 w-28"
                          autoFocus
                        />
                        <button onClick={() => commitRename(p.id)} className="text-xs text-blue-600">保存</button>
                        <button onClick={() => setRenamingId(null)} className="text-xs text-slate-400">取消</button>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                    )}
                    <p className="text-[10px] text-slate-400">{p.savedAtYearMonth}時点・{p.strategy}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {renamingId !== p.id && (
                      <button onClick={() => startRename(p.id, p.name)} className="text-[10px] text-slate-400 hover:text-slate-600">名前変更</button>
                    )}
                    <button
                      onClick={() => { setSelectedPlanId(p.id); setManagerOpen(false); }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      選択
                    </button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
