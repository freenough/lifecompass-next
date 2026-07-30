'use client';

import { calcChildYearlyCosts, type Grade } from '@/lib/educationCostCalc';
import type { PublicPrivate, UniversityTrack } from '@/lib/educationCostData';
import { REMITTANCE_PRESET_ANNUAL, MAX_CHILDREN } from '@/lib/educationCostData';

export interface ChildFormValues {
  currentGrade: Grade | null;
  stageSelections: {
    kindergarten: PublicPrivate;
    elementary: PublicPrivate;
    juniorHigh: PublicPrivate;
    highSchool: PublicPrivate;
    university: UniversityTrack;
  };
  livingAlone: boolean;
  /** 円/年。NumberFieldは「月額(万円)」で表示・編集するため、編集時のみ丸めが発生する
   *  （未編集ならプリセットの正確な円額(958,000)がそのまま計算に使われる）。 */
  remittanceAnnual: number;
}

/** 新規タブ追加時の初期値。「未入力」バッジ判定はcurrentGrade===nullで行う（Spec 4章）。 */
export const EMPTY_CHILD: ChildFormValues = {
  currentGrade: null,
  stageSelections: {
    kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
    highSchool: 'public', university: 'national',
  },
  livingAlone: false,
  remittanceAnnual: REMITTANCE_PRESET_ANNUAL,
};

interface EducationCostFormProps {
  kids: ChildFormValues[];
  activeIndex: number;
  onSelectTab: (index: number) => void;
  onAddChild: () => void;
  onChangeChild: (index: number, patch: Partial<ChildFormValues>) => void;
}

const GRADE_GROUPS: { label: string; options: { value: Grade; label: string }[] }[] = [
  { label: '未就学', options: [{ value: 'preK', label: '未就学児' }] },
  {
    label: '幼稚園',
    options: [
      { value: 'kinder1', label: '幼稚園 年少' },
      { value: 'kinder2', label: '幼稚園 年中' },
      { value: 'kinder3', label: '幼稚園 年長' },
    ],
  },
  {
    label: '小学校',
    options: (['elem1', 'elem2', 'elem3', 'elem4', 'elem5', 'elem6'] as Grade[]).map((v, i) => ({
      value: v, label: `小学${i + 1}年`,
    })),
  },
  {
    label: '中学校',
    options: (['jhs1', 'jhs2', 'jhs3'] as Grade[]).map((v, i) => ({ value: v, label: `中学${i + 1}年` })),
  },
  {
    label: '高校',
    options: (['hs1', 'hs2', 'hs3'] as Grade[]).map((v, i) => ({ value: v, label: `高校${i + 1}年` })),
  },
  {
    label: '大学',
    options: (['univ1', 'univ2', 'univ3', 'univ4'] as Grade[]).map((v, i) => ({ value: v, label: `大学${i + 1}年` })),
  },
];

const STAGE_TOGGLES: { key: 'kindergarten' | 'elementary' | 'juniorHigh' | 'highSchool'; label: string }[] = [
  { key: 'kindergarten', label: '幼稚園' },
  { key: 'elementary', label: '小学校' },
  { key: 'juniorHigh', label: '中学校' },
  { key: 'highSchool', label: '高校' },
];

const UNIVERSITY_OPTIONS: { value: UniversityTrack; label: string }[] = [
  { value: 'national', label: '国公立' },
  { value: 'privateArts', label: '私立文系' },
  { value: 'privateScience', label: '私立理系' },
];

const selectClassName =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-base bg-white focus:border-accent focus:outline-none';

function PublicPrivateToggle({
  value, onChange,
}: { value: PublicPrivate; onChange: (v: PublicPrivate) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
      {(['public', 'private'] as PublicPrivate[]).map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 px-3 py-2 ${
            value === opt ? 'bg-accent text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {opt === 'public' ? '公立' : '私立'}
        </button>
      ))}
    </div>
  );
}

/** SimulatorForm.tsxのMiniToggleと同じON/OFFスイッチパターン。 */
function LivingAloneSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function formatMan(yen: number): string {
  return `約${Math.round(yen / 10_000).toLocaleString('ja-JP')}万円`;
}

export default function EducationCostForm({
  kids, activeIndex, onSelectTab, onAddChild, onChangeChild,
}: EducationCostFormProps) {
  const active = kids[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* タブ列 */}
      <div className="flex flex-wrap items-center gap-2">
        {kids.map((child, i) => {
          const isActive = i === activeIndex;
          const isEmpty = child.currentGrade === null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectTab(i)}
              className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors ${
                isActive ? 'border-accent bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="text-sm font-semibold text-slate-700">子供{i + 1}</span>
              {isEmpty ? (
                <span className="text-[10px] font-semibold text-warn-text bg-warn-bg rounded px-1.5 py-0.5">
                  未入力
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">{formatMan(estimateChildTotal(child))}</span>
              )}
            </button>
          );
        })}
        {kids.length < MAX_CHILDREN && (
          <button
            type="button"
            onClick={onAddChild}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors"
          >
            + 子供を追加
          </button>
        )}
      </div>

      {/* 選択中タブの入力ブロック */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="currentGrade" className="text-xs font-medium text-slate-600">
            現在の学年
          </label>
          <select
            id="currentGrade"
            value={active.currentGrade ?? ''}
            onChange={e => onChangeChild(activeIndex, { currentGrade: e.target.value as Grade })}
            className={selectClassName}
          >
            <option value="" disabled>選択してください</option>
            {GRADE_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {STAGE_TOGGLES.map(stage => (
            <div key={stage.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">{stage.label}</label>
              <PublicPrivateToggle
                value={active.stageSelections[stage.key]}
                onChange={v => onChangeChild(activeIndex, {
                  stageSelections: { ...active.stageSelections, [stage.key]: v },
                })}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="university" className="text-xs font-medium text-slate-600">
            大学
          </label>
          <select
            id="university"
            value={active.stageSelections.university}
            onChange={e => onChangeChild(activeIndex, {
              stageSelections: { ...active.stageSelections, university: e.target.value as UniversityTrack },
            })}
            className={selectClassName}
          >
            {UNIVERSITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
          <span className="text-sm text-slate-600">大学で一人暮らしになる予定ですか?</span>
          <LivingAloneSwitch
            checked={active.livingAlone}
            onChange={v => onChangeChild(activeIndex, { livingAlone: v })}
          />
        </div>

        {active.livingAlone && (
          <div className="flex flex-col gap-1">
            <label htmlFor="remittance" className="text-xs font-medium text-slate-600">
              月額仕送り額
            </label>
            <div className="flex items-center gap-2">
              <input
                id="remittance"
                type="number"
                inputMode="decimal"
                min={0}
                value={Math.round(active.remittanceAnnual / 12 / 10_000)}
                onChange={e => {
                  const monthlyMan = Number(e.target.value);
                  if (isNaN(monthlyMan)) return;
                  onChangeChild(activeIndex, { remittanceAnnual: Math.max(0, Math.round(monthlyMan)) * 12 * 10_000 });
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-base focus:border-accent focus:outline-none"
              />
              <span className="shrink-0 text-sm text-slate-500">万円/月</span>
            </div>
            <p className="text-xs text-slate-400">
              日本政策金融公庫の調査による自宅外通学者の平均額（プリセット）です。編集できます。
            </p>
          </div>
        )}
      </div>

      {kids.length >= MAX_CHILDREN && (
        <p className="text-xs text-slate-400">
          4人目以降のお子さんがいる場合は、本格シミュレーターのライフイベント機能で個別に追加できます。
        </p>
      )}
    </div>
  );
}
function estimateChildTotal(child: ChildFormValues): number {
  if (!child.currentGrade) return 0;
  return calcChildYearlyCosts({
    currentGrade: child.currentGrade,
    stageSelections: child.stageSelections,
    livingAlone: child.livingAlone,
    remittanceAnnual: child.remittanceAnnual,
  }).reduce((a, b) => a + b, 0);
}
