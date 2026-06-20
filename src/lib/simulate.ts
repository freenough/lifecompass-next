import type { SimParams, LifeEvent, YearSnap, WithdrawalStrategy, IdecoStatus } from './types';
import { withdraw, retirementTaxCalc, calcPensionTaxDiff, calcMortgage } from './helpers';

const INC_TYPES: Record<string, { kind: string }> = {
  reemploy:    { kind: 'period' },
  sidejob:     { kind: 'period' },
  rental:      { kind: 'period' },
  inheritance: { kind: 'lump' },
  severance:   { kind: 'lump' },
  other_inc:   { kind: 'period' },
  inc_change:  { kind: 'inc_change' },
};

const EXP_TYPES: Record<string, { kind: string; acct?: string }> = {
  education:        { kind: 'period' },
  care:             { kind: 'period' },
  renovation:       { kind: 'lump' },
  mortgage:         { kind: 'mortgage' },
  other_exp:        { kind: 'period' },
  base_change:      { kind: 'base_change' },
  nisa_con_change:  { kind: 'con_change', acct: 'nisa' },
  ideco_con_change: { kind: 'con_change', acct: 'ideco' },
  tax_con_change:   { kind: 'con_change', acct: 'tax' },
};

export function simulate(
  p: SimParams,
  evs: LifeEvent[],
  strategy: WithdrawalStrategy,
  shockOverrides: number[] | null = null
): YearSnap[] {
  const snaps: YearSnap[] = [];
  let nisa  = p.acct.nisa.bal;
  let ideco = p.acct.ideco.bal;
  let tax   = p.acct.tax.bal;
  let cash  = p.acct.cash.bal;
  let taxCostBasis = p.acct.tax.costBasis ?? p.acct.tax.bal;

  let idecoExitDone = false;
  let idecoStatus: IdecoStatus = 'accumulation';
  let idecoBalanceBeforeWithdrawal: number | null = null;
  let idecoWithdrawalAmount: number | null = null;
  const isPension = p.idecoReceiveType === 'pension';
  let idecoRemainingYears = p.idecoReceiveYears;

  const baseChanges = evs
    .filter(ev => ev.category === 'expense' && ev.subtype === 'base_change')
    .sort((a, b) => a.age - b.age);
  const incChanges = evs
    .filter(ev => ev.category === 'income' && ev.subtype === 'inc_change')
    .sort((a, b) => a.age - b.age);
  const conChanges = {
    nisa:  evs.filter(ev => ev.category === 'expense' && ev.subtype === 'nisa_con_change').sort((a, b) => a.age - b.age),
    ideco: evs.filter(ev => ev.category === 'expense' && ev.subtype === 'ideco_con_change').sort((a, b) => a.age - b.age),
    tax:   evs.filter(ev => ev.category === 'expense' && ev.subtype === 'tax_con_change').sort((a, b) => a.age - b.age),
  };

  for (let age = p.curAge; age <= p.lifeEx; age++) {
    const yr = age - p.curAge;
    const inflM = Math.pow(1 + p.inflR / 100, yr);
    const isRet = age >= p.retAge;
    const isIdecoStart = age >= p.idecoStartAge;
    const shock = shockOverrides ? shockOverrides[yr] : 0;
    const nisaRate  = (isRet ? p.acct.nisa.rR  : p.acct.nisa.rW)  + shock;
    const idecoRate = (isRet ? p.acct.ideco.rR : p.acct.ideco.rW) + shock;
    const taxRate   = (isRet ? p.acct.tax.rR   : p.acct.tax.rW)   + shock;

    let baseInc = isRet ? 0 : p.baseInc;
    if (!isRet) {
      for (const ic of incChanges) {
        if (age >= ic.age) baseInc = ic.amount;
      }
    }
    if (age >= p.penAge) baseInc += p.penAmt;
    if (p.spouse) {
      const spAge = p.spouse.spCurAge ? p.spouse.spCurAge + (age - p.curAge) : null;
      const spRetOk = spAge !== null ? spAge < p.spouse.retAge : age < p.spouse.retAge;
      const spPenOk = spAge !== null ? spAge >= p.spouse.penAge : age >= p.spouse.penAge;
      if (spRetOk) baseInc += p.spouse.inc;
      if (spPenOk) baseInc += p.spouse.penAmt;
    }

    let currentBaseExp = p.baseExp;
    for (const bc of baseChanges) {
      if (age >= bc.age) currentBaseExp = bc.amount;
    }

    let extraInc = 0, extraExp = 0, severanceGross = 0;
    for (const ev of evs) {
      const cfg = ev.category === 'income' ? (INC_TYPES[ev.subtype] || {}) : (EXP_TYPES[ev.subtype] || {});
      const kind = (cfg as { kind?: string }).kind;
      if (
        ev.subtype === 'base_change' || ev.subtype === 'inc_change' ||
        ev.subtype === 'nisa_con_change' || ev.subtype === 'ideco_con_change' || ev.subtype === 'tax_con_change'
      ) continue;
      if (ev.category === 'income') {
        if (ev.subtype === 'severance' && age === ev.age) {
          if (isRet) severanceGross += ev.amount;
          else extraInc += ev.amount;
        } else if (kind === 'lump' && age === ev.age) {
          extraInc += ev.amount;
        } else if (kind === 'period' && age >= ev.age && age < ev.age + ev.years) {
          extraInc += ev.amount;
        }
      } else {
        const expEv = ev as { subtype: string; principal?: number; rate?: number; termYears?: number; age: number; years: number; amount: number };
        if (ev.subtype === 'mortgage' && age >= ev.age && age < ev.age + ev.years) {
          extraExp += calcMortgage(expEv.principal ?? 0, expEv.rate ?? 0, expEv.termYears ?? 0);
        } else if (kind === 'lump' && age === ev.age) {
          extraExp += ev.amount;
        } else if (kind === 'period' && age >= ev.age && age < ev.age + ev.years) {
          extraExp += ev.amount;
        }
      }
    }

    let income = baseInc + extraInc;
    const expense = currentBaseExp * inflM + extraExp;
    const nisaActive  = !isRet && age <= p.acct.nisa.toAge;
    const idecoActive = !isRet && age <= p.acct.ideco.toAge && p.hasIdeco;
    const taxActive   = !isRet && age <= p.acct.tax.toAge;

    nisa  += nisa  * (nisaRate  / 100);
    if (idecoStatus === 'accumulation' || idecoStatus === 'pension') ideco += ideco * (idecoRate / 100);
    tax   += tax   * (taxRate   / 100);

    let idecoTaxPaid = 0, retirementTaxPaid = 0, severanceNet = 0;
    const retirementIncomes: Array<{ type: string; amount: number }> = [];
    let severanceGrossForIdeco = 0;
    if (isRet && severanceGross > 0) {
      retirementIncomes.push({ type: 'severance', amount: severanceGross });
      severanceGrossForIdeco = severanceGross;
    } else if (!isRet && severanceGross > 0) {
      cash += severanceGross;
    }

    if (isIdecoStart && !idecoExitDone && !isPension) {
      retirementIncomes.push({ type: 'ideco', amount: ideco });
    }

    if (retirementIncomes.length > 0) {
      const totalSev   = retirementIncomes.filter(r => r.type === 'severance').reduce((s, r) => s + r.amount, 0);
      const totalIdeco = retirementIncomes.filter(r => r.type === 'ideco').reduce((s, r) => s + r.amount, 0);
      const res = retirementTaxCalc(totalIdeco, totalSev, p.idecoYrs, p.sevYrs);
      if (totalSev > 0) { cash += res.severanceNet; severanceNet = Math.round(res.severanceNet); }
      if (totalIdeco > 0) {
        idecoTaxPaid += Math.round(totalIdeco - res.idecoNet);
        idecoBalanceBeforeWithdrawal = Math.round(ideco);
        idecoWithdrawalAmount = Math.round(res.idecoNet);
        cash += res.idecoNet;
        ideco = 0;
        idecoStatus = 'closed';
      }
      retirementTaxPaid = Math.round((totalSev - res.severanceNet) + (totalIdeco - res.idecoNet));
    }

    if (isIdecoStart && !idecoExitDone) {
      if (isPension) {
        idecoStatus = 'pension';
        idecoRemainingYears = p.idecoReceiveYears;
      }
      idecoExitDone = true;
    }

    let idecoAnnualGross = 0;
    if (idecoStatus === 'pension' && idecoExitDone) {
      if (idecoRemainingYears > 0 && ideco > 0) {
        const idecoAnnualPension = ideco / idecoRemainingYears;
        ideco = Math.max(0, ideco - idecoAnnualPension);
        idecoRemainingYears--;
        const currentPenAmt = age >= p.penAge ? p.penAmt : 0;
        const pensionTax = Math.round(calcPensionTaxDiff(currentPenAmt, idecoAnnualPension, age));
        idecoTaxPaid += pensionTax;
        idecoAnnualGross = Math.round(idecoAnnualPension);
        income += Math.max(0, idecoAnnualPension - pensionTax);
        if (idecoRemainingYears <= 0 || ideco <= 0) {
          ideco = 0;
          idecoStatus = 'closed';
        }
      } else {
        ideco = 0;
        idecoStatus = 'closed';
      }
    }

    let fillCash = 0, fillNisa = 0;

    if (!isRet) {
      const nisaCon  = nisaActive  ? p.acct.nisa.con  : 0;
      const idecoCon = idecoActive ? p.acct.ideco.con : 0;
      const taxCon   = taxActive   ? p.acct.tax.con   : 0;
      let nisaConEff = nisaCon, idecoConEff = idecoCon, taxConEff = taxCon;
      for (const cc of conChanges.nisa)  { if (age >= cc.age) nisaConEff  = cc.amount; }
      for (const cc of conChanges.ideco) { if (age >= cc.age) idecoConEff = cc.amount; }
      for (const cc of conChanges.tax)   { if (age >= cc.age) taxConEff   = cc.amount; }
      const totalCon = nisaConEff + idecoConEff + taxConEff;
      const avail = income - expense;
      const actualCon = Math.min(totalCon, Math.max(0, avail + cash));
      const ratio = totalCon > 0 ? Math.min(1, actualCon / totalCon) : 0;
      if (nisaActive)  nisa  += nisaConEff  * ratio;
      if (idecoActive) ideco += idecoConEff * ratio;
      if (taxActive) {
        tax          += taxConEff * ratio;
        taxCostBasis += taxConEff * ratio;
      }
      cash += avail - totalCon * ratio;
      if (cash < 0) {
        const def = -cash; cash = 0;
        if (strategy === 'proportional') {
          const inv = nisa + ideco + tax;
          if (inv > 0) {
            const r = Math.min(1, def / inv);
            nisa  = Math.max(0, nisa  - nisa  * r);
            ideco = Math.max(0, ideco - ideco * r);
            taxCostBasis = Math.max(0, taxCostBasis - taxCostBasis * r);
            tax   = Math.max(0, tax   - tax   * r);
          }
        } else {
          const orders: Array<'tax' | 'nisa' | 'ideco'> = ['tax', 'nisa', 'ideco'];
          let rem = def;
          const a = { nisa, ideco, tax };
          for (const k of orders) {
            if (rem <= 0) break;
            if (k === 'tax') {
              const t = Math.min(rem, a.tax);
              const ratio2 = a.tax > 0 ? t / a.tax : 0;
              taxCostBasis = Math.max(0, taxCostBasis - taxCostBasis * ratio2);
              a.tax = Math.max(0, a.tax - t); rem -= t;
            } else {
              const t = Math.min(rem, a[k]); a[k] -= t; rem -= t;
            }
          }
          nisa = a.nisa; ideco = a.ideco; tax = a.tax;
        }
      }
    } else {
      const surplus = income - expense;
      if (surplus >= 0) {
        cash += surplus;
      } else {
        const res = withdraw(nisa, ideco, tax, cash, taxCostBasis, -surplus, strategy);
        nisa = res.nisa; ideco = res.ideco; tax = res.tax; cash = res.cash;
        taxCostBasis = res.costBasis;
        fillCash = res.fillCash; fillNisa = res.fillNisa;
      }
    }

    nisa  = Math.max(0, nisa);
    ideco = Math.max(0, ideco);
    tax   = Math.max(0, tax);
    cash  = Math.max(0, cash);

    snaps.push({
      age,
      totalAssets: Math.round(nisa + ideco + tax + cash),
      nisa:  Math.round(nisa),
      ideco: Math.round(ideco),
      tax:   Math.round(tax),
      cash:  Math.round(cash),
      income:   Math.round(income),
      expense:  Math.round(expense),
      cashFlow: Math.round(income - expense),
      extraInc: Math.round(extraInc),
      extraExp: Math.round(extraExp),
      nisaActive,
      idecoActive,
      taxActive,
      idecoTaxPaid,
      retirementTaxPaid,
      idecoAnnualGross,
      fillCash: Math.round(fillCash),
      fillNisa: Math.round(fillNisa),
      hasSeverance: severanceGross > 0 && isRet,
      baseExp: Math.round(currentBaseExp * inflM),
      idecoStatus,
      idecoBalanceBeforeWithdrawal,
      idecoWithdrawalAmount,
      severanceNet,
    });

    idecoBalanceBeforeWithdrawal = null;
    idecoWithdrawalAmount = null;

    if (nisa + ideco + tax + cash === 0) break;
  }

  const targetLen = p.lifeEx - p.curAge + 1;
  while (snaps.length < targetLen) {
    const l = snaps[snaps.length - 1];
    snaps.push({
      ...l,
      age: l.age + 1,
      totalAssets: 0, nisa: 0, ideco: 0, tax: 0, cash: 0,
      cashFlow: 0,
      nisaActive: false, idecoActive: false, taxActive: false,
      idecoTaxPaid: 0, fillCash: 0, fillNisa: 0,
      idecoStatus: 'closed',
    });
  }

  return snaps;
}
