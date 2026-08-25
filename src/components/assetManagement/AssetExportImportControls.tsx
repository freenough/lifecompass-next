'use client';

import { useRef } from 'react';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import type { AssetDisplayScope } from '@/lib/assetManagement/csvHistory';
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
  /**
   * ページ上の唯一の「表示：個人のみ／合算」トグル（AssetManagementPage.tsxのdisplayScope）を
   * そのまま受け取る。CSVインポートのスコープ対称化（csv_yyyymm_format_and_import_scope_fix.md
   * 2章）：combined時はCSV内の法人行も法人ストアへ書き込む。Export側は変更しない（現状通り
   * 個人のみを出力）。
   */
  displayScope: AssetDisplayScope;
  onImported: (holdings: AssetHolding[], snapshots: AssetSnapshot[], hojinHoldings?: AssetHolding[], hojinSnapshots?: HojinAssetSnapshot[]) => void;
  /** 保存上限超過による自動削除が発生したときに呼ばれる（追加実装：保存上限変更）。 */
  onRemoved?: (removed: AssetSnapshot[]) => void;
  /** combinedスコープのCSVインポートで法人側の記録が保存上限超過により自動削除された場合に呼ばれる。 */
  onRemovedHojin?: (removedHojin: HojinAssetSnapshot[]) => void;
}

export default function AssetExportImportControls({ holdings, snapshots, displayScope, onImported, onRemoved, onRemovedHojin }: AssetExportImportControlsProps) {
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
   * スコープはページ上の表示トグル（displayScope）に従う（csv_yyyymm_format_and_import_scope_fix.md
   * 2章）。personalOnly時：個人セクションでのCSVインポートは個人保有資産のみを対象とし、
   * 法人行が含まれていても反映しない（investigation_csv_duplicate_bug_and_reset_feature.md
   * バグB対応）。combined時：法人行も法人ストアへ書き込む。法人側のCSVインポートボタンから
   * 同じCSVを読み込んだ場合と同じ結果になる。旧6列形式（レガシー）は年月概念を持たないため
   * scopeに関わらず個人ストアのみ更新する（従来通り）。
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
      const parsed = parseHistoryCsv(text, displayScope);
      if (parsed.affectedYearMonths.length === 0) {
        alert(
          parsed.ignoredCorporateRowCount > 0
            ? 'このCSVには個人（本人/配偶者）の行が含まれていないため、インポートできる内容がありません。法人の行は個人インポートでは反映されません。'
            : 'インポートできる内容がありませんでした。'
        );
        return;
      }
      let message = `${parsed.affectedYearMonths.join('、')} の記録を上書きします。よろしいですか？`;
      if (parsed.ignoredCorporateRowCount > 0) {
        message += '\n\n※法人の行は個人インポートでは反映されません';
      } else if (displayScope === 'combined' && parsed.hojinGroups && parsed.hojinGroups.size > 0) {
        message += '\n\n※個人・法人の両方に反映されます';
      }
      const confirmed = window.confirm(message);
      if (!confirmed) return;
      const result = applyHistoryCsv(parsed);
      onImported(result.holdings, result.snapshots, result.hojinHoldings, result.hojinSnapshots);
      if (result.removed.length > 0) onRemoved?.(result.removed);
      if (result.removedHojin && result.removedHojin.length > 0) onRemovedHojin?.(result.removedHojin);
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
