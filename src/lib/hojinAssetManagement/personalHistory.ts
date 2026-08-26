import type { AssetSnapshot } from '@/lib/assetManagement/types';

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
