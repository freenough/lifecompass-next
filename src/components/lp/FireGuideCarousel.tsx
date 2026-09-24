'use client';

import { useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogPostMeta } from '@/lib/blog';

/**
 * ドラッグと判定する移動量のしきい値(px)。これを超えたら直後のクリックを
 * リンク遷移させない（カードがLinkのため、ドラッグ操作がそのまま記事遷移に
 * ならないようにするための閾値判定）。
 */
const DRAG_THRESHOLD = 5;
const CARD_GAP_PX = 16; // Tailwindのgap-4と一致させる

export default function FireGuideCarousel({ posts }: { posts: BlogPostMeta[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const dragDistanceRef = useRef(0);

  const getCardStep = (track: HTMLDivElement) => {
    const firstCard = track.querySelector<HTMLElement>('.fireguide-card');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : track.clientWidth * 0.3;
    return cardWidth + CARD_GAP_PX;
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    isDownRef.current = true;
    dragDistanceRef.current = 0;
    track.style.cursor = 'grabbing';
    // ドラッグ中はscroll-behavior:smooth・scroll-snap-type（globals.cssの.fireguide-track）を
    // 一時的に無効化する。smoothが有効なままだとmousemoveごとのscrollLeft直接代入が
    // 毎回新しいアニメーションを再スタートしてしまい描画が進まない。またscroll-snap-typeが
    // 有効なままだと、スナップ点以外へのscrollLeft代入がブラウザ側で拒否され、閾値を超えた
    // 瞬間だけ次のスナップ点へ飛ぶ（＝指の動きに追従しない）挙動になる。どちらもドラッグ中に
    // カーソルへ滑らかに追従させるために外し、mouseup/mouseleaveで元に戻す
    // （離した後は本来のスナップ・イージングへ自然に着地させる）。
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
    startXRef.current = e.pageX - track.offsetLeft;
    scrollLeftStartRef.current = track.scrollLeft;
  };

  const endDrag = () => {
    const track = trackRef.current;
    if (!track) return;
    const wasDragging = isDownRef.current;
    isDownRef.current = false;
    track.style.cursor = 'grab';
    // 離した後は元のCSS（smooth easing・スナップ）に戻す。CSSのscroll-snap-typeは
    // 「次にスクロールが発生したとき」にしか補正が効かないため、ドラッグ中断直後の
    // 現在位置に対しては自動では効かない。最寄りのカード境界へ明示的にscrollToして
    // 着地させる（ドラッグ距離が実質ゼロ＝クリック相当の場合は何もしない）。
    track.style.scrollBehavior = '';
    track.style.scrollSnapType = '';
    if (wasDragging && dragDistanceRef.current > DRAG_THRESHOLD) {
      // 次のフレームまで待ってから実行する（直前のドラッグ用インスタントscrollLeft代入と
      // 同一フレーム内でsmooth scrollToを呼ぶと、ブラウザ側でアニメーションが開始されず
      // 位置が固まってしまう現象を確認したため、rAFで1フレーム分ずらしている）。
      requestAnimationFrame(() => {
        const step = getCardStep(track);
        const nearestIndex = Math.round(track.scrollLeft / step);
        const maxScroll = track.scrollWidth - track.clientWidth;
        const target = Math.max(0, Math.min(maxScroll, nearestIndex * step));
        track.scrollTo({ left: target, behavior: 'smooth' });
      });
    }
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !isDownRef.current) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = x - startXRef.current;
    dragDistanceRef.current = Math.abs(walk);
    track.scrollLeft = scrollLeftStartRef.current - walk;
  };

  // ドラッグ距離が閾値を超えていた場合、直後に発火するカードのclick(=Link遷移)を
  // キャプチャ段階で無効化する。閾値以下（実質クリック）はそのまま通常のリンク遷移をさせる。
  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (dragDistanceRef.current > DRAG_THRESHOLD) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // ブラウザ標準の画像ドラッグ（半透明ゴーストがカーソルに追従する既定挙動）を止める。
  // mousemove側のpreventDefaultだけではdragstart自体は止まらず、独自ドラッグスクロールと
  // ネイティブ画像ドラッグが同時に発生してしまうため、明示的に無効化する
  // （globals.cssの`.fireguide-card img`のuser-drag:noneと併用）。
  const handleDragStart = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * getCardStep(track), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* 矢印ボタン：pointer:fine（マウス操作）でのみ表示、タッチでは非表示（globals.css参照）。
          自身のmousedownはstopPropagationしてトラック側のドラッグ判定に巻き込まれないようにする。 */}
      <button
        type="button"
        aria-label="前の記事へ"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => scrollByCard(-1)}
        className="fireguide-arrow fireguide-arrow-left"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div
        ref={trackRef}
        role="region"
        aria-label="FIREガイド記事一覧"
        tabIndex={0}
        className="fireguide-track flex gap-4 overflow-x-auto pb-2"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={handleClickCapture}
        onDragStart={handleDragStart}
      >
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="fireguide-card rounded border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
          >
            {/* サムネイル型（claude_instruction_fireguide_card_thumbnail.md）：アイキャッチは雰囲気を伝える画像と割り切り、
                16:9の枠で中央を切り抜く（画像内の文字は読めなくてよい）。タイトルは全幅でテキストで読ませるため、
                画像のaltは空にする（リンク内のテキストと二重に読み上げられないように）。
                sizesは実際のカード幅（globals.cssの.fireguide-card：640px未満は82%、以上は30%・最小260px、
                1152px以上はコンテナ上限で約332px）に合わせている。 */}
            <div className="relative w-full aspect-video shrink-0 overflow-hidden bg-slate-100">
              {post.eyecatch && (
                <Image
                  src={post.eyecatch}
                  alt=""
                  fill
                  sizes="(min-width: 1152px) 332px, (min-width: 640px) 34vw, 82vw"
                  className="object-cover object-center"
                  draggable={false}
                />
              )}
            </div>
            {/* バッジ（全記事同じカテゴリで情報にならない）とexcerptは出さない。excerptは検索インデックスで使うためデータはそのまま。
                タイトルは2行分の高さを確保し、1行の記事でも日付の位置がそろうようにする（text-base・leading-snugの2行＝2.75rem）。 */}
            <div className="flex-1 min-w-0 p-[14px] flex flex-col gap-1">
              <h3 className="min-h-[2.75rem] text-base font-semibold text-slate-900 leading-snug line-clamp-2 [line-break:strict]">
                {post.title}
              </h3>
              <time className="text-xs text-slate-500 whitespace-nowrap">{post.date}</time>
            </div>
          </Link>
        ))}
      </div>

      {/* 右端フェード：スクロール可能であることを示唆（矢印ボタン・末尾カードは追加しない） */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 bottom-2 w-12 bg-gradient-to-r from-transparent to-white"
      />

      <button
        type="button"
        aria-label="次の記事へ"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => scrollByCard(1)}
        className="fireguide-arrow fireguide-arrow-right"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
