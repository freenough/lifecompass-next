'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountUp, prefersReducedMotion } from '@/hooks/useCountUp';
import { calcCompositionPercentages } from '@/lib/hojinAssetManagement/compositionBar';
import { DEMO_HOLDINGS_TOTAL } from '@/lib/lp/demoHoldings';
import { DEMO_HOJIN_HOLDINGS_TOTAL } from '@/lib/lp/demoHojinHoldings';

// 濃紺（CTAボタンと同色）。HitoriHojinManageSection.tsxのNAVYと同じ値。
const NAVY = '#0F2A4A';
const HATCH_BG = 'rgba(15,42,74,0.2)';

// 読み込み中の枠（HitoriHojinManageSection.tsxのdynamic loading、h-[162px]）と高さを揃えるため、
// 各行の高さを固定している：バー20＋凡例(mt12＋20＋gap6＋20)＋mb16＋白ボックス68＝162px。

// 一人法人LP 法人資産ブロックの「個人＋法人 合算」カード本体。ツール（HojinAssetCompositionBar）と
// 同じく、個人＋法人の合計を100%とした内訳を本物のcalcCompositionPercentages()で求め、
// 描画だけLP側のデザイン（個人＝濃紺、法人＝斜線）で行う（impl_hitori_hojin_manage_live_demo.md 3節）。
// 画面に30%入った時点で一度だけアニメーションを始める仕組みはAssetProgressBadges.tsxに合わせる。
export default function HojinCompositionDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  // 「動きを減らす」設定では画面に入るのを待たず、最初から最終状態を表示する。
  const [reducedMotion] = useState(prefersReducedMotion);
  const [entered, setEntered] = useState(reducedMotion);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || entered) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [entered]);

  const combinedTotal = DEMO_HOLDINGS_TOTAL + DEMO_HOJIN_HOLDINGS_TOTAL;
  const { personalPct, hojinPct } = calcCompositionPercentages(DEMO_HOLDINGS_TOTAL, DEMO_HOJIN_HOLDINGS_TOTAL);
  const totalVal = useCountUp(entered ? combinedTotal : null, 1200, 0);

  const barTransition = reducedMotion ? 'none' : 'width 1.2s cubic-bezier(0.33, 1, 0.68, 1)';

  return (
    <div ref={rootRef}>
      <div className="w-full h-5 rounded-full bg-slate-200 overflow-hidden flex">
        <div
          style={{ width: entered ? `${personalPct}%` : '0%', backgroundColor: NAVY, transition: barTransition }}
          aria-hidden="true"
        />
        <div
          style={{
            width: entered ? `${hojinPct}%` : '0%',
            backgroundImage: `repeating-linear-gradient(45deg, ${NAVY}, ${NAVY} 3px, transparent 3px, transparent 6px)`,
            backgroundColor: HATCH_BG,
            transition: barTransition,
          }}
          aria-hidden="true"
        />
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 mb-4">
        <li className="flex items-center gap-2 h-5 text-xs text-slate-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NAVY }} aria-hidden="true" />
          個人資産
          <span className="ml-auto text-slate-500">
            {DEMO_HOLDINGS_TOTAL.toLocaleString()}万円（{Math.round(personalPct)}%）
          </span>
        </li>
        <li className="flex items-center gap-2 h-5 text-xs text-slate-600">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${NAVY}, ${NAVY} 2px, transparent 2px, transparent 4px)`,
              backgroundColor: HATCH_BG,
            }}
            aria-hidden="true"
          />
          法人保有資産
          <span className="ml-auto text-slate-500">
            {DEMO_HOJIN_HOLDINGS_TOTAL.toLocaleString()}万円（{Math.round(hojinPct)}%）
          </span>
        </li>
      </ul>

      <div className="rounded-lg bg-white p-3 h-[68px]">
        <p className="text-[11px] text-slate-400">個人＋法人 合計</p>
        <p className="mt-0.5 text-lg font-bold text-slate-900">{Math.round(totalVal).toLocaleString()}万円</p>
      </div>
    </div>
  );
}
