import Link from 'next/link';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';
import { ASSET_MANAGEMENT_PATH } from '@/lib/assetManagement/routes';

// instruction_freenough_footer_unification.md で確定した4段構成。
// フッター自体は資産シミュレーター側・一人法人側どちらのページに描画されても内容は同一
// （Header.tsxのようなusePathname()によるセクション分岐は不要）。
// ただし「一人法人トップ」「一人法人ブログ」はnext/linkを使うとbasePath('/asset-simulator')が
// 自動付与され、クリーンURL(/hitori-hojin)表示中でもクリック1回で
// /asset-simulator/hitori-hojin/...に巻き戻ってしまうため、常に絶対URL付き<a>で実装する
// （URLクリーンURル化・ヘッダー実装時に発生した既知の不具合と同一原理）。
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 pt-8 pb-6 text-xs text-slate-500 sm:pt-10 sm:pb-8 sm:text-sm">
      <div className="mx-auto max-w-7xl px-4">
        {/* ①2カラムのコンテンツ列。モバイルでも2カラムのまま、フォント・余白のみ圧縮する
            （instruction_freenough_footer_unification.md モバイルA案：アコーディオン化はしない）。
            grid-cols-2だとコンテナ幅(max-w-7xl)いっぱいに列が引き伸ばされ、②③の
            flex-wrap justify-centerな行と横幅が揃わなかったため、同じflex justify-centerに
            揃える。ただし②③のflex-wrapをそのまま使うと、狭い画面で「一人法人を考える」列が
            下に折り返され縦積みになり、モバイルでも2カラム横並びを維持するA案の仕様に反するため、
            flex-nowrapを明示指定して折り返しを禁止する（instruction_freenough_footer_layout_fix.md）。 */}
        <div className="flex flex-nowrap justify-center gap-8 border-b border-slate-200 pb-5 sm:gap-16 sm:pb-8">
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-400 sm:mb-3 sm:text-xs">FIREを考える</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><Link href="/" className="hover:text-slate-700">資産シミュレーター</Link></li>
              <li><Link href="/tools" className="hover:text-slate-700">ツール</Link></li>
              <li><Link href="/concerns" className="hover:text-slate-700">お悩み</Link></li>
              <li><Link href="/blog" className="hover:text-slate-700">ブログ</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-400 sm:mb-3 sm:text-xs">一人法人を考える</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href={HITORI_HOJIN_SITE_URL} className="hover:text-slate-700">一人法人トップ</a></li>
              <li><a href={`${HITORI_HOJIN_SITE_URL}/blog`} className="hover:text-slate-700">一人法人ブログ</a></li>
            </ul>
          </div>
        </div>

        {/* ②共有機能行 */}
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-b border-slate-200 py-4 sm:gap-4 sm:py-6">
          <Link href="/app" className="hover:text-slate-700">シミュレーター</Link>
          <Link href={ASSET_MANAGEMENT_PATH} className="hover:text-slate-700">資産管理ツール</Link>
          <Link href="/guide" className="hover:text-slate-700">使い方ガイド</Link>
          <Link href="/methodology" className="hover:text-slate-700">計算ロジック</Link>
          <a href="https://x.com/freenough" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700">X</a>
          <a href="https://note.com/freenough" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700">Note</a>
        </nav>

        {/* ③ポリシー等の行 */}
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-b border-slate-200 py-4 sm:gap-4 sm:py-6">
          <a href="https://www.freenough.com/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700">Freenoughについて</a>
          <Link href="/disclosure" className="hover:text-slate-700">広告開示</Link>
          <Link href="/privacy-policy" className="hover:text-slate-700">プライバシーポリシー</Link>
          <Link href="/disclaimer" className="hover:text-slate-700">免責事項</Link>
          <Link href="/about" className="hover:text-slate-700">運営者情報</Link>
        </nav>

        {/* ④コピーライト */}
        <div className="flex flex-col items-center gap-1.5 pt-4 text-center sm:gap-2 sm:pt-6">
          <p>© {new Date().getFullYear()} FREENOUGH</p>
          <p className="text-[11px] text-slate-400 sm:text-xs">本サービスは情報提供を目的としており、投資助言ではありません。</p>
        </div>
      </div>
    </footer>
  );
}
