'use client';

import { useRef } from 'react';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import { summarizeYearMonths } from '@/lib/assetManagement/csvHistory';
import {
  exportToJson,
  exportToCsv,
  parseJsonPayload,
  applyJsonPayload,
  detectCsvFormat,
  importHoldingsFromCsvText,
  parseAssetCsv,
  applyAssetCsv,
  type ImportResult,
} from '@/lib/assetManagement/exportImport';

interface AssetExportImportControlsProps {
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
  hojinHoldings: AssetHolding[];
  hojinSnapshots: HojinAssetSnapshot[];
  onImported: (result: ImportResult) => void;
  /** 保存上限超過による自動削除が発生したときに呼ばれる（追加実装：保存上限変更）。 */
  onRemoved: (removed: { personal: AssetSnapshot[]; hojin: HojinAssetSnapshot[] }) => void;
  /** CSVインポートが書き込むprofileId（csv_profile_scope_fix.md 1節：以前は'default'固定だった）。 */
  currentProfileId: string;
}

/**
 * 個人・法人の保有資産＋記録履歴の唯一のExport/Importブロック（simplify_csv_scope_and_fix_graph
 * _history_bug.md 2章）。以前は個人セクション用・法人セクション用に2つのコンポーネントへ分かれ
 * ていたが、Export/Importの挙動が表示トグルと無関係になったことで実質同じ処理になったため、
 * 1つのコンポーネント・1組のボタンに統合した（HojinAssetExportImportControls.tsxは削除）。
 */
export default function AssetExportImportControls({
  holdings,
  snapshots,
  hojinHoldings,
  hojinSnapshots,
  onImported,
  onRemoved,
  currentProfileId,
}: AssetExportImportControlsProps) {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * JSON Importはペイロードに含まれる範囲を「置き換え」る破壊的操作のため（json_import_replace
   * _not_merge.md 1章：バックアップ復元は「その時点の状態にすべて戻す」ことを意味し、マージ
   * （バックアップ後に増えたデータが残り続ける）は誤りだったため変更）、認識可能なデータを
   * 1つでも含む場合は必ず確認ダイアログで影響範囲を明示する（2章：文言も置き換えである
   * ことが明確に伝わるものに変更）。
   */
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseJsonPayload(text);
      if (parsed.hasContent) {
        const confirmed = window.confirm('現在のデータは、このファイルの内容に完全に置き換わります（ファイルに存在しない過去の記録は削除されます）。よろしいですか？');
        if (!confirmed) return;
      }
      const result = applyJsonPayload(parsed);
      onImported(result);
      onRemoved({ personal: result.removed, hojin: result.removedHojin });
    } catch {
      alert('JSONの読み込みに失敗しました');
    } finally {
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  /**
   * 影響を受ける年月の一覧を示す確認ダイアログの文言を組み立てる（3章：件数が多い場合の要約表示）。
   * 個人・法人の年月合計が5件以下ならすべて列挙、6件以上ならsummarizeYearMonthsで要約する。
   * 両方に対象がある場合のみ「個人：.../法人：...」とラベル分けする（片方だけなら現状通り
   * ラベルなし）。
   */
  function buildConfirmMessage(personalYearMonths: string[], hojinYearMonths: string[]): string {
    const totalCount = personalYearMonths.length + hojinYearMonths.length;
    const both = personalYearMonths.length > 0 && hojinYearMonths.length > 0;
    const parts: string[] = [];
    if (personalYearMonths.length > 0) {
      const summary = summarizeYearMonths(personalYearMonths, totalCount);
      parts.push(both ? `個人：${summary}` : summary);
    }
    if (hojinYearMonths.length > 0) {
      const summary = summarizeYearMonths(hojinYearMonths, totalCount);
      parts.push(both ? `法人：${summary}` : summary);
    }
    return `${parts.join('／')} の記録を上書きします。よろしいですか？`;
  }

  /**
   * 年月列ありの新形式（記録履歴対応）か、旧6列形式かをヘッダーだけで判定する。新形式は
   * 各行の「区分」列だけを見て、本人/配偶者行は個人ストアへ、法人行は法人ストアへ、それぞれ
   * 独立に書き込む（表示トグルは一切参照しない。simplify_csv_scope_and_fix_graph_history_bug.md
   * 2章）。旧6列形式も同じ「区分列で振り分け」を適用する（importHoldingsFromCsvText参照）。
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
        onImported(importHoldingsFromCsvText(text, currentProfileId));
        return;
      }
      const parsed = parseAssetCsv(text, currentProfileId);
      if (parsed.personalYearMonths.length === 0 && parsed.hojinYearMonths.length === 0) {
        alert('インポートできる内容がありませんでした。');
        return;
      }
      const confirmed = window.confirm(buildConfirmMessage(parsed.personalYearMonths, parsed.hojinYearMonths));
      if (!confirmed) return;
      const result = applyAssetCsv(parsed, currentProfileId);
      onImported(result);
      onRemoved({ personal: result.removed, hojin: result.removedHojin });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVの読み込みに失敗しました');
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  // instruction_phase2_ui_alignment.md 4節：ProfileDrawer.tsxと同じ縦積みボタン列スタイルに
  // 統一し、並び順をCSVでエクスポート→CSVをインポート→JSONでエクスポート→JSONをインポート
  // に固定する（呼び出し元のAssetManagerProfilePanel.tsxが、名前欄・保存ボタンの直後にこの
  // コンポーネントを配置し、その下に保存済みプロファイル一覧を続ける）。
  const buttonClass = 'w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50';
  const importLabelClass = 'w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 text-center hover:border-slate-400';

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => exportToCsv(holdings, snapshots, hojinHoldings, hojinSnapshots)} className={buttonClass}>
        CSVでエクスポート
      </button>
      <label className={importLabelClass}>
        CSVをインポート
        <input ref={csvFileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
      </label>
      <button onClick={() => exportToJson(holdings, snapshots, hojinHoldings, hojinSnapshots)} className={buttonClass}>
        JSONでエクスポート
      </button>
      <label className={importLabelClass}>
        JSONをインポート
        <input ref={jsonFileInputRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />
      </label>
    </div>
  );
}
