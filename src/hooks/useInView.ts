'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * 対象要素が画面内に見えているかをIntersectionObserverで監視する。
 * コールバックref方式を採用: useRef+useEffect（空の依存配列）だと、呼び出し元コンポーネントが
 * 初回レンダーで対象要素をまだ描画していない場合（例: マウント直後にローディング表示を返す等）、
 * ref.currentがnullのままeffectが一度きりで終わってしまい、後から要素が現れても監視が
 * 始まらない問題がある。コールバックrefはDOMノードが実際にアタッチされた時点で毎回呼ばれるため、
 * この問題が起きない。
 */
export function useInView<T extends HTMLElement>(): [(node: T | null) => void, boolean] {
  const [inView, setInView] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setRef = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new IntersectionObserver(([entry]) => {
        setInView(entry.isIntersecting);
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  return [setRef, inView];
}
