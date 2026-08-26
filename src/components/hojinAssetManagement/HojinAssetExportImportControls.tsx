'use client';

import { useRef } from 'react';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import type { AssetDisplayScope } from '@/lib/assetManagement/csvHistory';
import {
  exportToJson,
  exportToCsv,
  importFromJson,
  parseHojinHistoryCsv,
  applyHojinHistoryCsv,
} from '@/lib/hojinAssetManagement/exportImport';

interface HojinAssetExportImportControlsProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  snapshots: HojinAssetSnapshot[];
  /**
   * 個人ストア自身の真の記録履歴（assetManagement/storage.tsのloadSnapshots()が返すもの）。
   * combinedスコープのCSV Exportで、法人スナップショットが持つpersonalHoldings（表示用の
   * 複製、記録タイミングによって歯抜けになりうる）ではなくこちらを使う
   * （followup_evidence_request_f5ee8f8.md 2章）。
   */
  personalSnapshots: AssetSnapshot[];
  /**
   * ページ上の唯一の「表示：個人のみ／合算」トグル（AssetManagementPage.tsxのdisplayScope）を
   * そのまま受け取る。以前このコンポーネントが独自に持っていた「エクスポート範囲」ローカル
   * トグルは廃止した（csv_yyyymm_format_and_import_scope_fix.md 2章：新しいスコープ概念を
   * 作らず、既にある表示トグルをExport/Import両方の判断材料として共有する）。
   */
  displayScope: AssetDisplayScope;
  onImported: (hojinHoldings: AssetHolding[], personalHoldings: AssetHolding[], hojinSnapshots?: HojinAssetSnapshot[], personalSnapshots?: AssetSnapshot[]) => void;
  /** 保存上限超過による自動削除が発生したときに呼ばれる（追加実装：保存上限変更）。 */
  onRemoved?: (removedHojin: HojinAssetSnapshot[]) => void;
  /** combinedスコープのCSVインポートで個人側の記録が保存上限超過により自動削除された場合に呼ばれる。 */
  onRemovedPersonal?: (removedPersonal: AssetSnapshot[]) => void;
}

// 個人資産管理ツールのAssetExportImportControls.tsx（ロック対象外）の2ボックス構成を踏襲。
// Export/Importのスコープはページ上の表示トグル（displayScope）に従う（10章、2章で刷新）。
export default function HojinAssetExportImportControls({
  hojinHoldings,
  personalHoldings,
  snapshots,
  personalSnapshots,
  displayScope,
  onImported,
  onRemoved,
  onRemovedPersonal,
}: HojinAssetExportImportControlsProps) {
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

  /**
   * 年月ラベル付きCSVを読み込み、影響を受ける年月の一覧を示す確認ダイアログを挟んで適用する（1-3節）。
   * スコープはページ上の表示トグル（displayScope）に従う（csv_yyyymm_format_and_import_scope_fix.md
   * 2章）。personalOnly時：法人セクションでのCSVインポートは法人保有資産（owner:'corporate'の行）
   * のみを対象とし、本人/配偶者行が含まれていても個人ツール本体のストアには一切書き込まない
   * （差し戻し対応remand_csv_date_parsing_and_scope_fix.md 2章の制約を維持）。確認ダイアログで
   * 「反映されません」と明示する。combined時：本人/配偶者行・法人行の両方をそれぞれ正しい
   * 保存先へ書き込む。個人側のCSVインポートボタンから同じCSVを読み込んだ場合と同じ結果になる。
   */
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseHojinHistoryCsv(text, displayScope);
      if (parsed.affectedYearMonths.length === 0) {
        alert(
          parsed.ignoredPersonalRowCount > 0
            ? 'このCSVには法人（法人）の行が含まれていないため、インポートできる内容がありません。本人/配偶者の行は法人インポートでは反映されません。'
            : 'インポートできる内容がありませんでした。'
        );
        return;
      }
      let message = `${parsed.affectedYearMonths.join('、')} の記録を上書きします。よろしいですか？`;
      if (parsed.ignoredPersonalRowCount > 0) {
        message += '\n\n※本人/配偶者の行は法人インポートでは反映されません';
      } else if (displayScope === 'combined' && parsed.personalGroups && parsed.personalGroups.size > 0) {
        message += '\n\n※個人・法人の両方に反映されます';
      }
      const confirmed = window.confirm(message);
      if (!confirmed) return;
      const result = applyHojinHistoryCsv(parsed);
      onImported(result.hojinHoldings, result.personalHoldings ?? personalHoldings, result.hojinSnapshots, result.personalSnapshots);
      if (result.removedHojin.length > 0) {
        onRemoved?.(result.removedHojin);
      }
      if (result.removedPersonal && result.removedPersonal.length > 0) {
        onRemovedPersonal?.(result.removedPersonal);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVの読み込みに失敗しました');
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-1">JSON</p>
          <p className="text-[11px] text-slate-400 mb-2">法人保有資産・記録履歴（合算時は個人資産も含む）の完全バックアップ</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportToJson(hojinHoldings, personalHoldings, snapshots, displayScope)}
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
              onClick={() => exportToCsv(hojinHoldings, personalHoldings, snapshots, displayScope, personalSnapshots)}
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
