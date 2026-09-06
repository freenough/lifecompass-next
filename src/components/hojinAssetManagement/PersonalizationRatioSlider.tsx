'use client';

import InfoTooltip from '@/components/simulator/InfoTooltip';
import { calcPersonalizedAmount, calcCombinedTotal } from '@/lib/hojinAssetManagement/personalization';

interface PersonalizationRatioSliderProps {
  ratio: number;
  onChange: (ratio: number) => void;
  hojinTotal: number;
  // instruction_remove_transfer_helper_and_update_personalization_ratio.md 0.4節：
  // 「個人＋法人（個人化後）」の合計行を出すために個人資産合計も必要。
  personalTotal: number;
}

// instruction_asset_management_page_layout_review.md 0.2節：直下に2本べた書きされていた
// 説明文を1つにまとめ、「？」アイコン（InfoTooltip）に格納した（内容は変えず、重複する
// 言い回しのみ整理）。スライダー直下には短いキャプション1行のみを残す。
const APPLIED_TAX_RATE_TOOLTIP =
  'まだ引き出していない法人保有資産のうち、将来どのくらいの割合を個人の手取りとして受け取れそうか、目安をご自身で設定してください（法人預金・本人の現金の欄に直接反映済みの分は実績として扱われ、この比率の対象には含まれません）。この比率は、法人保有資産が将来個人の手取りになるまでにかかる、法人側の税金（法人税）と個人側の税金（所得税・住民税・社会保険料）を合わせた実質的な負担率の見積もりです。法人の運営年数が長いほど、残高の大部分は過去の決算ですでに法人税を払い終えた内部留保である可能性が高く、その場合は個人側の税金のみ（目安20〜30%程度）に近づきます。直近で大きな利益が出て決算をまたいでいない場合は、法人税分を上乗せして見積もってください（目安40〜50%程度）。精緻な税務計算ではなく、ご自身の見積もりとして入力してください。';

// 7章：個人化想定比率スライダー。法人保有資産合計×比率＝個人化想定額（表示専用、
// simulate.tsには一切連携しない）。
// instruction_remove_transfer_helper_and_update_personalization_ratio.md 0.2節：
// 資産移転ヘルパー撤去に伴い、ラベルを「適用税率」に変更（呼称のみ統一。意味は従来通り
// 「まだ移転していない法人残高全体」に対する将来の個人化率の見積もり）。
export default function PersonalizationRatioSlider({ ratio, onChange, hojinTotal, personalTotal }: PersonalizationRatioSliderProps) {
  const personalizedAmount = calcPersonalizedAmount(hojinTotal, ratio);
  const combinedTotal = calcCombinedTotal(personalTotal, hojinTotal, ratio);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="personalization-ratio" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          適用税率
          <InfoTooltip text={APPLIED_TAX_RATE_TOOLTIP} />
        </label>
        <span className="text-sm font-bold text-slate-800">{ratio}%</span>
      </div>
      <input
        id="personalization-ratio"
        type="range"
        min={0}
        max={100}
        value={ratio}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-700"
      />
      <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
        将来、法人資産を個人へ移す際の実質的な負担率の見積もりです。
      </p>
      <p className="mt-2 text-xs text-slate-600">
        個人化想定額: <span className="font-bold text-slate-900">{personalizedAmount.toLocaleString()}万円</span>
      </p>
      <p className="mt-1 text-sm text-slate-600">
        個人＋法人（個人化後）: <span className="font-bold text-base text-slate-900">{combinedTotal.toLocaleString()}万円</span>
      </p>
    </div>
  );
}
