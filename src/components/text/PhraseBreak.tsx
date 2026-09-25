import { Fragment } from 'react';
import { segmentJapanese } from '@/lib/budoux';

// 和文を文節ごとに区切り、区切りの位置に<wbr />を挟んで描画する（impl_budoux_phrase_break.md）。
// 区切りはsrc/lib/budoux（BudouX公式のParser＋モデルの構成を参考にした最小構成）をサーバー側で使うため、
// Safariなどword-break: auto-phrase未対応のブラウザでも同じ位置で改行できる。
// 呼び出し側でword-break: keep-allを指定し、<wbr />の位置だけで折り返させる前提。
//
// サーバーコンポーネント専用（src/lib/budouxが'server-only'のため、'use client'のファイルから
// importするとビルドエラーになる）。
// 出力は<wbr />を挟むだけで、文字列そのものは変えない（textContentは元の文字列と一致する）。
export default function PhraseBreak({ text }: { text: string }) {
  const phrases = segmentJapanese(text);
  return (
    <>
      {phrases.map((phrase, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {phrase}
        </Fragment>
      ))}
    </>
  );
}
