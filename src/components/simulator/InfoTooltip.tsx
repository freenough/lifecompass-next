'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 208; // w-52相当
const GAP = 8; // トリガーとの間隔（0.5rem相当）
// 右端のみ左端(8px)より広め。clientWidth基準のクランプで機能上の「切れ」は解消済みだが、
// 実ブラウザ(Windows Chrome/Edge等)ではスクロールバーの帯にツールチップの右端が
// 数pxだけ重なって見える環境があるため、視覚的な余裕を持たせる（tooltip_right_margin_scrollbar_adjust）。
const RIGHT_EDGE_MARGIN = 14;

interface Pos { top: number; left: number; arrowLeft: number; openUp: boolean }

/**
 * 「?」アイコン+タップ/クリックで開閉する吹き出し。全ての?アイコンで共有する。
 *
 * position: fixed + React Portal（document.body直下）で描画する。当初はposition: absoluteで
 * 実装していたが、`lg:overflow-y-auto`（入力パネル・結果パネルの独立スクロール領域）の内側で
 * 絶対配置すると、「タップだけでは吹き出しが見えないが、スクロールすると見える」という
 * 再現性の低い症状が発生した。これはoverflow:autoコンテナ内の絶対配置要素に特有の
 * クリッピング／コンポジット遅延の問題であり、position: fixed + portalで
 * スクロール祖先の外（document.body直下）に描画することで、祖先のoverflow/z-indexに
 * 一切影響されない形にして根本的に回避する。
 *
 * 位置計算はトリガー（?ボタン）のgetBoundingClientRect()を基準に自前で行う
 * （absoluteのtop-6/left-0等のCSSクラスではなく、pxの数値をstyleで直接指定する）。
 * 開いた直後にuseLayoutEffectで実際のDOMサイズを計測し、
 * - 横方向: ビューポート右端からはみ出す場合は左にシフト
 * - 縦方向: ビューポート下端からはみ出す場合は上向きに開く
 * を行う。useLayoutEffectはブラウザの描画前に同期実行されるため、位置が
 * 入れ替わる瞬間がユーザーに見えることはない。
 */
export default function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // 1st pass: トリガー直下・左揃えを起点に、横方向のはみ出しだけ先に解消する
  // 基準幅は window.innerWidth ではなく document.documentElement.clientWidth を使う。
  // innerWidthは縦スクロールバーを含んだ幅を返すため、classic方式のスクロールバー
  // （Windows Chrome/Edge等、約15〜17px）がある環境では、innerWidth基準でクランプすると
  // 計算上は画面内でも、スクロールバーの下に隠れて実際には見えない領域まで右端を
  // 許してしまう。clientWidthはスクロールバーを除いた実際の描画可能幅を返すため、
  // これを基準にすることで環境によらず確実に見える範囲に収める。
  useLayoutEffect(() => {
    if (!show || !btnRef.current) return;
    const b = btnRef.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const left = Math.min(Math.max(8, b.left), viewportWidth - TOOLTIP_WIDTH - RIGHT_EDGE_MARGIN);
    setPos({ top: b.bottom + GAP, left, arrowLeft: b.left - left + b.width / 2 - 6, openUp: false });
  }, [show]);

  // 2nd pass: 実際に描画された吹き出しの高さを見て、縦方向のはみ出しがあれば上向きに反転する
  useLayoutEffect(() => {
    if (!show || !pos || pos.openUp || !tipRef.current || !btnRef.current) return;
    const t = tipRef.current.getBoundingClientRect();
    if (t.bottom > window.innerHeight - 8) {
      const b = btnRef.current.getBoundingClientRect();
      setPos(p => (p ? { ...p, top: b.top - t.height - GAP, openUp: true } : p));
    }
  }, [show, pos]);

  // 位置はクリック時点の座標で一度だけ計算しており、開いている間スクロールに追従させる
  // 仕組みは持たない。ページ内のどのスクロールコンテナ（window自身・lg:overflow-y-autoの
  // 各パネル等）でスクロールが発生しても検知できるよう、windowにcapture:trueで
  // scrollイベントを登録する（scrollイベントはbubbleしないため、descendant要素での
  // スクロールを拾うにはキャプチャフェーズで listen する必要がある）。検知したら
  // 吹き出しを閉じる（追従・再計算は行わない）。
  useEffect(() => {
    if (!show) return;
    const closeOnScroll = () => setShow(false);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [show]);

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={e => { e.stopPropagation(); setShow(v => !v); }}
        className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-slate-300"
        aria-label="説明を表示"
      >
        ?
      </button>
      {show && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={e => { e.stopPropagation(); setShow(false); }} />
          <div
            ref={tipRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
            className="z-[61] rounded-lg bg-slate-800 text-white text-xs p-3 shadow-xl leading-relaxed normal-case font-normal tracking-normal"
          >
            <div
              className="absolute w-3 h-3 bg-slate-800 rotate-45"
              style={{ left: pos.arrowLeft, ...(pos.openUp ? { bottom: -6 } : { top: -6 }) }}
            />
            {text}
          </div>
        </>,
        document.body
      )}
    </span>
  );
}
