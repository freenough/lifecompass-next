'use client';

import { useRef } from 'react';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import {
  exportToJson,
  exportToCsv,
  importFromJson,
  detectCsvFormat,
  importHoldingsFromCsvText,
  parseHistoryCsv,
  applyHistoryCsv,
} from '@/lib/assetManagement/exportImport';

interface AssetExportImportControlsProps {
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
  onImported: (holdings: AssetHolding[], snapshots: AssetSnapshot[]) => void;
  /** 保存上限超過による自動削除が発生したときに呼ばれる（追加実装：保存上限変更）。 */
  onRemoved?: (removed: AssetSnapshot[]) => void;
}

export default function AssetExportImportControls({ holdings, snapshots, onImported, onRemoved }: AssetExportImportControlsProps) {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { holdings: mergedHoldings, snapshots: mergedSnapshots } = await importFromJson(file);
      onImported(mergedHoldings, mergedSnapshots);
    } catch {
      alert('JSONの読み込みに失敗しました');
    } finally {
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  /**
   * 年月列ありの新形式（記録履歴対応）か、旧6列形式かをヘッダーだけで判定し、
   * 新形式のときのみ「影響を受ける年月ラベル」を示す確認ダイアログを挟む（1-3節）。
   */
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const format = detectCsvFormat(text);
      if (format === 'unknown') {
        alert('対応していないCSV形式です。自社のCSVエクスポート機能で出力したファイルを選択してください。');
        return;
      }
      if (format === 'legacy') {
        const mergedHoldings = importHoldingsFromCsvText(text);
        onImported(mergedHoldings, snapshots);
        return;
      }
      const parsed = parseHistoryCsv(text);
      if (parsed.affectedYearMonths.length > 0) {
        const confirmed = window.confirm(`${parsed.affectedYearMonths.join('、')} の記録を上書きします。よろしいですか？`);
        if (!confirmed) return;
      }
      const result = applyHistoryCsv(parsed);
      onImported(result.holdings, result.snapshots);
      if (result.removed.length > 0) onRemoved?.(result.removed);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVの読み込みに失敗しました');
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* 左＝JSON：保有資産＋記録履歴を含む完全バックアップ。主導線として先に置く（2.4節）。 */}
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">JSON</p>
        <p className="text-[11px] text-slate-400 mb-2">保有資産・記録履歴すべてを含む完全バックアップ</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportToJson(holdings, snapshots)}
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

      {/* 右＝CSV：保有資産＋記録履歴（年月ラベル付き）。表計算ソフトで編集してサイトに戻すための導線。 */}
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">CSV</p>
        <p className="text-[11px] text-slate-400 mb-2">保有資産＋記録履歴（年月ラベル付き）。表計算ソフトで編集し、この形式のまま読み込み直せます</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportToCsv(holdings, snapshots)}
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
  );
}
