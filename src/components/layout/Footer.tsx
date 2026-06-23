import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 py-8 text-sm text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center">
        <p>© {new Date().getFullYear()} LifeCompass — FIRE資産シミュレーター</p>
        <nav className="flex gap-4">
          <Link href="/simulator" className="hover:text-slate-700">シミュレーター</Link>
          <Link href="/blog"       className="hover:text-slate-700">ブログ</Link>
          <Link href="/disclosure" className="hover:text-slate-700">広告開示</Link>
        </nav>
        <p className="text-xs text-slate-400">本サービスは情報提供を目的としており、投資助言ではありません。</p>
      </div>
    </footer>
  );
}
