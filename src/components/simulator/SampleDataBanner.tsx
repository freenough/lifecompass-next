'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lifecompass_sample_banner_seen';

/**
 * note.com経由の初回訪問者向けに、入力パネルの数字がサンプルデータであることを
 * 案内するバー。localStorageのフラグで初回訪問時のみ表示する。
 *
 * 「閉じるボタンを押さず離脱した場合」の扱い: 表示した時点（マウント時）で
 * 即座にフラグを立てる方式にした。仕様の「表示済みフラグ」は文字通り
 * “表示したかどうか”の記録であり、明示的な×クリックの有無で挙動を分けると
 * 「閉じずに離脱したら次回また出る／出ない」の判断がさらに複雑になるため、
 * シンプルに「一度表示されたら次回から出さない」に統一した。
 */
export default function SampleDataBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShow(true);
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500 leading-relaxed">
      <p className="flex-1">
        この画面はサンプルデータです。ご自身の数字に置き換えると、結果がリアルタイムで更新されます。いつでも「サンプル」で元に戻せます。
      </p>
      <button
        onClick={() => setShow(false)}
        className="shrink-0 text-slate-400 hover:text-slate-600 leading-none"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
}
