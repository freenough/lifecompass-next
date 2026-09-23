import type { ConcernCTAType } from '@/data/concerns';

// お悩みカードのボタン文言。行き先（かんたん計算ツール／シミュレーター本体）が分かる形に統一する。
// concerns.ts（ロックファイル）のctaLabelは変更せず、ConcernsPage・ConcernBlockLPがConcernCardへ渡す
// 直前にこの定数で差し替える（claude_instruction_index_pages_implementation.md B-1）。
export const CONCERN_CTA_LABELS = {
  lightTool: 'かんたんツールで試算',
  fullSimulator: 'シミュレーターで試算',
} as const satisfies Record<ConcernCTAType, string>;
