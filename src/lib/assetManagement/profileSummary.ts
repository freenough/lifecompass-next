import type { AssetHolding } from './types';

// instruction_phase2_ui_safety_hardening.md 2節：上書き保存の確認ダイアログに表示する
// 「対象プロファイルの現在の内容」「今画面の内容」の集計。既存のtotalAmount/hojinTotal
// （AssetManagementPage.tsx）と同じreduceパターンを1箇所に集約し、テスト可能にする
// （新規に計算方法を作らないこと、という指示に沿って既存パターンをそのまま使う）。

export interface ProfileHoldingsSummary {
  count: number;
  totalAmount: number;
}

export function summarizeProfileHoldings(
  holdings: AssetHolding[],
  hojinHoldings: AssetHolding[],
  profileId: string,
): ProfileHoldingsSummary {
  const personal = holdings.filter((h) => h.profileId === profileId);
  const hojin = hojinHoldings.filter((h) => h.profileId === profileId);
  return {
    count: personal.length + hojin.length,
    totalAmount: personal.reduce((s, h) => s + (h.amount || 0), 0) + hojin.reduce((s, h) => s + (h.amount || 0), 0),
  };
}
