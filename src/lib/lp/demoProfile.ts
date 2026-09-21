import type { SimParams, LifeEvent } from '@/lib/types';

// HeroDemo.tsxから抽出した共通のLP用ダミープロファイル。ヒーローと「毎月の資産を、記録する。」
// カード（AssetProgressBadges.tsx）が同じ入力データでsimulate()/analyze()を独立に呼び出す際、
// 値そのもの（35歳・年収750万・NISA/iDeCo/特定口座/現金の4口座）が両者でズレないよう一箇所に集約する。
export const DEMO_PROFILE: SimParams = {
  curAge: 35, lifeEx: 90,
  baseInc: 750, baseExp: 360, inflR: 1,
  retAge: 60, penAge: 65, penAmt: 120,
  mcStd: 12, mcStdR: 8,
  hasIdeco: true, idecoYrs: 10,
  idecoReceiveType: 'pension', idecoReceiveYears: 15, idecoSplitRatio: 50, idecoStartAge: 60,
  sevYrs: 12,
  acct: {
    nisa:  { bal: 400, con: 120, toAge: 60, rW: 5, rR: 3.5 },
    ideco: { bal: 300, con: 27.6, toAge: 60, rW: 5, rR: 3.5 },
    tax:   { bal: 500, con: 0,    toAge: 60, rW: 5, rR: 3.5, costBasis: 500 },
    cash:  { bal: 300 },
  },
  spouse: null,
};

export const DEMO_EVENTS: LifeEvent[] = [
  { category: 'expense', subtype: 'base_change', age: 60, amount: 300, name: '', years: 0 },
];
