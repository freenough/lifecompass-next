import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-800 tracking-tight">
          LifeCompass
        </Link>
        <nav className="flex gap-6 text-sm text-slate-600">
          <Link href="/simulator" className="hover:text-slate-900 transition-colors">シミュレーター</Link>
          <Link href="/blog"       className="hover:text-slate-900 transition-colors">ブログ</Link>
          <Link href="/disclosure" className="hover:text-slate-900 transition-colors">広告開示</Link>
        </nav>
      </div>
    </header>
  );
}
