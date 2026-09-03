// 計画生成ロジック（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 2節）。
// simulate()は直接importしてよい（src/lib/hojinCompanyState/mc.tsと同じ先例）。montecarlo.ts
// （runMC()）は直接importせず、パーセンタイル集計ロジックのみをこのファイル内に複製する（同じくmc.tsの
// 方針を踏襲）。PlanSnapshot型にAnalysisResult由来のフィールドが無いため、analyze()は呼ばない。
//
// 法人由来extraEventsの除外：ここではprofile.events（ProfileV3に永続化された個人イベントのみ）だけを
// simulate()に渡す。useSimulatorStoreは一切importしない（法人取崩トグルの現在値がONでも、Storeの一時状態
// extraEventsはProfileV3に保存されないため、profile.eventsを使う限り構造的に混入し得ない）。

import { simulate } from '../simulate';
import { randNorm } from '../helpers';
import { profileToSimParams, SAMPLE_PROFILE, type ProfileV3 } from '../profile';
import type { LifeEvent, WithdrawalStrategy } from '../types';
import { toYearMonth } from '../assetManagement/monthlyCheck';
import type { PlanCurvePoint, PlanPercentilePoint, PlanSnapshot, CorporateYearSnap } from './types';

const DEFAULT_TRIALS = 1000;

// claude_instruction_phase2_yojitsu_polish.md 0節：loadProfiles()（src/lib/storage.ts）は
// localStorageの生データをそのまま返し、simulatorStore.tsのloadInitialProfile()と異なり
// SAMPLE_PROFILEでの欠損補完を行わない。JSONインポート等でparams/portfolioの一部フィールドが
// 欠けたプロファイルをそのままprofileToSimParams()に渡すと例外になる（例：params.pfManualFlags
// が無いとgetEffectiveMcStd()が例外を投げる）ため、loadInitialProfile()と同じ補完パターンを
// ここでも適用し、呼び出し元（UIに限らず）を問わずgeneratePlan()自体を頑健にする。
export function normalizeSimulatorProfile(raw: ProfileV3): ProfileV3 {
  return {
    ...SAMPLE_PROFILE,
    ...raw,
    params: { ...SAMPLE_PROFILE.params, ...raw.params },
    portfolio: { ...SAMPLE_PROFILE.portfolio, ...raw.portfolio },
  };
}

function pct(arr: number[], q: number): number {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

// montecarlo.tsのrunMC()と数値的に同一の結果を返すことをscripts/verify-plan-snapshot.tsで
// 直接検証するため、trialReturns（年ごとのZスコア列）の生成方法・pct()の補間方法・
// Math.round()の丸め方をrunMC()と一行単位で同一に保つ。shockOverridesはrunMC()と同じ形状
// （number[][]、shockOverrides[試行番号][年インデックス]）で、テストからのみ使う
// （本番のgeneratePlan()呼び出し元は渡さない＝常に内部で乱数生成する）。
export function generateMcPercentiles(
  p: ReturnType<typeof profileToSimParams>,
  evs: LifeEvent[],
  strategy: WithdrawalStrategy,
  trials: number,
  shockOverrides?: number[][],
): PlanPercentilePoint[] | null {
  try {
    const years = p.lifeEx - p.curAge + 1;
    if (years <= 0) return null;
    const trialReturns: number[][] = shockOverrides ?? Array.from({ length: trials }, () =>
      Array.from({ length: years }, () => randNorm(0, 1))
    );
    const allTotals: number[][] = Array.from({ length: years }, () => []);
    for (let t = 0; t < trials; t++) {
      const snaps = simulate(p, evs, strategy, trialReturns[t]);
      snaps.forEach((s, i) => allTotals[i]?.push(s.totalAssets));
    }
    return allTotals.map((arr, i) => ({
      age: p.curAge + i,
      p10: Math.round(pct(arr, 0.1)),
      p50: Math.round(pct(arr, 0.5)),
      p90: Math.round(pct(arr, 0.9)),
    }));
  } catch {
    return null;
  }
}

export function generatePlan(
  rawProfile: ProfileV3,
  opts: {
    profileId: string;
    simulatorProfileId: number;
    name?: string;
    trials?: number;
    extraEvents?: LifeEvent[];
    // claude_instruction_combined_line_implementation.md：計算には使わず、そのまま戻り値の
    // PlanSnapshotへコピーして保存するだけ。このファイル自体はuseSimulatorStore/
    // useCompanyStateStoreを一切importしない設計を維持する。
    includesHojinDrawdown?: boolean;
    corporateSnaps?: CorporateYearSnap[];
  },
): PlanSnapshot {
  const profile = normalizeSimulatorProfile(rawProfile);
  const p = profileToSimParams(profile);
  // claude_instruction_extraEvents_toggle_implementation.md：呼び出し元が明示的に渡した
  // opts.extraEvents（保存ボタン押下時点のsimulatorStore.extraEventsのライブ値）とだけマージする。
  // このファイル自体はuseSimulatorStoreを一切importしない設計を維持する
  // （simulatorStore.tsのrunAll()と同一の結合パターン）。
  const evs = opts.extraEvents && opts.extraEvents.length > 0
    ? [...profile.events, ...opts.extraEvents]
    : profile.events;
  const strategy = (profile.ui.activeStrategies[0] ?? 'proportional') as WithdrawalStrategy;

  const snaps = simulate(p, evs, strategy);
  const curve: PlanCurvePoint[] = snaps.map((s) => ({ age: s.age, totalAssets: s.totalAssets }));
  const percentiles = generateMcPercentiles(p, evs, strategy, opts.trials ?? DEFAULT_TRIALS);

  const now = new Date();
  const trimmedName = opts.name?.trim();

  return {
    id: crypto.randomUUID(),
    profileId: opts.profileId,
    simulatorProfileId: opts.simulatorProfileId,
    strategy,
    name: trimmedName || `計画 ${now.toISOString().slice(0, 10)}`,
    createdAt: now.toISOString(),
    savedAtAge: p.curAge,
    savedAtYearMonth: toYearMonth(now),
    fixed: { curve, byAccount: null },
    mc: percentiles ? { percentiles, byAccount: null } : null,
    ...(opts.includesHojinDrawdown !== undefined ? { includesHojinDrawdown: opts.includesHojinDrawdown } : {}),
    ...(opts.corporateSnaps ? { corporateSnaps: opts.corporateSnaps } : {}),
  };
}
