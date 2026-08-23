'use client';

// 「法人トグルONなら合算計算結果、OFFなら個人単独のsimulatorStore.mcResult」を切り替える
// 共通ロジック（最終版指示書3.7節）。MonteCarloPanel.tsx/ImpactTable.tsx/AiPanel.tsx/page.tsxが
// それぞれ独自にmcResultを読んでいたため、変換ロジックをここに一本化する
// （2026-08-22修正：モンテカルロ分析欄・ImpactTable・AiPanelが個人単独のsimulatorStore.mcResultを
// 直接参照しており、法人トグルON時にrunMonteCarloWithCorporateAwareness()がsimulatorStore.mcResultを
// 更新しないため、これらの表示だけ更新されない不具合があった）。

import { useCompanyStateStore } from './companyStateStore';
import type { MCResult, MCStrategyResult, WithdrawalStrategy } from '../types';
import type { CombinedMcStrategyResult } from './mc';

function toMcStrategyResult(s: CombinedMcStrategyResult): MCStrategyResult {
  return {
    percentiles: s.percentiles,
    bankruptcyRate: s.bankruptcyRate,
    depletionMean: null,
    depletionMin: null,
  };
}

/**
 * フック外（イベントハンドラ等）から同じ変換を行うための非フック版。
 * useCompanyStateStore.getState()で現在値を1回だけ読む（再レンダーはトリガーしない）。
 * AiPanel.tsxのようにgetState()でストアの現在値をまとめて取得している箇所から使う。
 */
export function resolveDisplayMcResult(rawMcResult: MCResult | null): MCResult | null {
  const { state, combinedMcResult } = useCompanyStateStore.getState();
  if (state.settings.includeInPersonalSimulator && combinedMcResult) {
    return {
      strategies: {
        proportional:  toMcStrategyResult(combinedMcResult.personalOnly.proportional),
        cash_first:    toMcStrategyResult(combinedMcResult.personalOnly.cash_first),
        taxable_first: toMcStrategyResult(combinedMcResult.personalOnly.taxable_first),
      },
      trials: combinedMcResult.trials,
    };
  }
  return rawMcResult;
}

/**
 * 個人単独のsimulatorStore.mcResultを受け取り、法人トグルON＋合算MC計算済みの場合は
 * companyStateStore.combinedMcResult.personalOnly（3戦略それぞれ独立計算済み）に
 * 詰め替えたMCResultを返す。OFF時・未実行時は引数のrawMcResultをそのまま返す。
 */
export function useDisplayMcResult(rawMcResult: MCResult | null): MCResult | null {
  const includeInPersonalSimulator = useCompanyStateStore(s => s.state.settings.includeInPersonalSimulator);
  const combinedMcResult = useCompanyStateStore(s => s.combinedMcResult);

  if (includeInPersonalSimulator && combinedMcResult) {
    return {
      strategies: {
        proportional:  toMcStrategyResult(combinedMcResult.personalOnly.proportional),
        cash_first:    toMcStrategyResult(combinedMcResult.personalOnly.cash_first),
        taxable_first: toMcStrategyResult(combinedMcResult.personalOnly.taxable_first),
      },
      trials: combinedMcResult.trials,
    };
  }
  return rawMcResult;
}

/**
 * 指定戦略の「個人+法人 合算後」パーセンタイル・破綻率を返す（法人トグルON＋計算済み時のみ）。
 * AssetChart.tsxの合算オーバーレイ・MonteCarloPanel.tsxの法人合算表示で共有する。
 */
export function useCorporateMcCombined(strategy: WithdrawalStrategy): CombinedMcStrategyResult | null {
  const includeInPersonalSimulator = useCompanyStateStore(s => s.state.settings.includeInPersonalSimulator);
  const combinedMcResult = useCompanyStateStore(s => s.combinedMcResult);
  if (includeInPersonalSimulator && combinedMcResult) {
    return combinedMcResult.combined[strategy];
  }
  return null;
}
