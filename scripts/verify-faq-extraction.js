/**
 * scripts/verify-faq-extraction.js
 * src/lib/faqExtraction.ts（remark ASTベースのFAQPage抽出ロジック）を検証する。
 * 本番のextractFaqFromMarkdown()を直接importして呼び出すだけで、独自の再実装ロジックは含まない。
 *
 * extractFaqFromMarkdown()はremark/remark-gfm(ESM専用パッケージ)を動的import()で読み込むため
 * 非同期になる。full-verify.js内の他のverify-*.jsは同期的にrequireされるが、このスクリプトは
 * full-verify.jsのrequireチェーンの最後に置くことで、非同期処理の完了を待たずに次のスクリプトへ
 * 進んでしまう出力の前後入れ替わりを避けている（Node.jsのプロセスは保留中のPromiseが解決する
 * までexitしないため、exit codeも正しく反映される）。
 */

require('./lib/registerTsNode');
const { extractFaqFromMarkdown } = require('../src/lib/faqExtraction');

let pass = 0, fail = 0;

function record(label, ok, detail) {
  if (ok) pass++; else fail++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const CASES = [
  {
    label: 'パターン1（空行あり + A.プレフィックスあり）',
    md: `## よくある質問\n\n**Q. これは質問ですか?**\n\nA. はい、これは回答です。\n\n## まとめ\n`,
    expected: [{ question: 'これは質問ですか?', answer: 'はい、これは回答です。' }],
  },
  {
    label: 'パターン2（空行なし + A.プレフィックスなし）',
    md: `## よくある質問\n\n**Q. これは質問ですか?**\nこれは回答です。\n`,
    expected: [{ question: 'これは質問ですか?', answer: 'これは回答です。' }],
  },
  {
    label: 'パターン1（空行あり + A.プレフィックスなし）',
    md: `## よくある質問\n\n**Q. 質問A?**\n\nこれは回答Aです。\n\n**Q. 質問B?**\n\nこれは回答Bです。\n`,
    expected: [
      { question: '質問A?', answer: 'これは回答Aです。' },
      { question: '質問B?', answer: 'これは回答Bです。' },
    ],
  },
  {
    label: 'パターン2（空行なし + A.プレフィックスあり）',
    md: `## よくある質問\n\n**Q. 質問です?**\nA.空白なしの回答です。\n`,
    expected: [{ question: '質問です?', answer: '空白なしの回答です。' }],
  },
  {
    label: '複数段落にまたがる回答（パターン1）',
    md: `## よくある質問\n\n**Q. 長い回答の質問?**\n\n回答の1段落目です。\n\n回答の2段落目です。\n\n**Q. 次の質問?**\n\n次の回答。\n`,
    expected: [
      { question: '長い回答の質問?', answer: '回答の1段落目です。 回答の2段落目です。' },
      { question: '次の質問?', answer: '次の回答。' },
    ],
  },
  {
    label: '質問・回答内の強調/リンクをプレーンテキスト化',
    md: `## よくある質問\n\n**Q. これは*強調*とリンクを含む質問ですか?**\n\nA. はい、[詳しくはこちら](https://example.com/foo)をご覧ください。*強調*も含みます。\n`,
    expected: [
      {
        question: 'これは強調とリンクを含む質問ですか?',
        answer: 'はい、詳しくはこちらをご覧ください。強調も含みます。',
      },
    ],
  },
  {
    label: '末尾の---区切りは内容として読み飛ばし、セクション終端にしない',
    md: `## よくある質問\n\n**Q. 質問です?**\n\nA. 回答です。\n\n---\n\n## まとめ\n`,
    expected: [{ question: '質問です?', answer: '回答です。' }],
  },
  {
    label: '見出し表記ゆれ「よくある質問(FAQ)」も検出する',
    md: `## よくある質問(FAQ)\n\n**Q. 検出されますか?**\n検出されるはずです。\n`,
    expected: [{ question: '検出されますか?', answer: '検出されるはずです。' }],
  },
  {
    label: 'ドキュメント末尾までがFAQセクション（後続見出しなし）',
    md: `## よくある質問\n\n**Q. 最後の質問?**\n\nA. 最後の回答。\n`,
    expected: [{ question: '最後の質問?', answer: '最後の回答。' }],
  },
  {
    label: 'FAQセクションが存在しない記事は空配列',
    md: `## まとめ\n\n本文のみでFAQセクションはありません。\n`,
    expected: [],
  },
];

async function main() {
  for (const c of CASES) {
    const actual = await extractFaqFromMarkdown(c.md);
    const ok = JSON.stringify(actual) === JSON.stringify(c.expected);
    record(
      c.label,
      ok,
      ok ? undefined : `期待=${JSON.stringify(c.expected)} 実際=${JSON.stringify(actual)}`
    );
  }
  console.log(`\n[verify-faq-extraction] 合計: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[verify-faq-extraction] 予期しないエラー:', err);
  process.exitCode = 1;
});
