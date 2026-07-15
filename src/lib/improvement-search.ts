import type { LifeEvent, SimParams, WithdrawalStrategy } from './types';
import { simulate } from './simulate';
import { analyze } from './analyze';

const EXPENSE_SEARCH_MAX_PCT = 50;

export interface ThresholdResult {
  achievable: boolean;
  /** 支出削減探索では% (0-50)、退職延長探索では年数。届かない場合はnull */
  value: number | null;
}

export interface ImprovementSearchResult {
  expense: ThresholdResult;
  retirement: ThresholdResult;
  message: string;
}

function isFireAchieved(p: SimParams, events: LifeEvent[], strategy: WithdrawalStrategy): boolean {
  return analyze(simulate(p, events, strategy), p).fA != null;
}

/**
 * 支出削減方向の最小必要%を二分探索する(0-50%を上限)。
 * simulate.ts/analyze.tsは変更せず、baseExpを加工したSimParamsを渡すのみ。
 */
export function findExpenseReductionThreshold(
  p: SimParams, events: LifeEvent[], strategy: WithdrawalStrategy,
): ThresholdResult {
  const achievedAtPct = (pct: number) => {
    const pTest: SimParams = { ...p, baseExp: Math.round(p.baseExp * (1 - pct / 100)) };
    return isFireAchieved(pTest, events, strategy);
  };

  if (!achievedAtPct(EXPENSE_SEARCH_MAX_PCT)) {
    return { achievable: false, value: null };
  }
  let lo = 0, hi = EXPENSE_SEARCH_MAX_PCT;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (achievedAtPct(mid)) hi = mid; else lo = mid;
  }
  return { achievable: true, value: hi };
}

/**
 * 退職年齢を`deltaYears`だけ変更した際の口座別パラメータを組み立てる。
 * 設計(retirement_extension_contribution_logic.md確定分):
 * - 特定口座のtoAgeだけ新retAgeまで延ばす(Math.maxのため縮む方向には作用しない)。NISA・iDeCoのtoAgeは変更しない
 * - 延長期間中(旧retAge〜新retAge)は、NISA分+iDeCo分+特定口座分の元の積立額を合算し、丸ごと特定口座に積み立てる
 *   （口座別利率を自由に設定できる以上、NISA/特定口座どちらを優先すべきか決め打ちできないため、
 *   合算して特定口座に寄せることで恣意的な有利不利の判断を避ける）
 * simulate.ts自体は変更せず、既存のcon_changeイベント機構(tax_con_change等)とtoAge加工だけで実現する。
 *
 * `deltaYears`が負(退職前倒し)の場合も同じ関数をそのまま使ってよい(retirement_extension_rolloutで検証済み)。
 * 新retAgeが旧retAgeより前になるため、`age: oldRetAge`のcon_changeイベントは
 * 到達前に`isRet`が真になり発火しない(無害な到達不能イベントになるだけ)。`tax.toAge`の
 * `Math.max`も新retAgeの方が小さいため実質的no-opで、素の`retAge`変更のみの場合と
 * 数値が完全一致することを確認済み。
 */
export function buildRetirementExtension(
  p: SimParams, deltaYears: number,
): { params: SimParams; extraEvents: LifeEvent[] } {
  const oldRetAge = p.retAge;
  const newRetAge = oldRetAge + deltaYears;
  const combinedCon = p.acct.nisa.con + p.acct.ideco.con + p.acct.tax.con;

  const params: SimParams = {
    ...p,
    retAge: newRetAge,
    acct: {
      ...p.acct,
      tax: { ...p.acct.tax, toAge: Math.max(p.acct.tax.toAge, newRetAge) },
    },
  };

  // 延長期間の開始(旧retAge)から、特定口座に合算額を積み立てる。
  // NISA・iDeCoは0円上書き(それぞれのtoAgeが旧retAgeより後ろに設定されている場合の保険。
  // 通常はtoAge自体が旧retAge以前で止まるため実質的に無効化されるだけで済むケースが多い)。
  const extraEvents: LifeEvent[] = [
    { category: 'expense', subtype: 'tax_con_change',   name: '', age: oldRetAge, years: 0, amount: combinedCon },
    { category: 'expense', subtype: 'nisa_con_change',  name: '', age: oldRetAge, years: 0, amount: 0 },
    { category: 'expense', subtype: 'ideco_con_change', name: '', age: oldRetAge, years: 0, amount: 0 },
  ];
  return { params, extraEvents };
}

/**
 * 退職延長方向の最小必要年数を1年刻みの線形探索で求める(lifeEx-1を上限)。
 *
 * 合格条件は`fA !== null`（生涯のどこかで達成）ではなく、
 * `fA !== null && fA <= 新retAge`（延長後の退職年齢までにFIRE達成していること）。
 * `fA`自体は「生涯のどこかで達成」を示す指標として他の用途で正しく機能しているため
 * analyze.ts側の定義は変更せず、この探索の合格ラインだけを厳しくする
 * （retirement_extension_success_criteria_fix）。固定の年齢上限は設けない
 * （延長するほど合格ラインである新retAge自体も後ろ倒しになるため、この基準変更自体が
 * 自己抑制的に働く。探索上限は従来通りlifeEx-1のまま）。
 */
export function findRetirementExtensionThreshold(
  p: SimParams, events: LifeEvent[], strategy: WithdrawalStrategy,
): ThresholdResult {
  const maxDelta = p.lifeEx - 1 - p.retAge;
  for (let delta = 1; delta <= maxDelta; delta++) {
    const { params, extraEvents } = buildRetirementExtension(p, delta);
    const a = analyze(simulate(params, [...events, ...extraEvents], strategy), params);
    if (a.fA != null && a.fA <= params.retAge) {
      return { achievable: true, value: delta };
    }
  }
  return { achievable: false, value: null };
}

/**
 * 支出削減・退職延長の両方向を探索する。優先順位は付けない
 * （%と年という異なる単位を大小比較して片方を選ぶ設計は、「支出12%減 vs 退職2年延長」
 * のようなケースで直感に反するため撤回済み。kpi_improvement_suggestion_display参照）。
 * 両方届くなら両方、片方のみ届くならその片方、どちらも届かなければその旨を表示する。
 */
export function findImprovementThresholds(
  p: SimParams, events: LifeEvent[], strategy: WithdrawalStrategy,
): ImprovementSearchResult {
  const expense = findExpenseReductionThreshold(p, events, strategy);
  const retirement = findRetirementExtensionThreshold(p, events, strategy);

  let message: string;
  if (expense.achievable && retirement.achievable) {
    message = `支出${expense.value}%減または退職+${retirement.value}年で達成`;
  } else if (expense.achievable) {
    message = `支出${expense.value}%減で達成`;
  } else if (retirement.achievable) {
    message = `退職+${retirement.value}年で達成`;
  } else {
    message = '大幅な見直しが必要';
  }
  return { expense, retirement, message };
}
