/**
 * Heroのライブデモカードの背後に配置する装飾。中心から放射状に広がる薄い線で、
 * 「1,000通りの未来がそこから分岐している」ことを示す（instruction_lp_typography_and_hero.md
 * Phase1-B）。既存のチャートを隠さないよう、線はカードの外周付近にとどめ、不透明度を低くする。
 * 装飾のみでインタラクションを持たないため pointer-events-none、aria-hidden。
 */
export default function RadialLinesBackground() {
  const cx = 50;
  const cy = 46;
  const lineCount = 20;
  const innerR = 30;
  const outerR = 68;

  const lines = Array.from({ length: lineCount }, (_, i) => {
    const angle = (i / lineCount) * Math.PI * 2;
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle) * 0.7;
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle) * 0.7;
    return { x1, y1, x2, y2, key: i };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full overflow-visible"
    >
      {lines.map((l) => (
        <line
          key={l.key}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="#93c5fd"
          strokeWidth={0.3}
          strokeOpacity={0.35}
        />
      ))}
    </svg>
  );
}
