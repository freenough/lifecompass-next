// 資産移転ヘルパー（法人→個人）の実行履歴を保存するだけの独立ストレージ。
// 一覧表示・編集・削除UIは対象外（追加実装3-4節）。将来の予実比較機能で参照する可能性がある
// ための下地。ロックファイル非依存。

const TRANSFER_LOG_KEY = 'hojinTransferLog';

export interface TransferLogEntry {
  id: string;
  executedAt: string; // ISO日時
  mode: 'withdrawal' | 'salary'; // 取崩 / 役員報酬・給与
  amount: number; // 引き出し額（万円）
  appliedRate: number | null; // withdrawalのときのみ税率(%)、salaryはnull
  hojinDelta: number; // 常に-amount
  personalDelta: number; // withdrawal: amount*rate/100、salary: amount
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadTransferLog(): TransferLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRANSFER_LOG_KEY);
    return raw ? (JSON.parse(raw) as TransferLogEntry[]) : [];
  } catch {
    return [];
  }
}

function saveTransferLog(entries: TransferLogEntry[]): void {
  localStorage.setItem(TRANSFER_LOG_KEY, JSON.stringify(entries));
}

export function appendTransferLog(entry: Omit<TransferLogEntry, 'id' | 'executedAt'>): TransferLogEntry[] {
  const full: TransferLogEntry = {
    ...entry,
    id: generateId(),
    executedAt: new Date().toISOString(),
  };
  const next = [...loadTransferLog(), full];
  saveTransferLog(next);
  return next;
}
