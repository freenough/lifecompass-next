'use client';

import { calcLumpSumPattern, calcPensionPattern, calcMixedPattern, type WithdrawalPatternResult } from '@/lib/tax/ideco';
import type { IdecoWithdrawalFormValues, ReceiveMethod } from './IdecoWithdrawalForm';
import DetailsAccordion from '@/components/tools/DetailsAccordion';
import ToolCard from '@/components/tools/ui/ToolCard';

interface IdecoWithdrawalResultProps {
  values: IdecoWithdrawalFormValues;
}

function toManYen(yen: number): number {
  return Math.round(yen / 10_000);
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

function fmtPct(v: number | null): string {
  if (v === null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

const METHOD_LABEL: Record<ReceiveMethod, string> = {
  lump: '一時金',
  pension: '年金',
  mixed: '併用',
};

export default function IdecoWithdrawalResult({ values }: IdecoWithdrawalResultProps) {
  const input = {
    idecoBalance: values.idecoBalanceManYen * 10_000,
    idecoYrs: values.idecoYrs,
    receiveAge: values.receiveAge,
    publicPensionAnnual: values.publicPensionAnnualManYen * 10_000,
    otherIncome: values.otherIncomeManYen * 10_000,
    severance: values.severanceManYen * 10_000,
    sevYrs: values.sevYrs,
    annuityYears: values.annuityYears,
  };

  const results: Record<ReceiveMethod, WithdrawalPatternResult> = {
    lump: calcLumpSumPattern(input),
    pension: calcPensionPattern(input),
    mixed: calcMixedPattern(input, values.lumpSumRatioPct),
  };

  const order: ReceiveMethod[] = ['lump', 'pension', 'mixed'];
  const best = order.reduce((a, b) => (results[b].idecoOnlyNetAmount > results[a].idecoOnlyNetAmount ? b : a));
  const selected = results[values.receiveMethod];
  const selectedLabel = METHOD_LABEL[values.receiveMethod];

  return (
    <ToolCard variant="result">
      <p className="text-sm font-medium text-slate-500">
        iDeCo/DC受取額(手取り)の比較(概算)
      </p>
      <p className="text-xs text-slate-400 -mt-0.5">
        一時金は一括受取額、年金・併用は{values.annuityYears}年間の受給合計です。
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {order.map(key => {
          const r = results[key];
          const isBest = key === best;
          const isSelected = key === values.receiveMethod;
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 ${
                isSelected ? 'border-accent bg-blue-50' : 'border-slate-200'
              }`}
            >
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                {METHOD_LABEL[key]}
                {isBest && <span className="text-[10px] font-bold text-accent">最大</span>}
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
                {fmt(toManYen(r.idecoOnlyNetAmount))}<span className="text-xs font-medium ml-0.5">万円</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">税額 {fmt(toManYen(r.idecoOnlyTax))}万円</p>
              <p className="text-xs text-slate-500">実効税率 {fmtPct(r.idecoOnlyEffectiveTaxRate)}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">
          参考:公的年金 年間{fmt(values.publicPensionAnnualManYen)}万円(税引前)
        </p>
        <p className="text-[11px] text-slate-400">※上記の比較には含まれていません</p>
      </div>

      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        この試算条件では、<span className="font-semibold text-accent">{METHOD_LABEL[best]}</span>での受取が手取り最大(概算)です。
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">{selectedLabel}パターンの内訳</p>

        {!(values.receiveMethod === 'pension' && values.severanceManYen === 0) ? (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-500 mb-1">一時金分(退職所得課税、一括受給)</p>
            <div className="text-sm text-slate-700">
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">退職所得控除</span>
                <span className="font-medium">{fmt(toManYen(selected.lumpSum.deduction))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">課税退職所得</span>
                <span className="font-medium">{fmt(toManYen(selected.lumpSum.taxableIncome))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">所得税+住民税</span>
                <span className="font-medium">{fmt(toManYen(selected.lumpSum.incomeTax + selected.lumpSum.residentTax.total))}万円</span>
              </div>
              <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
                <span className="text-slate-500">一時金分の手取り</span>
                <span className="font-semibold">{fmt(toManYen(selected.lumpSum.netAmount))}万円</span>
              </div>
            </div>
          </div>
        ) : null}

        {values.receiveMethod !== 'lump' && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">
              年金分(総合課税:公的年金+iDeCo年金を合算して計算・1年あたり)
            </p>
            <div className="text-sm text-slate-700">
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">公的年金等控除</span>
                <span className="font-medium">{fmt(toManYen(selected.pension.deduction))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">雑所得(公的年金+DC年金)</span>
                <span className="font-medium">{fmt(toManYen(selected.pension.taxableIncome))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">所得税の基礎控除</span>
                <span className="font-medium">{fmt(toManYen(selected.comprehensive.basicDeduction))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">所得税+復興特別所得税</span>
                <span className="font-medium">{fmt(toManYen(selected.comprehensive.incomeTax + selected.comprehensive.reconstructionTax))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">住民税</span>
                <span className="font-medium">{fmt(toManYen(selected.comprehensive.residentTax.total))}万円</span>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-200 pt-1.5 mt-1">
                ↓ 上記の合算税額を、iDeCoと公的年金のグロス金額比で按分
              </p>
              <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
                <span className="text-slate-500">iDeCo年金分の手取り(1年あたり)</span>
                <span className="font-semibold">{fmt(toManYen(selected.idecoOnlyNetPerYear))}万円</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between py-2 px-2 -mx-2 mt-2 rounded bg-blue-50">
          <span className="font-semibold text-slate-700">{selectedLabel}パターンの手取り総額(iDeCo単体・{values.annuityYears}年間)</span>
          <span className="font-bold text-accent">{fmt(toManYen(selected.idecoOnlyNetAmount))}万円</span>
        </div>
      </div>

      <DetailsAccordion label="計算根拠を見る" className="mt-4">
        <p>
          本ツールは、所得税(累進課税)・復興特別所得税・住民税・公的年金等控除を中心に、現行の税制に基づいて計算しています。
          本体シミュレーターは長期にわたる資産推移を継続的に試算する都合上、税額を一律20.315%とする簡易モデルを採用していますが、
          本ツールは特定の受け取り方を比較検討するための単発計算のため、より精緻な計算を行っています。また、差分方式による
          経路依存性を避け、各受取方法(一時金・年金・併用)について、指定いただいた受給期間全体で受け取れる手取り総額を
          直接計算しています。
        </p>
        <p>
          <strong>iDeCo単体の年金・併用パターンの手取り額について</strong><br />
          年金・併用パターンでは、iDeCo年金と公的年金を合算した金額に公的年金等控除・所得税・住民税を一括で計算しています。
          上記カードのiDeCo単体の手取り額は、この合算税額をiDeCoと公的年金のグロス金額比で按分した概算値です(差分計算では
          ありません)。実際の按分結果は、税額計算上の仮定によって多少変動する可能性があります。
        </p>
        <p>ただし、以下は反映していません:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            国民健康保険料・後期高齢者医療保険料・介護保険料(特に年金・併用パターンでは、公的年金等に係る雑所得の増加に
            伴いこれらの保険料負担も増える場合があり、本ツールの試算はその分だけ有利に見える可能性があります)
          </li>
          <li>退職所得控除の重複調整(19年・9年ルール)</li>
          <li>基礎控除以外の各種所得控除</li>
          <li>年金受取中の運用</li>
          <li>税制年度ごとの基礎控除差</li>
          <li>比較期間中に65歳をまたぐ場合の区分切り替え</li>
        </ul>
        <p>
          退職後も給与・事業所得等がある方は「年金以外の所得」欄への入力を推奨します。実際の受取可否・税額は金融機関・
          企業年金規約・税務署にご確認ください。
        </p>
        <p className="pt-2 border-t border-slate-100">
          本ツールは、受給期間中の物価上昇(インフレ)を考慮せず、入力いただいた年金額やその他所得等を、期間を通じて
          毎年同額の名目値として計算しています。実際の受取額は物価変動により変わる可能性があります。
        </p>
      </DetailsAccordion>
    </ToolCard>
  );
}
