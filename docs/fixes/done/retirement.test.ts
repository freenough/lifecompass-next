/**
 * src/lib/tax/retirement.test.ts
 *
 * テストフレームワークは既存プロジェクトの構成(Jest/Vitest等)に合わせてimportを調整してください。
 * 例:import { describe, it, expect } from "vitest";
 */
import {
  calcRetirementDeduction,
  calcRetirementTaxableIncome,
  calcRetirementIncomeTax,
} from "./retirement";

describe("calcRetirementDeduction", () => {
  it("勤続20年以下:40万円×勤続年数", () => {
    expect(calcRetirementDeduction(10, false)).toBe(4_000_000); // 400万円
  });

  it("勤続20年以下:80万円下限が効くケース", () => {
    expect(calcRetirementDeduction(1, false)).toBe(800_000); // 40万<80万→80万円
  });

  it("勤続20年超:800万円+70万円×超過年数", () => {
    expect(calcRetirementDeduction(25, false)).toBe(11_500_000); // 800+70*5=1150万円
  });

  it("障害者特例:+100万円", () => {
    expect(calcRetirementDeduction(10, true)).toBe(5_000_000); // 400万+100万
  });
});

describe("calcRetirementTaxableIncome", () => {
  it("一般退職手当等:(収入-控除)×1/2", () => {
    const deduction = calcRetirementDeduction(20, false); // 800万円
    const taxable = calcRetirementTaxableIncome(30_000_000, deduction, 20, false);
    expect(taxable).toBe(11_000_000); // (3000万-800万)*1/2=1100万円
  });

  it("控除額>退職金の境界ケース:0円下限", () => {
    const deduction = calcRetirementDeduction(3, false); // 120万円(40*3=120>80)
    const taxable = calcRetirementTaxableIncome(500_000, deduction, 3, false);
    expect(taxable).toBe(0);
  });

  it("短期退職手当等:300万円超部分は1/2適用なし", () => {
    const deduction = calcRetirementDeduction(5, false); // 200万円
    const taxable = calcRetirementTaxableIncome(6_000_000, deduction, 5, false);
    // base = 600万-200万=400万円 > 300万円
    // = 300万*1/2 + (400万-300万) = 150万+100万 = 250万円
    expect(taxable).toBe(2_500_000);
  });

  it("特定役員退職手当等:1/2適用なし", () => {
    const deduction = calcRetirementDeduction(5, false); // 200万円
    const taxable = calcRetirementTaxableIncome(6_000_000, deduction, 5, true);
    // base = 600万-200万=400万円、1/2適用なしで全額
    expect(taxable).toBe(4_000_000);
  });

  it("1,000円未満切り捨て", () => {
    const deduction = calcRetirementDeduction(10, false); // 400万円
    // (401万2,345円-400万円)*0.5 = 6,172.5円 → 端数あり
    const taxable = calcRetirementTaxableIncome(4_012_345, deduction, 10, false);
    expect(taxable % 1000).toBe(0);
  });
});

describe("calcRetirementIncomeTax", () => {
  it("控除額>退職金の境界ケース:税額ゼロ", () => {
    const result = calcRetirementIncomeTax(500_000, 3, false, false);
    expect(result.taxableIncome).toBe(0);
    expect(result.incomeTax).toBe(0);
    expect(result.residentTax.total).toBe(0);
    expect(result.netAmount).toBe(500_000);
  });

  it("一般退職手当等の標準ケース(勤続20年)", () => {
    const result = calcRetirementIncomeTax(30_000_000, 20, false, false);
    expect(result.payType).toBe("general");
    expect(result.deduction).toBe(8_000_000);
    expect(result.taxableIncome).toBe(11_000_000);
    // 所得税・住民税の期待値は国税庁の計算例と突合の上で確定させること
    expect(result.incomeTax).toBeGreaterThan(0);
    expect(result.residentTax.municipal % 100).toBe(0);
    expect(result.residentTax.prefectural % 100).toBe(0);
  });

  it("障害者特例あり:控除額のみ+100万円加算される", () => {
    const withException = calcRetirementIncomeTax(30_000_000, 20, false, true);
    const without = calcRetirementIncomeTax(30_000_000, 20, false, false);
    expect(withException.deduction).toBe(without.deduction + 1_000_000);
    expect(withException.taxableIncome).toBeLessThan(without.taxableIncome);
  });

  // TODO: 田中誠シリーズ等、既存キャラクターの数値との突合(整合性チェック用途)
  // TODO: 国税庁の公開計算例との数値一致を確認するテストケースを追加
});
