/**
 * scripts/verify-ts-node-register.js
 * scripts/ 配下のスクリプトが ts-node を直接登録していないことを確認する（再発防止）。
 * docs/fixes の fix_verify_ts_node_register_once.md 3節。
 *
 * ts-node は register() を呼ぶたびに前の .ts 読み込みフックを包むため、full-verify.js のように複数の
 * スクリプトを同じプロセスで require すると、登録が重なった分だけ .ts ファイルが何重にもコンパイルされ、
 * メモリが膨らむ（登録24回で約4.6GB。investigation_full_verify_memory.md）。TypeScript を読み込む
 * スクリプトは、登録済みなら登録しない共通処理 require('./lib/registerTsNode') を使う。
 *
 * 確認すること:
 * 1. scripts/ 配下のすべての .js ファイル（共通の登録処理 scripts/lib/registerTsNode.js と、判定用の文字列を持つ
 *    このファイル自身を除く）に、ts-node の直接の読み込み（require・import。コメント行は除く）が0件
 * 失敗した場合は、対象のファイル:行を出力する。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// 共通の登録処理そのものと、判定用の文字列を持つこのファイル自身は対象外
const EXCLUDED = ['scripts/lib/registerTsNode.js', 'scripts/verify-ts-node-register.js'];
let pass = 0, fail = 0;
const failedCases = [];

function record(label, ok, details = []) {
  if (ok) pass++; else { fail++; failedCases.push({ label, details }); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}`);
  if (!ok) details.forEach((d) => console.log(`    ${d}`));
}

// ts-node を直接読み込んでいる行（require('ts-node')、require('ts-node/register')、import ... from 'ts-node' など）。
// 説明のためのコメント行（// ・ /* ・ * で始まる行）は対象外
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;
const DIRECT_TS_NODE = /(?:require\(\s*|import\s*\(\s*|from\s+|import\s+)['"`]ts-node(?:\/[^'"`]*)?['"`]/;
function findDirectTsNode(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!COMMENT_LINE.test(line) && DIRECT_TS_NODE.test(line)) hits.push({ line: i + 1, text: line.trim() });
  });
  return hits;
}

// ----------------------------------------------------------------
// 1. scripts/ 配下の .js ファイル
// ----------------------------------------------------------------
const hits = [];
let fileCount = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(rel);
    } else if (entry.name.endsWith('.js') && !EXCLUDED.includes(rel)) {
      fileCount++;
      for (const hit of findDirectTsNode(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
        hits.push(`${rel}:${hit.line}  ${hit.text}`);
      }
    }
  }
}
walk('scripts');
record(`1. scripts/ 配下の .js ファイル（${fileCount}ファイル、共通の登録処理とこのファイル自身を除く）に、ts-node の直接登録が0件`, hits.length === 0, hits);

// 判定ロジック自体の確認（直接の読み込みを検出し、共通処理の利用やコメント中の言及は検出しないこと）
const selfTest = [
  ["require('ts-node').register({", 1],
  ['require("ts-node").register({ transpileOnly: true });', 1],
  ["const tsNode = require('ts-node');", 1],
  ["require('ts-node/register');", 1],
  ["require('ts-node/register/transpile-only');", 1],
  ["import { register } from 'ts-node';", 1],
  ["require('./lib/registerTsNode');", 0],
  ['// 素のts-node+requireでは解決できない', 0],
  ["// require('ts-node').register は使わない", 0],
  [" * require('ts-node/register') の代わりに共通処理を使う", 0],
];
const selfTestNg = selfTest.filter(([text, n]) => findDirectTsNode(text).length !== n).map(([text, n]) => `期待${n}件: ${text}`);
record('（判定ロジックの自己確認）ts-node の直接の読み込みを検出し、共通処理の利用やコメント中の言及は検出しない', selfTestNg.length === 0, selfTestNg);

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
