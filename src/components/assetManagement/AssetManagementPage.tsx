'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo } from 'react';
import {
  ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_CATEGORY,
  CASH_ASSET_CLASS,
  HOJIN_ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY,
  HOJIN_CATEGORY_DEFAULT_ASSET_CLASS,
} from '@/lib/assetManagement/categories';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import type { AssetDisplayScope } from '@/lib/assetManagement/csvHistory';
import type { ImportResult } from '@/lib/assetManagement/exportImport';
import { useAssetManagerProfileStore } from '@/lib/assetManagement/profileStore';
import {
  loadHoldings,
  saveHoldings,
  loadSnapshots,
  addSnapshot,
  loadTargetAmount,
  saveTargetAmount,
  resetAll as resetPersonalAll,
  dedupeSnapshotsByDate,
} from '@/lib/assetManagement/storage';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadSnapshots as loadHojinSnapshots,
  addSnapshot as addHojinSnapshot,
  loadTargetAmount as loadHojinTargetAmount,
  saveTargetAmount as saveHojinTargetAmount,
  loadPersonalizationRatio,
  savePersonalizationRatio,
  resetAll as resetHojinAll,
} from '@/lib/hojinAssetManagement/storage';
import { clearTransferLog } from '@/lib/hojinAssetManagement/transferLog';
import { useUnsavedChangesGuard } from '@/lib/UnsavedChangesContext';
import type { PlanSnapshot } from '@/lib/planSnapshot/types';
import { listPlans } from '@/lib/planSnapshot/storage';
import AssetHoldingCard from './AssetHoldingCard';
import AssetProgressPanel from './AssetProgressPanel';
import AssetAllocationChangeTable from './AssetAllocationChangeTable';
import MonthlyRecordBanner from './MonthlyRecordBanner';
import AssetResetControls, { type ResetScope } from './AssetResetControls';
import AssetManagerProfilePanel from './AssetManagerProfilePanel';
import HojinAssetHoldingCard from '@/components/hojinAssetManagement/HojinAssetHoldingCard';
import HojinAssetProgressPanel from '@/components/hojinAssetManagement/HojinAssetProgressPanel';
import HojinAssetAllocationChangeTable from '@/components/hojinAssetManagement/HojinAssetAllocationChangeTable';
import HojinTransferHelper from '@/components/hojinAssetManagement/HojinTransferHelper';

// Rechartsコンポーネントは必ずssr:falseの動的importで読み込む（ResponsiveContainerが
// DOM計測に依存するため。HeroDemo.tsx/src/app/page.tsxの既存パターンを踏襲）。
const AssetAllocationChart = dynamic(() => import('./AssetAllocationChart'), { ssr: false });
const AssetSnapshotHistory = dynamic(() => import('./AssetSnapshotHistory'), { ssr: false });
const HojinAssetAllocationChart = dynamic(() => import('@/components/hojinAssetManagement/HojinAssetAllocationChart'), { ssr: false });
const HojinAssetSnapshotHistory = dynamic(() => import('@/components/hojinAssetManagement/HojinAssetSnapshotHistory'), { ssr: false });
const PlanComparisonSection = dynamic(() => import('./PlanComparisonSection'), { ssr: false });

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssetManagementPage() {
  // フェーズ2（instruction_phase2_profile_foundation.md 7節）：資産管理ツールのプロファイル。
  // holdings/snapshots等のstateは常に「全プロファイル分」を保持し（loadHoldings()等は
  // profileIdで絞り込まない）、表示・子コンポーネントへ渡す値だけをcurrentProfileIdで
  // フィルタする。書き込み時は「他プロファイル分＋現在プロファイルの新データ」にマージしてから
  // 保存する（フィルタ後の配列をそのまま保存すると他プロファイルのデータが消えるため）。
  const currentProfileId = useAssetManagerProfileStore((s) => s.currentProfileId);
  const linkedSimulatorProfileId = useAssetManagerProfileStore(
    (s) => s.profiles.find((p) => p.id === currentProfileId)?.linkedSimulatorProfileId ?? null
  );

  // 実機確認（instruction_phase2_profile_foundation.md 11節）で発見：loadHoldings()等を
  // useStateの初期化関数に直接使うと、サーバー側（window未定義＝常に空配列）とクライアント側
  // （実データあり）でレンダー結果が食い違い、Reactのハイドレーションエラーになる（下のincludeCorporate
  // と同じ理由、既存コメント参照）。フェーズ1から存在した潜在バグで、保有資産・記録履歴が
  // 空でない状態でこのページへ直接アクセスすると再現する（このタスクの実機確認で新規に発見・
  // 修正。プロファイル機能自体が原因ではないが、同一ページの実機確認を進める上で放置できないため
  // 修正した）。他のuseState初期化と同じ「サーバーと一致する空値で始め、マウント後のuseEffectで
  // 読み込む」パターンに統一する。
  const [allHoldings, setAllHoldings] = useState<AssetHolding[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<AssetSnapshot[]>([]);
  const [targetAmount, setTargetAmount] = useState<number>(0);
  // モバイル（lg:未満）のみ有効な「入力を編集」トグル。lg:以上は常時展開
  // （既存シミュレーター本体のformOpenパターンを参照して踏襲、7章）。
  const [formOpen, setFormOpen] = useState(false);

  // フェーズ1（資産管理ツール統合）：法人資産（一人法人）セクション。CompanyState
  // （SimulatorForm.tsx＋CorporateSettingsSection.tsx）と同じ「トグルで展開」パターンを
  // 踏襲しつつ、資産管理ツールは単純なCRUD・表示のみのため、Zustandストアを新設せず
  // このページ1つでstateを保持する（個人・法人のholdingsを同じ場所で持つことで、
  // 法人セクションが個人資産を「常にライブ参照」できるようにし、フェーズ1の目的である
  // 「個人データをインポート」ボタン廃止・食い違いバグの構造的解消を実現する）。
  // 初期値はSSR/クライアントで一致させるため常にfalseにし、法人データがあればマウント後の
  // useEffectでONに切り替える（localStorage読み取り結果をuseStateの初期化関数に直接使うと、
  // サーバー側（window未定義＝常に空）とクライアント側（実データあり）でレンダー結果が食い違い、
  // 条件分岐でDOM構造ごと変わるためReactのハイドレーションエラーになる）。
  const [includeCorporate, setIncludeCorporate] = useState(false);
  useEffect(() => {
    // プロファイル切替のたびに再判定する（切替先プロファイルに法人データがあれば自動でON。
    // 既存の「一度ONになったら自動でOFFにはしない」という一方向の挙動は維持する）。
    if (loadHojinHoldings().some((h) => h.profileId === currentProfileId)) setIncludeCorporate(true);
  }, [currentProfileId]);
  const [allHojinHoldings, setAllHojinHoldings] = useState<AssetHolding[]>([]);
  const [allHojinSnapshots, setAllHojinSnapshots] = useState<HojinAssetSnapshot[]>([]);
  const [hojinTargetAmount, setHojinTargetAmount] = useState<number>(0);
  const [personalizationRatio, setPersonalizationRatio] = useState<number>(0);

  // 予実比較機能V1（計画）：現在プロファイル分のみを保持する（AssetSnapshot等の「全プロファイル分＋
  // useMemoで絞り込む」パターンとは異なり、storage.ts側のlistPlans()が既にprofileIdで絞り込んで返すため
  // そのままstateに持てる）。
  const [plans, setPlans] = useState<PlanSnapshot[]>([]);
  const refreshPlans = () => setPlans(listPlans(currentProfileId));
  useEffect(() => {
    refreshPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfileId]);

  // マウント後に一度だけ、全プロファイル分のデータを読み込む（上記コメント参照）。
  useEffect(() => {
    setAllHoldings(loadHoldings());
    setAllSnapshots(loadSnapshots());
    setTargetAmount(loadTargetAmount());
    setAllHojinHoldings(loadHojinHoldings());
    setAllHojinSnapshots(loadHojinSnapshots());
    setHojinTargetAmount(loadHojinTargetAmount());
    setPersonalizationRatio(loadPersonalizationRatio());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 表示：個人のみ／合算。/assetsは個人ツールが本体のため、'personalOnly'は個人資産のみを指す
  // （法人資産管理ツール単体だった頃の「法人のみ／合算」から意味が反転している）。
  // csv_yyyymm_format_and_import_scope_fix.md 2章：CSV Export/Importのスコープ判断も
  // 新しい概念を作らずこのトグル1つを共有する（AssetDisplayScope型はこの値と同じ型）。
  const [displayScopePref, setDisplayScopePref] = useState<AssetDisplayScope>('combined');

  // 現在プロファイルでフィルタした表示用の派生値（子コンポーネント・集計はすべてこちらを使う）。
  const holdings = useMemo(() => allHoldings.filter((h) => h.profileId === currentProfileId), [allHoldings, currentProfileId]);
  const snapshots = useMemo(() => allSnapshots.filter((s) => s.profileId === currentProfileId), [allSnapshots, currentProfileId]);
  const hojinHoldings = useMemo(() => allHojinHoldings.filter((h) => h.profileId === currentProfileId), [allHojinHoldings, currentProfileId]);
  const hojinSnapshots = useMemo(() => allHojinSnapshots.filter((s) => s.profileId === currentProfileId), [allHojinSnapshots, currentProfileId]);

  // instruction_phase2_ui_alignment.md 1節：保有資産編集を「ページ単位の明示保存」方式に変更。
  // 追加・編集・削除操作は即座にはlocalStorageへ書き込まず、allHoldings/allHojinHoldings
  // （React state＝下書き）だけを更新する。保存は「保存」ボタン（handleSaveHoldings）を押した
  // ときのみ確定する。「記録する」（handleRecord）は指示書通り対象外（下書きも含めてそのまま
  // スナップショットする、という既存の挙動を維持）。
  // instruction_phase2_ui_followup.md 2節：dirtyフラグはこのページのローカルstateではなく
  // 共有Context（UnsavedChangesContext）を単一の情報源として使う。useUnsavedChangesGuardが
  // Header.tsxのSPA内遷移ガード用にContextへ同期しつつ、beforeunload登録・アンマウント時の
  // クリーンアップ（他ページへ状態を残さない）もまとめて行う。
  const [holdingsDirty, setHoldingsDirty] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  useUnsavedChangesGuard(holdingsDirty);

  const handleSaveHoldings = () => {
    saveHoldings(allHoldings);
    saveHojinHoldings(allHojinHoldings);
    setHoldingsDirty(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // 保存上限（MAX_SNAPSHOTS）超過による自動削除の通知バナー（追加実装2章）。
  const [removalNotice, setRemovalNotice] = useState<string | null>(null);
  const notifyRemoved = (removedGroups: Array<{ date: string }[]>) => {
    const all = removedGroups.flat();
    if (all.length === 0) return;
    const dates = all.map((r) => r.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    const range = first === last ? first : `${first}〜${last}`;
    setRemovalNotice(`保存上限のため、${range}の記録を自動削除しました`);
  };

  // 現在プロファイルの編集結果（nextForCurrentProfile）を、他プロファイル分と合わせて下書き
  // stateに反映する（instruction_phase2_profile_foundation.md 7節：フィルタ後の配列をそのまま
  // 保存すると他プロファイルのデータが消えるため）。instruction_phase2_ui_alignment.md 1節：
  // ここではlocalStorageへは書き込まない（下書き）。確定は「保存」ボタン
  // （handleSaveHoldings）でのみ行う。
  const updateHoldings = (nextForCurrentProfile: AssetHolding[]) => {
    const merged = [...allHoldings.filter((h) => h.profileId !== currentProfileId), ...nextForCurrentProfile];
    setAllHoldings(merged);
    setHoldingsDirty(true);
  };

  const handleAdd = (category: string) => {
    const isCash = category === '現金';
    const allowed = ALLOWED_ASSET_CLASSES_BY_CATEGORY[category as keyof typeof ALLOWED_ASSET_CLASSES_BY_CATEGORY];
    const defaultAssetClass = isCash ? CASH_ASSET_CLASS : (allowed?.[0]?.key ?? '全世界株');
    const holding: AssetHolding = {
      id: newId(),
      owner: 'personal',
      accountCategory: category,
      assetClass: defaultAssetClass,
      amount: 0,
      updatedAt: new Date().toISOString(),
      profileId: currentProfileId,
    };
    updateHoldings([...holdings, holding]);
  };

  const handleChange = (id: string, patch: Partial<AssetHolding>) => {
    updateHoldings(
      holdings.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h))
    );
  };

  const handleDelete = (id: string) => {
    updateHoldings(holdings.filter((h) => h.id !== id));
  };

  const updateHojinHoldings = (nextForCurrentProfile: AssetHolding[]) => {
    const merged = [...allHojinHoldings.filter((h) => h.profileId !== currentProfileId), ...nextForCurrentProfile];
    setAllHojinHoldings(merged);
    setHoldingsDirty(true);
  };

  const handleAddHojin = (category: string) => {
    const key = category as keyof typeof ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY;
    const defaultAssetClass = HOJIN_CATEGORY_DEFAULT_ASSET_CLASS[key] ?? ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY[key]?.[0]?.key ?? '全世界株';
    const holding: AssetHolding = {
      id: newId(),
      owner: 'corporate',
      accountCategory: category,
      assetClass: defaultAssetClass,
      amount: 0,
      updatedAt: new Date().toISOString(),
      profileId: currentProfileId,
    };
    updateHojinHoldings([...hojinHoldings, holding]);
  };

  const handleChangeHojin = (id: string, patch: Partial<AssetHolding>) => {
    updateHojinHoldings(
      hojinHoldings.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h))
    );
  };

  const handleDeleteHojin = (id: string) => {
    updateHojinHoldings(hojinHoldings.filter((h) => h.id !== id));
  };

  // 「記録する」押下時：個人資産は常に記録し、法人資産を含めるトグルON時は、その瞬間の
  // 個人holdings state（=まさに今ライブ表示している値、現在プロファイル分のみ）をそのまま
  // 法人スナップショットにも自動的に書き込む。手動の「個人データをインポート」操作は不要
  // （フェーズ1の核心）。addSnapshot()はloadSnapshots()（全プロファイル分）を内部で読み直して
  // 保存し直すため、戻り値のsnapshotsは既に全プロファイル分の最新状態になっている
  // （このページ側でのマージは不要）。
  const handleRecord = () => {
    const { snapshots: nextSnapshots, removed } = addSnapshot(holdings, currentProfileId);
    setAllSnapshots(nextSnapshots);
    if (includeCorporate) {
      const { snapshots: nextHojinSnapshots, removed: removedHojin } = addHojinSnapshot(hojinHoldings, holdings, currentProfileId);
      setAllHojinSnapshots(nextHojinSnapshots);
      notifyRemoved([removed, removedHojin]);
    } else {
      notifyRemoved([removed]);
    }
  };

  const handleChangeTarget = (amount: number) => {
    setTargetAmount(amount);
    saveTargetAmount(amount);
  };

  const handleChangeHojinTarget = (amount: number) => {
    setHojinTargetAmount(amount);
    saveHojinTargetAmount(amount);
  };

  const handleChangeRatio = (ratio: number) => {
    setPersonalizationRatio(ratio);
    savePersonalizationRatio(ratio);
  };

  // simplify_csv_scope_and_fix_graph_history_bug.md 2章：Export/Importが表示トグルと無関係に
  // なり、個人・法人どちらのストアが更新されたかに関わらず戻り値は常に両ストアの最新状態を
  // 含むため（ImportResult）、旧来の「個人用」「法人用」2つのハンドラに分ける必要がなくなった。
  // CSV/JSON自体はまだプロファイル非対応（次指示書スコープ）のため、常に全プロファイル分を
  // 対象にした戻り値をそのままallHoldings等へ反映する。
  const handleImported = (result: ImportResult) => {
    setAllHoldings(result.holdings);
    // claude_instruction_banner_and_duplicate_plan_fix.md：CSV/JSONインポートの結果
    // （applyAssetCsv/applyJsonPayload等）はソートせずそのまま返ってくるため、
    // loadSnapshots()の自己修復ソートを経由しないままsetAllSnapshots()すると、
    // isCurrentMonthRecorded()等の配列順に依存するコードが誤判定する
    // （実際にはCSV/JSON経由の全3経路がonImported→handleImported()に集約されている
    // ことを確認済み）。setAllSnapshots()へ渡す前にdedupeSnapshotsByDate()で日付順へ揃える。
    setAllSnapshots(dedupeSnapshotsByDate(result.snapshots));
    setAllHojinHoldings(result.hojinHoldings);
    setAllHojinSnapshots(result.hojinSnapshots);
    // json_export_completeness_and_history_bug.md 2章：JSON Importで設定値も上書きされうる
    // ようになったため、ページ側stateも同期する（CSV/legacy経路は現在値の素通しなので無害）。
    setTargetAmount(result.targetAmount);
    setHojinTargetAmount(result.hojinTargetAmount);
    setPersonalizationRatio(result.personalizationRatio);
    // CSV/JSON Importは既にlocalStorageへ直接書き込み済みのため、未保存の下書きは無い状態になる。
    setHoldingsDirty(false);
  };

  // instruction_phase2_ui_alignment.md 2節：「新規保存」時、現在アクティブなプロファイルの
  // 保有資産・法人設定を新プロファイルへコピーする。「今画面に表示されている内容
  // （下書きも含む）」をコピー対象とするため、allHoldings/allHojinHoldings（React state）を
  // そのまま使う（storageの再読み込みはしない）。新規プロファイル作成という明示的な保存操作
  // のため、保留中の下書き全体もこの時点でまとめて確定する（データロス防止）。
  // instruction_phase2_companystate_rearchitecture.md 1節：CompanyStateは資産管理ツール側
  // プロファイルと無関係になったため、ここでのコピーは不要（削除済み）。
  const handleCreateProfileFromCurrent = (name: string) => {
    const created = useAssetManagerProfileStore.getState().createProfile({ name, birthDate: null, linkedSimulatorProfileId: null });

    const copiedHoldings = holdings.map((h) => ({ ...h, id: newId(), profileId: created.id }));
    const copiedHojinHoldings = hojinHoldings.map((h) => ({ ...h, id: newId(), profileId: created.id }));
    const nextAllHoldings = [...allHoldings, ...copiedHoldings];
    const nextAllHojinHoldings = [...allHojinHoldings, ...copiedHojinHoldings];

    saveHoldings(nextAllHoldings);
    saveHojinHoldings(nextAllHojinHoldings);
    setAllHoldings(nextAllHoldings);
    setAllHojinHoldings(nextAllHojinHoldings);
    setHoldingsDirty(false);

    useAssetManagerProfileStore.getState().switchProfile(created.id);
  };

  // instruction_phase2_ui_safety_hardening.md 1節：未保存の下書きがある状態で「読込」（プロファイル
  // 切替）が確認された（破棄して続行）場合、AssetManagerProfilePanel.tsxから呼ばれる。
  // allHoldings/allHojinHoldingsをstorageの内容で上書きし、現在プロファイル分の下書き編集を破棄する。
  const handleDiscardHoldingsDraft = () => {
    setAllHoldings(loadHoldings());
    setAllHojinHoldings(loadHojinHoldings());
    setHoldingsDirty(false);
  };

  // instruction_phase2_ui_safety_hardening.md 2節：「上書き保存」は対象プロファイル（現在
  // アクティブか、名前が一致した別プロファイルか）の保有資産を、今画面に表示されている
  // 内容（下書き含む）で実際に置き換える（従来はメタ情報＝名前のリネームのみだったが、確認
  // ダイアログが「内容が置き換わる」と明示する以上、実際にそうする）。対象が現在アクティブな
  // プロファイルの場合はholdingsDirtyを確定し、非アクティブな別プロファイル
  // の場合は現在の下書きには一切触れない（アクティブなプロファイルの切替は行わない）。
  // instruction_phase2_companystate_rearchitecture.md 1節：CompanyStateは資産管理ツール側
  // プロファイルと無関係になったため、ここでのCompanyState保存処理は削除済み。
  //
  // 実機確認で発見した不具合の修正：対象が非アクティブな別プロファイルのとき、
  // allHoldings（現在アクティブなプロファイル自身の未保存下書きを含みうる）をベースに
  // saveHoldings()すると、保存ボタンを押していない現在プロファイルの下書きまで一緒に
  // localStorageへ書き込まれてしまう（「確認なしに自動保存される経路を残さない」という
  // 1節の方針に反する）。対象が非アクティブな場合はloadHoldings()（storageの最新保存済み
  // 状態）をベースにし、現在プロファイルの下書きはReact state上にのみ残す。
  const handleOverwriteProfile = (targetProfileId: string, name: string) => {
    const copiedHoldings = holdings.map((h) => ({ ...h, id: newId(), profileId: targetProfileId }));
    const copiedHojinHoldings = hojinHoldings.map((h) => ({ ...h, id: newId(), profileId: targetProfileId }));
    const isTargetActive = targetProfileId === currentProfileId;
    const baseHoldings = isTargetActive ? allHoldings : loadHoldings();
    const baseHojinHoldings = isTargetActive ? allHojinHoldings : loadHojinHoldings();
    const nextAllHoldings = [...baseHoldings.filter((h) => h.profileId !== targetProfileId), ...copiedHoldings];
    const nextAllHojinHoldings = [...baseHojinHoldings.filter((h) => h.profileId !== targetProfileId), ...copiedHojinHoldings];

    saveHoldings(nextAllHoldings);
    saveHojinHoldings(nextAllHojinHoldings);

    if (isTargetActive) {
      setAllHoldings(nextAllHoldings);
      setAllHojinHoldings(nextAllHojinHoldings);
      setHoldingsDirty(false);
    } else {
      // 現在プロファイルの下書き（React state）はそのまま維持しつつ、対象プロファイル分の
      // 保存済み内容だけをstateにも反映する（storageと表示の整合を保つため）。
      setAllHoldings((prev) => [...prev.filter((h) => h.profileId !== targetProfileId), ...copiedHoldings]);
      setAllHojinHoldings((prev) => [...prev.filter((h) => h.profileId !== targetProfileId), ...copiedHojinHoldings]);
    }

    useAssetManagerProfileStore.getState().renameProfile(targetProfileId, name);
  };

  // 全データリセット（追加実装4章）。対象範囲ごとにストレージを削除したうえで、
  // 各stateをストレージから読み直す（削除後は空配列・デフォルト設定値になる）。
  // instruction_phase2_profile_foundation.md 9節：リセット機能のプロファイルスコープ選択
  // （現在のプロファイルのみ／全プロファイル）は今回のスコープ外のため、従来通り常に
  // 全プロファイル分を削除する（AssetResetControls.tsxの文言も個人/法人/両方の範囲のみで、
  // プロファイルには言及していないため矛盾はない）。
  const handleReset = (scope: ResetScope, includeSettings: boolean) => {
    if (scope === 'personal' || scope === 'both') {
      resetPersonalAll({ includeSettings });
      setAllHoldings(loadHoldings());
      setAllSnapshots(loadSnapshots());
      setTargetAmount(loadTargetAmount());
    }
    if (scope === 'hojin' || scope === 'both') {
      resetHojinAll({ includeSettings });
      clearTransferLog();
      setAllHojinHoldings(loadHojinHoldings());
      setAllHojinSnapshots(loadHojinSnapshots());
      setHojinTargetAmount(loadHojinTargetAmount());
      setPersonalizationRatio(loadPersonalizationRatio());
    }
    // リセットは即座にlocalStorageへ反映されるため、未保存の下書きは無い状態になる。
    setHoldingsDirty(false);
  };

  const totalAmount = holdings.reduce((s, h) => s + (h.amount || 0), 0);
  const hojinTotal = hojinHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  // 法人保有資産が未入力のときは「個人のみ」に固定する（合算しても差が出ないため）。
  const hojinIsEmpty = hojinHoldings.length === 0 || hojinTotal === 0;
  const displayScope: AssetDisplayScope = hojinIsEmpty ? 'personalOnly' : displayScopePref;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2A4A] mb-2">資産管理</h1>
        <p className="text-sm text-slate-500">保有資産を記録して、毎月のFIRE進捗を確認します。</p>
      </div>

      <div className="mb-6">
        <AssetManagerProfilePanel
          allHoldings={allHoldings}
          allSnapshots={allSnapshots}
          allHojinHoldings={allHojinHoldings}
          allHojinSnapshots={allHojinSnapshots}
          onImported={handleImported}
          onRemoved={(removed) => notifyRemoved([removed.personal, removed.hojin])}
          onCreateProfileFromCurrent={handleCreateProfileFromCurrent}
          onOverwriteProfile={handleOverwriteProfile}
          holdingsDirty={holdingsDirty}
          onDiscardHoldingsDraft={handleDiscardHoldingsDraft}
        />
      </div>

      {saveToast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-800 text-white text-xs px-4 py-2 shadow-lg">
          保存しました
        </div>
      )}

      <div className="mb-6">
        <MonthlyRecordBanner snapshots={snapshots} onRecord={handleRecord} />
      </div>

      {removalNotice && (
        <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">{removalNotice}</p>
          <button
            onClick={() => setRemovalNotice(null)}
            className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
          >
            閉じる
          </button>
        </div>
      )}

      {/* デスクトップ(lg:1024px以上)は左右2カラム、モバイルは上下積み。
          既存の資産シミュレーター本体（src/app/app/page.tsx）の左サイドバー/右メイン分割・
          独立スクロール（lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto）パターンを踏襲。 */}
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左: 入力カード群。scrollbar-gutter:stableで、スクロールバーの出現/消失による
            横幅の変動（1章バグの一因）を吸収する（Tailwindに標準ユーティリティが無いため
            任意値記法で指定）。 */}
        <div className="lg:w-80 lg:shrink-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">保有資産</h2>
            <span className="text-sm font-bold text-slate-800">合計 {totalAmount.toLocaleString()}万円</span>
          </div>

          {/* instruction_phase2_ui_alignment.md 1節：保有資産編集は下書き→明示保存方式。
              未保存の変更がある間はここに表示し、「保存」ボタンで確定する。 */}
          {holdingsDirty && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
              <span className="text-xs text-amber-700">未保存の変更があります</span>
              <button
                type="button"
                onClick={handleSaveHoldings}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
              >
                保存
              </button>
            </div>
          )}

          {/* モバイルのみの開閉トグル（既存シミュレーターの「入力を編集/閉じる」ボタンの
              ラベル・矢印表現を参照して踏襲。フォーム全体がfixed配置される独自スクロール構成は
              このページでは不要なため、通常のドキュメントフロー内のボタンとして簡略化している）。 */}
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="lg:hidden w-full mb-3 rounded-lg border border-slate-300 bg-white py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            {formOpen ? '入力を閉じる ▲' : '入力を編集 ▼'}
          </button>

          <div className={`flex-col gap-3 lg:flex ${formOpen ? 'flex' : 'hidden'}`}>
            {ACCOUNT_CATEGORIES.map((category) => (
              <AssetHoldingCard
                key={category}
                category={category}
                holdings={holdings.filter((h) => h.accountCategory === category)}
                allowedAssetClasses={ALLOWED_ASSET_CLASSES_BY_CATEGORY[category]}
                onAdd={handleAdd}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}

            {/* 法人資産（一人法人）を含める：CompanyStateのSimulatorForm.tsx＋
                CorporateSettingsSection.tsxと同じトグル展開パターン。 */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-700">法人資産（一人法人）を含める</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeCorporate}
                  onClick={() => setIncludeCorporate((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    includeCorporate ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeCorporate ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {includeCorporate && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-slate-700">法人保有資産</h3>
                    <span className="text-xs font-bold text-slate-800">合計 {hojinTotal.toLocaleString()}万円</span>
                  </div>
                  {HOJIN_ACCOUNT_CATEGORIES.map((category) => (
                    <HojinAssetHoldingCard
                      key={category}
                      category={category}
                      holdings={hojinHoldings.filter((h) => h.accountCategory === category)}
                      allowedAssetClasses={ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY[category]}
                      onAdd={handleAddHojin}
                      onChange={(id, patch) => handleChangeHojin(id, patch as Partial<AssetHolding>)}
                      onDelete={handleDeleteHojin}
                    />
                  ))}

                  <HojinTransferHelper
                    hojinHoldings={hojinHoldings}
                    personalHoldings={holdings}
                    personalizationRatio={personalizationRatio}
                    onUpdateHojinHoldings={updateHojinHoldings}
                    onUpdatePersonalHoldings={updateHoldings}
                    currentProfileId={currentProfileId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右: サマリー群 */}
        <div className="flex flex-1 flex-col gap-6 min-w-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">
          {includeCorporate && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">表示:</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setDisplayScopePref('personalOnly')}
                    className={`px-3 py-1 ${displayScope === 'personalOnly' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    個人のみ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayScopePref('combined')}
                    disabled={hojinIsEmpty}
                    className={`px-3 py-1 ${displayScope === 'combined' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    合算
                  </button>
                </div>
              </div>
              {hojinIsEmpty && (
                <span className="text-xs text-slate-400">法人資産が未入力のため「個人のみ」で表示しています</span>
              )}
            </div>
          )}

          <section>
            {includeCorporate ? (
              <HojinAssetSnapshotHistory
                snapshots={hojinSnapshots}
                onRecord={handleRecord}
                displayScope={displayScope}
                currentPersonalTotal={totalAmount}
                currentHojinTotal={hojinTotal}
                personalSnapshots={snapshots}
              />
            ) : (
              <AssetSnapshotHistory snapshots={snapshots} onRecord={handleRecord} currentTotal={totalAmount} />
            )}
          </section>

          <PlanComparisonSection
            plans={plans}
            personalSnapshots={snapshots}
            onPlansChanged={refreshPlans}
            currentProfileId={currentProfileId}
            linkedSimulatorProfileId={linkedSimulatorProfileId}
            displayScope={displayScope}
            hojinSnapshots={hojinSnapshots}
          />

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">FIRE進捗</h2>
            {includeCorporate ? (
              <HojinAssetProgressPanel
                hojinHoldings={hojinHoldings}
                personalHoldings={holdings}
                snapshots={hojinSnapshots}
                targetAmount={hojinTargetAmount}
                onChangeTarget={handleChangeHojinTarget}
                personalizationRatio={personalizationRatio}
                onChangeRatio={handleChangeRatio}
                displayScope={displayScope}
                personalSnapshots={snapshots}
              />
            ) : (
              <AssetProgressPanel
                holdings={holdings}
                snapshots={snapshots}
                targetAmount={targetAmount}
                onChangeTarget={handleChangeTarget}
              />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">資産クラス内訳</h2>
            {includeCorporate ? (
              <HojinAssetAllocationChart hojinHoldings={hojinHoldings} personalHoldings={holdings} displayScope={displayScope} />
            ) : (
              <AssetAllocationChart holdings={holdings} totalAmount={totalAmount} />
            )}
          </section>

          {includeCorporate ? (
            <HojinAssetAllocationChangeTable
              hojinHoldings={hojinHoldings}
              personalHoldings={holdings}
              snapshots={hojinSnapshots}
              displayScope={displayScope}
              personalSnapshots={snapshots}
            />
          ) : (
            <AssetAllocationChangeTable holdings={holdings} snapshots={snapshots} />
          )}

          <section>
            <AssetResetControls onReset={handleReset} />
          </section>
        </div>
      </div>
    </main>
  );
}
