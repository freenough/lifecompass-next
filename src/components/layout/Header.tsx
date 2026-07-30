'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IconMenu2, IconX } from '@tabler/icons-react';
import { withBasePath } from '@/lib/siteConfig';

const NAV_ITEMS: { label: string; href: string; external?: boolean }[] = [
  { label: 'シミュレーター', href: '/app' },
  { label: 'ブログ', href: '/blog' },
  { label: 'ツール', href: '/tools' },
  { label: 'Note', href: 'https://note.com/freenough', external: true },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-800 tracking-tight">
          <Image src={withBasePath('/images/compass_logo.png')} alt="" width={28} height={28} className="shrink-0" />
          資産シミュレーター
        </Link>

        {/* PC幅（lg:以上）は従来通り横並びナビ */}
        <nav className="hidden lg:flex gap-6 text-sm text-slate-600">
          {NAV_ITEMS.map((item) =>
            item.external ? (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className="hover:text-slate-900 transition-colors">
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* モバイル幅（lg:未満）はハンバーガーアイコン */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden text-slate-600 hover:text-slate-900 transition-colors"
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={open}
        >
          {open ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </button>
      </div>

      {/* モバイルメニュー展開部（ヘッダー下にドロップダウン、ページ本体は押し下げない） */}
      <div
        className={`lg:hidden absolute inset-x-0 top-full overflow-hidden border-b border-slate-200 bg-white transition-[max-height] duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)] ${
          open ? 'max-h-60' : 'max-h-0'
        }`}
      >
        <nav className="flex flex-col px-4 py-1">
          {NAV_ITEMS.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-slate-100 py-3 text-sm text-slate-600 last:border-b-0 hover:text-slate-900"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="border-b border-slate-100 py-3 text-sm text-slate-600 last:border-b-0 hover:text-slate-900"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </header>

    {/* 背景オーバーレイ（headerの外の兄弟要素。headerはz-50でスタッキングコンテキストを
        作るため、header配下のドロップダウン(top-fullで飛び出す部分)は常にこのオーバーレイ
        より上に描画される。DOM順序やz-indexの数値比較ではなくheader/overlay間の
        スタッキングコンテキスト境界で決まるため、header内側の要素に個別z-indexは不要）。 */}
    {open && (
      <div
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    )}
    </>
  );
}
