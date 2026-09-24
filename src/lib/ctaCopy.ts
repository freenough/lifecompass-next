import { CONCERN_CTA_LABELS } from '@/lib/concernCtaLabels';

// CTAまわりの文言の定数（impl_hitori_hojin_lp_ui.md 5-1節）。
// 現時点で使っているのは一人法人LPだけ。本体LP・記事詳細・AssetManagementPromoSection・
// SimulatorCtaCardの直書きの置き換えは別タスク。

// シミュレーター本体へのボタン文言。お悩みカード・SimulatorCtaCardと同じ文字列を二重に書かないよう、
// CONCERN_CTA_LABELSから値を取る。
export const SIMULATOR_CTA_LABEL = CONCERN_CTA_LABELS.fullSimulator;

// ボタン下の補足文。
export const FREE_NO_SIGNUP_NOTE = '無料・登録不要・データは端末内に保存';
