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
}: AssetExportImportControlsProps) {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 設定値（目標資産額・個人化想定比率）・移転履歴ログを含むJSONの場合のみ、上書きされることを
   * 確認ダイアログで明示する（json_export_completeness_and_history_bug.md 2章）。含まない
   * JSON（保有資産・記録履歴のみ、または旧形式）は従来通り確認なしで取り込む。
   */
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseJsonPayload(text);
      if (parsed.includesSettings) {
        const confirmed = window.confirm('設定値（目標資産額・個人化想定比率）・移転履歴ログも上書きされます。よろしいですか？');
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
        onImported(importHoldingsFromCsvText(text));
        return;
      }
      const parsed = parseAssetCsv(text);
      if (parsed.personalYearMonths.length === 0 && parsed.hojinYearMonths.length === 0) {
        alert('インポートできる内容がありませんでした。');
        return;
      }
      const confirmed = window.confirm(buildConfirmMessage(parsed.personalYearMonths, parsed.hojinYearMonths));
      if (!confirmed) return;
      const result = applyAssetCsv(parsed);
      onImported(result);
      onRemoved({ personal: result.removed, hojin: result.removedHojin });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVの読み込みに失敗しました');
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {/* 左＝JSON：保有資産＋記録履歴を含む完全バックアップ。主導線として先に置く。 */}
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">JSON</p>
        <p className="text-[11px] text-slate-400 mb-2">個人・法人の保有資産・記録履歴・設定値（目標資産額・個人化想定比率）・移転履歴ログすべてを含む完全バックアップ</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportToJson(holdings, snapshots, hojinHoldings, hojinSnapshots)}
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
        <p className="text-[11px] text-slate-400 mb-2">個人・法人の保有資産＋記録履歴（年月ラベル付き）。表計算ソフトで編集し、この形式のまま読み込み直せます</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportToCsv(holdings, snapshots, hojinHoldings, hojinSnapshots)}
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
