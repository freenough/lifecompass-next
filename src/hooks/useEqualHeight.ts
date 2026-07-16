'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * 複数要素の実測高さのうち最大値を返す。CSS Gridのデフォルト(align-items: stretch)は
 * 同じ行内の要素しか高さを揃えないため、grid-cols-2（2×2）のようにアイテムが複数行に
 * 分かれるレイアウトでは、行をまたいだ「全部同じ高さ」は実現できない
 * （tooltip_wrap_fix：改善案文言が長い場合にFIRE達成カードのみ含む行が他行より
 * 高くなる問題）。ResizeObserverで各要素の高さ変化（内容変化・ビューポート幅変化どちらも）
 * を検知し、最大値をmin-heightとして呼び出し側から全要素に適用してもらうことで解決する。
 */
export function useEqualHeight(count: number): { setRef: (i: number) => (el: HTMLDivElement | null) => void; maxHeight: number | undefined } {
  const elsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const heights = elsRef.current.map(el => el?.getBoundingClientRect().height ?? 0);
    const max = Math.max(0, ...heights);
    setMaxHeight(prev => (max > 0 && max !== prev ? max : prev));
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    elsRef.current.forEach(el => el && ro.observe(el));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, count]);

  const setRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
    elsRef.current[i] = el;
  }, []);

  return { setRef, maxHeight };
}
