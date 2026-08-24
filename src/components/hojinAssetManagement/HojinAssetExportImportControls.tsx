'use client';

import { useRef, useState } from 'react';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import {
  exportToJson,
  exportToCsv,
  importFromJson,
  parseHojinHistoryCsv,
  applyHojinHistoryCsv,
  type ExportScope,
} from '@/lib/hojinAssetManagement/exportImport';

interface HojinAssetExportImportControlsProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  snapshots: HojinAssetSnapshot[];
  onImported: (hojinHoldings: AssetHolding[], personalHoldings: AssetHolding[], hojinSnapshots?: HojinAssetSnapshot[], personalSnapshots?: AssetSnapshot[]) => void;
  /** 保存上限超過による自動削除が発生したときに呼ばれる（追加実装：保存上限変更）。 */
  onRemoved?: (removedHojin: HojinAssetSnapshot[], removedPersonal: AssetSnapshot[]) => void;
}

// 個人資産管理ツールのAssetExportImportControls.tsx（ロック対象外）の2ボックス構成を踏襲しつつ、
// 「法人のみ／合算」の共通トグルを追加（10章）。JSON・CSVの両Exportがこのトグルに従う。
export default function HojinAssetExportImportControls({
  hojinHoldings,
  personalHoldings,
  snapshots,
  onImported,
  onRemoved,
}: HojinAssetExportImportControlsProps) {
  const [scope, setScope] = useState<ExportScope>('combined');
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromJson(file);
      onImported(result.hojinHoldings, result.personalHoldings, result.snapshots);
    } catch {
      alert('JSONの読み込みに失敗しました');
    } finally {
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  /** 年月ラベル付きCSVを読み込み、影響を受ける年月の一覧を示す確認ダイアログを挟んで適用する（1-3節）。 */
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseHojinHistoryCsv(text);
      if (parsed.affectedYearMonths.length > 0) {
        const confirmed = window.confirm(`${parsed.affectedYearMonths.join('、')} の記録を上書きします。よろしいですか？`);
        if (!confirmed) return;
      }
      const result = applyHojinHistoryCsv(parsed);
      onImported(result.hojinHoldings, result.personalHoldings, result.hojinSnapshots, result.personalSnapshots);
      if (result.removedHojin.length > 0 || result.removedPersonal.length > 0) {
        onRemoved?.(result.removedHojin, result.removedPersonal);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVの読み込みに失敗しました');
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 法人のみ／合算 共通トグル（Export時にのみ影響。Importはファイル内容から自動判定） */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">エクスポート範囲:</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
          <button
            type="button"
            onClick={() => setScope('hojin')}
            className={`px-3 py-1 ${scope === 'hojin' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            法人のみ
          </button>
          <button
            type="button"
            onClick={() => setScope('combined')}
            className={`px-3 py-1 ${scope === 'combined' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            合算
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-1">JSON</p>
          <p className="text-[11px] text-slate-400 mb-2">法人保有資産・記録履歴（合算時は個人資産も含む）の完全バックアップ</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportToJson(hojinHoldings, personalHoldings, snapshots, scope)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              JSONでエクスポート
            </button>
            <label className="cursor-pointer text-xs border border-dashed border-slate-300 rounded-lg px-3 py-1.5 text-slate-500 hover:border-slate-400">
              JSONをインポート
              <input ref={jsonFileInputRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-1">CSV</p>
          <p className="text-[11px] text-slate-400 mb-2">保有資産＋記録履歴（年月ラベル付き）。表計算ソフトで編集し、この形式のまま読み込み直せます</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportToCsv(hojinHoldings, personalHoldings, snapshots, scope)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50"
            >
              CSVでエクスポート
            </button>
            <label className="cursor-pointer text-xs border border-dashed border-slate-300 rounded-lg px-3 py-1.5 text-slate-500 hover:border-slate-400">
              CSVをインポート
              <input ref={csvFileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
