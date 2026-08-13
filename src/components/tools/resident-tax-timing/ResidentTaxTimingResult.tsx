'use client';

import { useState } from 'react';
import { calcResidentTaxTiming, type ResidentTaxTimingInput } from '@/lib/tax/residentTaxTiming';
import ToolCard from '@/components/tools/ui/ToolCard';

interface ResidentTaxTimingResultProps {
  input: ResidentTaxTimingInput;
}

function toManYen(yen: number): number {
  return Math.round(yen / 10_000);
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

export default function ResidentTaxTimingResult({ input }: ResidentTaxTimingResultProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const result = calcResidentTaxTiming(input);
  const { currentYearTax, nextYearTax, assumptionNotes } = result;

  // 表示はすべて「個別に万円へ丸めてから合計する」方式に統一する(円単位のtotalCashNeededを
  // 直接丸めて使うと、①+②の丸め後合計とヘッドラインが一致しないケースがあるため)。
  // ①・②のセクション表示(残額・小計)も同じroundedCurrent/roundedNextを使うので、
  // ヘッドラインとの整合は常に保たれる。
  const roundedCurrent = toManYen(currentYearTax.remainingAmount);
  const roundedNext = toManYen(nextYearTax.total);
  const headlineManYen = roundedCurrent + roundedNext;
  const withheldManYen = currentYearTax.isWithheldAtSource ? roundedCurrent : 0;
  const selfPayManYen = headlineManYen - withheldManYen;

  return (
    <ToolCard variant="result">
      <div className="rounded-lg border border-accent bg-blue-50 p-4">
        <p className="text-sm font-medium text-slate-500">確保しておきたい現金の目安</p>
        <p className="mt-1 text-4xl sm:text-5xl font-bold text-slate-800 leading-none [text-wrap:balance]">
          {fmt(headlineManYen)}
          <span className="ml-1 text-xl sm:text-2xl font-bold">万円</span>
        </p>
        <div className="mt-3 border-t border-accent/20 pt-3 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>退職時に給与・退職金から差し引かれる想定</span>
            <span className="font-medium">{fmt(withheldManYen)}万円</span>
          </div>
          <div className="flex justify-between">
            <span>自分で納付する想定</span>
            <span className="font-medium">{fmt(selfPayManYen)}万円</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          退職時に差し引かれる想定の金額は、退職金・最終給与が十分にある場合の見込みです。不足する場合は、その分も自己資金での準備が必要になります。
        </p>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 leading-relaxed">
        本ツールは、独身・扶養家族なし・給与所得のみ(社会保険料控除等は未考慮)を前提とした
        簡易試算です。配偶者控除・扶養控除、事業所得・不動産所得等がある場合や、
        ふるさと納税・住宅ローン控除等を利用している場合は、実際の税額と異なります。
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
        <p className="text-xs font-semibold text-slate-500 mb-1">
          <span className="text-accent font-bold">①</span> 退職前から進行中の住民税の残り
          ({currentYearTax.incomeBasisYearLabel}の所得基準)
        </p>
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">徴収区分</span>
          <span className="font-medium">{currentYearTax.collectionType}</span>
        </div>
        <div className="flex justify-between py-1.5 border-t border-slate-100">
          <span className="text-slate-500">残額</span>
          <span className="font-semibold text-accent">{fmt(roundedCurrent)}万円</span>
        </div>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{currentYearTax.note}</p>
        {currentYearTax.nonTaxableWarning.mayBeNonTaxable && (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-relaxed">
            ⚠ {currentYearTax.nonTaxableWarning.message}
          </p>
        )}

        <p className="text-xs font-semibold text-slate-500 mt-4 mb-1">
          <span className="text-accent font-bold">②</span> 退職した年の所得をもとにした、翌年6月からの新しい住民税
        </p>
        <div className="flex justify-between py-1.5">
          <span className="text-slate-500">所得割</span>
          <span className="font-medium">{fmt(toManYen(nextYearTax.incomeTaxPart))}万円</span>
        </div>
        <div className="flex justify-between py-1.5 border-t border-slate-100">
          <span className="text-slate-500">均等割</span>
          <span className="font-medium">{fmt(toManYen(nextYearTax.perCapitaPart))}万円</span>
        </div>
        <div className="flex justify-between py-2 border-t border-slate-300 mt-1">
          <span className="font-semibold text-slate-700">小計</span>
          <span className="font-bold text-accent">{fmt(roundedNext)}万円</span>
        </div>
        {nextYearTax.nonTaxableWarning.mayBeNonTaxable && (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-relaxed">
            ⚠ {nextYearTax.nonTaxableWarning.message}
          </p>
        )}
      </div>

      {assumptionNotes.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 leading-relaxed space-y-1">
          {assumptionNotes.map((note, i) => (
            <p key={i}>※ {note}</p>
          ))}
        </div>
      )}

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
              なお、「①」「②」という呼び方はこのツール内でのわかりやすさのための呼称であり、
              税法上の正式な用語ではありません(税法上は退職所得・給与所得等、より詳細な区分があります)。
            </p>
            <p>
              「今の住民税の残り」は、退職時点で特別徴収(給与天引き)中の住民税年度の残額です。
              {currentYearTax.incomeBasisYearLabel}の年収{fmt(toManYen(currentYearTax.incomeBasisAmount))}万円を
              基準に、給与所得控除・住民税の基礎控除(43万円)を差し引いた課税所得に、
              市民税6%・県民税4%の標準税率と標準的な均等割(5,000円)を適用して年間税額を算出し、
              退職月から住民税年度末(5月)までの残り月数で按分しています(年間税額を残り月数で
              按分した概算です。実際の月ごとの徴収額とは一致しない場合があります)。
            </p>
            <p>
              「退職翌年6月からの新規課税」は、退職年の給与収入(退職前の給与を前年年収の
              月割りで仮定、退職後に別の収入があればそれも合算)を基準に、同様の方法で
              翌年度分の住民税を算出しています。
            </p>
            <p>
              給与所得控除は国税庁の令和7年分以後の速算表に基づく近似値です(本来、
              年収660万円未満の部分は所得税法別表第五という4,000円刻みの区分表を使うのが
              正式ルールですが、本ツールでは速算表による近似値を用いています)。この近似の差は
              収入が属する区分ごとに一意に決まります(190万円超〜360万円以下の区分:最大1,200円、
              360万円超〜660万円以下の区分:最大800円、660万円超〜850万円以下の区分:最大400円、
              それ以外の区分:差なし)。e-Gov法令API経由で取得した所得税法別表第五との
              突き合わせで確認済みです。
            </p>
            <p>
              普通徴収(自分で納付)に切り替わった場合の実際の納付回数・時期(第何期にいくら、など)は
              自治体によって異なり、公開情報だけでは一律の計算式を特定できなかったため、
              本ツールでは残額の合計のみを表示しています。
            </p>
            <p>
              給与所得が45万円(単身・扶養なしの場合に多くの自治体で採用されている水準・1級地)
              以下のときは、税額の表示に加えて非課税の可能性がある旨の警告を表示します。
              ただしこれは扶養状況・お住まいの自治体(級地区分)を反映しない簡易判定であり、
              税額そのものは非表示にしません。
            </p>
            <p className="pt-2 border-t border-slate-100">
              本ツールは、独身・扶養家族なし・給与所得のみを前提とした簡易試算です。
              社会保険料控除(健康保険・厚生年金等)、配偶者控除・扶養控除等の人的控除、
              事業所得・不動産所得・年金収入等の給与以外の所得、ふるさと納税・住宅ローン控除・
              医療費控除等の各種控除、自治体独自の超過課税は考慮していません。これらに該当する
              場合、実際の税額は本ツールの試算結果と異なります。入力する年収は額面(税込)の
              金額を想定しており、失業給付・傷病手当金等の非課税の給付は含めないでください。
            </p>
          </div>
        )}
      </div>
    </ToolCard>
  );
}
