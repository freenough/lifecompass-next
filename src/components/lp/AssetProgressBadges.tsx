'use client';

import { useEffect, useRef, useState } from 'react';
import { simulate, analyze } from '@/lib';
import KpiCard from '@/components/simulator/KpiCard';
import { useCountUp } from '@/hooks/useCountUp';
import { useEqualHeight } from '@/hooks/useEqualHeight';
import { DEMO_PROFILE, DEMO_EVENTS } from '@/lib/lp/demoProfile';
import { DEMO_HOLDINGS_TOTAL } from '@/lib/lp/demoHoldings';

// 前回記録比は実データに基づく必要はなく、進捗が順調であることが伝わる適当な固定値でよい
// （KENZO了承済み、claude_instruction_asset_card_redesign_unified.md 2節）。実際のツール
// （AssetProgressPanel.tsx）の「絶対額＋%（比較対象日付）」という表示形式を踏襲する。
const PREV_DIFF_AMOUNT = 100; // 万円
const PREV_DIFF_PCT = 7.1;
const PREV_LABEL = '2026-08比';

// 狭幅（3列表示）でKpiCardのtruncateにより文字が欠けないよう、本体の「FIRE進捗」ブロック
// （目標資産額／目標までの進捗／前回記録比）より短い表記にする（HeroDemo.tsxのKPI_LABELSと
// 同じ理由。LP独自のラベルのため他画面には影響しない）。
const KPI_LABELS = ['目標資産', '進捗率', '前回比'];

export default function AssetProgressBadges() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number | null>(null);

  // 目標資産額の取得方法：ヒーロー（HeroDemo.tsx）と同じDEMO_PROFILE/DEMO_EVENTS（値自体は
  // lib/lp/demoProfile.tsに一本化済み）で、simulate()/analyze()をこのコンポーネント側で
  // 独立に呼び出す方式を採用（完了報告参照：計算を共有フックへ抽出するより、値の一元化だけで
  // 事足りるこの独立呼び出しの方がコード重複が少ないと判断した）。
  useEffect(() => {
    const snaps = simulate(DEMO_PROFILE, DEMO_EVENTS, 'cash_first');
    const a = analyze(snaps, DEMO_PROFILE);
    if (a.fA != null) {
      const fireSnap = snaps.find((s) => s.age === a.fA);
      if (fireSnap) setTargetAmount(fireSnap.totalAssets);
    }
  }, []);

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

  const loaded = targetAmount != null;
  // 目標までの進捗＝DEMO_HOLDINGS合計÷目標資産額。表示前に必ず丸め処理を通す（小数第1位）。
  const progressPct = loaded ? Math.round((DEMO_HOLDINGS_TOTAL / targetAmount) * 1000) / 10 : null;

  const targetVal   = useCountUp(entered && loaded ? targetAmount : null, 1200, 0);
  const progressVal = useCountUp(entered && progressPct != null ? progressPct : null, 1200, 1);
  const diffVal      = useCountUp(entered ? PREV_DIFF_AMOUNT : null, 1200, 0);

  const kpiValues = [
    loaded ? `${Math.round(targetVal).toLocaleString()}万円` : '—',
    loaded && progressPct != null ? `${progressVal.toFixed(1)}%` : '—',
    `+${Math.round(diffVal).toLocaleString()}万円`,
  ];
  // 「前回比」のsub行（%＋比較月）はカード幅に対して情報が細かすぎるため非表示にする
  // （claude_instruction_asset_card_width_fix.md 2節）。PREV_DIFF_PCT/PREV_LABEL自体は
  // 将来使う可能性があるため定数として残す。
  type Variant = 'good' | 'warn' | 'danger' | 'neutral';
  const kpiVariants: Variant[] = [
    'neutral',
    loaded && progressPct != null && progressPct >= 100 ? 'good' : 'neutral',
    'good',
  ];

  const { setRef: setKpiCardRef, maxHeight: kpiCardMaxHeight } = useEqualHeight(3);

  return (
    <div ref={rootRef} className="grid grid-cols-3 gap-2">
      {KPI_LABELS.map((label, i) => (
        <div
          key={label}
          ref={setKpiCardRef(i)}
          style={{
            opacity:   entered ? 1 : 0,
            transform: entered ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.4s ease ${i * 0.15}s, transform 0.4s ease ${i * 0.15}s`,
            ...(kpiCardMaxHeight ? { minHeight: kpiCardMaxHeight } : undefined),
          }}
        >
          <KpiCard label={label} value={kpiValues[i]} variant={kpiVariants[i]} size="sm" />
        </div>
      ))}
    </div>
  );
}
