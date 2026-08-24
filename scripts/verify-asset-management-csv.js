/**
 * scripts/verify-asset-management-csv.js
 * 資産管理ツールのCSV記録履歴インポートまわりの純粋関数（ブラウザ・localStorage不要）を
 * 直接importして検証する。investigation_csv_duplicate_bug_and_reset_feature.mdで発覚した
 * 2つのバグの回帰テスト：
 *   バグA：同一ID・同一年月の行を複数含むCSVを1回インポートしただけで重複行が保存される
 *          （groupRowsByYearMonthがID一致判定を持たなかった）
 *   バグB：個人セクションのCSVインポートが「区分」によるフィルタを持たず、法人行が
 *          個人ストアに混入する（法人側にのみ除外フィルタがあり、個人側に未実装だった）
 * 本番のmergeById/groupRowsByYearMonth/buildGroupsExcludingOwners/normalizeYearMonth/
 * parseHistoryCsv/parseHojinHistoryCsvを直接importして呼び出すだけで、独自の再実装は含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

const {
  mergeById,
  groupRowsByYearMonth,
  buildGroupsExcludingOwners,
  normalizeYearMonth,
} = require('../src/lib/assetManagement/csvHistory');
const { parseHistoryCsv } = require('../src/lib/assetManagement/exportImport');
const { parseHojinHistoryCsv } = require('../src/lib/hojinAssetManagement/exportImport');

let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, detail) {
  if (ok) {
    pass++;
  } else {
    fail++;
    failedCases.push({ label, detail });
  }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const HISTORY_HEADER = 'ID,年月,口座カテゴリ,資産クラス,区分,金額(万円),更新日';

function csvText(rows) {
  return [HISTORY_HEADER, ...rows].join('\n');
}

// ================================================================
// SECTION 1: mergeById（ID一致判定の共通ロジック）
// ================================================================
console.log('='.repeat(80));
console.log('【mergeById：ID一致判定の共通ロジック】');
console.log('='.repeat(80));

{
  const existing = [{ id: 'a', amount: 100 }, { id: 'b', amount: 200 }];
  const incoming = [{ id: 'a', amount: 999 }];
  const merged = mergeById(existing, incoming);
  record(
    '1. id一致→上書き（位置は保持、amountは新しい値）',
    merged.length === 2 && merged[0].id === 'a' && merged[0].amount === 999 && merged[1].id === 'b',
    JSON.stringify(merged)
  );
}
{
  const existing = [{ id: 'a', amount: 100 }];
  const incoming = [{ id: 'c', amount: 300 }];
  const merged = mergeById(existing, incoming);
  record(
    '2. id不一致→末尾に新規追加',
    merged.length === 2 && merged[1].id === 'c',
    JSON.stringify(merged)
  );
}
{
  // バグAの核心：existingが空の状態にincoming側で同一idが複数回渡された場合も1件に収束するか
  const merged = mergeById([], [{ id: 'x', amount: 1 }, { id: 'x', amount: 2 }]);
  record(
    '3. incoming内に同一idが複数あっても最後の値1件に収束する',
    merged.length === 1 && merged[0].amount === 2,
    JSON.stringify(merged)
  );
}

// ================================================================
// SECTION 2: groupRowsByYearMonth（回帰テスト：バグA）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【groupRowsByYearMonth：同一ID・同一年月の重複排除（バグA回帰テスト）】');
console.log('='.repeat(80));

{
  const rows = [
    { id: 'dup1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 300, updatedAt: '', yearMonth: '2026-08' },
    { id: 'dup1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 300, updatedAt: '', yearMonth: '2026-08' },
    { id: 'dup1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 300, updatedAt: '', yearMonth: '2026-08' },
  ];
  const groups = groupRowsByYearMonth(rows);
  const g = groups.get('2026-08');
  record(
    '4. 同一ID・同一年月の行が3回登場するCSVでも、グループ内は1件に収束する',
    groups.size === 1 && g.length === 1 && g[0].id === 'dup1',
    `groups.size=${groups.size}, group('2026-08').length=${g ? g.length : 'undefined'}`
  );
}
{
  const rows = [
    { id: 'a', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 100, updatedAt: '', yearMonth: '2026-08' },
    { id: 'b', owner: 'personal', accountCategory: 'NISA', assetClass: '全世界株', amount: 200, updatedAt: '', yearMonth: '2026-08' },
    { id: 'c', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 300, updatedAt: '', yearMonth: '2026-07' },
  ];
  const groups = groupRowsByYearMonth(rows);
  record(
    '5. 異なるID・異なる年月は正しくそれぞれ独立して保持される（過剰統合しない）',
    groups.size === 2 && groups.get('2026-08').length === 2 && groups.get('2026-07').length === 1,
    JSON.stringify(Array.from(groups.entries()))
  );
}

// ================================================================
// SECTION 3: buildGroupsExcludingOwners（回帰テスト：バグB、区分によるクロス混入防止）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【buildGroupsExcludingOwners：区分フィルタ（バグB回帰テスト）】');
console.log('='.repeat(80));

{
  const rows = [
    { id: 'corp1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 100, updatedAt: '', yearMonth: '2026-08' },
    { id: 'pers1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 200, updatedAt: '', yearMonth: '2026-08' },
    { id: 'sp1', owner: 'personal_spouse', accountCategory: '現金', assetClass: '現金', amount: 300, updatedAt: '', yearMonth: '2026-08' },
  ];
  const { groups, ignoredCount } = buildGroupsExcludingOwners(rows, ['corporate']);
  const g = groups.get('2026-08');
  record(
    '6. 個人向けフィルタ（法人除外）：法人行が除外され、本人/配偶者行のみ残る',
    ignoredCount === 1 && g.length === 2 && g.every((h) => h.owner !== 'corporate'),
    JSON.stringify(g)
  );
  const hojinResult = buildGroupsExcludingOwners(rows, ['personal', 'personal_spouse']);
  const hg = hojinResult.groups.get('2026-08');
  record(
    '7. 法人向けフィルタ（本人/配偶者除外）：本人/配偶者行が除外され、法人行のみ残る',
    hojinResult.ignoredCount === 2 && hg.length === 1 && hg[0].owner === 'corporate',
    JSON.stringify(hg)
  );
}

// ================================================================
// SECTION 4: parseHistoryCsv（個人側パーサ、実CSV文字列を使ったエンドツーエンド）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【parseHistoryCsv（個人側）：CSV文字列からのエンドツーエンド検証】');
console.log('='.repeat(80));

{
  // バグA：同一CSVファイル内に同一ID・同一年月の行が複数回登場するケース
  const text = csvText([
    'row1,2026-08,現金,現金,本人,100,',
    'row1,2026-08,現金,現金,本人,100,',
    'row1,2026-08,現金,現金,本人,100,',
  ]);
  const parsed = parseHistoryCsv(text);
  const g = parsed.groups.get('2026-08');
  record(
    '8. 同一ID行が3回登場するCSVを1回パースしても、結果は1件に収束する',
    g && g.length === 1 && g[0].amount === 100,
    JSON.stringify(g)
  );
}
{
  // 同じCSVを3回連続でパースしても、結果（グループの中身）が変化しないこと
  // （「同じCSVを3回連続でインポートしても行数が変わらない」の純粋関数レベルでの確認）
  const text = csvText(['row1,2026-08,現金,現金,本人,100,', 'row2,2026-08,NISA,全世界株,本人,200,']);
  const results = [1, 2, 3].map(() => parseHistoryCsv(text).groups.get('2026-08').length);
  record(
    '9. 同一CSVを3回連続でパースしても、グループの行数は常に2件のまま変化しない',
    results.every((n) => n === 2),
    `results=${JSON.stringify(results)}`
  );
}
{
  // バグB：個人側パーサに法人区分の行が含まれる場合、除外されて反映されないこと
  const text = csvText([
    'corp1,2026-08,法人預金,現金,法人,999,',
    'pers1,2026-08,現金,現金,本人,100,',
  ]);
  const parsed = parseHistoryCsv(text);
  const g = parsed.groups.get('2026-08');
  record(
    '10. 個人側パーサ：法人区分の行は除外され、個人ストアには反映されない（バグB回帰）',
    parsed.ignoredCorporateRowCount === 1 && g.length === 1 && g[0].owner === 'personal',
    JSON.stringify({ ignoredCorporateRowCount: parsed.ignoredCorporateRowCount, g })
  );
}

// ================================================================
// SECTION 5: parseHojinHistoryCsv（法人側パーサ、実CSV文字列を使ったエンドツーエンド）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【parseHojinHistoryCsv（法人側）：CSV文字列からのエンドツーエンド検証】');
console.log('='.repeat(80));

{
  const text = csvText([
    'row1,2026-08,法人預金,現金,法人,300,',
    'row1,2026-08,法人預金,現金,法人,300,',
  ]);
  const parsed = parseHojinHistoryCsv(text);
  const g = parsed.hojinGroups.get('2026-08');
  record(
    '11. 法人側パーサ：同一ID行が2回登場するCSVを1回パースしても、結果は1件に収束する（バグA回帰）',
    g && g.length === 1,
    JSON.stringify(g)
  );
}
{
  // バグBの逆方向（既に前回の差し戻しで実装済みだが、共通化後も維持されているかの回帰確認）
  const text = csvText([
    'corp1,2026-08,法人預金,現金,法人,300,',
    'pers1,2026-08,現金,現金,本人,999,',
    'sp1,2026-08,現金,現金,配偶者,888,',
  ]);
  const parsed = parseHojinHistoryCsv(text);
  const g = parsed.hojinGroups.get('2026-08');
  record(
    '12. 法人側パーサ：本人/配偶者区分の行は除外され、法人ストアには反映されない',
    parsed.ignoredPersonalRowCount === 2 && g.length === 1 && g[0].owner === 'corporate',
    JSON.stringify({ ignoredPersonalRowCount: parsed.ignoredPersonalRowCount, g })
  );
}
{
  const text = csvText(['row1,2026-08,法人預金,現金,法人,300,', 'row2,2026-08,法人証券口座,全世界株,法人,500,']);
  const results = [1, 2, 3].map(() => parseHojinHistoryCsv(text).hojinGroups.get('2026-08').length);
  record(
    '13. 法人側：同一CSVを3回連続でパースしても、グループの行数は常に2件のまま変化しない',
    results.every((n) => n === 2),
    `results=${JSON.stringify(results)}`
  );
}

// ================================================================
// SECTION 6: normalizeYearMonth（表計算ソフトの自動日付変換への頑健性）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【normalizeYearMonth：年月正規化】');
console.log('='.repeat(80));

const NORMALIZE_CASES = [
  ['2026-08', '2026-08'],
  ['2026/08', '2026-08'],
  ['Aug-26', '2026-08'],
  ['Aug-2026', '2026-08'],
  ['aug-26', '2026-08'],
  ['2026/8/1', '2026-08'],
  ['8/1/2026', '2026-08'],
  ['不明な月', null],
  ['2026-13', null], // 存在しない月
  ['', null],
];
for (const [input, expected] of NORMALIZE_CASES) {
  const actual = normalizeYearMonth(input);
  record(`14. normalizeYearMonth("${input}") → ${JSON.stringify(expected)}`, actual === expected, `actual=${JSON.stringify(actual)}`);
}

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: CSV記録履歴インポートの重複排除・区分フィルタ・年月正規化を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));
