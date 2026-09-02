// 資産管理ツール（hojinAssetManagement、ロック対象外）の法人保有資産データを、CompanyStateの
// 「①現在PF」に変換するワンショットの関数（最終版指示書3.6節）。
// 資産管理ツールの既存Export/Import基盤と同じ方式（同一オリジン内のlocalStorage直接読み取り、
// ファイル選択なし）。ボタン押下時に一括上書きする想定で、自動同期は行わない。

import { loadHojinHoldings } from '../hojinAssetManagement/storage';
import type { AssetHolding } from '../assetManagement/types';
import type { CorporatePortfolioRow } from './types';

// 変換ルール（3.6節）：
// - 法人証券口座 ＋ その他法人資産（不動産等） → 資産クラス％配分に変換、合計額はinvestedBalanceへ
// - 法人預金 ＋ 保険積立金 ＋ 貸付金・仮払金 → 合計してcashBalanceへ
const INVESTED_CATEGORIES = new Set(['法人証券口座', 'その他法人資産']);
const CASH_CATEGORIES = new Set(['法人預金', '保険積立金', '貸付金・仮払金']);

export interface ImportedCorporateAssets {
  rows: CorporatePortfolioRow[];
  investedBalance: number;
  cashBalance: number;
}

// instruction_phase2_companystate_rearchitecture.md 5.1節：資産管理ツール側の"今アクティブな"
// プロファイルを暗黙参照せず、呼び出し側（CorporatePortfolioPanel.tsxのインポート元セレクター）が
// 選んだprofileIdを明示的に受け取る。
export function importFromAssetManagement(profileId: string): ImportedCorporateAssets {
  const holdings: AssetHolding[] = loadHojinHoldings().filter((h) => h.profileId === profileId);

  const investedHoldings = holdings.filter(h => INVESTED_CATEGORIES.has(h.accountCategory));
  const cashHoldings = holdings.filter(h => CASH_CATEGORIES.has(h.accountCategory));

  const investedBalance = investedHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  const cashBalance = cashHoldings.reduce((s, h) => s + (h.amount || 0), 0);

  const amountByClass = new Map<string, number>();
  for (const h of investedHoldings) {
    amountByClass.set(h.assetClass, (amountByClass.get(h.assetClass) ?? 0) + (h.amount || 0));
  }

  const rows: CorporatePortfolioRow[] = investedBalance > 0
    ? Array.from(amountByClass.entries()).map(([assetClass, amount]) => ({
        assetClass,
        pct: Math.round((amount / investedBalance) * 1000) / 10,
        amount,
      }))
    : [];

  return { rows, investedBalance, cashBalance };
}
