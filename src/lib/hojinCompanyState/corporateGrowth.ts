// 法人資産の年次成長計算（最終版指示書3.2節）。
// 投資分(investedBalance)はμ・σで成長し、現金分(cashBalance)は成長せず事業利益・取崩の
// 収支だけを反映する。前年末残高を1年運用後、年末に収支を反映する（個人側simulate.tsの
// 「年末積立方式」と同じ考え方。CLAUDE.mdのアーキテクチャ不変ルール参照）。
//
// 各年の処理順序（3.2節）：
// 1. investedBalance = investedBalance × (1 + μ + Z×σ)
//    ※ retirementAge未満は積立期PF、以降は取崩期PFのμ・σを使用（CompanyStateSettings.retirementAge、
//       個人側useSimulatorStoreのretAgeは一切参照しない）
// 2. cashBalance += その年の事業利益
// 3. その年に「実際に取り崩せる額」= min(取崩イベントの要求額, 現金+投資の合計残高)を計算し、
//    現金優先で取り崩す（不足分はinvestedBalanceから補填、0円が下限。エラーは出さない）。
//    スナップショットのwithdrawalは常にこの「実際に取り崩された額」を返す（要求額そのものではない）。
//    2026-08-23バグ修正：以前は要求額をそのままcashBalanceから減算し、シフトフォール分だけを
//    investedBalanceから補填していたため、残高(investedBalance/cashBalance)自体は0円で
//    正しく下限に張り付いていたが、スナップショットのwithdrawalフィールドには「実際には
//    賄いきれなかった要求額」がそのまま残っていた。この値がbuildCombinedSimulationInput.ts経由で
//    個人側のother_inc収入イベントに変換されるため、法人資産が枯渇した年以降も個人側が
//    満額の税引後収入を受け取り続けてしまう（法人が0円に張り付いた後も個人へ資金補填が
//    続いてしまう）という不整合があった。

import { getEffectivePhaseMetrics, getEffectiveRetirementMu, getEffectiveRetirementSigma } from './portfolioMath';
import type { CompanyStateSettings, CorporateLifeEvent, CorporatePortfolio, CorporateYearSnap } from './types';

function aggregateByAge(events: CorporateLifeEvent[], kind: CorporateLifeEvent['kind']): Map<number, number> {
  const totals = new Map<number, number>();
  for (const ev of events) {
    if (ev.kind !== kind) continue;
    for (let age = ev.startAge; age < ev.startAge + ev.years; age++) {
      totals.set(age, (totals.get(age) ?? 0) + ev.amount);
    }
  }
  return totals;
}

/**
 * 法人資産の年次成長シミュレーション。
 * shockZOverrides省略時（固定計算モード）はZ=0として扱う。MCモードでは年ごとのZスコア配列
 * （個人側simulate()に渡すものと同じ配列、長さ= lifeEx-curAge+1）を渡す。
 */
export function simulateCorporateAssets(
  settings: CompanyStateSettings,
  curAge: number,
  lifeEx: number,
  portfolio: CorporatePortfolio,
  events: CorporateLifeEvent[],
  shockZOverrides: number[] | null = null,
): CorporateYearSnap[] {
  const workingMetrics = getEffectivePhaseMetrics(portfolio.working);
  // μ・σそれぞれ独立にrateSameAsWorking/sigmaSameAsWorkingを判定する
  // （個人側profile.tsのgetEffectiveRR/getEffectiveMcStdRと同じ設計。2026-08-21最終
  // チェックリスト3番：以前はretirementSameAsWorking（％配分の同期）1つでμ・σも
  // まとめて切り替えていたが、個人側は％配分・利回り・標準偏差の3つが独立トグル）。
  const retirementMetrics = {
    mu: getEffectiveRetirementMu(portfolio, workingMetrics.mu),
    sigma: getEffectiveRetirementSigma(portfolio, workingMetrics.sigma),
  };

  const profitByAge = aggregateByAge(events, 'business_profit');
  const withdrawalByAge = aggregateByAge(events, 'withdrawal');

  const snaps: CorporateYearSnap[] = [];
  let investedBalance = settings.investedBalance;
  let cashBalance = settings.cashBalance;

  for (let age = curAge; age <= lifeEx; age++) {
    const yr = age - curAge;
    const isRet = age >= settings.retirementAge;
    const { mu, sigma } = isRet ? retirementMetrics : workingMetrics;
    const z = shockZOverrides ? (shockZOverrides[yr] ?? 0) : 0;
    const shock = z * sigma;

    investedBalance = Math.max(0, investedBalance * (1 + (mu + shock) / 100));

    const businessProfit = profitByAge.get(age) ?? 0;
    const requestedWithdrawal = withdrawalByAge.get(age) ?? 0;
    cashBalance += businessProfit;
    // 実際に取り崩せる額は、その時点の残高（現金+投資）を上限とする。要求額がこれを
    // 上回る場合は超過分を切り捨てる（エラーは出さない）。
    const totalAvailable = Math.max(0, cashBalance) + investedBalance;
    const actualWithdrawal = Math.min(requestedWithdrawal, totalAvailable);
    cashBalance -= actualWithdrawal;
    if (cashBalance < 0) {
      const shortfall = -cashBalance;
      cashBalance = 0;
      investedBalance = Math.max(0, investedBalance - shortfall);
    }

    snaps.push({
      age,
      investedBalance: Math.round(investedBalance),
      cashBalance: Math.round(cashBalance),
      total: Math.round(investedBalance + cashBalance),
      businessProfit: Math.round(businessProfit),
      withdrawal: Math.round(actualWithdrawal),
    });
  }
  return snaps;
}
