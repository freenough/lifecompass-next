/**
 * scripts/verify-phrase-break.js
 * src/lib/budoux（BudouX公式のParser＋モデルの構成を参考にした最小構成）の文節区切りを検証する
 * （impl_budoux_phrase_break.md 3節）。本番のsegmentJapanese()を直接呼び出すだけで、独自の再実装ロジックは含まない。
 *
 * src/lib/budoux/index.ts は 'server-only' をimportしており、Next.jsのビルドを通らないNode.jsからは
 * 解決できないため、処理本体の src/lib/budoux/segment.ts を直接読み込む。
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const { segmentJapanese } = require('../src/lib/budoux/segment');
const { PROTECTED_TERMS } = require('../src/lib/budoux/protectedTerms');

let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, detail) {
  if (ok) pass++; else { fail++; failedCases.push({ label, detail }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail && !ok ? ' — ' + detail : ''}`);
}

const show = (phrases) => phrases.join('／');
const boundariesOf = (phrases) => {
  const result = [];
  let position = 0;
  for (const phrase of phrases.slice(0, -1)) { position += phrase.length; result.push(position); }
  return result;
};

// ----------------------------------------------------------------
// 1. npm版（budoux@0.9.2）との一致
// 期待値は試験導入（experiment_budoux_hitori_hojin.md）の完了報告にある、npm版 loadDefaultJapaneseParser() の区切り。
// 一人法人LPの記事8件のタイトル・説明文と、下部CTAの2文（計18文）。
// 今回の実装の区切り位置は「npm版の区切り位置から、用語リストの語の途中にあるものを除いたもの」と完全に一致すること。
// ----------------------------------------------------------------
const NPM_EXPECTED = [
  ['一人', '法', '人って、', 'そもそも', '何？'],
  ['一人', '法人の', '基本と、', 'FIRE計画に', 'おける', '位置づけ'],
  ['税金・社会保険は', 'どう', '変わる？'],
  ['法人化で', '変わる', '税金・社会保険の', '構造'],
  ['実際、', '維持コストは', 'いくら？'],
  ['一人', '法人の', '維持コストを', '実感ベースで', '整理'],
  ['完全リタイアしなくても、', 'FIREって', '目指せる？'],
  ['完全リタイアと', '会社員の', '間に', 'ある', '選択肢'],
  ['役員報酬は、', 'いくらに', 'すればいい？'],
  ['役員報酬を', '考える', '3つの', '視点'],
  ['法人に', '残す？', '個人に', '移す？'],
  ['法人と', '個人、', 'お金の', '置き場所を', '考える'],
  ['会社員から', '一人法人へ。', '何が', '変わった？'],
  ['働き方が', '変わって', '見えてきた', 'お金の', '論点'],
  ['一人', '法人は、', 'いつ', '作ればいい？'],
  ['一人', '法人を', '作る', 'タイミングの', '考え方'],
  ['一人', '法人を', '考える', '前に、', 'まずは', '自分の', '必要資産額を', '確認してみてください。'],
  ['一人', '法人は', 'FIREを', '実現する', 'ための', '選択肢の', '一つです。'],
];

// 用語リストの語の内側にある位置（検証側で独立に求める。長い語を優先し、長い語の中の短い語は数えない）
function interiorPositions(text) {
  const terms = [...PROTECTED_TERMS].sort((a, b) => b.length - a.length);
  const covered = new Array(text.length).fill(false);
  const result = new Set();
  for (const term of terms) {
    for (let start = text.indexOf(term); start !== -1; start = text.indexOf(term, start + 1)) {
      const end = start + term.length;
      if (covered.slice(start, end).some(Boolean)) continue;
      for (let i = start + 1; i < end; i++) result.add(i);
      covered.fill(true, start, end);
    }
  }
  return result;
}

console.log('--- 1. npm版（budoux@0.9.2）との一致（用語リストで結合される箇所を除く） ---');
const mergedCases = [];
for (const npm of NPM_EXPECTED) {
  const text = npm.join('');
  const actual = segmentJapanese(text);
  const interior = interiorPositions(text);
  const expectedBoundaries = boundariesOf(npm).filter((b) => !interior.has(b));
  const ok = JSON.stringify(boundariesOf(actual)) === JSON.stringify(expectedBoundaries);
  record(`${text}`, ok, `期待 ${expectedBoundaries.join(',')} / 実際 ${boundariesOf(actual).join(',')}（${show(actual)}）`);
  if (boundariesOf(npm).length !== boundariesOf(actual).length) mergedCases.push(`npm版「${show(npm)}」→ 今回「${show(actual)}」`);
}
console.log('  用語リストで結合された箇所:');
mergedCases.forEach((c) => console.log(`    ${c}`));

// ----------------------------------------------------------------
// 2. 用語リスト：「一人法人」「法人」の途中に区切りが入らないこと
// ----------------------------------------------------------------
console.log('\n--- 2. 用語リスト ---');
const TERM_CASES = [
  // impl_budoux_phrase_break.md 2節の表の例
  ['一人法人って、そもそも何？', ['一人法人って、', 'そもそも', '何？']],
  ['一人法人の基本と、FIRE計画における位置づけ', ['一人法人の', '基本と、', 'FIRE計画に', 'おける', '位置づけ']],
  ['一人法人を考える前に、まずは自分の必要資産額を確認してみてください。', ['一人法人を', '考える', '前に、', 'まずは', '自分の', '必要資産額を', '確認してみてください。']],
  // 用語の直前・直後の区切りは残す（変化なし）
  ['法人に残す？個人に移す？', ['法人に', '残す？', '個人に', '移す？']],
];
for (const [text, expected] of TERM_CASES) {
  const actual = segmentJapanese(text);
  record(`「${text}」→ ${show(expected)}`, show(actual) === show(expected), `実際 ${show(actual)}`);
}
// 全ケースで、どの用語の途中にも区切りがないこと
const allTexts = [...NPM_EXPECTED.map((p) => p.join('')), ...TERM_CASES.map(([t]) => t)];
let termBreaks = [];
for (const text of allTexts) {
  const interior = interiorPositions(text);
  const hits = boundariesOf(segmentJapanese(text)).filter((b) => interior.has(b));
  if (hits.length) termBreaks.push(`${text}（位置 ${hits.join(',')}）`);
}
record(`全${allTexts.length}文で、用語（${PROTECTED_TERMS.join('・')}）の途中に区切りがない`, termBreaks.length === 0, termBreaks.join(' / '));

// ----------------------------------------------------------------
// 3. 文字列の保存：区切った結果を連結すると元の文字列に一致すること
// ----------------------------------------------------------------
console.log('\n--- 3. 文字列の保存 ---');
const EDGE_TEXTS = ['', 'FIRE', 'abc123', '2026', '！？。、・…', '---', '　', 'a', '法', '人', '一人法人'];
const broken = [...allTexts, ...EDGE_TEXTS].filter((t) => segmentJapanese(t).join('') !== t);
record(`全${allTexts.length + EDGE_TEXTS.length}件で、連結結果が元の文字列と一致する`, broken.length === 0, broken.join(' / '));

// ----------------------------------------------------------------
// 4. 空文字・英数字だけ・記号だけの文字列で例外が出ないこと
// ----------------------------------------------------------------
console.log('\n--- 4. 例外が出ないこと ---');
for (const text of EDGE_TEXTS) {
  let ok = true, detail = '';
  try {
    const r = segmentJapanese(text);
    detail = JSON.stringify(r);
    if (!Array.isArray(r)) ok = false;
  } catch (e) {
    ok = false; detail = String(e);
  }
  record(`${JSON.stringify(text)} → ${detail}`, ok, detail);
}
record('空文字は空の配列を返す（公式Parserと同じ）', JSON.stringify(segmentJapanese('')) === '[]');

console.log('='.repeat(80));
console.log(`結果: PASS=${pass} FAIL=${fail}`);
if (fail > 0) {
  console.log('--- FAILED CASES ---');
  failedCases.forEach((c) => console.log(`  - ${c.label}${c.detail ? ' — ' + c.detail : ''}`));
  process.exitCode = 1;
}
