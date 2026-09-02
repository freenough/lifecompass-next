// 予実比較機能V1の「計画」データ型（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 1節）。
// ロックファイルには追加しない独立モジュール。V1は個人のみが対象で、法人（CompanyState）関連の
// 型・データは一切含まない。

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
}
