'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// スクロール表示演出（implementation_lp_scroll_reveal.md）。
// 初期の非表示・トランジションはglobals.cssの`.js-reveal .rv`で定義し、ここでは
// 画面に入った要素に`in`クラスを付けるだけにする（数値はCSS変数--rv-*で一元管理）。
// `js-reveal`クラスはlayout.tsxのインラインスクリプトがHTML解析中に<html>へ付与する。

type RevealTag = 'div' | 'li' | 'h2' | 'p';

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
}

declare global {
  interface Window {
    // layout.tsxの4秒保険スクリプトが参照する「Revealが動作開始した」目印
    __rvReady?: boolean;
  }
}

const MAX_STAGGER_STEPS = 4;

let sharedObserver: IntersectionObserver | null = null;

function show(el: Element) {
  el.classList.add('in');
}

function getObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      const entered: HTMLElement[] = [];
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          entered.push(el);
        } else if (entry.boundingClientRect.top < 0) {
          // 既に画面より上にある要素（ページ途中でのリロード等）は演出なしで即表示する。
          // 画面上端にかかって一部だけ見えている要素も、見えている割合がthresholdに届かないと
          // 以後コールバックが来ず非表示のまま残るため、上端が画面より上なら同じ扱いにする
          el.style.transition = 'none';
          show(el);
          sharedObserver!.unobserve(el);
          void el.offsetHeight; // transition:noneのまま表示状態を確定させてから戻す
          el.style.transition = '';
        }
      }
      // 同じコールバックで同時に入った要素を、DOM順に並べて時間差を付ける
      entered.sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );
      entered.forEach((el, i) => {
        const step = Math.min(i, MAX_STAGGER_STEPS);
        el.style.transitionDelay = step > 0 ? `calc(var(--rv-stagger) * ${step})` : '';
        show(el);
        sharedObserver!.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  return sharedObserver;
}

export default function Reveal({ children, className, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    window.__rvReady = true;
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      show(el);
      return;
    }

    const observer = getObserver();
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className ? `rv ${className}` : 'rv'}>
      {children}
    </Tag>
  );
}
