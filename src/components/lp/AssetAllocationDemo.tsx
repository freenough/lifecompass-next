'use client';

import { useEffect, useRef, useState } from 'react';
import AssetAllocationChart from '@/components/assetManagement/AssetAllocationChart';
import { useCountUp } from '@/hooks/useCountUp';
import { DEMO_HOLDINGS, DEMO_HOLDINGS_TOTAL } from '@/lib/lp/demoHoldings';

export default function AssetAllocationDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  // 画面内に入ったことを一度だけ検知する（IntersectionObserverはentered後すぐdisconnectし、
  // スクロールで往復しても再発火しない）。
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

  // 画面内に入るまではAssetAllocationChartをマウントしない。入った瞬間に初めてマウントする
  // ことで、Rechartsのデフォルトのマウントアニメーション（扇形が開く動き）を自然に発火させる。
  const totalVal = useCountUp(entered ? DEMO_HOLDINGS_TOTAL : null, 1200, 0);

  return (
    <div ref={rootRef}>
      {entered ? (
        <AssetAllocationChart holdings={DEMO_HOLDINGS} totalAmount={Math.round(totalVal)} />
      ) : (
        <div style={{ height: 220 }} aria-hidden="true" />
      )}
    </div>
  );
}
