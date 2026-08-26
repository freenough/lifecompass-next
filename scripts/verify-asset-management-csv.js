/**
 * scripts/verify-asset-management-csv.js
 * 資産管理ツールのCSV記録履歴インポートまわりの純粋関数（ブラウザ・localStorage不要）を
 * 直接importして検証する。investigation_csv_duplicate_bug_and_reset_feature.mdで発覚した
 * 2つのバグの回帰テスト：
 *   バグA：同一ID・同一年月の行を複数含むCSVを1回インポートしただけで重複行が保存される
 *          （groupRowsByYearMonthがID一致判定を持たなかった）
 *   バグB：個人セクションのCSVインポートが「区分」によるフィルタを持たず、法人行が
 *          個人ストアに混入する（法人側にのみ除外フィルタがあり、個人側に未実装だった）
 * simplify_csv_scope_and_fix_graph_history_bug.md 2章で、個人セクション用・法人セクション用に
 * 分かれていたパーサ（parseHistoryCsv/parseHojinHistoryCsv）を、表示トグルを一切参照しない
 * 単一のparseAssetCsvに統合した。本番のmergeById/groupRowsByYearMonth/splitGroupsByOwners/
 * normalizeYearMonth/toCompactYearMonth/summarizeYearMonths/parseAssetCsvを直接importして
 * 呼び出すだけで、独自の再実装は含まない。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

const {
  mergeById,
  groupRowsByYearMonth,
  splitGroupsByOwners,
  normalizeYearMonth,
  toCompactYearMonth,
  summarizeYearMonths,
} = require('../src/lib/assetManagement/csvHistory');
const { parseAssetCsv } = require('../src/lib/assetManagement/exportImport');

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
// SECTION 3: splitGroupsByOwners（回帰テスト：バグB、区分によるクロス混入防止）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【splitGroupsByOwners：区分による分類（バグB回帰テスト）】');
console.log('='.repeat(80));

{
  const rows = [
    { id: 'corp1', owner: 'corporate', accountCategory: '法人預金', assetClass: '現金', amount: 100, updatedAt: '', yearMonth: '2026-08' },
    { id: 'pers1', owner: 'personal', accountCategory: '現金', assetClass: '現金', amount: 200, updatedAt: '', yearMonth: '2026-08' },
    { id: 'sp1', owner: 'personal_spouse', accountCategory: '現金', assetClass: '現金', amount: 300, updatedAt: '', yearMonth: '2026-08' },
  ];
  const { ownGroups, otherGroups } = splitGroupsByOwners(rows, ['personal', 'personal_spouse']);
  const own = ownGroups.get('2026-08');
  const other = otherGroups.get('2026-08');
  record(
    '6. 個人owner指定：本人/配偶者行がownGroupsに、法人行がotherGroupsに分類される',
    own.length === 2 && own.every((h) => h.owner !== 'corporate') && other.length === 1 && other[0].owner === 'corporate',
    JSON.stringify({ own, other })
  );
  const hojinResult = splitGroupsByOwners(rows, ['corporate']);
  const hojinOwn = hojinResult.ownGroups.get('2026-08');
  const hojinOther = hojinResult.otherGroups.get('2026-08');
  record(
    '7. 法人owner指定：法人行がownGroupsに、本人/配偶者行がotherGroupsに分類される（6と対称）',
    hojinOwn.length === 1 && hojinOwn[0].owner === 'corporate' && hojinOther.length === 2 && hojinOther.every((h) => h.owner !== 'corporate'),
    JSON.stringify({ hojinOwn, hojinOther })
  );
}

// ================================================================
// SECTION 4: parseAssetCsv（統合パーサ、実CSV文字列を使ったエンドツーエンド）
// スコープの概念はなく、常に本人/配偶者行→personalGroups・法人行→hojinGroupsへ分類する
// （simplify_csv_scope_and_fix_graph_history_bug.md 2章：CSVの中身だけで判断する）。
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【parseAssetCsv：CSV文字列からのエンドツーエンド検証】');
console.log('='.repeat(80));

{
  // バグA：同一CSVファイル内に同一ID・同一年月の行が複数回登場するケース
  const text = csvText([
    'row1,2026-08,現金,現金,本人,100,',
    'row1,2026-08,現金,現金,本人,100,',
    'row1,2026-08,現金,現金,本人,100,',
  ]);
  const parsed = parseAssetCsv(text);
  const g = parsed.personalGroups.get('2026-08');
  record(
    '8. 同一ID行が3回登場するCSVを1回パースしても、結果は1件に収束する',
    g && g.length === 1 && g[0].amount === 100,
    JSON.stringify(g)
  );
}
{
  // 同じCSVを3回連続でパースしても、結果（グループの中身）が変化しないこと
  const text = csvText(['row1,2026-08,現金,現金,本人,100,', 'row2,2026-08,NISA,全世界株,本人,200,']);
  const results = [1, 2, 3].map(() => parseAssetCsv(text).personalGroups.get('2026-08').length);
  record(
    '9. 同一CSVを3回連続でパースしても、グループの行数は常に2件のまま変化しない',
    results.every((n) => n === 2),
    `results=${JSON.stringify(results)}`
  );
}
{
  // バグB回帰＋スコープ廃止の確認：本人行・法人行が混在するCSVを1回パースするだけで、
  // 個人行はpersonalGroupsへ、法人行はhojinGroupsへ、常に両方とも正しく分類される
  // （以前のpersonalOnlyスコープのように法人行が「無視」されることはない）。
  const text = csvText([
    'corp1,2026-08,法人預金,現金,法人,999,',
    'pers1,2026-08,現金,現金,本人,100,',
  ]);
  const parsed = parseAssetCsv(text);
  const personal = parsed.personalGroups.get('2026-08');
  const hojin = parsed.hojinGroups.get('2026-08');
  record(
    '10. 本人行・法人行混在CSV：personalGroups・hojinGroups双方に正しく分類される（バグB回帰＋スコープ廃止）',
    personal.length === 1 && personal[0].owner === 'personal' && hojin.length === 1 && hojin[0].owner === 'corporate',
    JSON.stringify({ personal, hojin })
  );
}
{
  // 法人行のみのCSV：personalGroupsは空、hojinGroupsのみ埋まる（片方しか無ければ片方だけ）。
  const text = csvText(['corp1,2026-08,法人預金,現金,法人,300,', 'corp2,2026-08,法人証券口座,全世界株,法人,500,']);
  const parsed = parseAssetCsv(text);
  record(
    '11. 法人行のみのCSV：personalGroupsは空、hojinGroupsのみ2件埋まる',
    parsed.personalGroups.size === 0 && parsed.hojinGroups.get('2026-08').length === 2,
    JSON.stringify({ personalSize: parsed.personalGroups.size, hojin: parsed.hojinGroups.get('2026-08') })
  );
}
{
  const text = csvText(['row1,2026-08,法人預金,現金,法人,300,', 'row1,2026-08,法人預金,現金,法人,300,']);
  const results = [1, 2, 3].map(() => parseAssetCsv(text).hojinGroups.get('2026-08').length);
  record(
    '12. 法人側：同一ID行が2回登場するCSVを3回連続パースしても、常に1件に収束する（バグA回帰）',
    results.every((n) => n === 1),
    `results=${JSON.stringify(results)}`
  );
}

// ================================================================
// SECTION 5: normalizeYearMonth（表計算ソフトの自動日付変換への頑健性）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【normalizeYearMonth：年月正規化】');
console.log('='.repeat(80));

const NORMALIZE_CASES = [
  ['202608', '2026-08'], // 新しい主形式（YYYYMM、区切りなし6桁）
  ['202613', null], // 存在しない月（YYYYMM形式）
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
  record(`13. normalizeYearMonth("${input}") → ${JSON.stringify(expected)}`, actual === expected, `actual=${JSON.stringify(actual)}`);
}

// ================================================================
// SECTION 6: toCompactYearMonth（Export時のYYYY-MM→YYYYMM変換）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【toCompactYearMonth：Export時の年月表記変換】');
console.log('='.repeat(80));

{
  record('14. toCompactYearMonth("2026-08") → "202608"', toCompactYearMonth('2026-08') === '202608', `actual=${toCompactYearMonth('2026-08')}`);
  record('14. toCompactYearMonth("2026-12") → "202612"', toCompactYearMonth('2026-12') === '202612', `actual=${toCompactYearMonth('2026-12')}`);
}

// ================================================================
// SECTION 7: summarizeYearMonths（確認ダイアログの要約表示、指示書3章）
// ================================================================
console.log('\n' + '='.repeat(80));
console.log('【summarizeYearMonths：年月一覧の要約表示】');
console.log('='.repeat(80));

{
  const months = ['2026-08', '2026-07', '2026-06'];
  record(
    '15. 合計5件以下：具体的な年月をすべて列挙する（現状通り）',
    summarizeYearMonths(months, 3) === '2026-06、2026-07、2026-08',
    summarizeYearMonths(months, 3)
  );
}
{
  const months = Array.from({ length: 120 }, (_, i) => {
    const y = 2020 + Math.floor(i / 12);
    const m = String((i % 12) + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  record(
    '16. 合計6件以上：範囲と件数の要約になる（指示書3章の例と同じ形式）',
    summarizeYearMonths(months, 123) === '2020-01〜2029-12（120件）',
    summarizeYearMonths(months, 123)
  );
}
{
  // 指示書3章の例そのもの：法人側は3件しかなくても、合計（120+3=123）が6件以上なら要約される。
  const hojinMonths = ['2026-06', '2026-07', '2026-08'];
  record(
    '17. 法人側が3件のみでも、合計件数（personal+hojin）が6件以上なら要約される',
    summarizeYearMonths(hojinMonths, 123) === '2026-06〜2026-08（3件）',
    summarizeYearMonths(hojinMonths, 123)
  );
}
{
  record('18. 空配列 → 空文字列', summarizeYearMonths([], 0) === '', JSON.stringify(summarizeYearMonths([], 0)));
}

// ================================================================
// 総合結果
// ================================================================
console.log('\n' + '='.repeat(80));
console.log(`総合結果: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('検証成功: CSV記録履歴インポートの重複排除・区分分類・年月正規化・要約表示を確認しました。');
} else {
  console.log('検証失敗: 以下のケースがFAILしました。');
  for (const f of failedCases) {
    console.log(`  - [${f.label}] ${f.detail ?? ''}`);
  }
  process.exitCode = 1;
}
console.log('='.repeat(80));
