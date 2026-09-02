// 計画（PlanSnapshot）の保存・管理（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 3節）。
// assetManagement/storage.tsの設計パターン（全プロファイル分を1キーに保存し、profileIdでフィルタする）を
// 踏襲する。idがcrypto.randomUUID()で自然衝突しないため、AssetSnapshotのような日付重複の自己修復ロジックは
// 不要（このモジュールでは実装しない）。

import type { PlanSnapshot } from './types';
import { MAX_PLANS } from './config';

const PLANS_KEY = 'lifeCompassPlanSnapshots';

function loadAllPlans(): PlanSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    return raw ? (JSON.parse(raw) as PlanSnapshot[]) : [];
  } catch {
    return [];
  }
}

function saveAllPlans(plans: PlanSnapshot[]): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

function byCreatedAtAsc(a: PlanSnapshot, b: PlanSnapshot): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function listPlans(profileId: string): PlanSnapshot[] {
  return loadAllPlans()
    .filter((p) => p.profileId === profileId)
    .sort(byCreatedAtAsc);
}

export function getLatestPlan(profileId: string): PlanSnapshot | null {
  const plans = listPlans(profileId);
  return plans.length > 0 ? plans[plans.length - 1] : null;
}

// 対象profileIdの件数のみでMAX_PLANS上限を判定する。超過分は対象profileId内の最古から削除する
// （他プロファイルの計画件数・内容には一切影響しない）。
export function savePlan(plan: PlanSnapshot): void {
  const all = loadAllPlans();
  const others = all.filter((p) => p.profileId !== plan.profileId);
  const sameProfile = [...all.filter((p) => p.profileId === plan.profileId), plan].sort(byCreatedAtAsc);
  const excess = sameProfile.length - MAX_PLANS;
  const trimmed = excess > 0 ? sameProfile.slice(excess) : sameProfile;
  saveAllPlans([...others, ...trimmed]);
}

export function deletePlan(planId: string): void {
  saveAllPlans(loadAllPlans().filter((p) => p.id !== planId));
}

export function renamePlan(planId: string, name: string): void {
  saveAllPlans(loadAllPlans().map((p) => (p.id === planId ? { ...p, name } : p)));
}
