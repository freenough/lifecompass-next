import type { Root, Content, Parent } from 'mdast';

export interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_HEADING_RE = /^よくある質問/;
const LEADING_Q_RE = /^Q\.?\s*/;
const LEADING_A_RE = /^A\.?\s*/;

interface HasChildren {
  children: Content[];
}

function hasChildren(node: unknown): node is HasChildren {
  return typeof node === 'object' && node !== null && Array.isArray((node as HasChildren).children);
}

/**
 * インライン要素(strong/emphasis/link等)を再帰的にプレーンテキストへ変換する。
 * linkはリンクテキストのみを残しURLは破棄する。
 */
function flattenToText(node: Content | Content[]): string {
  if (Array.isArray(node)) {
    return node.map(flattenToText).join('');
  }
  if (node.type === 'text' || node.type === 'inlineCode') {
    return (node as { value: string }).value;
  }
  if (node.type === 'break') {
    return ' ';
  }
  if (hasChildren(node)) {
    return flattenToText(node.children);
  }
  return '';
}

function isQuestionParagraph(node: Content): node is Content & { children: Content[] } {
  if (node.type !== 'paragraph' || !hasChildren(node) || node.children.length === 0) return false;
  const first = node.children[0];
  if (first.type !== 'strong') return false;
  const text = flattenToText(first).trim();
  return /^Q\.?\s/.test(text) || /^Q\.?$/.test(text) || text.startsWith('Q');
}

function stripLeadingPrefix(text: string, re: RegExp): string {
  return text.replace(re, '').trim();
}

/** 改行を含む連続空白を単一の半角スペースへ畳み込む(構造化データのtextフィールド用)。 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * FAQセクション(`## よくある質問`見出し以降、次の同level以下見出しまたはドキュメント末尾まで)を
 * remarkのASTから抽出する。thematicBreak(---)は内容として読み飛ばし、セクション終端の判定には
 * 使わない(終端はあくまで次の見出しかファイル末尾)。
 */
function extractFaqSectionNodes(tree: Root): Content[] {
  const children = tree.children;
  let startIdx = -1;
  let headingDepth = 0;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type === 'heading') {
      const text = flattenToText(node.children).trim();
      if (FAQ_HEADING_RE.test(text)) {
        startIdx = i + 1;
        headingDepth = node.depth;
        break;
      }
    }
  }
  if (startIdx === -1) return [];

  const section: Content[] = [];
  for (let i = startIdx; i < children.length; i++) {
    const node = children[i];
    if (node.type === 'heading' && node.depth <= headingDepth) break;
    if (node.type === 'thematicBreak') continue;
    section.push(node);
  }
  return section;
}

/**
 * FAQセクション内のparagraphノード列からQ&Aペアを抽出する。
 * 質問直後の回答は2パターンに対応する:
 * - パターン1: 質問paragraphの次のsibling paragraph(群)が回答
 * - パターン2: 質問のstrongノード直後、同一paragraph内のテキストが回答
 * いずれも次の質問paragraphが現れるまで回答テキストを連結する。
 */
function pairQuestionsAndAnswers(section: Content[]): FaqItem[] {
  const items: FaqItem[] = [];
  let i = 0;
  while (i < section.length) {
    const node = section[i];
    if (!isQuestionParagraph(node)) {
      i++;
      continue;
    }
    const paragraph = node as Content & { children: Content[] };
    const strongNode = paragraph.children[0];
    const question = stripLeadingPrefix(normalizeWhitespace(flattenToText(strongNode)), LEADING_Q_RE);

    const answerParts: string[] = [];

    // パターン2: 同一paragraph内、strongノード以降の残り要素
    const rest = paragraph.children.slice(1);
    const restText = normalizeWhitespace(flattenToText(rest));
    if (restText.length > 0) {
      answerParts.push(restText);
    }

    // パターン1: 後続の sibling paragraph(群)。次の質問paragraphが現れるまで連結
    let j = i + 1;
    while (j < section.length && !isQuestionParagraph(section[j])) {
      const sib = section[j];
      if (sib.type === 'paragraph' && hasChildren(sib)) {
        const text = normalizeWhitespace(flattenToText(sib.children));
        if (text.length > 0) answerParts.push(text);
      }
      j++;
    }

    let answer = answerParts.join(' ').trim();
    answer = stripLeadingPrefix(answer, LEADING_A_RE);

    items.push({ question, answer });
    i = j;
  }
  return items;
}

export async function extractFaqFromMarkdown(markdown: string): Promise<FaqItem[]> {
  const { remark } = await import('remark');
  const remarkGfm = (await import('remark-gfm')).default;
  const tree = remark().use(remarkGfm).parse(markdown) as Root;
  const section = extractFaqSectionNodes(tree);
  if (section.length === 0) return [];
  return pairQuestionsAndAnswers(section);
}
