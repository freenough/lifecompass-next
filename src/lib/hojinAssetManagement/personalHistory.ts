import type { AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from './types';

/**
 * 個人ストア自身の真の記録履歴（assetManagement/storage.tsのloadSnapshots()が返すもの）から、
 * 指定した年月に一致するスナップショットを探す。HojinAssetSnapshot.personalHoldings／
 * totalPersonalAmount（「記録する」を法人トグルON時に押した月だけ自動キャプチャされる
 * 表示用の複製、記録タイミングによって歯抜けになりうる）の代わりにこちらを優先参照するために使う
 * （simplify_csv_scope_and_fix_graph_history_bug.md 1章：グラフ・前回記録比カード・資産配分の
 * 変化テーブルの3箇所が同じ原因で同じ不具合を持っていたため、検索ロジックをここに集約する）。
 * 一致するエントリが無ければundefinedを返す。呼び出し側はフォールバック（表示用の複製）を
 * 明示的に指定すること（データを失わないため）。
 */
export function findPersonalSnapshot(personalSnapshots: AssetSnapshot[], date: string): AssetSnapshot | undefined {
  return personalSnapshots.find((s) => s.date === date);
}

/**
 * findPersonalSnapshotの法人版。指定した年月に一致する法人スナップショットを探す。
 */
export function findHojinSnapshot(hojinSnapshots: HojinAssetSnapshot[], date: string): HojinAssetSnapshot | undefined {
  return hojinSnapshots.find((s) => s.date === date);
}

/**
 * 「記録の行が存在するか」の判定の土台。個人スナップショットの日付集合と法人スナップショットの
 * 日付集合の和集合を昇順ソートして返す（claude_investigation_hojin_toggle_history_graph_bug.md：
 * 法人スナップショットが0件のプロファイルでは、個人側に記録があっても法人スナップショット配列
 * 単独を土台にしていた3箇所すべてで「記録なし」表示になっていた）。
 * ある年月がどちらか一方（または両方）に存在すれば、その年月の行は「存在する」ものとして扱う。
 */
export function getMergedRecordDates(personalSnapshots: AssetSnapshot[], hojinSnapshots: HojinAssetSnapshot[]): string[] {
  const dates = new Set<string>([
    ...personalSnapshots.map((s) => s.date),
    ...hojinSnapshots.map((s) => s.date),
  ]);
  return Array.from(dates).sort();
}
