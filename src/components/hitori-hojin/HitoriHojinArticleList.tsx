import { IconChevronRight } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';
import PhraseBreak from '@/components/text/PhraseBreak';

interface HitoriHojinArticleListProps {
  posts: HitoriHojinBlogPostMeta[];
  // 全行共通のアイコン。渡さなければアイコンなしで描画し、テキストを左に詰める
  // （あとでアイコンをやめたり記事ごとに変えたりできるよう任意にしている）。
  icon?: Icon;
}

// 一人法人LPの記事一覧。1枚のパネルの中に、罫線で区切った行（1行＝1記事、行全体がリンク）を並べる
// （impl_hitori_hojin_lp_ui.md 4-3節）。
// - 罫線はパネルの左右端まで伸ばさず、行の左右余白（px-5）の内側で止めるため、<a>ではなく内側のdivに付ける。
// - リンクはnext/linkではなく絶対URLの<a>（basePath('/asset-simulator')が付いてクリーンURLから巻き戻るのを防ぐ。
//   siteConfig.tsのHITORI_HOJIN_SITE_URLのコメント参照）。
// - アイコンはタイトル1行目の高さ（text-base・leading-snug＝22px）の枠に入れ、タイトルが2行になっても1行目の横に留める。
// - タイトル・説明文は全文表示（line-clampなし）。[line-break:strict]は小書きの仮名等が行頭に来るのを防ぐ和文の禁則処理。
//   375px幅では行のテキスト幅が約220pxしかなく、禁則処理だけでは「る？」「構造」のような1〜2文字の行が残るため、
//   BudouX（PhraseBreak）でサーバー側から文節の区切りに<wbr />を入れ、[word-break:keep-all]でその位置だけで
//   折り返させる（ブラウザに関係なく同じ区切り方になる）。1つの文節が行に収まらない場合の保険として
//   [overflow-wrap:anywhere]を付ける。以前のCSS word-break: auto-phraseはChrome/Edgeにしかなく、
//   keep-allと役割が重なるため外した（experiment_budoux_hitori_hojin.md）。
//   text-pretty（text-wrap: pretty）は付けない：Safari（WebKit）では行長をそろえる挙動になり、375px幅で
//   1行目が13字入る幅に9字前後で折り返されていた（fix_hitori_hojin_intro_safari.md）。
export default function HitoriHojinArticleList({ posts, icon: RowIcon }: HitoriHojinArticleListProps) {
  return (
    <ul className="overflow-hidden rounded border border-slate-200 bg-white">
      {posts.map((post, i) => (
        <li key={post.slug}>
          <a
            href={`${HITORI_HOJIN_SITE_URL}/blog/${post.slug}`}
            className="block px-5 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
          >
            <div className={`flex items-center gap-4 py-4 ${i > 0 ? 'border-t border-slate-200' : ''}`}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {RowIcon && (
                  <span className="flex h-[1.375rem] shrink-0 items-center" aria-hidden="true">
                    <RowIcon size={18} className="text-slate-400" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-slate-900 [line-break:strict] [word-break:keep-all] [overflow-wrap:anywhere]">
                    <PhraseBreak text={post.title} />
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 [line-break:strict] [word-break:keep-all] [overflow-wrap:anywhere]">
                    <PhraseBreak text={post.excerpt ?? post.description} />
                  </p>
                </div>
              </div>
              <IconChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
