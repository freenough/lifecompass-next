/**
 * scripts/check-raw-html-in-blog.js
 * src/content/blog/*.md 本文に、<AffiliateLink .../> 以外の生HTMLタグが
 * 混入していないかを検出する（fire-inflation-sensitivity.mdで発生した
 * 「生HTMLがビルド時に警告なく消える」バグの再発防止）。
 * 警告のみでビルドは止めない（exit code 0）。
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'src/content/blog');
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s[^<>]*)?\/?>/g;

function frontmatterBodyStart(lines) {
  if (lines[0] !== '---') return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') return i + 1;
  }
  return 0;
}

function checkFile(filepath) {
  const raw = fs.readFileSync(filepath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const bodyStart = frontmatterBodyStart(lines);
  const findings = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    TAG_RE.lastIndex = 0;
    let match;
    while ((match = TAG_RE.exec(line)) !== null) {
      const full = match[0];
      if (full.startsWith('<AffiliateLink')) continue;
      findings.push({ line: i + 1, tag: full });
    }
  }
  return findings;
}

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log('[check-raw-html-in-blog] src/content/blog が見つかりません。スキップします。');
    return;
  }
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  let foundAny = false;
  for (const filename of files) {
    const findings = checkFile(path.join(POSTS_DIR, filename));
    for (const f of findings) {
      foundAny = true;
      console.warn(`[check-raw-html-in-blog] 警告: ${filename}:${f.line} に生HTMLタグ ${f.tag} が見つかりました`);
    }
  }
  if (!foundAny) {
    console.log(`[check-raw-html-in-blog] 問題なし: 生HTMLタグ(<AffiliateLink以外)は見つかりませんでした（対象${files.length}件）`);
  }
}

main();
