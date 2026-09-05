'use client';

import { useState } from 'react';
import type { AssetHolding } from '@/lib/assetManagement/types';
import { CASH_ASSET_CLASS } from '@/lib/assetManagement/categories';
import { appendTransferLog } from '@/lib/hojinAssetManagement/transferLog';
import { calcPersonalDelta } from '@/lib/hojinAssetManagement/transferHelper';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import InfoTooltip from '@/components/simulator/InfoTooltip';

// instruction_transfer_helper_tax_rate_fix.md 0節：積立期（法人税未確定の今期利益を含む）は
// 法人税＋個人側税金で40〜50%程度、取崩期（過去に法人税を払い終えた内部留保）は個人側税金の
// 20〜30%程度と、状況によって幅があるため、KENZOが都度調整する前提の中間的な初期値。
// 「個人化想定比率」（DEFAULT_PERSONALIZATION_RATIO、進捗バー用の別概念）とは意味が異なるため
// 独立した定数として持つ（以前はpersonalizationRatioを流用していたが、計算式の向きを修正した
// ことで数値の意味が変わり、流用が不適切になったため切り離した）。
const DEFAULT_APPLIED_TAX_RATE = 35;

const APPLIED_TAX_RATE_TOOLTIP =
  '目安：この移転額のうち、最終的に税金として失われる割合の見積もりです。今回の引き出しが今期の利益の範囲内（法人税がまだ確定していない利益を取り崩す想定）なら、法人税と個人側の所得税・住民税・社会保険料を合わせた負担率（目安40〜50%程度）。役員報酬が今期の利益を上回る場合（過去に法人税を払い終えた内部留保を取り崩す想定）は、個人側の税金のみ（目安20〜30%程度）で構いません。精緻な税務計算ではなく、ご自身の見積もりとして入力してください。';

interface HojinTransferHelperProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  onUpdateHojinHoldings: (next: AssetHolding[]) => void;
  onUpdatePersonalHoldings: (next: AssetHolding[]) => void;
  // 新規作成するcash行に設定するprofileId（instruction_phase2_profile_foundation.md 5節：
  // 固定の'default'ではなく、資産管理ツール側で現在選択中のプロファイルを使う）。
  currentProfileId: string;
}

type TransferMode = 'withdrawal' | 'salary';

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 資産移転ヘルパー（法人→個人）。法人からの引き出し額と、個人側の税引後増加額を手計算せずに
// 両方の保有資産を整合の取れた形で同時更新する（追加実装3章）。
// 対象行はユーザー確認済みの仕様：法人側は「法人預金」カテゴリの先頭行、個人側は
// owner==='personal'（配偶者ではない）の「現金」カテゴリの先頭行。どちらも無ければ新規作成する。
// 自動配分・按分ロジックは実装しない（複数行への分配はユーザーの手動調整に委ねる）。
export default function HojinTransferHelper({
  hojinHoldings,
  personalHoldings,
  onUpdateHojinHoldings,
  onUpdatePersonalHoldings,
  currentProfileId,
}: HojinTransferHelperProps) {
  const [amountInput, setAmountInput] = useState('');
  const [mode, setMode] = useState<TransferMode | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const handleSelectMode = (next: TransferMode) => {
    // 取崩モードへ切り替えた瞬間だけ、デフォルト値を初期値として1回埋める
    // （以降はユーザー入力優先、個別の移転ごとに上書き可能）。
    if (next === 'withdrawal' && mode !== 'withdrawal') {
      setRateInput(String(DEFAULT_APPLIED_TAX_RATE));
    }
    setMode(next);
  };

  const amount = Number(amountInput) || 0;
  const canExecute = mode !== null && amount > 0;

  const handleExecute = () => {
    if (!canExecute || !mode) return;
    const rate = mode === 'withdrawal' ? (Number(rateInput) || 0) : null;
    const personalDelta = calcPersonalDelta(mode, amount, rate ?? 0);
    const nowIso = new Date().toISOString();

    // 法人側：法人預金カテゴリの先頭行から全額を減算（クランプしない。マイナス残高も許容）。
    const hojinCashIdx = hojinHoldings.findIndex((h) => h.accountCategory === '法人預金');
    let resultingHojinCash: number;
    let nextHojinHoldings: AssetHolding[];
    if (hojinCashIdx >= 0) {
      resultingHojinCash = hojinHoldings[hojinCashIdx].amount - amount;
      nextHojinHoldings = hojinHoldings.map((h, i) =>
        i === hojinCashIdx ? { ...h, amount: resultingHojinCash, updatedAt: nowIso } : h
      );
    } else {
      resultingHojinCash = -amount;
      nextHojinHoldings = [
        ...hojinHoldings,
        { id: newId(), owner: 'corporate', accountCategory: '法人預金', assetClass: CASH_ASSET_CLASS, amount: resultingHojinCash, updatedAt: nowIso, profileId: currentProfileId },
      ];
    }

    // 個人側：本人（owner==='personal'）の現金カテゴリの先頭行へ加算。
    const personalCashIdx = personalHoldings.findIndex((h) => h.owner === 'personal' && h.accountCategory === '現金');
    let nextPersonalHoldings: AssetHolding[];
    if (personalCashIdx >= 0) {
      nextPersonalHoldings = personalHoldings.map((h, i) =>
        i === personalCashIdx ? { ...h, amount: h.amount + personalDelta, updatedAt: nowIso } : h
      );
    } else {
      nextPersonalHoldings = [
        ...personalHoldings,
        { id: newId(), owner: 'personal', accountCategory: '現金', assetClass: CASH_ASSET_CLASS, amount: personalDelta, updatedAt: nowIso, profileId: currentProfileId },
      ];
    }

    onUpdateHojinHoldings(nextHojinHoldings);
    onUpdatePersonalHoldings(nextPersonalHoldings);

    appendTransferLog({
      mode,
      amount,
      appliedRate: rate,
      hojinDelta: -amount,
      personalDelta,
    });

    setWarning(resultingHojinCash < 0 ? '法人預金がマイナス残高になりました。実態に合わせて他の口座から手動で調整してください' : null);
    setAmountInput('');
    setMode(null); // 毎回明示的に選び直させる（指示書3-2節）
  };

  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-slate-700">資産移転ヘルパー（法人→個人）</h3>
      <p className="text-[11px] text-slate-400">
        法人預金と本人の現金を、引き出し額に応じて同時に更新します。記録（スナップショット）への反映は別途「記録する」を押してください。
      </p>

      <div className="flex items-center gap-1">
        <input
          type="number"
          value={amountInput}
          onFocus={(e) => clearZeroOrSelect(e.currentTarget)}
          onClick={(e) => clearZeroOrSelect(e.currentTarget)}
          onChange={(e) => {
            const cleaned = stripLeadingZero(e.target.value);
            setAmountInput(cleaned);
          }}
          min={0}
          placeholder="例: 100"
          className="w-24 text-xs border border-slate-300 rounded px-1 py-1 text-right"
        />
        <span className="text-xs text-slate-400 shrink-0">万円</span>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs w-fit">
        <button
          type="button"
          onClick={() => handleSelectMode('withdrawal')}
          className={`px-3 py-1 ${mode === 'withdrawal' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          取崩（税率を適用）
        </button>
        <button
          type="button"
          onClick={() => handleSelectMode('salary')}
          className={`px-3 py-1 ${mode === 'salary' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          役員報酬・給与
        </button>
      </div>

      {mode === 'withdrawal' && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1">
            適用税率:
            <InfoTooltip text={APPLIED_TAX_RATE_TOOLTIP} />
          </span>
          <input
            type="number"
            value={rateInput}
            onFocus={(e) => clearZeroOrSelect(e.currentTarget)}
            onClick={(e) => clearZeroOrSelect(e.currentTarget)}
            onChange={(e) => {
              const cleaned = stripLeadingZero(e.target.value);
              setRateInput(cleaned);
            }}
            min={0}
            max={100}
            className="w-16 text-xs border border-slate-300 rounded px-1 py-1 text-right"
          />
          <span className="text-xs text-slate-400 shrink-0">%</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleExecute}
        disabled={!canExecute}
        className="mt-1 text-xs font-semibold bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        実行
      </button>

      {warning && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{warning}</p>
      )}
    </div>
  );
}
