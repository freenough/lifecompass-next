'use client';

// 資産管理ツールのプロファイル管理UI。instruction_phase2_ui_alignment.md 2節：シミュレーター側
// ProfileDrawer.tsx（src/components/simulator/ProfileDrawer.tsx、変更禁止・参考のみ）と同じ
// スライドインドロワー構成・挙動に作り直す。ロジックはProfileDrawer.tsxと一切共有しない。
//
// 削除・リンク切れ表示・リンク解除・名前変更の仕様はinstruction_phase2_profile_foundation.md
// （フェーズ2①）のまま維持する。生年月日・リンク先の指定は主要フロー（名前欄＋保存ボタン）
// からは外した（ProfileDrawer.tsxに合わせるため。作成時はbirthDate: null固定）。

import { useState, useEffect } from 'react';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import type { ImportResult } from '@/lib/assetManagement/exportImport';
import type { AssetManagerProfile } from '@/lib/assetManagement/profileTypes';
import type { ProfileV3 } from '@/lib/profile';
import { useAssetManagerProfileStore } from '@/lib/assetManagement/profileStore';
import { summarizeProfileHoldings } from '@/lib/assetManagement/profileSummary';
import { loadProfiles as loadSimulatorProfiles } from '@/lib/storage';
import AssetExportImportControls from './AssetExportImportControls';

// claude_instruction_phase2_yojitsu_link_ui.md：プロファイル連携UI（手動リンクのみ）。
// 未連携時は連携先を選ぶ<select>を持つため、プロファイルごとに独立した選択状態が必要になり、
// .map()内では素直にuseStateを使えない。行単位のサブコンポーネントに切り出す。
function ProfileLinkControl({
  assetProfile,
  simulatorProfiles,
  linkSimulatorProfile,
}: {
  assetProfile: AssetManagerProfile;
  simulatorProfiles: ProfileV3[];
  linkSimulatorProfile: (id: string, simulatorProfileId: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | ''>(simulatorProfiles[0]?.id ?? '');

  if (assetProfile.linkedSimulatorProfileId == null) {
    if (simulatorProfiles.length === 0) {
      return <p className="text-[10px] text-slate-400 mt-0.5">シミュレーター側に保存済みのプロファイルがありません</p>;
    }
    return (
      <div className="flex items-center gap-1 mt-1">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="text-[10px] border border-slate-300 rounded px-1 py-0.5 flex-1 min-w-0"
        >
          {simulatorProfiles.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
        <button
          onClick={() => selectedId !== '' && linkSimulatorProfile(assetProfile.id, selectedId)}
          className="text-[10px] text-blue-600 hover:underline shrink-0"
        >
          連携する
        </button>
      </div>
    );
  }

  const linkedProfile = simulatorProfiles.find((sp) => sp.id === assetProfile.linkedSimulatorProfileId);
  if (!linkedProfile) return null; // リンク切れ表示は呼び出し元（既存ロジック）が別途担当する
  return <p className="text-[10px] text-slate-400 mt-0.5">「{linkedProfile.name}」と連携中</p>;
}

interface AssetManagerProfilePanelProps {
  allHoldings: AssetHolding[];
  allSnapshots: AssetSnapshot[];
  allHojinHoldings: AssetHolding[];
  allHojinSnapshots: HojinAssetSnapshot[];
  onImported: (result: ImportResult) => void;
  onRemoved: (removed: { personal: AssetSnapshot[]; hojin: HojinAssetSnapshot[] }) => void;
  /** 「新規保存」時に呼ばれる。現在表示中の保有資産・法人設定を新プロファイルへコピーする
   * 一連の処理はAssetManagementPage.tsx側（allHoldings等を既に保持している）が担う。 */
  onCreateProfileFromCurrent: (name: string) => void;
  /** 「上書き保存」時に呼ばれる。対象プロファイル（現在アクティブ、または名前が一致した
   * 別プロファイル）の保有資産・法人設定を、今画面の内容で実際に置き換える。 */
  onOverwriteProfile: (targetProfileId: string, name: string) => void;
  /** 保有資産側に未保存の下書きがあるか（instruction_phase2_ui_safety_hardening.md 1節：
   * プロファイル切替時の確認ダイアログに使う）。 */
  holdingsDirty: boolean;
  /** 切替確認で「保存せずに切り替える」が選ばれたときに呼ぶ。保有資産の下書きを破棄する。 */
  onDiscardHoldingsDraft: () => void;
}

export default function AssetManagerProfilePanel({
  allHoldings,
  allSnapshots,
  allHojinHoldings,
  allHojinSnapshots,
  onImported,
  onRemoved,
  onCreateProfileFromCurrent,
  onOverwriteProfile,
  holdingsDirty,
  onDiscardHoldingsDraft,
}: AssetManagerProfilePanelProps) {
  const profiles = useAssetManagerProfileStore((s) => s.profiles);
  const currentProfileId = useAssetManagerProfileStore((s) => s.currentProfileId);
  const switchProfile = useAssetManagerProfileStore((s) => s.switchProfile);
  const deleteProfile = useAssetManagerProfileStore((s) => s.deleteProfile);
  const renameProfile = useAssetManagerProfileStore((s) => s.renameProfile);
  const unlinkSimulatorProfile = useAssetManagerProfileStore((s) => s.unlinkSimulatorProfile);
  const linkSimulatorProfile = useAssetManagerProfileStore((s) => s.linkSimulatorProfile);

  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // claude_instruction_phase2_yojitsu_hydration_fix.md：currentProfileId/profilesは
  // useAssetManagerProfileStore（localStorageから同期的に初期化されるZustandストア）由来のため、
  // SSR（常にwindow未定義→profiles=[]・currentProfileId='default'扱い）とクライアント初回レンダー
  // （実データあり）でこのテキストの中身が食い違い、Reactのハイドレーションエラーになる
  // （PlanManagerPanel.tsxで既に発見・修正済みの同種パターン）。マウント完了までは常にSSRと同じ
  // 「デフォルト」表示に固定し、マウント後のuseEffectで実際の値に切り替える。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentProfile = profiles.find((p) => p.id === currentProfileId);
  const simulatorProfiles = loadSimulatorProfiles();

  const handleOpen = () => {
    setSaveName(currentProfile?.name ?? '');
    setOpen(true);
  };

  // ProfileDrawer.tsxのisUpdateと同じ判定式：入力名が既存プロファイル名（自分自身を含む）と
  // 一致すれば「上書き保存」、一致しなければ「新規保存」。
  const trimmed = saveName.trim();
  const matched = profiles.find((p) => p.name === trimmed && trimmed !== '');
  const isUpdate = !!matched;

  // instruction_phase2_ui_safety_hardening.md 2節：上書き保存の確認に、対象プロファイルの
  // 現在の内容と今画面の内容（件数・合計金額）を対比して表示する。既存の集計ロジック
  // （AssetManagementPage.tsxのtotalAmount/hojinTotalと同じreduceパターン）を
  // summarizeProfileHoldingsに集約したものを再利用する。
  const handleSave = () => {
    const name = trimmed || '名称なし';
    const matchedNow = profiles.find((p) => p.name === name);
    if (matchedNow) {
      const isDifferentProfile = matchedNow.id !== currentProfileId;
      const before = summarizeProfileHoldings(allHoldings, allHojinHoldings, matchedNow.id);
      const after = summarizeProfileHoldings(allHoldings, allHojinHoldings, currentProfileId);
      const crossProfileNote = isDifferentProfile
        ? `現在編集中の内容を、別のプロファイル「${name}」に上書きします。\n`
        : '';
      const confirmed = window.confirm(
        `${crossProfileNote}「${name}」はすでに存在します。上書きすると、現在の内容` +
        `（資産${before.count}件・合計${before.totalAmount.toLocaleString()}万円）が、` +
        `今画面の内容（資産${after.count}件・合計${after.totalAmount.toLocaleString()}万円）` +
        `に置き換わります。よろしいですか？`
      );
      if (!confirmed) return;
      onOverwriteProfile(matchedNow.id, name);
    } else {
      onCreateProfileFromCurrent(name);
    }
    setOpen(false);
  };

  // instruction_phase2_ui_safety_hardening.md 1節：未保存の変更（保有資産の下書き）がある状態で
  // 別プロファイルへ切り替えようとした場合、確認なしに自動保存・自動破棄される経路を残さない。
  // OK＝下書きを破棄して切り替える／キャンセル＝切り替えず現在の画面に留まる。
  // instruction_phase2_companystate_rearchitecture.md 1〜2節：CompanyStateは資産管理ツール側
  // プロファイルと無関係になったため、companyStateDirtyのガードは撤去した（holdingsDirtyのみ）。
  const handleLoad = (id: string) => {
    if (holdingsDirty) {
      const proceed = window.confirm('保存されていない変更があります。保存せずにプロファイルを切り替えますか？');
      if (!proceed) return;
      onDiscardHoldingsDraft();
    }
    switchProfile(id);
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (profiles.length <= 1) return;
    const confirmed = window.confirm(
      `プロファイル「${name}」を削除します。このプロファイルの保有資産・記録履歴・法人設定もすべて削除されます（リンク先のシミュレータープロファイル自体は削除されません）。この操作は取り消せません。よろしいですか？`
    );
    if (!confirmed) return;
    deleteProfile(id);
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameInput(currentName);
  };

  const commitRename = (id: string) => {
    const name = renameInput.trim();
    if (name) renameProfile(id, name);
    setRenamingId(null);
  };

  return (
    <>
      {/* 3節：ドロワーを閉じていても常に見える「現在のプロファイル」表示。トリガーボタンとは別。 */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="text-xs text-slate-500">
          現在のプロファイル: <span className="font-bold text-slate-800">{mounted ? (currentProfile?.name ?? 'デフォルト') : 'デフォルト'}</span>
        </span>
        <button
          onClick={handleOpen}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          プロファイル管理
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-80 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">プロファイル管理</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2 mb-4">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="プロファイル名を入力"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button onClick={handleSave} className="w-full rounded-lg bg-slate-800 py-2 text-sm text-white hover:bg-slate-700">
                  {isUpdate ? '上書き保存' : '新規保存'}
                </button>

                <AssetExportImportControls
                  holdings={allHoldings}
                  snapshots={allSnapshots}
                  hojinHoldings={allHojinHoldings}
                  hojinSnapshots={allHojinSnapshots}
                  onImported={onImported}
                  onRemoved={onRemoved}
                  currentProfileId={currentProfileId}
                />
              </div>

              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">保存済みプロファイル</h3>
              {profiles.map((p) => {
                const isCurrent = p.id === currentProfileId;
                const linkBroken =
                  p.linkedSimulatorProfileId != null &&
                  !simulatorProfiles.some((sp) => sp.id === p.linkedSimulatorProfileId);
                return (
                  <div key={p.id} className="flex items-center justify-between border-b border-slate-100 py-2 gap-2">
                    <div className="min-w-0">
                      {renamingId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && commitRename(p.id)}
                            className="text-xs border border-slate-300 rounded px-1 py-0.5 w-28"
                            autoFocus
                          />
                          <button onClick={() => commitRename(p.id)} className="text-xs text-blue-600">保存</button>
                          <button onClick={() => setRenamingId(null)} className="text-xs text-slate-400">取消</button>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {p.name || '名称なし'}{isCurrent && '（選択中）'}
                        </p>
                      )}
                      {linkBroken && <p className="text-[10px] text-amber-600">リンク切れ</p>}
                      <ProfileLinkControl
                        assetProfile={p}
                        simulatorProfiles={simulatorProfiles}
                        linkSimulatorProfile={linkSimulatorProfile}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* claude_instruction_phase2_yojitsu_polish.md 1節：正常に連携が成立している
                          状態にも解除手段が必要（従来はリンク切れ時のみ表示していた）。 */}
                      {p.linkedSimulatorProfileId != null && (
                        <button
                          onClick={() => unlinkSimulatorProfile(p.id)}
                          className={linkBroken ? 'text-[10px] text-amber-600 hover:underline' : 'text-[10px] text-slate-400 hover:text-slate-600 hover:underline'}
                        >
                          リンク解除
                        </button>
                      )}
                      {renamingId !== p.id && (
                        <button onClick={() => startRename(p.id, p.name)} className="text-[10px] text-slate-400 hover:text-slate-600">
                          名前変更
                        </button>
                      )}
                      <button onClick={() => handleLoad(p.id)} className="text-xs text-blue-600 hover:text-blue-800">読込</button>
                      {profiles.length > 1 && (
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
