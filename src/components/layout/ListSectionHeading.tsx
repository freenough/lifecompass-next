import SectionRule from './SectionRule';

interface ListSectionHeadingProps {
  // ページ上部のジャンプ用チップ（JumpChips）のリンク先になる
  id: string;
  children: string;
}

// 一覧ページ（お悩み一覧・ツール一覧）のステージ／カテゴリ見出し。LPのSectionHeadingと同じ「───」の線を
// 使いつつ、h2はページのh1（24/30px）より小さい18pxに抑える。scroll-mt-20(80px)は固定ヘッダー(59px)＋余裕分
// （claude_instruction_index_pages_implementation.md B-2）。
export default function ListSectionHeading({ id, children }: ListSectionHeadingProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <SectionRule />
      <h2 id={id} className="scroll-mt-20 text-lg font-bold text-slate-900">
        {children}
      </h2>
    </div>
  );
}
