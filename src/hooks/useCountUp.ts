'use client';

import { useEffect, useState } from 'react';

/**
 * targetへ向けてease-outで数値をカウントアップする。target===nullの間は0のまま待機し、
 * targetが非nullに変わった時点からアニメーションを開始する（HeroDemo.tsxのFIRE達成年齢等の
 * 表示から抽出。AssetAllocationDemo.tsxでも同じ仕組みを再利用する）。
 */
export function useCountUp(target: number | null, duration = 1200, decimals = 0): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === null) return;
    const start = Date.now();
    let frame: number;
    const step = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(parseFloat((target * eased).toFixed(decimals)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, decimals]);
  return val;
}
