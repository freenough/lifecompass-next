import type { WithdrawResult, RetirementTaxResult, WithdrawalStrategy } from './types';

export function calcMortgage(principal: number, rate: number, termYears: number): number {
  if (!principal || !termYears) return 0;
  const r = rate / 100 / 12;
  const n = termYears * 12;
  if (r <= 0) return Math.round(principal / termYears * 100) / 100;
  const monthly = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.round(monthly * 12 * 100) / 100;
}

export function randNorm(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.max(-50, Math.min(50, mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}

export function calcIdecoEligibleAge(idecoYrs: number, curAge: number, idecoToAge: number): number {
  const additionalYrs = Math.max(0, Math.min(idecoToAge, 60) - curAge);
  const totalYrs = idecoYrs + additionalYrs;
  if (totalYrs >= 10) return 60;
  if (totalYrs >= 8)  return 61;
  if (totalYrs >= 6)  return 62;
  if (totalYrs >= 4)  return 63;
  if (totalYrs >= 2)  return 64;
  return 65;
}

export function calcPensionTaxDiff(penAmt: number, idecoAnnual: number, age: number): number {
  function deduction(total: number, over65: boolean): number {
    if (over65) {
      if (total <= 330) return 110;
      if (total <= 410) return total * 0.25 + 27.5;
      if (total <= 770) return total * 0.15 + 68.5;
      return total * 0.05 + 145.5;
    } else {
      if (total <= 130) return 60;
      if (total <= 410) return total * 0.25 + 27.5;
      if (total <= 770) return total * 0.15 + 68.5;
      return total * 0.05 + 145.5;
    }
  }
  const over65 = age >= 65;
  const taxRate = 0.20315;
  const taxWithout = Math.max(0, penAmt - deduction(penAmt, over65)) * taxRate;
  const taxWith    = Math.max(0, penAmt + idecoAnnual - deduction(penAmt + idecoAnnual, over65)) * taxRate;
  return Math.max(0, taxWith - taxWithout);
}

export function retirementTaxCalc(
  idecoBalance: number, severanceAmount: number, dcYears: number, sevYears: number
): RetirementTaxResult {
  const hasIdeco = idecoBalance > 0;
  const hasSev = severanceAmount > 0;
  // 同一年に両方受け取る場合のみ控除を一本化（max）。別年受取はそれぞれ自分の年数のみを使う。
  // 近似実装: 税制上の重複期間按分調整（19年/9年ルール）は対象外（methodology参照）。
  // 勤続年数の1年未満の端数は切り上げ（国税庁No.1420）。
  const yrs = Math.max(1, Math.ceil(
    hasIdeco && hasSev ? Math.max(dcYears, sevYears) :
    hasSev ? sevYears :
    dcYears
  ));
  // 勤続20年以下は40万円×勤続年数だが、国税庁の規定により最低80万円の下限がある。
  const deduction = yrs <= 20 ? Math.max(40 * yrs, 80) : 800 + 70 * (yrs - 20);
  const total = idecoBalance + severanceAmount;
  if (total <= 0) return { idecoNet: 0, severanceNet: 0, totalTax: 0 };
  const remaining = Math.max(0, total - deduction);
  // 短期退職手当等（役員等以外・勤続年数5年以下）：控除後300万円を超える部分は1/2課税を適用しない。
  const taxable = yrs <= 5
    ? Math.min(remaining, 300) / 2 + Math.max(0, remaining - 300)
    : remaining / 2;
  const totalTax = taxable * 0.20315;
  const taxRatio = totalTax / total;
  return {
    idecoNet:     Math.max(0, idecoBalance     - idecoBalance     * taxRatio),
    severanceNet: Math.max(0, severanceAmount  - severanceAmount  * taxRatio),
    totalTax,
  };
}

export function withdraw(
  nisa: number, ideco: number, tax: number, cash: number,
  costBasis: number, need: number, strategy: WithdrawalStrategy
): WithdrawResult {
  if (need <= 0) return { nisa, ideco, tax, cash, costBasis, fillCash: 0, fillNisa: 0 };

  if (strategy === 'proportional') {
    const total = nisa + ideco + tax + cash;
    if (total <= 0) return { nisa: 0, ideco: 0, tax: 0, cash: 0, costBasis: 0, fillCash: 0, fillNisa: 0 };
    const r = Math.min(1, need / total);
    const gainR = tax > 0 ? Math.max(0, (tax - costBasis) / tax) : 0;
    const netPer = 1 - gainR * 0.20315;
    const taxGross = Math.min(tax, netPer > 0 ? (tax * r) / netPer : tax * r);
    const taxNet = taxGross * netPer;
    const taxRatio = tax > 0 ? taxGross / tax : 0;
    const totalNet = nisa * r + ideco * r + taxNet + cash * r;
    const shortfall = Math.max(0, need - totalNet);
    const newCash = Math.max(0, cash - cash * r);
    let cashFill = 0, nisaFill = 0;
    let rem = shortfall;
    if (rem > 0 && newCash > 0) { cashFill = Math.min(rem, newCash); rem -= cashFill; }
    let newNisa = Math.max(0, nisa - nisa * r);
    if (rem > 0 && newNisa > 0) { nisaFill = Math.min(rem, newNisa); rem -= nisaFill; }
    return {
      nisa:      Math.max(0, newNisa - nisaFill),
      ideco:     Math.max(0, ideco - ideco * r),
      tax:       Math.max(0, tax - taxGross),
      cash:      Math.max(0, newCash - cashFill),
      costBasis: Math.max(0, costBasis - costBasis * taxRatio),
      fillCash:  cashFill,
      fillNisa:  nisaFill,
    };
  }

  const order: Array<'cash' | 'tax' | 'nisa' | 'ideco'> =
    strategy === 'cash_first'
      ? ['cash', 'tax', 'nisa', 'ideco']
      : ['tax', 'cash', 'nisa', 'ideco'];
  let rem = need;
  const a = { nisa, ideco, tax, cash };
  let newCost = costBasis;
  for (const k of order) {
    if (rem <= 0) break;
    if (k === 'tax') {
      if (a.tax <= 0) continue;
      const gainR = Math.max(0, (a.tax - newCost) / a.tax);
      const netPer = 1 - gainR * 0.20315;
      const gross = Math.min(netPer > 0 ? rem / netPer : rem, a.tax);
      const net = gross * netPer;
      newCost = Math.max(0, newCost - newCost * (gross / a.tax));
      a.tax = Math.max(0, a.tax - gross);
      rem = Math.max(0, rem - net);
    } else {
      const t = Math.min(rem, a[k]); a[k] -= t; rem -= t;
    }
  }
  return { nisa: a.nisa, ideco: a.ideco, tax: a.tax, cash: a.cash, costBasis: newCost, fillCash: 0, fillNisa: 0 };
}
