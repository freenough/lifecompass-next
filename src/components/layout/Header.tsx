import Link from 'next/link';
import Image from 'next/image';
import { withBasePath } from '@/lib/siteConfig';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-800 tracking-tight">
          <Image src={withBasePath('/images/compass_logo.png')} alt="" width={28} height={28} className="shrink-0" />
          資産シミュレーター
        </Link>
        <nav className="flex gap-6 text-sm text-slate-600">
          <Link href="/app" className="hover:text-slate-900 transition-colors">シミュレーター</Link>
          <Link href="/blog"      className="hover:text-slate-900 transition-colors">ブログ</Link>
        </nav>
      </div>
    </header>
  );
}
