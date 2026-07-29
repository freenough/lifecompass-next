'use client';

import { useState } from 'react';
import { calcRetirementIncomeTax, calcRetirementDeduction, type RetirementPayType } from '@/lib/tax/retirement';

interface RetirementTaxResultProps {
  incomeManYen: number;
  serviceYears: number;
  isExecutive: boolean;
  hasDisabilityException: boolean;
}

const PAY_TYPE_LABEL: Record<RetirementPayType, string> = {
  general: '一般退職手当等',
  short_term: '短期退職手当等(勤続5年以下・役員等以外)',
  specified_executive: '特定役員退職手当等(役員等・勤続5年以下)',
};

function toManYen(yen: number): number {
  return Math.round(yen / 10_000);
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

export default function RetirementTaxResult({
  incomeManYen, serviceYears, isExecutive, hasDisabilityException,
}: RetirementTaxResultProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const incomeYen = incomeManYen * 10_000;
  const result = calcRetirementIncomeTax(incomeYen, serviceYears, isExecutive, hasDisabilityException);
  const deduction = calcRetirementDeduction(serviceYears, hasDisabilityException);

  const netManYen = toManYen(result.netAmount);
  const deductionManYen = toManYen(deduction);
  const taxableManYen = toManYen(result.taxableIncome);
  const incomeTaxManYen = toManYen(result.incomeTax);
  const residentTaxManYen = toManYen(result.residentTax.total);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">手取り額</p>
      <p className="mt-1 text-4xl sm:text-5xl font-bold text-accent leading-none [text-wrap:balance]">
        {fmt(netManYen)}
        <span className="ml-1 text-xl sm:text-2xl font-bold">万円</span>
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">退職金</span>
          <span className="font-medium">{fmt(incomeManYen)}万円</span>
        </div>
        <div className="flex justify-between py-1.5 border-t border-slate-100">
          <span className="text-slate-500">退職所得控除</span>
          <span className="font-medium">{fmt(deductionManYen)}万円</span>
        </div>
        <div className="flex justify-between py-1.5 border-t border-slate-100">
          <span className="text-slate-500">課税退職所得</span>
          <span className="font-medium">{fmt(taxableManYen)}万円</span>
        </div>
        <div className="flex justify-between py-1.5 border-t border-slate-100">
          <span className="text-slate-500">所得税(復興特別所得税込み)</span>
          <span className="font-medium">{fmt(incomeTaxManYen)}万円</span>
        </div>
        <div className="flex justify-between py-1.5 border-t border-slate-100">
          <span className="text-slate-500">住民税</span>
          <span className="font-medium">{fmt(residentTaxManYen)}万円</span>
        </div>
        <div className="flex justify-between py-2 border-t border-slate-300 mt-1">
          <span className="font-semibold text-slate-700">手取り</span>
          <span className="font-bold text-accent">{fmt(netManYen)}万円</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>計算根拠を見る</span>
          <span className="text-slate-400">{detailsOpen ? '▲' : '▼'}</span>
        </button>
        {detailsOpen && (
          <div className="px-3 pb-3 pt-1 text-xs text-slate-500 leading-relaxed space-y-2">
            <p>
              入力内容(勤続年数{serviceYears}年{serviceYears <= 5 && (isExecutive ? '・役員等' : '')})から、
              退職手当等の種類は<span className="font-medium text-slate-700">「{PAY_TYPE_LABEL[result.payType]}」</span>
              と判定しました。
            </p>
            <p>
              退職所得控除額{fmt(deductionManYen)}万円を差し引いた金額に、区分に応じた計算方法(一般・短期退職手当等は原則1/2、
              短期退職手当等の300万円超部分・特定役員退職手当等は1/2適用なし)を適用し、
              課税退職所得金額{fmt(taxableManYen)}万円を算出しています。
            </p>
            <p>
              所得税は令和8年分の源泉徴収税額速算表(復興特別所得税込み)、住民税は市民税6%・県民税4%の標準税率で
              それぞれ計算しています。自治体によって税率の配分が異なる場合があり、均等割等も考慮していない簡易計算です。
            </p>
            <p className="pt-2 border-t border-slate-100">
              本体の資産シミュレーターでは、長期にわたる資産推移を継続的に試算する都合上、退職所得税について一律20.315%の
              簡易モデルを採用しています。本ツールは、特定の受け取り方を確認するための単発計算のため、国税庁の一次情報に
              基づいてより精緻な計算を行っています。ただし、退職所得控除の重複調整(19年・9年ルール)は反映していません。
              実際の税額と本体シミュレーターの結果とは異なる場合があります。
            </p>
            <p>
              本ツールは、入力いただいた退職金額をそのまま名目金額(実際に受け取る時点の金額)として計算しています。
              物価上昇(インフレ)による調整は行っていません。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
