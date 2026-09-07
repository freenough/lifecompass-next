/**
 * 文字列中の数値部分（0-9・小数点・桁区切りのカンマ・符号の連続）だけをfont-number
 * (Space Grotesk)で描画し、それ以外（単位・文言）は呼び出し側のフォントのまま維持する。
 * LP再設計Phase1（instruction_lp_typography_and_hero.md）：「数字だけ切り替える」実装のための
 * 汎用ヘルパー。既存の表示コンポーネントは改変せず、呼び出し側でこれを挟んで使う。
 */
export default function NumberText({ children }: { children: string }) {
  const parts = children.split(/([+-]?\d[\d,.]*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^[+-]?\d/.test(part) ? (
          <span key={i} className="font-number">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
}
