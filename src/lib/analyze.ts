import type { YearSnap, SimParams, AnalysisResult } from './types';

function getIdecoDisplayBalance(s: YearSnap): number {
  return s.idecoBalanceBeforeWithdrawal ?? s.ideco;
}

export function analyze(snaps: YearSnap[], p: SimParams): AnalysisResult {
  let pV = 0, pA = p.curAge, dA: number | null = null, fA: number | null = null;
  for (const s of snaps) {
    if (s.totalAssets > pV) { pV = s.totalAssets; pA = s.age; }
    if (s.totalAssets === 0 && !dA) dA = s.age;
    if (!fA && s.totalAssets > 0 && s.baseExp != null && s.totalAssets >= s.baseExp * 25) {
      const fromHere = snaps.slice(snaps.indexOf(s));
      if (fromHere.every(r => r.totalAssets > 0 && r.baseExp != null && r.totalAssets >= r.baseExp * 25)) {
        fA = s.age;
      }
    }
  }

  const assetLife = dA ? dA - p.retAge : null;

  const retSnap = snaps.find(s => s.age === p.retAge);
  let withdrawalRate: number | null = null;
  if (retSnap && retSnap.totalAssets > 0) {
    const netWithdraw = Math.max(0, retSnap.expense - retSnap.income);
    withdrawalRate = netWithdraw / retSnap.totalAssets * 100;
  }

  const retSnaps = snaps.filter(s => s.age >= p.retAge && !s.hasSeverance);
  let breakEven: number | null = null;
  for (let i = 1; i < retSnaps.length - 1; i++) {
    const avg3 = (retSnaps[i - 1].cashFlow + retSnaps[i].cashFlow + retSnaps[i + 1].cashFlow) / 3;
    if (avg3 < 0) { breakEven = retSnaps[i].age; break; }
  }
  if (breakEven === null && retSnaps.length >= 2) {
    const avg2 = (retSnaps[0].cashFlow + retSnaps[1].cashFlow) / 2;
    if (avg2 < 0) breakEven = retSnaps[0].age;
  }

  const penAgeSnap = snaps.find(s => s.age === p.penAge);
  const penAgeAssets = penAgeSnap ? penAgeSnap.totalAssets : null;

  const idecoStartSnap = snaps.find(s => s.age === p.idecoStartAge);
  const idecoLumpNet   = idecoStartSnap ? (idecoStartSnap.idecoWithdrawalAmount || 0) : 0;
  // Sum retirementTaxPaid across all snaps (covers severance at retAge ≠ idecoStartAge)
  const idecoLumpTax   = snaps.reduce((sum, s) => sum + (s.retirementTaxPaid || 0), 0);
  const severanceNetKPI = snaps.reduce((sum, s) => sum + (s.severanceNet || 0), 0);
  const idecoTotalTax   = snaps
    .filter(s => s.age >= p.idecoStartAge)
    .reduce((sum, s) => sum + (s.idecoTaxPaid || 0), 0);
  const idecoTotalGross = snaps
    .filter(s => s.age >= p.idecoStartAge)
    .reduce((sum, s) => sum + (s.idecoAnnualGross || 0), 0);
  const idecoTotalNetWithdrawal = Math.max(0, idecoTotalGross - idecoTotalTax);
  const idecoStartBalance = idecoStartSnap ? getIdecoDisplayBalance(idecoStartSnap) : 0;

  // Spouse KPI values
  const spIdecoLumpNet    = snaps.reduce((s, snap) => s + (snap.spIdecoWithdrawalAmount ?? 0), 0);
  const spSeveranceNetKPI = snaps.reduce((s, snap) => s + (snap.spSeveranceNet          ?? 0), 0);
  const spRetirementTaxKPI = snaps.reduce((s, snap) => s + (snap.spRetirementTaxPaid    ?? 0), 0);
  // 配偶者のiDeCo年金受取分（本人のidecoTotalTax/idecoTotalGross/idecoTotalNetWithdrawalに相当）
  const spIdecoTotalTax   = snaps.reduce((s, snap) => s + (snap.spIdecoTaxPaid    ?? 0), 0);
  const spIdecoTotalGross = snaps.reduce((s, snap) => s + (snap.spIdecoAnnualGross ?? 0), 0);
  const spIdecoTotalNetWithdrawal = Math.max(0, spIdecoTotalGross - spIdecoTotalTax);

  return {
    last: snaps[snaps.length - 1].totalAssets,
    pV, pA, dA, fA, assetLife, withdrawalRate, breakEven, penAgeAssets,
    idecoLumpNet, idecoLumpTax, idecoTotalTax, idecoTotalNetWithdrawal, idecoStartBalance, severanceNetKPI,
    spIdecoLumpNet, spIdecoTotalTax, spIdecoTotalNetWithdrawal, spSeveranceNetKPI, spRetirementTaxKPI,
  };
}
