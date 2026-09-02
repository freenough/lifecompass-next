'use client';

// instruction_phase2_ui_followup.md 2節：「未保存の変更があるか」を示す軽量な共有state。
// アプリ全体（Header.tsx含む）からアクセス可能にする。Next.jsのクライアントサイド遷移
// （<Link>）ではbeforeunloadが発火しないため、ヘッダーのナビゲーションリンク側でこのフラグを
// 確認し、trueならconfirm()で警告してから遷移を許可する、という最小限のガードに使う。
// ルートレイアウト（src/app/layout.tsx）1箇所にProviderを置くだけで、App Routerの
// クライアントサイド遷移をまたいでも同一インスタンスが保持される（レイアウトごと
// アンマウントされないため）。

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface UnsavedChangesContextValue {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  /** trueなら（未保存の変更が無い、またはユーザーがconfirmで続行を選んだ）遷移してよい。 */
  confirmNavigation: () => boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // confirmNavigationは頻繁に再生成する必要が無いため、refでhasUnsavedChangesの最新値を
  // 参照しつつ、confirmNavigation自体はメモ化して安定させる（Header.tsxのLink onClickに
  // 渡しても不要な再レンダリングを起こさないため）。
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  const confirmNavigation = useCallback(() => {
    if (!hasUnsavedChangesRef.current) return true;
    return window.confirm('未保存の変更があります。このページを離れると変更内容が失われます。よろしいですか？');
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges, confirmNavigation }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  return ctx;
}

/**
 * 下書き状態を持つページ・セクションから呼ぶ共通フック。
 * - dirtyを共有Contextへ同期する（Header.tsxのナビガードが参照する）
 * - ブラウザレベルの離脱（タブを閉じる・リロード・別サイトへ移動）に対してbeforeunloadで警告する
 * - アンマウント時（正常に離脱・保存済み等）はフラグをfalseへ戻し、他ページへ影響を残さない
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  const { setHasUnsavedChanges } = useUnsavedChanges();

  useEffect(() => {
    setHasUnsavedChanges(dirty);
  }, [dirty, setHasUnsavedChanges]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    return () => setHasUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
