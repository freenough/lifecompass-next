import { calcPensionAmountAtAge, calcBreakEvenAge, REFERENCE_AGE } from '@/lib/pensionCore';

interface PensionTimingResultProps {
  basicAmount: number;
  employeesAmount: number;
  isNewRate: boolean;
  targetAge: number;
  compareEndAge: number;
}

function fmtSigned(v: number): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString('ja-JP')}`;
}

function fmtPct(v: number): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}`;
}

export default function PensionTimingResult({
  basicAmount, employeesAmount, isNewRate, targetAge, compareEndAge,
}: PensionTimingResultProps) {
  const selected = calcPensionAmountAtAge(basicAmount, employeesAmount, targetAge, isNewRate);
  const reference = calcPensionAmountAtAge(basicAmount, employeesAmount, REFERENCE_AGE, isNewRate);
  const breakEven = calcBreakEvenAge(basicAmount, employeesAmount, targetAge, isNewRate, compareEndAge);

  const diffAmount = selected.totalAmount - reference.totalAmount;
  const ratioPct = selected.rate * 100;
  const diffPct = (selected.rate - 1) * 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">{targetAge}歳受給での年額(概算)</p>
      <p className="mt-1 text-4xl sm:text-5xl font-bold text-accent leading-none [text-wrap:balance]">
        {selected.totalAmount.toLocaleString('ja-JP')}
        <span className="ml-1 text-xl sm:text-2xl font-bold">万円/年</span>
      </p>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        {targetAge}歳から受給すると、年額は{selected.totalAmount.toLocaleString('ja-JP')}万円になります(65歳受給比{ratioPct.toFixed(1)}%)
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs font-medium text-slate-500">65歳受給との差額</p>
          <p className="mt-1 text-lg font-semibold text-slate-700">
            {fmtSigned(diffAmount)}万円/年({fmtPct(diffPct)}%)
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">内訳(基礎/厚生)</p>
          <p className="mt-1 text-lg font-semibold text-slate-700">
            {selected.basicAmount.toLocaleString('ja-JP')} / {selected.employeesAmount.toLocaleString('ja-JP')}万円
          </p>
        </div>
      </div>

      {targetAge !== REFERENCE_AGE && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {breakEven.foundWithinHorizon ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-accent">{breakEven.age}歳</span>まで生きると65歳受給より得になります
            </p>
          ) : (
            <p className="text-sm text-slate-700">
              比較終了年齢({compareEndAge}歳)内では、65歳受給との逆転は起こりません
            </p>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed">
        <p>この試算は額面ベースの簡易計算です。在職老齢年金・加給年金・振替加算・税金・社会保険料・年金生活者支援給付金・障害年金/遺族年金との調整・企業年金等は考慮していません。</p>
        <p>繰上げ受給は、老齢基礎年金・老齢厚生年金を同時に請求することが原則です。</p>
        <p>繰上げ受給は取消できません。障害年金の請求に制限が生じる場合があるなど重要な制約があるため、実際の判断は年金事務所にご確認ください。</p>
        <p>本ツールはインフレ(物価上昇)を考慮しません。入力した利回りをそのまま複利計算するだけの試算です。入力する利回りが名目か実質かによって、将来の金額の意味合いが変わります。</p>
      </div>
    </div>
  );
}
