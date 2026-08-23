'use client';

// PortfolioPanel.tsx（src/components/simulator/、ロック対象）のUIパターンを複製する（5.2節、
// 最終版指示書3.4節）。個人側は口座別（NISA/iDeCo/特定口座）にAssetCardが複数並ぶが、法人側は
// 口座区分がないため、AssetCard相当のカードは1つのみ（法人資産全体で1つのポートフォリオ配分）。
// 状態管理は法人専用の新規ストア（useCompanyStateStore）に差し替える。
//
// UI仕上げ指示書1章（2026-08-22）→ 再指示（2026-08-23）：
// 個人側SimulatorForm.tsx（ロック対象外）の「利回り設定」「MC設定」は、①資産クラス配分カードと
// は別の独立したセクションとして、口座ごとの行をRateField（ラベル＋トグル＋数値）で並べる構造。
// 前回実装は資産クラスカードの中にトグル+数値を埋め込んでおり、この構造と一致していなかったため、
// 個人側と同じ構造（独立セクション＋RateField行）に作り直した。資産クラス配分カード側からは
// μ・σの手入力UIを完全に除去し、常に自動算出値のみを読み取り専用表示する。

import { useState } from 'react';
import { ASSET_CLASSES } from '@/lib/hojinAssetManagement/categories';
import {
  getEffectivePhaseMetrics, calcPortfolioMetrics, getEffectiveRetirementMu, getEffectiveRetirementSigma,
} from '@/lib/hojinCompanyState/portfolioMath';
import { useCompanyStateStore } from '@/lib/hojinCompanyState/companyStateStore';
import { importFromAssetManagement } from '@/lib/hojinCompanyState/importFromAssetManagement';
import type { CorporatePortfolioPhase, CorporatePortfolioRow } from '@/lib/hojinCompanyState/types';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';
import { UNIT_WIDTH_CLASS, INPUT_WIDTH_CLASS } from '@/components/simulator/formLayout';
import InfoTooltip from '@/components/simulator/InfoTooltip';

type Phase = 'current' | 'working' | 'retirement';
type RatePhaseKey = 'working' | 'retirement';

// ── ①②③ 資産クラス配分カード（μ・σは読み取り専用表示のみ、手入力UIは持たない） ──

interface AssetCardProps {
  phase: Phase;
  data: CorporatePortfolioPhase;
}

function AssetCard({ phase, data }: AssetCardProps) {
  const updatePortfolioPhase = useCompanyStateStore(s => s.updatePortfolioPhase);
  const rows = data.rows;

  const update = (newRows: CorporatePortfolioRow[]) => updatePortfolioPhase(phase, newRows);
  const setClass = (i: number, val: string) => update(rows.map((r, idx) => idx === i ? { ...r, assetClass: val } : r));
  const setPct   = (i: number, val: number) => update(rows.map((r, idx) => idx === i ? { ...r, pct: val } : r));
  const addRow   = () => update([...rows, { assetClass: '全世界株', pct: 0 }]);
  const delRow   = (i: number) => update(rows.filter((_, idx) => idx !== i));

  // PortfolioPanel.tsx（個人側、ロック対象）のdisplayMu（`const displayMu = calcMu(rows);`、
  // AssetCard内、手入力トグルの状態を一切見ない）と同じ設計。カード見出しのμは
  // 「このカードの資産クラス％配分から常にライブ計算される読み取り専用の参考値」であり、
  // 「利回り設定」「MC設定」側の手入力トグルの状態には一切影響されない
  // （2026-08-21最終監査で判明：以前はgetEffectivePhaseMetricsを使っており、手入力ON中は
  // カード見出しにも手入力値が表示されてしまっていた＝個人側の設計と不一致だった）。
  // 見出しはμのみ表示する（個人側PortfolioPanel.tsxのAssetCardと同じ、σは表示しない。
  // 2026-08-21最終チェックリスト1番で修正：以前はσも表示していた）。
  const { mu } = calcPortfolioMetrics(rows);

  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">法人資産（投資分）</span>
        <span className="text-sm font-bold text-slate-800">μ: {mu.toFixed(1)}%</span>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 items-center">
          <select
            value={row.assetClass}
            onChange={e => setClass(i, e.target.value)}
            className="flex-1 text-xs border border-slate-300 rounded px-1 py-1"
          >
            {ASSET_CLASSES.map(a => (
              <option key={a.key} value={a.key}>{a.key}</option>
            ))}
          </select>
          <input
            type="number"
            value={row.pct}
            onFocus={e => clearZeroOrSelect(e.currentTarget)}
            onClick={e => clearZeroOrSelect(e.currentTarget)}
            onChange={e => {
              const cleaned = stripLeadingZero(e.target.value);
              if (cleaned !== e.target.value) e.target.value = cleaned;
              const n = e.target.valueAsNumber;
              setPct(i, isNaN(n) ? 0 : n);
            }}
            min={0}
            max={100}
            className="w-14 text-xs border border-slate-300 rounded px-1 py-1 text-right"
          />
          <span className="text-xs text-slate-400">%</span>
          <button onClick={() => delRow(i)} className="text-red-400 hover:text-red-600 text-xs px-1">×</button>
        </div>
      ))}

      <button
        onClick={addRow}
        className="text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded py-1"
      >
        + 追加
      </button>
    </div>
  );
}

// ── ①②③フェーズカード用のバッジ付きSection（既存、資産クラス配分カードで使用） ──

interface PhaseSectionProps {
  label: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
  subAction?: React.ReactNode;
}

function PhaseSection({ label, badge, badgeColor, children, subAction }: PhaseSectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1 px-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-1 items-center gap-2 py-2 text-left hover:bg-slate-50 rounded"
        >
          <span className={`text-[10px] font-semibold rounded px-2 py-0.5 ${badgeColor}`}>{badge}</span>
          <span className="text-xs font-medium text-slate-700 flex-1">{label}</span>
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="py-2 px-1 text-slate-400 text-xs hover:bg-slate-50 rounded shrink-0"
        >
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && subAction && <div className="px-1 pb-1">{subAction}</div>}
      {open && <div className="flex flex-col gap-3 pb-3 px-1">{children}</div>}
    </div>
  );
}

function BalanceInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={0}
          onFocus={e => clearZeroOrSelect(e.currentTarget)}
          onClick={e => clearZeroOrSelect(e.currentTarget)}
          onChange={e => {
            const cleaned = stripLeadingZero(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
            const n = e.target.valueAsNumber;
            onChange(isNaN(n) ? 0 : n);
          }}
          className="w-20 text-xs border border-slate-300 rounded px-1 py-1 text-right"
        />
        <span className="text-xs text-slate-400">万円</span>
      </div>
    </div>
  );
}

// ── 「利回り設定」「MC設定」独立セクション（個人側SimulatorForm.tsxと同じ構造・見た目を複製） ──
// SimulatorForm.tsxはロック対象外だがexportされていないため、MiniToggle/RateField/Sectionは
// ここに複製する（個人側と全く同じCSSクラス・formLayout定数を使い、見た目を完全に一致させる）。

interface MiniToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  disabled?: boolean;
}

function MiniToggle({ checked, onChange, title, disabled }: MiniToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

interface RateFieldProps {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  linked: boolean;
  onToggleLinked: (linked: boolean) => void;
  rowDisabled?: boolean;
  min?: number;
  max?: number;
  toggleTitle?: string;
}

/** 個人側SimulatorForm.tsxのRateFieldと同一レイアウト（ラベルw-20、トグル、入力欄INPUT_WIDTH_CLASS、単位UNIT_WIDTH_CLASS）。 */
function RateField({
  label, id, value, onChange, linked, onToggleLinked, rowDisabled,
  min = 0, max = 50, toggleTitle = 'ONでポートフォリオの計算値を使用します',
}: RateFieldProps) {
  const inputDisabled = rowDisabled || linked;
  return (
    <div className="flex items-center justify-between gap-1">
      <label htmlFor={id} className="w-20 shrink-0 text-xs text-slate-600 truncate">{label}</label>
      <div className="flex items-center gap-2">
        <MiniToggle checked={linked} onChange={onToggleLinked} disabled={rowDisabled} title={toggleTitle} />
        <div className="flex items-center gap-1">
          <input
            id={id}
            type="number"
            value={value}
            onFocus={e => clearZeroOrSelect(e.currentTarget)}
            onClick={e => clearZeroOrSelect(e.currentTarget)}
            onChange={e => {
              const cleaned = stripLeadingZero(e.target.value);
              if (cleaned !== e.target.value) e.target.value = cleaned;
              const raw = e.target.valueAsNumber;
              onChange(isNaN(raw) ? 0 : raw);
            }}
            onBlur={e => {
              const raw = e.target.valueAsNumber;
              const safe = isNaN(raw) ? (value || 0) : raw;
              if (safe !== value) onChange(safe);
              e.target.value = String(safe);
            }}
            min={min}
            max={max}
            step={0.1}
            disabled={inputDisabled}
            className={`${INPUT_WIDTH_CLASS} shrink-0 rounded border border-slate-300 px-1 py-1 text-right text-sm text-slate-900 focus:border-slate-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
          />
          <span className={`${UNIT_WIDTH_CLASS} shrink-0 text-left text-xs text-slate-500`}>%</span>
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** 個人側SimulatorForm.tsxのSection（利回り設定・MC設定用）と同一の見た目・挙動。 */
function SettingsSection({ title, tooltip, children, defaultOpen = false }: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 text-left"
        >
          {title}
        </button>
        {tooltip && <InfoTooltip text={tooltip} />}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-1 justify-end py-2 pl-1 text-xs text-slate-500 hover:text-slate-700 shrink-0"
        >
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && <div className="flex flex-col gap-2 pb-3">{children}</div>}
    </div>
  );
}

export default function CorporatePortfolioPanel() {
  const portfolio = useCompanyStateStore(s => s.state.portfolio);
  const investedBalance = useCompanyStateStore(s => s.state.settings.investedBalance);
  const cashBalance = useCompanyStateStore(s => s.state.settings.cashBalance);
  const setInvestedBalance = useCompanyStateStore(s => s.setInvestedBalance);
  const setCashBalance = useCompanyStateStore(s => s.setCashBalance);
  const setRetirementSameAsWorking = useCompanyStateStore(s => s.setRetirementSameAsWorking);
  const setRateSameAsWorking = useCompanyStateStore(s => s.setRateSameAsWorking);
  const setSigmaSameAsWorking = useCompanyStateStore(s => s.setSigmaSameAsWorking);
  const copyCurrentToWorking = useCompanyStateStore(s => s.copyCurrentToWorking);
  const setImportedAssets = useCompanyStateStore(s => s.setImportedAssets);
  const setPortfolioPhaseManual = useCompanyStateStore(s => s.setPortfolioPhaseManual);

  // ％配分の同期（retirementSameAsWorking）は資産クラスカードの表示切り替えにのみ使う。
  const retirementSameAsWorking = portfolio.retirementSameAsWorking;
  const retirementRows = retirementSameAsWorking ? portfolio.working.rows : portfolio.retirement.rows;

  // 下部の灰色サマリーボックス（「μ/σ」表示）は、個人側PortfolioPanel.tsxの「全口座集計」欄
  // （calcAggregateMu/calcAggregateSigma）と同じく、手入力トグルの状態を一切見ない
  // 常にライブな参考値にする（2026-08-21最終チェックリスト4番：ブラウザ実機で個人側の
  // 「全口座集計」欄がNISA rWを手入力ONにしても変化しないことを確認済み。以前は
  // getEffectivePhaseMetricsを使っており、手入力を反映してしまっていた＝個人側と不一致だった）。
  const { mu: muWLive, sigma: sigmaWLive } = calcPortfolioMetrics(portfolio.working.rows);
  const { mu: muRLive, sigma: sigmaRLive } = calcPortfolioMetrics(retirementRows);

  // 「利回り設定」「MC設定」のRateField自体の値は実効値（手入力があればそれを優先）。
  // 積立期はgetEffectivePhaseMetrics、取崩期はrateSameAsWorking/sigmaSameAsWorkingを
  // それぞれ独立に見るgetEffectiveRetirementMu/Sigma（個人側getEffectiveRW/RRと同じ設計）。
  const { mu: muW, sigma: sigmaW } = getEffectivePhaseMetrics(portfolio.working);
  const muR = getEffectiveRetirementMu(portfolio, muW);
  const sigmaR = getEffectiveRetirementSigma(portfolio, sigmaW);

  const handleImport = () => {
    const { rows, investedBalance: importedInvested, cashBalance: importedCash } = importFromAssetManagement();
    setImportedAssets(importedInvested, importedCash, rows);
  };

  // 利回り設定・MC設定のトグル：ON(linked)=PF計算値を使う、OFF=手入力（個人側RateFieldと同じ極性）。
  // 手入力に切り替えた瞬間は、その時点の実効値をシードする（個人側SimulatorForm.tsxのsetLinkedと同じUX）。
  // μ・σは独立フラグ（useManualMu/useManualSigma）のため、それぞれ専用のトグルハンドラを持つ。
  const setMuLinked = (phase: RatePhaseKey, linked: boolean) => {
    if (linked) {
      setPortfolioPhaseManual(phase, { useManualMu: false });
      return;
    }
    const current = phase === 'working' ? muW : muR;
    setPortfolioPhaseManual(phase, { useManualMu: true, manualMu: current });
  };
  const setSigmaLinked = (phase: RatePhaseKey, linked: boolean) => {
    if (linked) {
      setPortfolioPhaseManual(phase, { useManualSigma: false });
      return;
    }
    const current = phase === 'working' ? sigmaW : sigmaR;
    setPortfolioPhaseManual(phase, { useManualSigma: true, manualSigma: current });
  };

  return (
    <div className="flex flex-col gap-1">
      <PhaseSection label="現在のPF" badge="① 現在" badgeColor="bg-slate-100 text-slate-600">
        <button
          onClick={handleImport}
          className="text-[11px] border border-blue-300 text-blue-600 rounded-full px-2 py-1 hover:bg-blue-50 self-start"
        >
          資産管理ツールからインポート
        </button>
        <BalanceInput label="投資分（残高）" value={investedBalance} onChange={setInvestedBalance} />
        <BalanceInput label="現金分（残高）" value={cashBalance} onChange={setCashBalance} />
        <AssetCard phase="current" data={portfolio.current} />
      </PhaseSection>

      <PhaseSection
        label="シミュレーションPF"
        badge="② 積立期"
        badgeColor="bg-blue-100 text-blue-700"
        subAction={
          <button
            onClick={copyCurrentToWorking}
            className="text-[10px] border border-slate-300 rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-50 whitespace-nowrap"
          >
            ①の比率をコピー
          </button>
        }
      >
        <AssetCard phase="working" data={portfolio.working} />
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex gap-4">
          <span className="text-slate-500">μ/σ</span>
          <span><strong>{muWLive.toFixed(1)}% / {sigmaWLive.toFixed(1)}%</strong></span>
        </div>
      </PhaseSection>

      <PhaseSection label="シミュレーションPF" badge="③ 取崩期" badgeColor="bg-green-100 text-green-700">
        <div className="flex items-center gap-2 mb-1">
          <input
            id="corpSameAsWorking"
            type="checkbox"
            checked={retirementSameAsWorking}
            onChange={e => setRetirementSameAsWorking(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="corpSameAsWorking" className="text-xs text-slate-600">積立期と同じPFを使う</label>
        </div>
        {!retirementSameAsWorking && (
          <AssetCard phase="retirement" data={portfolio.retirement} />
        )}
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex gap-4">
          <span className="text-slate-500">μ/σ</span>
          <span><strong>{muRLive.toFixed(1)}% / {sigmaRLive.toFixed(1)}%</strong></span>
        </div>
      </PhaseSection>

      {/* ①②③各フェーズの外側、資産クラス配分カードとは別の独立セクション
          （個人側SimulatorForm.tsxの「利回り設定」「MC設定」と同じ構造）。 */}
      <SettingsSection
        title="利回り設定"
        tooltip="積立期（μ）/ 取崩期（μ）・スイッチONでPF計算値を使用"
      >
        <RateField
          label="投資分 μ(積立)" id="corpMuWorking"
          value={muW} onChange={v => setPortfolioPhaseManual('working', { manualMu: v })}
          linked={!portfolio.working.useManualMu} onToggleLinked={linked => setMuLinked('working', linked)}
        />
        <RateField
          label="投資分 μ(取崩)" id="corpMuRetirement"
          value={muR} onChange={v => setPortfolioPhaseManual('retirement', { manualMu: v })}
          linked={portfolio.rateSameAsWorking || !portfolio.retirement.useManualMu}
          onToggleLinked={linked => setMuLinked('retirement', linked)}
          rowDisabled={portfolio.rateSameAsWorking}
        />
        {/* ％配分の同期（③取崩期は②積立期と同じPFを使う）とは独立したトグル。
            個人側SimulatorForm.tsxの「取崩期は積立期と同じ利回りを使う」と同じ設計
            （2026-08-21最終チェックリスト3番で追加）。 */}
        <div className="flex items-center gap-2 mt-1">
          <input
            id="corpRateSameAsWorking"
            type="checkbox"
            checked={portfolio.rateSameAsWorking}
            onChange={e => setRateSameAsWorking(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="corpRateSameAsWorking" className="text-xs text-slate-600">取崩期は積立期と同じ利回りを使う</label>
        </div>
      </SettingsSection>

      <SettingsSection
        title="MC設定"
        tooltip="積立期（σ）/ 取崩期（σ）・スイッチONでPF計算値を使用"
      >
        <RateField
          label="投資分 σ(積立)" id="corpSigmaWorking"
          value={sigmaW} onChange={v => setPortfolioPhaseManual('working', { manualSigma: v })}
          linked={!portfolio.working.useManualSigma} onToggleLinked={linked => setSigmaLinked('working', linked)}
        />
        <RateField
          label="投資分 σ(取崩)" id="corpSigmaRetirement"
          value={sigmaR} onChange={v => setPortfolioPhaseManual('retirement', { manualSigma: v })}
          linked={portfolio.sigmaSameAsWorking || !portfolio.retirement.useManualSigma}
          onToggleLinked={linked => setSigmaLinked('retirement', linked)}
          rowDisabled={portfolio.sigmaSameAsWorking}
        />
        {/* ％配分の同期・利回りの同期とは独立したトグル。個人側の「取崩期は積立期と
            同じ標準偏差を使う」と同じ設計（2026-08-21最終チェックリスト3番で追加）。 */}
        <div className="flex items-center gap-2 mt-1">
          <input
            id="corpSigmaSameAsWorking"
            type="checkbox"
            checked={portfolio.sigmaSameAsWorking}
            onChange={e => setSigmaSameAsWorking(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="corpSigmaSameAsWorking" className="text-xs text-slate-600">取崩期は積立期と同じ標準偏差を使う</label>
        </div>
      </SettingsSection>
    </div>
  );
}
