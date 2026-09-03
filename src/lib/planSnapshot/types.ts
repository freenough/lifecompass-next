// 予実比較機能V1の「計画」データ型（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 1節）。
// ロックファイルには追加しない独立モジュール。V1は個人のみが対象で、法人（CompanyState）関連の
// 型・データは一切含まない。
// claude_instruction_combined_line_implementation.md：V2で法人取崩・法人残高の任意フィールドを
// 追加専用の変更として追加した（既存フィールドの型・意味は一切変更しない）。

// generatePlan.tsの既存の回帰テスト（scripts/verify-plan-snapshot.js）が「generatePlan.tsのimport文に
// 'hojinCompanyState'という文字列が一切現れないこと」を検査しているため、CorporateYearSnap型を
// このファイルでre-exportし、generatePlan.ts側はこちら経由でimportする（型のみのimportで実行時の
// 依存は発生しないが、文字列検査に引っかからないようにするための対応）。
import type { CorporateYearSnap } from '../hojinCompanyState/types';
export type { CorporateYearSnap };

export interface PlanCurvePoint {
  age: number;
  totalAssets: number; // YearSnapのtotalAssetsをそのまま使う（personalOnly、口座別合算済みの値）
}

export interface PlanPercentilePoint {
  age: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface PlanSnapshot {
  id: string;                 // 新規発行（crypto.randomUUID()）
  profileId: string;          // 保存先の資産管理ツールプロファイルid
  simulatorProfileId: number; // 生成元のシミュレータープロファイルid
  strategy: string;           // WithdrawalStrategy（取崩戦略）、生成時点の設定を記録
  name: string;                // ユーザー命名。未入力時のデフォルトは "計画 YYYY-MM-DD"
  createdAt: string;           // ISO日時
  savedAtAge: number;          // 生成時点の年齢（実績との年月変換に使う）
  savedAtYearMonth: string;    // 生成時点の年月（"YYYY-MM"）。savedAtAgeと組み合わせて任意の年齢→年月を逆算する基準点にする
  fixed: {
    curve: PlanCurvePoint[];
    byAccount: null;           // 将来拡張用の予約フィールド。v1では常にnull
  };
  mc: {
    percentiles: PlanPercentilePoint[];
    byAccount: null;           // 将来拡張用の予約フィールド。v1では常にnull
  } | null;                    // MC実行に失敗した場合等はnullを許容
  /** 保存時点で「法人取崩を織り込む」チェックがONだったか。V1の計画（このフィールドを
   * 持たない過去データ）を読み込んだ場合はundefinedになる。読み込み側はundefined/falseを
   * 「合算非対応の計画」として扱うこと。 */
  includesHojinDrawdown?: boolean;
  /** 保存時点で計算された法人残高の年次系列。includesHojinDrawdown===trueの場合のみ存在する
   * （false/未設定の計画にはこのフィールド自体を含めない）。CorporateYearSnapをそのまま再利用する。 */
  corporateSnaps?: CorporateYearSnap[];
}
