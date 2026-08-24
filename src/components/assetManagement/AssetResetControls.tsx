'use client';

import { useState } from 'react';

export type ResetScope = 'personal' | 'hojin' | 'both';

interface AssetResetControlsProps {
  onReset: (scope: ResetScope, includeSettings: boolean) => void;
}

const SCOPE_LABEL: Record<ResetScope, string> = {
  personal: '個人のみ',
  hojin: '法人のみ',
  both: '両方',
};

// 資産管理ツールの全データリセット機能（追加実装4章）。保有資産・記録履歴（移転履歴ログを
// 含む）を対象範囲（個人のみ／法人のみ／両方）ごとに完全に削除する。設定値（目標資産額・
// 個人化想定比率）を削除するかどうかは対象範囲の選択とは別に選べる。取り消せない操作のため、
// 実行前に対象範囲を明示した確認ダイアログを必ず挟む。
export default function AssetResetControls({ onReset }: AssetResetControlsProps) {
  const [scope, setScope] = useState<ResetScope>('personal');
  const [includeSettings, setIncludeSettings] = useState(false);

  const handleExecute = () => {
    const settingsNote = includeSettings ? '（設定値を含む）' : '（設定値は保持されます）';
    const confirmed = window.confirm(
      `「${SCOPE_LABEL[scope]}」の保有資産・記録履歴${settingsNote}をすべて削除します。この操作は取り消せません。よろしいですか？`
    );
    if (!confirmed) return;
    onReset(scope, includeSettings);
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-red-700">全データを削除する</h3>
      <p className="text-[11px] text-red-500">
        保有資産・記録履歴（法人は移転履歴ログを含む）を完全に削除します。この操作は取り消せません。
      </p>

      <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs w-fit">
        {(['personal', 'hojin', 'both'] as ResetScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`px-3 py-1 ${scope === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {SCOPE_LABEL[s]}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={includeSettings}
          onChange={(e) => setIncludeSettings(e.target.checked)}
        />
        設定値（目標資産額・個人化想定比率）も削除する
      </label>

      <button
        type="button"
        onClick={handleExecute}
        className="mt-1 text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 w-fit"
      >
        削除を実行
      </button>
    </div>
  );
}
