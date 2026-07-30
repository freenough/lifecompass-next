'use client';

import { useState } from 'react';
import EducationCostForm, { EMPTY_CHILD, type ChildFormValues } from '@/components/tools/education-cost/EducationCostForm';
import EducationCostResult from '@/components/tools/education-cost/EducationCostResult';
import { MAX_CHILDREN } from '@/lib/educationCostData';
import type { ChildInput } from '@/lib/educationCostCalc';

// 子供1人目は現在の学年を入れた状態で初期表示する（他ツールと同様、送信なしで即座に
// 結果が見える状態からスタートする）。2・3人目は「+子供を追加」で追加した時点では
// currentGrade: null（未入力）のまま追加し、フォーム側の「未入力」バッジで
// 入力漏れに気づけるようにする（Spec 4章の入力漏れ防止策はこのケースのための設計）。
const DEFAULT_FIRST_CHILD: ChildFormValues = {
  ...EMPTY_CHILD,
  currentGrade: 'elem1',
};

export default function EducationCostTool() {
  const [kids, setKids] = useState<ChildFormValues[]>([DEFAULT_FIRST_CHILD]);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleChangeChild = (index: number, patch: Partial<ChildFormValues>) => {
    setKids(prev => prev.map((child, i) => (i === index ? { ...child, ...patch } : child)));
  };

  const handleAddChild = () => {
    if (kids.length >= MAX_CHILDREN) return;
    setKids(prev => [...prev, EMPTY_CHILD]);
    setActiveIndex(kids.length);
  };

  const filledKids: ChildInput[] = kids
    .filter((child): child is ChildFormValues & { currentGrade: NonNullable<ChildFormValues['currentGrade']> } =>
      child.currentGrade !== null
    )
    .map(child => ({
      currentGrade: child.currentGrade,
      stageSelections: child.stageSelections,
      livingAlone: child.livingAlone,
      remittanceAnnual: child.remittanceAnnual,
    }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] leading-snug">
          教育費シミュレーター
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          子供の現在の学年と進学プランから、教育費の総額と、複数の子供の教育費が重なる「負担のピーク時期」を試算します。
        </p>
      </div>

      <EducationCostForm
        kids={kids}
        activeIndex={activeIndex}
        onSelectTab={setActiveIndex}
        onAddChild={handleAddChild}
        onChangeChild={handleChangeChild}
      />

      <EducationCostResult kids={filledKids} />
    </div>
  );
}
