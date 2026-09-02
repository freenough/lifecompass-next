// 法人ポートフォリオのμ・σ算出ロジック。
// src/lib/profile.ts（ロック対象）の calcMu/calcPortfolioMetrics と同じ計算式をこのファイルに
// 複製する（実装指示書2章：「ロジックを複製、importしない」方針）。
// 個人側は口座別（NISA/iDeCo/特定口座）を集計する必要があるが、法人側は法人資産1本のみのため、
// 複数口座の加重集計部分（calcAggregateMu/calcAggregateSigma/calcAggregatedSigma相当）は
// 実装しない（過剰実装を避ける、3.3節）。

import { ASSET_CLASSES } from '../assetManagement/categories';
import type { CorporatePortfolioRow, CorporatePortfolioPhase, CorporatePortfolio } from './types';

const ASSET_MU:    Record<string, number> = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.mu ?? 0]));
const ASSET_SIGMA: Record<string, number> = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.sigma ?? 0]));
const ASSET_GROUP: Record<string, string> = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.group ?? 'cash']));

// profile.ts の ASSET_CORR と同じ値を複製（LTCMA相関行列）。
// instruction_phase2_companystate_rearchitecture.md 6節：暗号資産（cryptoグループ）を追加。
// profile.ts側と対称になるよう、既存5グループの各行にもcrypto列を追加する。
const ASSET_CORR: Record<string, Record<string, number>> = {
  stock:    { stock: 1.0, bond: 0.1, reit_dev: 0.7, reit_jp: 0.5, gold: 0.0, cash: 0.0, crypto: 0.3  },
  bond:     { stock: 0.1, bond: 1.0, reit_dev: 0.1, reit_jp: 0.0, gold: 0.1, cash: 0.0, crypto: 0.0  },
  reit_dev: { stock: 0.7, bond: 0.1, reit_dev: 1.0, reit_jp: 0.4, gold: 0.1, cash: 0.0, crypto: 0.15 },
  reit_jp:  { stock: 0.5, bond: 0.0, reit_dev: 0.4, reit_jp: 1.0, gold: 0.0, cash: 0.0, crypto: 0.15 },
  gold:     { stock: 0.0, bond: 0.1, reit_dev: 0.1, reit_jp: 0.0, gold: 1.0, cash: 0.0, crypto: 0.07 },
  cash:     { stock: 0.0, bond: 0.0, reit_dev: 0.0, reit_jp: 0.0, gold: 0.0, cash: 0.0, crypto: 0.0  },
  crypto:   { stock: 0.3, bond: 0.0, reit_dev: 0.15, reit_jp: 0.15, gold: 0.07, cash: 0.0, crypto: 1.0 },
};

export function calcMu(rows: CorporatePortfolioRow[]): number {
  if (!rows || !rows.length) return 0;
  return rows.reduce((s, w) => s + (w.pct / 100) * (ASSET_MU[w.assetClass] ?? 0), 0);
}

export function calcPortfolioMetrics(rows: CorporatePortfolioRow[]): { mu: number; sigma: number } {
  if (!rows || !rows.length) return { mu: 0, sigma: 0 };
  const mu = calcMu(rows);
  let sigma2 = 0;
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      const wi = rows[i].pct / 100, wj = rows[j].pct / 100;
      const si = ASSET_SIGMA[rows[i].assetClass] ?? 0;
      const sj = ASSET_SIGMA[rows[j].assetClass] ?? 0;
      const gi = ASSET_GROUP[rows[i].assetClass] ?? 'cash';
      const gj = ASSET_GROUP[rows[j].assetClass] ?? 'cash';
      const rho = (ASSET_CORR[gi] && ASSET_CORR[gi][gj] !== undefined) ? ASSET_CORR[gi][gj] : 0;
      sigma2 += wi * wj * si * sj * rho;
    }
  }
  return { mu, sigma: Math.sqrt(Math.max(0, sigma2)) };
}

/**
 * フェーズの実効μ・σを返す。useManualMu/useManualSigmaはそれぞれ独立に判定する
 * （2026-08-21最終チェックリスト3番：個人側のpfManualFlags['rWNisa']/['rRNisa']等が
 * 完全に独立しているのと同じ設計。「μは手入力・σは自動」のような混在も表現できる）。
 */
export function getEffectivePhaseMetrics(phase: CorporatePortfolioPhase): { mu: number; sigma: number } {
  const auto = calcPortfolioMetrics(phase.rows);
  return {
    mu: phase.useManualMu ? (phase.manualMu ?? 0) : auto.mu,
    sigma: phase.useManualSigma ? (phase.manualSigma ?? 0) : auto.sigma,
  };
}

/**
 * 取崩期の実効μを返す。個人側profile.tsのgetEffectiveRRと同じ優先順位：
 * 1. rateSameAsWorking(ON) → 積立期の実効μをそのまま返す（取崩期自身の手入力フラグは見ない）
 * 2. OFF かつ 取崩期自身がuseManualMu(ON) → 取崩期自身の手入力値
 * 3. OFF かつ 自動 → rows（％配分の同期がONなら積立期のrows、OFFなら取崩期自身のrows）から算出
 */
export function getEffectiveRetirementMu(portfolio: CorporatePortfolio, workingMu: number): number {
  if (portfolio.rateSameAsWorking) return workingMu;
  const retirement = portfolio.retirement;
  if (retirement.useManualMu) return retirement.manualMu ?? 0;
  const rows = portfolio.retirementSameAsWorking ? portfolio.working.rows : retirement.rows;
  return calcPortfolioMetrics(rows).mu;
}

/** 取崩期の実効σを返す。上記getEffectiveRetirementMuのσ版（sigmaSameAsWorking基準）。 */
export function getEffectiveRetirementSigma(portfolio: CorporatePortfolio, workingSigma: number): number {
  if (portfolio.sigmaSameAsWorking) return workingSigma;
  const retirement = portfolio.retirement;
  if (retirement.useManualSigma) return retirement.manualSigma ?? 0;
  const rows = portfolio.retirementSameAsWorking ? portfolio.working.rows : retirement.rows;
  return calcPortfolioMetrics(rows).sigma;
}

/**
 * instruction_phase2_companystate_rearchitecture.md 6.3節：法人側の暗号資産手動入力誘導。
 * CompanyStateは口座単位（NISA/iDeCo/特定口座）ではなくフェーズ単位（②積立期／③取崩期）のため、
 * 個人側profile.tsのgetUnconfiguredAccounts()とは別の粒度で判定する：該当フェーズのrowsに
 * 暗号資産が含まれ、かつそのフェーズの実効μ・σのいずれかが自動（PF計算値）モードのままの場合に
 * 警告する。
 */
export function getCorporateCryptoWarnings(portfolio: CorporatePortfolio): string[] {
  const warnings: string[] = [];
  const hasCrypto = (rows: CorporatePortfolioRow[]) => rows.some(r => r.assetClass === '暗号資産');

  if (hasCrypto(portfolio.working.rows) && (!portfolio.working.useManualMu || !portfolio.working.useManualSigma)) {
    warnings.push('暗号資産は既定の期待リターンを設定していません。②積立期のPFを手動入力に切り替えて、ご自身の想定利回り・標準偏差を入力してください。');
  }

  // rateSameAsWorking/sigmaSameAsWorkingがONの場合、取崩期の実効値は積立期をそのまま使うため
  // （getEffectiveRetirementMu/Sigma参照）、上の積立期の警告と重複する。両方OFFのときのみ、
  // 取崩期自身の設定を独立してチェックする（個人側getUnconfiguredAccounts()のrateSameAsWorking/
  // retirement.sameAsWorkingによるスキップと同じ考え方）。
  if (!portfolio.rateSameAsWorking && !portfolio.sigmaSameAsWorking) {
    const retirementRows = portfolio.retirementSameAsWorking ? portfolio.working.rows : portfolio.retirement.rows;
    if (hasCrypto(retirementRows) && (!portfolio.retirement.useManualMu || !portfolio.retirement.useManualSigma)) {
      warnings.push('暗号資産は既定の期待リターンを設定していません。③取崩期のPFを手動入力に切り替えて、ご自身の想定利回り・標準偏差を入力してください。');
    }
  }

  return warnings;
}
