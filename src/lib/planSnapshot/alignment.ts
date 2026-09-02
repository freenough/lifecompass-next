// 計画の年齢軸と実績の年月軸を揃えるための変換（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 5節）。
// savedAtAge/savedAtYearMonthを基準点にして、任意のageをカレンダー年月（'YYYY-MM'）へ変換する。
// 月はsavedAtYearMonthの月のまま、年だけ(age - savedAtAge)ぶんずらす（1年1回のシミュレーション刻みのため）。

export function ageToYearMonth(
  plan: { savedAtAge: number; savedAtYearMonth: string },
  age: number,
): string {
  const [yearStr, monthStr] = plan.savedAtYearMonth.split('-');
  const year = Number(yearStr) + (age - plan.savedAtAge);
  return `${year}-${monthStr}`;
}
