// LPのセクション見出し（SectionHeading）と一覧ページの見出し（ListSectionHeading）で共有する
// 「───」の線。見た目の定義をここ1か所に集約する（claude_instruction_index_pages_implementation.md B-2）。
//
// claude_instruction_lp_polish_round3.md 3節: h-px(1px)は細すぎて視認しにくく、
// ラベル文字色を濃くした後は相対的にさらに目立たなくなったため、h-0.5(2px)に太く
// する（色は変更しない）
export default function SectionRule() {
  return <span className="h-0.5 w-6 bg-slate-300" aria-hidden="true" />;
}
