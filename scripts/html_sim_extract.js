const INC_TYPES={
  reemploy:{label:'再雇用',kind:'period',color:'#3B6D11',defYrs:5,defAmt:240},
  sidejob:{label:'副業',kind:'period',color:'#085041',defYrs:10,defAmt:60},
  rental:{label:'賃貸収入',kind:'period',color:'#0F6E56',defYrs:20,defAmt:96},
  inheritance:{label:'相続',kind:'lump',color:'#27500A',defAmt:1000},
  severance:{label:'退職金',kind:'lump',color:'#3B6D11',defAmt:500},
  other_inc:{label:'その他収入',kind:'period',color:'#639922',defYrs:5,defAmt:100},
  inc_change:{label:'収入変更',kind:'inc_change',color:'#2E6FA3',defAmt:500}
};

const EXP_TYPES={
  education:{label:'教育費',kind:'period',color:'#993C1D',defYrs:4,defAmt:100},
  care:{label:'介護費',kind:'period',color:'#A32D2D',defYrs:3,defAmt:80},
  renovation:{label:'住宅修繕',kind:'lump',color:'#854F0B',defAmt:200},
  mortgage:{label:'住宅ローン',kind:'mortgage',color:'#6B4423',defYrs:35},
  other_exp:{label:'その他支出',kind:'period',color:'#BA7517',defYrs:3,defAmt:50},
  base_change:{label:'生活費変更',kind:'base_change',color:'#5B5EA6',defAmt:350},
  nisa_con_change: {label:'NISA積立変更',  kind:'con_change',acct:'nisa', color:'#1A6EB5',defAmt:360},
  ideco_con_change:{label:'iDeCo積立変更', kind:'con_change',acct:'ideco',color:'#0E7A5F',defAmt:27.6},
  tax_con_change:  {label:'特定口座積立変更',kind:'con_change',acct:'tax',  color:'#6E44A3',defAmt:50}
};

function randNorm(mean,std){
  let u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();
  return Math.max(-50,Math.min(50, mean+std*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)));
}

function calcMortgage(principal, rate, termYears){
  if(!principal||!termYears)return 0;
  const r=rate/100/12;
  const n=termYears*12;
  if(r<=0)return Math.round(principal/termYears*100)/100;
  const monthly=principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  return Math.round(monthly*12*100)/100;
}

function calcPensionTaxDiff(penAmt, idecoAnnual, age){
  function deduction(total, over65){
    if(over65){
      if(total<=330) return 110;
      if(total<=410) return total*0.25+27.5;
      if(total<=770) return total*0.15+68.5;
      return total*0.05+145.5;
    } else {
      if(total<=130) return 60;
      if(total<=410) return total*0.25+27.5;
      if(total<=770) return total*0.15+68.5;
      return total*0.05+145.5;
    }
  }
  const over65 = age>=65;
  const taxRate = 0.20315; // 所得税+住民税（簡略化・一律）
  const taxWithout = Math.max(0, penAmt   - deduction(penAmt, over65))               * taxRate;
  const taxWith    = Math.max(0, penAmt + idecoAnnual - deduction(penAmt+idecoAnnual, over65)) * taxRate;
  return Math.max(0, taxWith - taxWithout); // iDeCoが原因で増えた税額のみ
}

function retirementTaxCalc(idecoBalance, severanceAmount, dcYears, sevYears){
  const hasSev=severanceAmount>0;
  const yrs=Math.max(1,Math.floor(hasSev?Math.max(dcYears,sevYears):dcYears));
  const deduction=yrs<=20?40*yrs:800+70*(yrs-20); // 万円
  const total=idecoBalance+severanceAmount;
  if(total<=0)return{idecoNet:0,severanceNet:0,totalTax:0};
  const taxable=Math.max(0,total-deduction)/2; // 退職所得=1/2
  const totalTax=taxable*0.20315;
  // 税額を受取額で按分
  const taxRatio=totalTax/total;
  return{
    idecoNet:Math.max(0,idecoBalance-idecoBalance*taxRatio),
    severanceNet:Math.max(0,severanceAmount-severanceAmount*taxRatio),
    totalTax
  };
}

function withdraw(nisa,ideco,tax,cash,costBasis,need,strategy){
  if(need<=0)return{nisa,ideco,tax,cash,costBasis,補填Cash:0,補填Nisa:0};
  if(strategy==='proportional'){
    const total=nisa+ideco+tax+cash;
    if(total<=0)return{nisa:0,ideco:0,tax:0,cash:0,costBasis:0,補填Cash:0,補填Nisa:0};
    const r=Math.min(1,need/total);
    // 特定口座：手取りtax*r相当を引き出すためのgross逆算
    const gainR=tax>0?Math.max(0,(tax-costBasis)/tax):0;
    const netPer=1-gainR*0.20315;
    const taxGross=Math.min(tax, netPer>0?(tax*r)/netPer:tax*r);
    const taxNet=taxGross*netPer;
    const taxRatio=tax>0?taxGross/tax:0;
    // 各口座の手取り合計
    const totalNet=nisa*r+ideco*r+taxNet+cash*r;
    const shortfall=Math.max(0,need-totalNet); // [BUG-1] 課税による不足分
    // 不足分を現金→NISAで補填
    const newCash=Math.max(0,cash-cash*r);
    let cashFill=0, nisaFill=0;
    let rem=shortfall;
    if(rem>0&&newCash>0){ cashFill=Math.min(rem,newCash); rem-=cashFill; }
    let newNisa=Math.max(0,nisa-nisa*r);
    if(rem>0&&newNisa>0){ nisaFill=Math.min(rem,newNisa); rem-=nisaFill; }
    return{
      nisa:Math.max(0,newNisa-nisaFill),
      ideco:Math.max(0,ideco-ideco*r),
      tax:Math.max(0,tax-taxGross),
      cash:Math.max(0,newCash-cashFill),
      costBasis:Math.max(0,costBasis-costBasis*taxRatio),
      補填Cash:cashFill,
      補填Nisa:nisaFill
    };
  }
  // 順序型：cash_first → [cash→tax→nisa→ideco]、taxable_first → [tax→cash→nisa→ideco]
  const order=strategy==='cash_first'?['cash','tax','nisa','ideco']:['tax','cash','nisa','ideco'];
  let rem=need;
  const a={nisa,ideco,tax,cash};
  let newCost=costBasis;
  for(const k of order){
    if(rem<=0)break;
    if(k==='tax'){
      // 特定口座：手取りrem相当を取り出すためgrossを逆算
      if(a.tax<=0)continue;
      const gainR=Math.max(0,(a.tax-newCost)/a.tax);
      const netPer=1-gainR*0.20315; // 1万gross当たりの手取り
      const gross=Math.min(netPer>0?rem/netPer:rem, a.tax);
      const net=gross*netPer;
      newCost=Math.max(0,newCost-newCost*(gross/a.tax));
      a.tax=Math.max(0,a.tax-gross);
      rem=Math.max(0,rem-net);
    }else{
      const t=Math.min(rem,a[k]);a[k]-=t;rem-=t;
    }
  }
  return{nisa:a.nisa,ideco:a.ideco,tax:a.tax,cash:a.cash,costBasis:newCost,補填Cash:0,補填Nisa:0};
}

function calcIdecoEligibleAge(idecoYrs, curAge, idecoToAge){
  // 60歳時点での通算加入年数 = 現在加入年数 + (min(積立終了歳,60) - 現在年齢) の残積立年数
  const additionalYrs = Math.max(0, Math.min(idecoToAge, 60) - curAge);
  const totalYrs = idecoYrs + additionalYrs;
  if(totalYrs>=10) return 60;
  if(totalYrs>=8)  return 61;
  if(totalYrs>=6)  return 62;
  if(totalYrs>=4)  return 63;
  if(totalYrs>=2)  return 64;
  return 65;
}

function simulate(p, evs, strategy, shockOverrides=null){
  const snaps=[];
  let nisa=p.acct.nisa.bal, ideco=p.acct.ideco.bal, tax=p.acct.tax.bal, cash=p.acct.cash.bal;
  // 特定口座のコスト基準（初期残高を取得原価と仮定）
  let taxCostBasis=p.acct.tax.costBasis??p.acct.tax.bal;
  // iDeCo退職一時金は退職年に1回だけ課税処理
  let idecoExitDone=false;
  // idecoStatus: 'accumulation' | 'pension' | 'closed'
  let idecoStatus='accumulation';
  // idecoWithdrawal: 一時金受取年の表示用（受取前残高・受取額）
  let idecoBalanceBeforeWithdrawal=null;
  let idecoWithdrawalAmount=null;
  // iDeCo年金受取用（CHECK-3）
  const isPension = p.idecoReceiveType==='pension';
  let idecoRemainingYears = p.idecoReceiveYears; // 残り受取年数

  // base_changeイベントを年齢順にソートして保持
  const baseChanges=evs
    .filter(ev=>ev.category==='expense'&&ev.subtype==='base_change')
    .sort((a,b)=>a.age-b.age);
  // inc_changeイベントを年齢順にソートして保持
  const incChanges=evs
    .filter(ev=>ev.category==='income'&&ev.subtype==='inc_change')
    .sort((a,b)=>a.age-b.age);
  // con_changeイベントを口座別・年齢順にソートして保持
  const conChanges={
    nisa: evs.filter(ev=>ev.category==='expense'&&ev.subtype==='nisa_con_change').sort((a,b)=>a.age-b.age),
    ideco:evs.filter(ev=>ev.category==='expense'&&ev.subtype==='ideco_con_change').sort((a,b)=>a.age-b.age),
    tax:  evs.filter(ev=>ev.category==='expense'&&ev.subtype==='tax_con_change').sort((a,b)=>a.age-b.age)
  };

  for(let age=p.curAge; age<=p.lifeEx; age++){
    const yr=age-p.curAge;
    const inflM=Math.pow(1+p.inflR/100, yr);
    const isRet=age>=p.retAge;
    const isIdecoStart=age>=p.idecoStartAge; // iDeCo受取開始年齢（退職年とは独立）
    // [Step 10] 口座別利回り + shock（MCモード時）
    const shock=shockOverrides ? shockOverrides[yr] : 0;
    const nisaRate =(isRet ? p.acct.nisa.rR  : p.acct.nisa.rW)  + shock;
    const idecoRate=(isRet ? p.acct.ideco.rR : p.acct.ideco.rW) + shock;
    const taxRate  =(isRet ? p.acct.tax.rR   : p.acct.tax.rW)   + shock;


    // retInc参照を完全除去（引き継ぎ課題#2解消）
    let baseInc=isRet ? 0 : p.baseInc;
    // inc_changeイベント適用（退職前のみ・年齢順に上書き）
    if(!isRet){
      for(const ic of incChanges){
        if(age>=ic.age) baseInc=ic.amount;
      }
    }
    if(age>=p.penAge) baseInc+=p.penAmt;
    // 配偶者収入
    if(p.spouse){
      // [WARN-7] spCurAge活用：配偶者の現在年齢が設定されている場合、
      // spRetAge/spPenAgeを配偶者年齢基準で判定する
      // 配偶者年齢 = spCurAge + (age - curAge)
      const spAge = p.spouse.spCurAge ? p.spouse.spCurAge + (age - p.curAge) : null;
      const spRetOk = spAge !== null ? spAge < p.spouse.retAge : age < p.spouse.retAge;
      const spPenOk = spAge !== null ? spAge >= p.spouse.penAge : age >= p.spouse.penAge;
      if(spRetOk) baseInc+=p.spouse.inc;
      if(spPenOk) baseInc+=p.spouse.penAmt;
    }

    // 有効な支出ベース
    let currentBaseExp=p.baseExp;
    for(const bc of baseChanges){
      if(age>=bc.age) currentBaseExp=bc.amount;
    }

    let extraInc=0, extraExp=0;
    // [BUG-2] 退職年のseveranceは合算課税のため別管理
    let severanceGross=0;
    for(const ev of evs){
      const cfg=ev.category==='income'?(INC_TYPES[ev.subtype]||{}):(EXP_TYPES[ev.subtype]||{});
      if(ev.subtype==='base_change'||ev.subtype==='inc_change'||ev.subtype==='nisa_con_change'||ev.subtype==='ideco_con_change'||ev.subtype==='tax_con_change') continue;
      if(ev.category==='income'){
        if(ev.subtype==='severance'&&age===ev.age){
          // severanceは退職年にiDeCoと合算課税するため分離（退職年以外は通常加算）
          if(isRet) severanceGross+=ev.amount;
          else extraInc+=ev.amount;
        } else if(cfg.kind==='lump'&&age===ev.age) extraInc+=ev.amount;
        else if(cfg.kind==='period'&&age>=ev.age&&age<ev.age+ev.years) extraInc+=ev.amount;
      }else{
        if(ev.subtype==='mortgage'&&age>=ev.age&&age<ev.age+ev.years){
          extraExp+=calcMortgage(ev.principal,ev.rate,ev.termYears);
        }else if(cfg.kind==='lump'&&age===ev.age) extraExp+=ev.amount;
        else if(cfg.kind==='period'&&age>=ev.age&&age<ev.age+ev.years) extraExp+=ev.amount;
      }
    }

    let income=baseInc+extraInc;
    const expense=currentBaseExp*inflM+extraExp;
    const nisaActive =!isRet && age<=p.acct.nisa.toAge;
    const idecoActive=!isRet && age<=p.acct.ideco.toAge && p.hasIdeco;
    const taxActive  =!isRet && age<=p.acct.tax.toAge;

    // 運用益（現金は除く）— [Step 10] 口座別利回り
    // iDeCoはclosed（一時金受取済み）の場合は運用益なし
    nisa+=nisa*(nisaRate/100);
    if(idecoStatus==='accumulation'||idecoStatus==='pension') ideco+=ideco*(idecoRate/100);
    tax+=tax*(taxRate/100);

    // ---- 退職所得イベント集約課税（退職金＋iDeCo一時金を同年なら合算）----
    let idecoTaxPaid=0;
    let retirementTaxPaid=0;
    let severanceNet=0; // 表示専用：退職金手取り額（cashに直接加算済み・income列表示用）

    // 退職金を退職年のみ積み上げ
    const retirementIncomes=[];
    let severanceGrossForIdeco=0;
    if(isRet && severanceGross>0){
      retirementIncomes.push({type:'severance', amount:severanceGross});
      severanceGrossForIdeco=severanceGross; // 同年iDeCo一時金と合算するために退避
    } else if(!isRet && severanceGross>0){
      // 退職年以外のseverance（通常ありえないが念のため通常加算）
      cash+=severanceGross;
    }

    // iDeCo一時金を受取開始年に積み上げ
    if(isIdecoStart && !idecoExitDone && !isPension){
      retirementIncomes.push({type:'ideco', amount:ideco});
    }

    // 退職所得イベントが1件以上あれば合算課税
    if(retirementIncomes.length>0){
      const totalSev=retirementIncomes.filter(r=>r.type==='severance').reduce((s,r)=>s+r.amount,0);
      const totalIdeco=retirementIncomes.filter(r=>r.type==='ideco').reduce((s,r)=>s+r.amount,0);
      const res=retirementTaxCalc(totalIdeco, totalSev, p.idecoYrs, p.sevYrs);
      // 退職金の手取りを現金へ
      if(totalSev>0){ cash+=res.severanceNet; severanceNet=Math.round(res.severanceNet); }
      // iDeCo一時金の処理
      if(totalIdeco>0){
        const idecoPaid=Math.round(totalIdeco-res.idecoNet);
        idecoTaxPaid+=idecoPaid;
        idecoBalanceBeforeWithdrawal=Math.round(ideco);
        idecoWithdrawalAmount=Math.round(res.idecoNet);
        cash+=res.idecoNet;
        ideco=0;
        idecoStatus='closed';
      }
      retirementTaxPaid=Math.round((totalSev-res.severanceNet)+(totalIdeco-res.idecoNet));
    }

    // ---- iDeCo受取処理（受取開始年齢・年金モード）----
    if(isIdecoStart && !idecoExitDone){
      if(isPension){
        // --- 年金受取：退職所得課税なし・pensionステータスへ ---
        idecoStatus='pension';
        idecoRemainingYears=p.idecoReceiveYears;
      }
      idecoExitDone=true;
    }

    // --- iDeCo年金受取処理（pensionステータス中・毎年）---
    // 税引き後受取額をincomeに加算してsurplus計算に反映
    let idecoAnnualGross=0; // 税引き前年金受取額（スナップ記録用）
    if(idecoStatus==='pension' && idecoExitDone){
      if(idecoRemainingYears>0 && ideco>0){
        // 年初運用済みの残高を残り年数で割る
        const idecoAnnualPension=ideco/idecoRemainingYears;
        ideco=Math.max(0,ideco-idecoAnnualPension);
        idecoRemainingYears--;
        // 差分課税：iDeCoを受け取ったことで増えた税額のみ記録
        const currentPenAmt = age>=p.penAge ? p.penAmt : 0;
        const pensionTax=Math.round(calcPensionTaxDiff(currentPenAmt, idecoAnnualPension, age));
        idecoTaxPaid+=pensionTax;
        idecoAnnualGross=Math.round(idecoAnnualPension); // 税引き前受取額を記録
        // 税引き後受取額をincomeに加算（surplus = income - expenseに反映）
        income+=Math.max(0,idecoAnnualPension-pensionTax);
        // 受取完了
        if(idecoRemainingYears<=0 || ideco<=0){
          ideco=0;
          idecoStatus='closed';
        }
      } else {
        ideco=0;
        idecoStatus='closed';
      }
    }

    // [BUG-1] 補填額（withdraw呼び出し後に記録）
    let fillCash=0, fillNisa=0;

    if(!isRet){
      const nisaCon =nisaActive ?p.acct.nisa.con :0;
      const idecoCon=idecoActive?p.acct.ideco.con:0;
      const taxCon  =taxActive  ?p.acct.tax.con  :0;
      // con_change: 口座ごとに積立額を個別上書き
      let nisaConEff=nisaCon, idecoConEff=idecoCon, taxConEff=taxCon;
      for(const cc of conChanges.nisa){  if(age>=cc.age) nisaConEff=cc.amount; }
      for(const cc of conChanges.ideco){ if(age>=cc.age) idecoConEff=cc.amount; }
      for(const cc of conChanges.tax){   if(age>=cc.age) taxConEff=cc.amount; }
      const totalCon=nisaConEff+idecoConEff+taxConEff;
      const avail=income-expense;
      const actualCon=Math.min(totalCon,Math.max(0,avail+cash));
      const ratio=totalCon>0?Math.min(1,actualCon/totalCon):0;
      if(nisaActive)  nisa+=nisaConEff*ratio;
      if(idecoActive) ideco+=idecoConEff*ratio;
      if(taxActive){
        tax+=taxConEff*ratio;
        taxCostBasis+=taxConEff*ratio; // 積立分はコスト基準に加算
      }
      cash+=avail-totalCon*ratio;
      // 現金不足時の補填：戦略に準じた順序（積立期）
      if(cash<0){
        const def=-cash; cash=0;
        // 補填順序：taxable_first/cash_firstは特定→NISA→iDecoの順、proportionalは比例
        if(strategy==='proportional'){
          const inv=nisa+ideco+tax;
          if(inv>0){
            const r=Math.min(1,def/inv);
            nisa=Math.max(0,nisa-nisa*r);
            ideco=Math.max(0,ideco-ideco*r);
            // 特定口座は課税なし（積立期の補填は強制清算とみなし簡略化）
            taxCostBasis=Math.max(0,taxCostBasis-taxCostBasis*r);
            tax=Math.max(0,tax-tax*r);
          }
        }else{
          // 特定→NISA→iDecoの順で補填
          const orders=['tax','nisa','ideco'];
          let rem=def;
          const a={nisa,ideco,tax};
          for(const k of orders){
            if(rem<=0)break;
            if(k==='tax'){
              const t=Math.min(rem,a.tax);
              const ratio2=a.tax>0?t/a.tax:0;
              taxCostBasis=Math.max(0,taxCostBasis-taxCostBasis*ratio2);
              a.tax=Math.max(0,a.tax-t);rem-=t;
            }else{
              const t=Math.min(rem,a[k]);a[k]-=t;rem-=t;
            }
          }
          nisa=a.nisa;ideco=a.ideco;tax=a.tax;
        }
      }
    }else{
      const surplus=income-expense;
      if(surplus>=0){cash+=surplus;}
      else{
        const res=withdraw(nisa,ideco,tax,cash,taxCostBasis,-surplus,strategy);
        nisa=res.nisa;ideco=res.ideco;tax=res.tax;cash=res.cash;taxCostBasis=res.costBasis;
        fillCash=res.補填Cash; fillNisa=res.補填Nisa; // [BUG-1] 補填額をスナップに記録
      }
    }

    nisa=Math.max(0,nisa);ideco=Math.max(0,ideco);tax=Math.max(0,tax);cash=Math.max(0,cash);
    snaps.push({age,totalAssets:Math.round(nisa+ideco+tax+cash),nisa:Math.round(nisa),ideco:Math.round(ideco),tax:Math.round(tax),cash:Math.round(cash),income:Math.round(income),expense:Math.round(expense),cashFlow:Math.round(income-expense),extraInc:Math.round(extraInc),extraExp:Math.round(extraExp),nisaActive,idecoActive,taxActive,idecoTaxPaid,retirementTaxPaid,idecoAnnualGross,fillCash:Math.round(fillCash),fillNisa:Math.round(fillNisa),hasSeverance:severanceGross>0&&isRet,baseExp:Math.round(currentBaseExp*inflM),idecoStatus,idecoBalanceBeforeWithdrawal,idecoWithdrawalAmount,severanceNet});
    // スナップ保存後に表示用変数をリセット
    idecoBalanceBeforeWithdrawal=null; idecoWithdrawalAmount=null;
    if(nisa+ideco+tax+cash===0)break;
  }
  // [Step 10] 枯渇後スナップ：ループ外のfillなのでshockOverridesは参照しない。
  // totalAssets:0で固定のため運用益計算も発生しない。rateは最終実スナップ値を引き継ぐが表示のみ。
  const targetLen=p.lifeEx-p.curAge+1;
  while(snaps.length<targetLen){const l=snaps[snaps.length-1];snaps.push({...l,age:l.age+1,totalAssets:0,nisa:0,ideco:0,tax:0,cash:0,cashFlow:0,nisaActive:false,idecoActive:false,taxActive:false,idecoTaxPaid:0,fillCash:0,fillNisa:0,idecoStatus:'closed'});}
  return snaps;
}