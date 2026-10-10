/**
 * scripts/verify-asset-classes-sync.js
 * シミュレーター（src/lib/profile.ts）と資産管理ツール（src/lib/assetManagement/categories.ts）の
 * ASSET_CLASSES が一致していることを確認する（再発防止）。docs/fixes の unify_asset_classes_insurance_other.md 2-3節。
 *
 * 資産管理ツールからインポートした銘柄名がシミュレーターの一覧になく、<select>で選べなかった
 * （保険・その他）。2つの一覧がずれると同じことが起きるため、銘柄名・順番・値を突き合わせる。
 *
 * 確認すること:
 * 1. 銘柄名の集合と順番が同じ
 * 2. mu・sigmaは未設定を0として、groupは未設定を'cash'として比べて同じ
 *    （法人側 portfolioMath.ts の `?? 0`・`?? 'cash'` と同じ扱い）
 * 失敗した場合は、どの銘柄のどの値が違うかを出力する。
 */

require('./lib/registerTsNode');
const { ASSET_CLASSES: SIM_CLASSES } = require('../src/lib/profile');
const { ASSET_CLASSES: TOOL_CLASSES } = require('../src/lib/assetManagement/categories');

let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, details = []) {
  if (ok) pass++; else { fail++; failedCases.push({ label, details }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}`);
  if (!ok) details.forEach((d) => console.log(`    ${d}`));
}

const norm = (a) => ({ key: a.key, mu: a.mu ?? 0, sigma: a.sigma ?? 0, group: a.group ?? 'cash' });

// 違いを「銘柄: 項目 シミュレーター=… / 資産管理ツール=…」の形で返す（空配列なら一致）
function diffAssetClasses(sim, tool) {
  const diffs = [];
  const simKeys = sim.map((a) => a.key);
  const toolKeys = tool.map((a) => a.key);
  simKeys.filter((k) => !toolKeys.includes(k)).forEach((k) => diffs.push(`${k}: シミュレーターにだけある`));
  toolKeys.filter((k) => !simKeys.includes(k)).forEach((k) => diffs.push(`${k}: 資産管理ツールにだけある`));
  if (diffs.length === 0 && simKeys.join('|') !== toolKeys.join('|')) {
    diffs.push(`順番が違う: シミュレーター=[${simKeys.join(', ')}] / 資産管理ツール=[${toolKeys.join(', ')}]`);
  }
  for (const s of sim.map(norm)) {
    const t = tool.find((a) => a.key === s.key);
    if (!t) continue;
    const tn = norm(t);
    for (const f of ['mu', 'sigma', 'group']) {
      if (s[f] !== tn[f]) diffs.push(`${s.key}: ${f} シミュレーター=${s[f]} / 資産管理ツール=${tn[f]}`);
    }
  }
  return diffs;
}

const keysDiff = diffAssetClasses(SIM_CLASSES.map((a) => ({ key: a.key })), TOOL_CLASSES.map((a) => ({ key: a.key })));
record(`1. 銘柄名の集合と順番が同じ（シミュレーター${SIM_CLASSES.length}件・資産管理ツール${TOOL_CLASSES.length}件）`, keysDiff.length === 0, keysDiff);
const valuesDiff = diffAssetClasses(SIM_CLASSES, TOOL_CLASSES).filter((d) => !keysDiff.includes(d));
record('2. mu・sigma（未設定=0）・group（未設定=cash）が同じ', valuesDiff.length === 0, valuesDiff);

// 判定ロジック自体の確認（違いを検出し、未設定と0・cashは同じとみなすこと）
const base = [{ key: 'A', mu: 1, sigma: 2, group: 'stock' }, { key: 'B', mu: 0, sigma: 0, group: 'cash' }];
const selfTest = [
  ['同じ', [{ key: 'A', mu: 1, sigma: 2, group: 'stock' }, { key: 'B' }], 0],
  ['muが違う', [{ key: 'A', mu: 1.5, sigma: 2, group: 'stock' }, { key: 'B' }], 1],
  ['groupが違う', [{ key: 'A', mu: 1, sigma: 2, group: 'bond' }, { key: 'B' }], 1],
  ['銘柄が足りない', [{ key: 'A', mu: 1, sigma: 2, group: 'stock' }], 1],
  ['順番が違う', [{ key: 'B' }, { key: 'A', mu: 1, sigma: 2, group: 'stock' }], 1],
];
const selfTestNg = selfTest.filter(([, tool, n]) => diffAssetClasses(base, tool).length !== n).map(([label, , n]) => `期待${n}件: ${label}`);
record('（判定ロジックの自己確認）値・銘柄・順番の違いを検出し、未設定は0・cashとみなす', selfTestNg.length === 0, selfTestNg);

console.log('='.repeat(80));
console.log(`結果: PASS=${pass} FAIL=${fail}`);
if (fail > 0) {
  console.log('--- FAILED CASES ---');
  failedCases.forEach((c) => {
    console.log(`  - ${c.label}`);
    c.details.forEach((d) => console.log(`      ${d}`));
  });
  process.exitCode = 1;
}
