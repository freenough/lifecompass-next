'use client';

interface PersonalizationRatioSliderProps {
  ratio: number;
  onChange: (ratio: number) => void;
  hojinTotal: number;
}

// 7章：個人化想定比率スライダー。法人保有資産合計×比率＝個人化想定額（表示専用、
// simulate.tsには一切連携しない）。
export default function PersonalizationRatioSlider({ ratio, onChange, hojinTotal }: PersonalizationRatioSliderProps) {
  const personalizedAmount = Math.round(hojinTotal * (ratio / 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="personalization-ratio" className="text-xs font-semibold text-slate-600">
          個人化想定比率
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
        まだ引き出していない法人保有資産のうち、将来どのくらいの割合を個人の手取りとして受け取れそうか、目安をご自身で設定してください（資産移転ヘルパーで実際に移転した分は実績として扱われ、この比率の対象には含まれません）
      </p>
      <p className="mt-2 text-xs text-slate-600">
        個人化想定額: <span className="font-bold text-slate-900">{personalizedAmount.toLocaleString()}万円</span>
      </p>
    </div>
  );
}
