/**
 * scripts/verify-fixtures.js
 *
 * reference/simulation_fixtures.md にある確定値と、移植後のシミュレーションエンジンの
 * 出力を比較する検証スクリプト。Stop Hookとして使う場合、不一致があれば exit 2 で
 * セッションの終了をブロックする。
 *
 * 使い方:
 *   node scripts/verify-fixtures.js
 *
 * 注意:
 *   このスクリプトは「期待値」を独立に再計算するものではない。
 *   FIXTURES に書かれた期待値は reference/simulation_fixtures.md からそのまま転記すること。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { simulate } = require('../src/lib');

const FIXTURES = {
  yamamoto_base: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 4, rR: 4,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 55, def2: 51, def3: 57 },
  },
  yamamoto_expense288: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 4, rR: 4,
      baseInc: 456, baseExp: 288,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 58, def2: 52, def3: 59 },
  },
  yamamoto_expense228: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 4, rR: 4,
      baseInc: 456, baseExp: 228,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 51, def2: 48, def3: 53 },
  },
  yamamoto_expense180: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 4, rR: 4,
      baseInc: 456, baseExp: 180,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 46, def2: 44, def3: 49 },
  },
  yamamoto_rate5: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 5, rR: 5,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 54, def2: 49, def3: 54 },
  },
  yamamoto_rate6: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 6, rR: 6,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 53, def2: 47, def3: 53 },
  },
  yamamoto_rate7: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 7, rR: 7,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 51, def2: 45, def3: 51 },
  },
  yamamoto_career_change: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 170, rW: 4, rR: 4,
      baseInc: 506, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 52, def2: 48, def3: 53 },
  },
  yamamoto_career_change_exp320: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 170, rW: 4, rR: 4,
      baseInc: 506, baseExp: 320,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 58, def2: 52, def3: 58 },
  },
  yamamoto_age40: {
    params: {
      curAge: 40, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 4, rR: 4,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 61, def2: 55, def3: 62 },
  },
  yamamoto_age44: {
    params: {
      curAge: 44, nisaBal: 400, cashBal: 420,
      nisaCon: 120, rW: 4, rR: 4,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 65, def2: 58, def3: 65 },
  },
  yamamoto_con156: {
    params: {
      curAge: 34, nisaBal: 400, cashBal: 420,
      nisaCon: 156, rW: 4, rR: 4,
      baseInc: 456, baseExp: 264,
      penAge: 65, penInc: 100,
    },
    expected: { def1: 54, def2: 50, def3: 55 },
  },
  // 田中誠・佐々木誠一シリーズは確定データが無いため含めない。
};

function buildSimParams(f, retAge) {
  return {
    curAge: f.curAge, lifeEx: 90,
    baseInc: f.baseInc, baseExp: f.baseExp,
    inflR: 0,
    retAge,
    penAge: f.penAge, penAmt: f.penInc,
    mcStd: 0, mcStdR: 0,
    hasIdeco: false,
    idecoYrs: 1, idecoReceiveType: 'lump',
    idecoReceiveYears: 10, idecoStartAge: 60,
    sevYrs: 1,
    acct: {
      nisa:  { bal: f.nisaBal, con: f.nisaCon, toAge: 99, rW: f.rW, rR: f.rR },
      ideco: { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0 },
      tax:   { bal: 0, con: 0, toAge: 60, rW: 0, rR: 0, costBasis: 0 },
      cash:  { bal: f.cashBal },
    },
    spouse: null,
  };
}

function findFireAges(f) {
  const needed = f.baseExp * 25;
  let def1 = null, def2 = null, def3 = null;

  for (let retAge = f.curAge + 1; retAge <= 80; retAge++) {
    const p = buildSimParams(f, retAge);
    const snaps = simulate(p, [], 'proportional');
    const retSnap = snaps.find(s => s.age === retAge);
    const total = retSnap ? retSnap.totalAssets : 0;

    if (!def1 && total >= needed) def1 = retAge;

    const postRetSnaps = snaps.filter(s => s.age >= retAge);
    const survived90 = postRetSnaps.every(s => s.totalAssets > 0);
    if (!def2 && survived90) def2 = retAge;

    const alwaysAbove = postRetSnaps.every(s => s.totalAssets >= needed);
    if (!def3 && alwaysAbove) def3 = retAge;

    if (def1 && def2 && def3) break;
  }
  return { def1, def2, def3 };
}

function runFixture(name, fixture) {
  const actual = findFireAges(fixture.params);

  const mismatches = [];
  for (const key of Object.keys(fixture.expected)) {
    if (actual[key] !== fixture.expected[key]) {
      mismatches.push(`${key}: expected ${fixture.expected[key]}, got ${actual[key]}`);
    }
  }

  return mismatches.length === 0
    ? { name, status: 'PASS' }
    : { name, status: 'FAIL', mismatches };
}

function main() {
  const results = Object.entries(FIXTURES).map(([name, fixture]) => runFixture(name, fixture));

  let hasFailure = false;
  for (const r of results) {
    if (r.status === 'PASS') {
      console.log(`✅ ${r.name}`);
    } else if (r.status === 'SKIPPED') {
      console.log(`⏭️  ${r.name}: ${r.reason}`);
    } else {
      hasFailure = true;
      console.error(`❌ ${r.name}`);
      r.mismatches.forEach((m) => console.error(`   - ${m}`));
    }
  }

  if (hasFailure) {
    console.error('\n検証失敗：移植後のエンジン出力が確定値と一致しません。');
    process.exit(2);
  }

  console.log('\n検証完了（実装済みのシナリオは全て一致、未接続分はスキップ）。');
  process.exit(0);
}

main();
