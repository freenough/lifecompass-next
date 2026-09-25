import { Parser } from './parser';
import { model as jaModel } from './model-ja';
import { PROTECTED_TERMS } from './protectedTerms';

// 和文を文節に区切る処理の本体。index.tsから再エクスポートする（index.ts側で'server-only'を付けている）。
// scripts/verify-phrase-break.js はNext.jsのビルドを通らずに実行する（'server-only'を解決できない）ため、
// 検証スクリプトからはこのファイルを直接読み込む。アプリのコードからは必ず index.ts 経由で使うこと。

// パーサーはモジュールの読み込み時に1回だけ作る
const parser = new Parser(jaModel);

// 長い用語から先に判定する（「一人法人」の中の「法人」を重ねて処理しない）
const TERMS_LONGEST_FIRST = [...PROTECTED_TERMS].sort((a, b) => b.length - a.length);

// textの中で、区切ってはいけない位置（用語の内側の境界）を集める。
function protectedBoundaries(text: string): Set<number> {
  const covered = new Array<boolean>(text.length).fill(false);
  const result = new Set<number>();
  for (const term of TERMS_LONGEST_FIRST) {
    let from = 0;
    for (let start = text.indexOf(term, from); start !== -1; start = text.indexOf(term, from)) {
      const end = start + term.length;
      // すでに長い用語として処理した範囲に含まれる出現は重ねて処理しない
      if (!covered.slice(start, end).some(Boolean)) {
        for (let i = start + 1; i < end; i++) result.add(i);
        covered.fill(true, start, end);
      }
      from = start + 1;
    }
  }
  return result;
}

/**
 * 和文を文節の配列に区切る（BudouXの日本語モデル＋区切らない用語リスト）。
 * 区切った結果を連結すると、元の文字列と完全に一致する。
 */
export function segmentJapanese(text: string): string[] {
  const phrases = parser.parse(text);
  if (phrases.length <= 1) return phrases;

  const blocked = protectedBoundaries(text);
  const result: string[] = [phrases[0]];
  let position = phrases[0].length;
  for (const phrase of phrases.slice(1)) {
    if (blocked.has(position)) {
      result[result.length - 1] += phrase;
    } else {
      result.push(phrase);
    }
    position += phrase.length;
  }
  return result;
}
