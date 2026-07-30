/**
 * scripts/verify-education-cost.js
 * educationCostCalc.ts（教育費シミュレーター計算エンジン）の結果を、手計算した期待値と
 * 突き合わせる（verify-finance-core.jsと違い、simulate.tsとの数値整合ではなく
 * 統計データからの積み上げが正しいかどうかの検証。implementation_education_cost_phase1.md 3章）。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const {
  calcChildYearlyCosts,
  calcTotalEducationCost,
  calcPeakYear,
} = require('../src/lib/educationCostCalc');

let pass = 0, fail = 0;
const failedCases = [];

function assertEqual(label, actual, expected) {
  const ok = actual === expected;
  console.log(`[${label}] 実測=${actual} / 期待値=${expected} → ${ok ? 'PASS' : 'FAIL'}`);
  if (ok) pass++; else { fail++; failedCases.push(label); }
  return ok;
}

function assertArrayEqual(label, actual, expected) {
  const ok = actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  console.log(`[${label}] 実測=[${actual.join(',')}]`);
  console.log(`  期待値=[${expected.join(',')}] → ${ok ? 'PASS' : 'FAIL'}`);
  if (ok) pass++; else { fail++; failedCases.push(label); }
  return ok;
}

// ================================================================
// 手計算した期待値（PRE_UNIVERSITY_ANNUAL_COST/UNIVERSITY_COST/REMITTANCE_PRESET_ANNUALの
// 定数値をSpec通りに積み上げたもの。educationCostData.tsの値が変わった場合はここも更新すること）
// ================================================================

console.log('='.repeat(80));
console.log('【境界値ケース】子供1人・最年少(未就学児)');
console.log('='.repeat(80));
{
  // preK・全公立・大学=国公立・仕送りなし
  const child = {
    currentGrade: 'preK',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'national',
    },
  };
  const yearly = calcChildYearlyCosts(child);
  assertEqual('preK: 年次配列の長さ(3+6+3+3+4=19年)', yearly.length, 19);
  assertEqual('preK: 総額', yearly.reduce((a, b) => a + b, 0), 10_421_073);
  assertEqual('preK: 初年度(幼稚園公立)', yearly[0], 169_411);
  assertEqual('preK: 大学1年目(入学費用込み)', yearly[15], 1_707_000);
  assertEqual('preK: 大学2年目(入学費用なし)', yearly[16], 1_035_000);
}

console.log('\n' + '='.repeat(80));
console.log('【境界値ケース】子供1人・最年長(大学4年)');
console.log('='.repeat(80));
{
  // univ4・私立理系・仕送りあり(プリセット)
  const child = {
    currentGrade: 'univ4',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'privateScience',
    },
    livingAlone: true,
  };
  const yearly = calcChildYearlyCosts(child);
  assertEqual('univ4: 年次配列の長さ(残り1年)', yearly.length, 1);
  assertEqual('univ4: 入学費用は計上されない', yearly[0], 1_832_000 + 958_000);
}

console.log('\n' + '='.repeat(80));
console.log('【代表ケース】オール公立(preK・国公立・仕送りなし)');
console.log('='.repeat(80));
{
  const child = {
    currentGrade: 'preK',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'national',
    },
  };
  assertEqual('オール公立: 総額', calcTotalEducationCost([child]), 10_421_073);
}

console.log('\n' + '='.repeat(80));
console.log('【代表ケース】オール私立(preK・私立理系・仕送りあり)');
console.log('='.repeat(80));
{
  const child = {
    currentGrade: 'preK',
    stageSelections: {
      kindergarten: 'private', elementary: 'private', juniorHigh: 'private',
      highSchool: 'private', university: 'privateScience',
    },
    livingAlone: true,
  };
  // 幼稚園311,597×3 + 小学校1,774,511×6 + 中学校1,551,042×3 + 高校1,030,283×3
  // + 大学(入学888,000 + (在学1,832,000+仕送り958,000)×4)
  const preUni = 311_597 * 3 + 1_774_511 * 6 + 1_551_042 * 3 + 1_030_283 * 3;
  const uni = 888_000 + (1_832_000 + 958_000) * 4;
  assertEqual('オール私立: 総額', calcTotalEducationCost([child]), preUni + uni);
}

console.log('\n' + '='.repeat(80));
console.log('【代表ケース】混在パターン(幼稚園私立+それ以降公立、大学は国公立)');
console.log('='.repeat(80));
{
  const child = {
    currentGrade: 'kinder1',
    stageSelections: {
      kindergarten: 'private', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'national',
    },
  };
  assertEqual('混在: 総額', calcTotalEducationCost([child]), 10_847_631);
}

console.log('\n' + '='.repeat(80));
console.log('【代表ケース】仕送りON/OFF(univ1・私立文系)');
console.log('='.repeat(80));
{
  const base = {
    currentGrade: 'univ1',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'privateArts',
    },
  };
  const withRemittance = calcChildYearlyCosts({ ...base, livingAlone: true });
  const withoutRemittance = calcChildYearlyCosts({ ...base, livingAlone: false });
  assertEqual('仕送りON: 総額', withRemittance.reduce((a, b) => a + b, 0), 10_730_000);
  assertEqual('仕送りOFF: 総額', withoutRemittance.reduce((a, b) => a + b, 0), 10_730_000 - 958_000 * 4);
  assertEqual('仕送りON: 差額は958,000円×4年', withRemittance.reduce((a, b) => a + b, 0) - withoutRemittance.reduce((a, b) => a + b, 0), 958_000 * 4);
}

console.log('\n' + '='.repeat(80));
console.log('【代表ケース】高3(残り1年)→大学進学の接続(高校私立→大学国公立)');
console.log('='.repeat(80));
{
  const child = {
    currentGrade: 'hs3',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'private', university: 'national',
    },
  };
  const yearly = calcChildYearlyCosts(child);
  assertArrayEqual('hs3: 年次配列(高校private1年+大学4年)', yearly, [1_030_283, 1_707_000, 1_035_000, 1_035_000, 1_035_000]);
  assertEqual('hs3: 総額', yearly.reduce((a, b) => a + b, 0), 5_842_283);
}

console.log('\n' + '='.repeat(80));
console.log('【境界値ケース】子供0人');
console.log('='.repeat(80));
{
  assertEqual('子供0人: 総額は0', calcTotalEducationCost([]), 0);
  const peak = calcPeakYear([]);
  assertEqual('子供0人: ピーク年オフセットは0', peak.yearOffset, 0);
  assertEqual('子供0人: ピーク金額は0', peak.amount, 0);
}

console.log('\n' + '='.repeat(80));
console.log('【代表ケース】子供2人・年齢差あり(preK全公立国公立 + univ2私立理系仕送りあり)のピーク集中');
console.log('='.repeat(80));
{
  const childA = {
    currentGrade: 'preK',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'national',
    },
  };
  const childB = {
    currentGrade: 'univ2',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'privateScience',
    },
    livingAlone: true,
  };
  assertEqual('2人合計総額', calcTotalEducationCost([childA, childB]), 10_421_073 + 8_370_000);
  const peak = calcPeakYear([childA, childB]);
  assertEqual('2人ピーク: オフセット(重複する最初の3年のいずれか=0)', peak.yearOffset, 0);
  assertEqual('2人ピーク: 金額(169,411+2,790,000)', peak.amount, 169_411 + 2_790_000);
}

console.log('\n' + '='.repeat(80));
console.log('【境界値ケース】子供3人・年齢差なし(同一preK×3)のピーク集中');
console.log('='.repeat(80));
{
  const child = {
    currentGrade: 'preK',
    stageSelections: {
      kindergarten: 'public', elementary: 'public', juniorHigh: 'public',
      highSchool: 'public', university: 'national',
    },
  };
  const peak = calcPeakYear([child, child, child]);
  assertEqual('3人同時: ピークは大学1年目(offset15、入学費用込みが最大)', peak.yearOffset, 15);
  assertEqual('3人同時: ピーク金額(1,707,000×3)', peak.amount, 1_707_000 * 3);
}

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: educationCostCalc.tsの計算結果は手計算の期待値と一致しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) console.log(`  - ${f}`);
  process.exitCode = 1;
}
console.log('='.repeat(80));
