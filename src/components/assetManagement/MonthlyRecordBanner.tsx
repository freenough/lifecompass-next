'use client';

import { isCurrentMonthRecorded } from '@/lib/assetManagement/monthlyCheck';
import type { AssetSnapshot } from '@/lib/assetManagement/types';

interface MonthlyRecordBannerProps {
  snapshots: AssetSnapshot[];
  onRecord: () => void;
}

export default function MonthlyRecordBanner({ snapshots, onRecord }: MonthlyRecordBannerProps) {
  if (isCurrentMonthRecorded(snapshots)) return null;

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-xs text-amber-800">今月はまだ記録していません。資産の推移を残しておきましょう。</p>
      <button
        onClick={onRecord}
        className="shrink-0 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
      >
        今すぐ記録する
      </button>
    </div>
  );
}
