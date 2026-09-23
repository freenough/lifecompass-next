interface JumpChipsProps {
  items: { id: string; label: string }[];
}

// 一覧ページ上部の、各セクション見出しへのページ内リンク。ブログ一覧のFilterButton（絞り込みのトグル）とは
// 意味が違うためコンポーネントは流用せず、見た目だけFilterButtonの未選択状態にそろえている
// （claude_instruction_index_pages_implementation.md B-3）。
// sm未満だけ左右余白(px-2.5)とチップ間(gap-1.5)を詰め、お悩み一覧の4チップが375px・360px幅でも
// 1行に収まるようにしている。文字サイズは変えない（claude_instruction_index_pages_followup.md 3節）。
export default function JumpChips({ items }: JumpChipsProps) {
  return (
    <nav aria-label="セクションへ移動">
      <ul className="flex flex-wrap gap-1.5 sm:gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex items-center text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200 hover:border-slate-300 transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
