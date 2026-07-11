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
  // モンテカルロ用の標準正規乱数（Zスコア）列。実際のshock幅（%）はこの関数内で
  // 年ごとに、mcStd/mcStdR固定値、または動的モード時はその年の口座別残高加重σで決定する。
  shockZOverrides: number[] | null = null
): YearSnap[] {
  const snaps: YearSnap[] = [];

  // ── Main account balances ──
  let nisa  = p.acct.nisa.bal;
  let ideco = p.acct.ideco.bal;
  let tax   = p.acct.tax.bal;
  let cash  = p.acct.cash.bal;
  let taxCostBasis = p.acct.tax.costBasis ?? p.acct.tax.bal;

  // ── Spouse account balances ──
  let spNisa  = p.spouse?.acct?.nisa?.bal  ?? 0;
  let spIdeco = p.spouse?.acct?.ideco?.bal ?? 0;
  let spTax   = p.spouse?.acct?.tax?.bal   ?? 0;
  let spCash  = p.spouse?.acct?.cash?.bal  ?? 0;
  let spTaxCostBasis = p.spouse?.acct?.tax?.bal ?? 0;

  // ── Main iDeCo state ──
  let idecoExitDone = false;
  let idecoStatus: IdecoStatus = 'accumulation';
  let idecoBalanceBeforeWithdrawal: number | null = null;
  let idecoWithdrawalAmount: number | null = null;
  const isPension = p.idecoReceiveType === 'pension';
  const isSplit   = p.idecoReceiveType === 'split';
  let idecoRemainingYears = p.idecoReceiveYears;

  // ── Spouse iDeCo state ──
  let spIdecoExitDone = false;
  let spIdecoStatus: IdecoStatus = 'accumulation';
  let spIdecoWithdrawalAmount: number | null = null;
  const spIsPension = (p.spouse?.idecoReceiveType ?? 'lump') === 'pension';
  const spIsSplit   = (p.spouse?.idecoReceiveType ?? 'lump') === 'split';
  let spIdecoRemainingYears = p.spouse?.idecoReceiveYears ?? 10;

  // ── Spouse age milestones (in main-person-age terms) ──
  // Use || (not ??) so that spCurAge=0 (unset) also falls back to main person's age
  const spCurAge = p.spouse?.spCurAge || p.curAge;
  const spRetireAtAge    = p.curAge + ((p.spouse?.retAge      ?? p.retAge)      - spCurAge);
  const spIdecoStartAtAge = p.curAge + ((p.spouse?.idecoStartAge ?? p.spouse?.retAge ?? p.retAge) - spCurAge);
  const spIdecoYrs = p.spouse?.idecoYrs ?? 0;
  const spSevYrs   = p.spouse?.sevYrs   ?? 0;

  // ── Event pre-processing ──
  const baseChanges = evs
    .filter(ev => ev.category === 'expense' && ev.subtype === 'base_change')
    .sort((a, b) => a.age - b.age);
  const incChanges = evs
    .filter(ev => ev.category === 'income' && ev.subtype === 'inc_change')
    .sort((a, b) => a.age - b.age);

  // owner === 'spouse' con_change events go to spouse accounts
  const conChanges = {
    nisa:  evs.filter(ev => ev.category === 'expense' && ev.subtype === 'nisa_con_change'  && ev.owner !== 'spouse').sort((a, b) => a.age - b.age),
    ideco: evs.filter(ev => ev.category === 'expense' && ev.subtype === 'ideco_con_change' && ev.owner !== 'spouse').sort((a, b) => a.age - b.age),
    tax:   evs.filter(ev => ev.category === 'expense' && ev.subtype === 'tax_con_change'   && ev.owner !== 'spouse').sort((a, b) => a.age - b.age),
  };
  const spConChanges = {
    nisa:  evs.filter(ev => ev.category === 'expense' && ev.subtype === 'nisa_con_change'  && ev.owner === 'spouse').sort((a, b) => a.age - b.age),
    ideco: evs.filter(ev => ev.category === 'expense' && ev.subtype === 'ideco_con_change' && ev.owner === 'spouse').sort((a, b) => a.age - b.age),
    tax:   evs.filter(ev => ev.category === 'expense' && ev.subtype === 'tax_con_change'   && ev.owner === 'spouse').sort((a, b) => a.age - b.age),
  };

  for (let age = p.curAge; age <= p.lifeEx; age++) {
    const yr = age - p.curAge;
    const inflM = Math.pow(1 + p.inflR / 100, yr);
    const isRet = age >= p.retAge;
    const isSpRet = age >= spRetireAtAge;
    const isIdecoStart   = age >= p.idecoStartAge;
    const isSpIdecoStart = age >= spIdecoStartAtAge;
    // ── モンテカルロshock（%）: 静的モードはmcStd/mcStdR固定値、動的モードは
    // その年の期首残高（nisa/ideco/tax + 配偶者分）で加重平均した口座別σを使う。
    // 相関=1（全口座が同じshockを受ける）という設計は維持し、そのshock幅を決める
    // σの重み付けだけを実残高ベース・年次更新に変更している。
    let sigmaT = isRet ? p.mcStdR : p.mcStd;
    const dynamicOn = isRet ? (p.mcStdRDynamic ?? false) : (p.mcStdDynamic ?? false);
    if (dynamicOn) {
      const bN = nisa + spNisa, bI = ideco + spIdeco, bT = tax + spTax;
      const totalB = bN + bI + bT;
      if (totalB > 0) {
        const sN = (isRet ? p.acct.nisa.sigmaR  : p.acct.nisa.sigmaW)  ?? sigmaT;
        const sI = (isRet ? p.acct.ideco.sigmaR : p.acct.ideco.sigmaW) ?? sigmaT;
        const sT = (isRet ? p.acct.tax.sigmaR   : p.acct.tax.sigmaW)   ?? sigmaT;
        // 相関=1想定なので残高加重平均が数学的に正確: σ(aX+bY)=|a|σX+|b|σY when ρ(X,Y)=1
        sigmaT = (bN * sN + bI * sI + bT * sT) / totalB;
      }
    }
    const z = shockZOverrides ? shockZOverrides[yr] : 0;
    const shock = shockZOverrides ? Math.max(-50, Math.min(50, z * sigmaT)) : 0;
    const nisaRate  = (isRet ? p.acct.nisa.rR  : p.acct.nisa.rW)  + shock;
    const idecoRate = (isRet ? p.acct.ideco.rR : p.acct.ideco.rW) + shock;
    const taxRate   = (isRet ? p.acct.tax.rR   : p.acct.tax.rW)   + shock;
    const spAge = spCurAge + yr;

    // ── Income calculation ──
    let baseInc = isRet ? 0 : p.baseInc;
    if (!isRet) {
      for (const ic of incChanges) {
        if (age >= ic.age) baseInc = ic.amount;
      }
    }
    if (age >= p.penAge) baseInc += p.penAmt;
    if (p.spouse) {
      const spPenOk = spAge >= p.spouse.penAge;
      if (!isSpRet) baseInc += p.spouse.inc;
      if (spPenOk)  baseInc += p.spouse.penAmt;
    }

    let currentBaseExp = p.baseExp;
    for (const bc of baseChanges) {
      if (age >= bc.age) currentBaseExp = bc.amount;
    }

    // ── Event loop ──
    let extraInc = 0, extraExp = 0;
    let severanceGross = 0;    // main person's retirement severance
    let spSeveranceGross = 0;  // spouse's retirement severance (owner='spouse')
    for (const ev of evs) {
      const cfg = ev.category === 'income' ? (INC_TYPES[ev.subtype] || {}) : (EXP_TYPES[ev.subtype] || {});
      const kind = (cfg as { kind?: string }).kind;
      if (
        ev.subtype === 'base_change' || ev.subtype === 'inc_change' ||
        ev.subtype === 'nisa_con_change' || ev.subtype === 'ideco_con_change' || ev.subtype === 'tax_con_change'
      ) continue;
      // owner='spouse' events: ev.age is in spouse-age → convert to main-person age axis
      const evAge = (ev.owner === 'spouse') ? p.curAge + (ev.age - spCurAge) : ev.age;
      if (ev.category === 'income') {
        if (ev.subtype === 'severance' && age === evAge) {
          const owner = ev.owner ?? 'self';
          if (owner === 'spouse') {
            spSeveranceGross += ev.amount;
          } else {
            severanceGross += ev.amount;
          }
        } else if (kind === 'lump' && age === evAge) {
          extraInc += ev.amount;
        } else if (kind === 'period' && age >= evAge && age < evAge + ev.years) {
          extraInc += ev.amount;
        }
      } else {
        const expEv = ev as { subtype: string; principal?: number; rate?: number; termYears?: number; age: number; years: number; amount: number };
        if (ev.subtype === 'mortgage' && age >= evAge && age < evAge + ev.years) {
          extraExp += calcMortgage(expEv.principal ?? 0, expEv.rate ?? 0, expEv.termYears ?? 0);
        } else if (kind === 'lump' && age === evAge) {
          extraExp += ev.amount;
        } else if (kind === 'period' && age >= evAge && age < evAge + ev.years) {
          extraExp += ev.amount;
        }
      }
    }

    let income = baseInc + extraInc;
    const expense = currentBaseExp * inflM + extraExp;
    const nisaActive  = !isRet && age <= p.acct.nisa.toAge;
    const idecoActive = !isRet && age <= p.acct.ideco.toAge && p.hasIdeco;
    const taxActive   = !isRet && age <= p.acct.tax.toAge;

    // ── Growth ──
    nisa  += nisa  * (nisaRate  / 100);
    if (idecoStatus === 'accumulation' || idecoStatus === 'pension') ideco += ideco * (idecoRate / 100);
    tax   += tax   * (taxRate   / 100);

    spNisa  += spNisa  * (nisaRate  / 100);
    if (spIdecoStatus === 'accumulation' || spIdecoStatus === 'pension') spIdeco += spIdeco * (idecoRate / 100);
    spTax   += spTax   * (taxRate   / 100);

    // ── Spouse per-year tax/KPI tracking ──
    // 本人・配偶者は完全に独立会計。本人のiDeCoプールに配偶者残高を合算する処理は存在しない
    // （配偶者自身の一時金・年金・併用処理は下の「Spouse retirement income processing」ブロックで完結する）。
    let spRetirementTaxPaid = 0, spSeveranceNet = 0, spIdecoTaxPaid = 0;

    // ── Main retirement income processing (iDeCo lump + severance) ──
    let idecoTaxPaid = 0, retirementTaxPaid = 0, severanceNet = 0;
    let idecoBalanceBeforeWithdrawalThisYear: number | null = null;
    const retirementIncomes: Array<{ type: string; amount: number }> = [];
    if (severanceGross > 0) {
      retirementIncomes.push({ type: 'severance', amount: severanceGross });
    }
    if (isIdecoStart && !idecoExitDone && !isPension) {
      // split: push only the lump portion; the pension portion stays in ideco
      const lumpAmount = isSplit ? ideco * ((p.idecoSplitRatio ?? 50) / 100) : ideco;
      retirementIncomes.push({ type: 'ideco', amount: lumpAmount });
    }
    if (retirementIncomes.length > 0) {
      const totalSev   = retirementIncomes.filter(r => r.type === 'severance').reduce((s, r) => s + r.amount, 0);
      const totalIdeco = retirementIncomes.filter(r => r.type === 'ideco').reduce((s, r) => s + r.amount, 0);
      const res = retirementTaxCalc(totalIdeco, totalSev, p.idecoYrs, p.sevYrs);
      if (totalSev > 0) { cash += res.severanceNet; severanceNet = Math.round(res.severanceNet); }
      if (totalIdeco > 0) {
        idecoTaxPaid += Math.round(totalIdeco - res.idecoNet);
        idecoBalanceBeforeWithdrawalThisYear = Math.round(ideco);
        idecoWithdrawalAmount = Math.round(res.idecoNet);
        cash += res.idecoNet;
        if (isSplit) {
          // Keep the pension portion; only the lump portion was withdrawn
          ideco = ideco * (1 - (p.idecoSplitRatio ?? 50) / 100);
        } else {
          ideco = 0;
          idecoStatus = 'closed';
        }
      }
      retirementTaxPaid = Math.round((totalSev - res.severanceNet) + (totalIdeco - res.idecoNet));
    }
    if (isIdecoStart && !idecoExitDone) {
      if (isPension || isSplit) { idecoStatus = 'pension'; idecoRemainingYears = p.idecoReceiveYears; }
      idecoExitDone = true;
    }

    // ── Spouse retirement income processing (iDeCo lump + severance) ──
    const spRetirementIncomes: Array<{ type: string; amount: number }> = [];
    if (spSeveranceGross > 0) {
      spRetirementIncomes.push({ type: 'severance', amount: spSeveranceGross });
    }
    if (isSpIdecoStart && !spIdecoExitDone && !spIsPension) {
      // split: push only the lump portion; the pension portion stays in spIdeco
      const spLumpAmount = spIsSplit ? spIdeco * ((p.spouse?.idecoSplitRatio ?? 50) / 100) : spIdeco;
      spRetirementIncomes.push({ type: 'ideco', amount: spLumpAmount });
    }
    if (spRetirementIncomes.length > 0) {
      const totalSev   = spRetirementIncomes.filter(r => r.type === 'severance').reduce((s, r) => s + r.amount, 0);
      const totalIdeco = spRetirementIncomes.filter(r => r.type === 'ideco').reduce((s, r) => s + r.amount, 0);
      const res = retirementTaxCalc(totalIdeco, totalSev, spIdecoYrs, spSevYrs);
      if (totalSev > 0) { cash += res.severanceNet; spSeveranceNet = Math.round(res.severanceNet); }
      if (totalIdeco > 0) {
        spRetirementTaxPaid += Math.round(totalIdeco - res.idecoNet);
        spIdecoTaxPaid += Math.round(totalIdeco - res.idecoNet);
        spIdecoWithdrawalAmount = Math.round(res.idecoNet);
        cash += res.idecoNet;
        if (spIsSplit) {
          // Keep the pension portion; only the lump portion was withdrawn
          spIdeco = spIdeco * (1 - (p.spouse?.idecoSplitRatio ?? 50) / 100);
        } else {
          spIdeco = 0;
          spIdecoStatus = 'closed';
        }
      }
      spRetirementTaxPaid += Math.round(totalSev - res.severanceNet);
    }
    if (isSpIdecoStart && !spIdecoExitDone) {
      if (spIsPension || spIsSplit) { spIdecoStatus = 'pension'; spIdecoRemainingYears = p.spouse?.idecoReceiveYears ?? 10; }
      spIdecoExitDone = true;
    }

    // ── Main iDeCo pension payout ──
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
        if (idecoRemainingYears <= 0 || ideco <= 0) { ideco = 0; idecoStatus = 'closed'; }
      } else {
        ideco = 0; idecoStatus = 'closed';
      }
    }

    // ── Spouse iDeCo pension payout ──
    let spIdecoAnnualGross = 0;
    if (spIdecoStatus === 'pension' && spIdecoExitDone) {
      if (spIdecoRemainingYears > 0 && spIdeco > 0) {
        const spIdecoAnnualPension = spIdeco / spIdecoRemainingYears;
        spIdeco = Math.max(0, spIdeco - spIdecoAnnualPension);
        spIdecoRemainingYears--;
        const spCurrentPenAmt = spAge >= (p.spouse?.penAge ?? 65) ? (p.spouse?.penAmt ?? 0) : 0;
        const spPensionTax = Math.round(calcPensionTaxDiff(spCurrentPenAmt, spIdecoAnnualPension, spAge));
        // 年金税（雑所得課税）は退職所得税(spRetirementTaxPaid)には含めない。本人側のidecoTaxPaid/
        // retirementTaxPaidの分離と対称にするため、iDeCo手取りカード用のspIdecoTaxPaidにのみ計上する。
        spIdecoTaxPaid += spPensionTax;
        spIdecoAnnualGross = Math.round(spIdecoAnnualPension);
        income += Math.max(0, spIdecoAnnualPension - spPensionTax);
        if (spIdecoRemainingYears <= 0 || spIdeco <= 0) { spIdeco = 0; spIdecoStatus = 'closed'; }
      } else {
        spIdeco = 0; spIdecoStatus = 'closed';
      }
    }

    let fillCash = 0, fillNisa = 0;
    let idecoLockedBankrupt = false;

    if (!isRet) {
      // ── Main contributions ──
      const nisaCon  = nisaActive  ? p.acct.nisa.con  : 0;
      const idecoCon = idecoActive ? p.acct.ideco.con : 0;
      const taxCon   = taxActive   ? p.acct.tax.con   : 0;
      let nisaConEff = nisaCon, idecoConEff = idecoCon, taxConEff = taxCon;
      for (const cc of conChanges.nisa)  { if (age >= cc.age) nisaConEff  = cc.amount; }
      for (const cc of conChanges.ideco) { if (age >= cc.age) idecoConEff = cc.amount; }
      for (const cc of conChanges.tax)   { if (age >= cc.age) taxConEff   = cc.amount; }

      // ── Spouse contributions (applied while main person is in accumulation) ──
      let spNisaCon = 0, spIdecoCon = 0, spTaxCon = 0;
      if (p.spouse?.acct && !isSpRet) {
        if (spAge <= p.spouse.acct.nisa.toAge)  spNisaCon  = p.spouse.acct.nisa.con;
        if (spAge <= p.spouse.acct.ideco.toAge) spIdecoCon = p.spouse.acct.ideco.con;
        if (spAge <= p.spouse.acct.tax.toAge)   spTaxCon   = p.spouse.acct.tax.con;
        for (const cc of spConChanges.nisa)  { if (age >= p.curAge + (cc.age - spCurAge)) spNisaCon  = cc.amount; }
        for (const cc of spConChanges.ideco) { if (age >= p.curAge + (cc.age - spCurAge)) spIdecoCon = cc.amount; }
        for (const cc of spConChanges.tax)   { if (age >= p.curAge + (cc.age - spCurAge)) spTaxCon   = cc.amount; }
      }

      const totalCon = nisaConEff + spNisaCon + idecoConEff + spIdecoCon + taxConEff + spTaxCon;
      const avail = income - expense;
      const actualCon = Math.min(totalCon, Math.max(0, avail + cash));
      const ratio = totalCon > 0 ? Math.min(1, actualCon / totalCon) : 0;

      if (nisaActive)  nisa  += nisaConEff  * ratio;
      spNisa += spNisaCon  * ratio;
      if (idecoActive) ideco += idecoConEff * ratio;
      spIdeco += spIdecoCon * ratio;
      if (taxActive) {
        tax          += taxConEff * ratio;
        taxCostBasis += taxConEff * ratio;
      }
      spTax          += spTaxCon * ratio;
      spTaxCostBasis += spTaxCon * ratio;

      cash += avail - totalCon * ratio;
      if (cash < 0) {
        const def = -cash; cash = 0;
        if (strategy === 'proportional') {
          // iDeCoは積立期に引き出し不可のため除外
          const inv = nisa + spNisa + tax + spTax;
          if (inv > 0) {
            const r = Math.min(1, def / inv);
            nisa  = Math.max(0, nisa  - nisa  * r);
            spNisa = Math.max(0, spNisa - spNisa * r);
            taxCostBasis = Math.max(0, taxCostBasis - taxCostBasis * r);
            spTaxCostBasis = Math.max(0, spTaxCostBasis - spTaxCostBasis * r);
            tax   = Math.max(0, tax   - tax   * r);
            spTax = Math.max(0, spTax - spTax * r);
          }
        } else {
          // iDeCoは積立期に引き出し不可のため除外
          const orders: Array<'tax' | 'nisa'> = ['tax', 'nisa'];
          let rem = def;
          const a = { nisa: nisa + spNisa, tax: tax + spTax };
          for (const k of orders) {
            if (rem <= 0) break;
            if (k === 'tax') {
              const t = Math.min(rem, a.tax);
              const ratio2 = a.tax > 0 ? t / a.tax : 0;
              const mainTax = tax, spT = spTax;
              taxCostBasis    = Math.max(0, taxCostBasis    - taxCostBasis    * ratio2);
              spTaxCostBasis  = Math.max(0, spTaxCostBasis  - spTaxCostBasis  * ratio2);
              tax   = Math.max(0, mainTax - mainTax * ratio2);
              spTax = Math.max(0, spT     - spT     * ratio2);
              a.tax -= t; rem -= t;
            } else {
              const t = Math.min(rem, a[k]);
              const ratio2 = a[k] > 0 ? t / a[k] : 0;
              if (k === 'nisa') { nisa  = Math.max(0, nisa  - nisa  * ratio2); spNisa = Math.max(0, spNisa - spNisa * ratio2); }
              a[k] -= t; rem -= t;
            }
          }
        }
      }
    } else {
      // ── Retirement withdrawal ──
      const surplus = income - expense;
      if (surplus >= 0) {
        cash += surplus;
      } else {
        const need = -surplus;
        // idecoStartAge未到達の間はiDeCoを取崩対象から除外
        const idecoLocked = idecoStatus === 'accumulation';
        const cn = nisa + spNisa;
        const ci = idecoLocked ? 0 : (ideco + spIdeco);
        const ct = tax + spTax, cc = cash + spCash;
        const ccb = taxCostBasis + spTaxCostBasis;

        // iDeCoロック中（受給開始前）は、iDeCo以外の資産（NISA・特定口座・現金）
        // だけで生活費不足を賄いきれない場合、iDeCo残高自体は正でも実質的な資金
        // ショート（破綻）とみなす。iDeCoは原則中途引き出し不可のため、残高の
        // 有無は判定に含めない。withdraw()を呼ぶ前のこの時点でチェックすることで、
        // withdraw()本体・WithdrawResult型には一切手を入れずに済む。
        if (idecoLocked && need > cn + ct + cc) {
          idecoLockedBankrupt = true;
        } else {
          const res = withdraw(cn, ci, ct, cc, ccb, need, strategy);
          if (cn > 0) { const r = res.nisa  / cn; nisa  = r * (cn - spNisa);  spNisa  = r * spNisa;  }
          else        { nisa = 0; spNisa = 0; }
          if (!idecoLocked) {
            if (ci > 0) { const r = res.ideco / ci; ideco = r * (ci - spIdeco); spIdeco = r * spIdeco; }
            else        { ideco = 0; spIdeco = 0; }
          }
          if (ct > 0) { const r = res.tax   / ct; tax   = r * (ct - spTax);   spTax   = r * spTax;   }
          else        { tax = 0; spTax = 0; }
          if (cc > 0) { const r = res.cash  / cc; cash  = r * (cc - spCash);  spCash  = r * spCash;  }
          else        { cash = 0; spCash = 0; }
          if (ccb > 0) {
            const r = res.costBasis / ccb;
            taxCostBasis   = r * (ccb - spTaxCostBasis);
            spTaxCostBasis = r * spTaxCostBasis;
          } else { taxCostBasis = 0; spTaxCostBasis = 0; }
          fillCash = res.fillCash; fillNisa = res.fillNisa;
        }
      }
    }

    // iDeCoロック中の資金ショート（破綻）確定時は、iDeCoを含む全口座残高を0円に
    // する。新しい表示ルールは作らず、既存の「全口座0円→break→末尾ゼロ埋め」
    // （475行目・末尾のtargetLenループ）にそのまま合流させる。
    if (idecoLockedBankrupt) {
      nisa = 0; ideco = 0; tax = 0; cash = 0;
      spNisa = 0; spIdeco = 0; spTax = 0; spCash = 0;
    }

    nisa   = Math.max(0, nisa);
    ideco  = Math.max(0, ideco);
    tax    = Math.max(0, tax);
    cash   = Math.max(0, cash);
    spNisa  = Math.max(0, spNisa);
    spIdeco = Math.max(0, spIdeco);
    spTax   = Math.max(0, spTax);
    spCash  = Math.max(0, spCash);

    snaps.push({
      age,
      nisa,
      ideco,
      tax,
      cash,
      spNisa,
      spIdeco,
      spTax,
      spCash,
      totalAssets: Math.round(nisa + ideco + tax + cash + spNisa + spIdeco + spTax + spCash),
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
      hasSeverance: severanceGross > 0,
      baseExp: Math.round(currentBaseExp * inflM),
      idecoStatus,
      idecoBalanceBeforeWithdrawal: idecoBalanceBeforeWithdrawalThisYear,
      idecoWithdrawalAmount,
      severanceNet,
      spIdecoWithdrawalAmount,
      spRetirementTaxPaid,
      spSeveranceNet,
      spIdecoAnnualGross,
      spIdecoTaxPaid,
    });

    idecoWithdrawalAmount    = null;
    spIdecoWithdrawalAmount  = null;

    if (nisa + ideco + tax + cash + spNisa + spIdeco + spTax + spCash === 0) break;
  }

  const targetLen = p.lifeEx - p.curAge + 1;
  while (snaps.length < targetLen) {
    const l = snaps[snaps.length - 1];
    snaps.push({
      ...l,
      age: l.age + 1,
      totalAssets: 0, nisa: 0, ideco: 0, tax: 0, cash: 0,
      spNisa: 0, spIdeco: 0, spTax: 0, spCash: 0,
      cashFlow: 0,
      nisaActive: false, idecoActive: false, taxActive: false,
      idecoTaxPaid: 0, fillCash: 0, fillNisa: 0,
      idecoStatus: 'closed',
      idecoBalanceBeforeWithdrawal: null,
      idecoWithdrawalAmount: null,
      spIdecoWithdrawalAmount: null,
      spRetirementTaxPaid: 0,
      spSeveranceNet: 0,
    });
  }

  return snaps;
}
