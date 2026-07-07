'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 208; // w-52相当
const GAP = 8; // トリガーとの間隔（0.5rem相当）

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
  useLayoutEffect(() => {
    if (!show || !btnRef.current) return;
    const b = btnRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, b.left), window.innerWidth - TOOLTIP_WIDTH - 8);
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
