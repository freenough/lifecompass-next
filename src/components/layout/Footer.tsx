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
    // claude_instruction_lp_polish_round3.md 2節：リンク一覧〜著作権バーまでフッター全体を
    // ひと続きの濃紺（bg-accent、著作権バーが元々使っていた値と同一）にする。文字色・区切り線も
    // 暗い背景で視認できるよう明るい色（slate-300/白系）・半透明白ボーダーに変更する
    // （新規トークン追加はborder-white/10のようなTailwind標準の不透明度指定のみ）。
    <footer className="mt-16 border-t border-white/10 bg-accent pt-8 text-xs text-slate-300 sm:pt-10 sm:text-sm">
      <div className="mx-auto max-w-7xl px-4 pb-6 sm:pb-8">
        {/* ①2カラムのコンテンツ列。モバイルでも2カラムのまま、フォント・余白のみ圧縮する
            （instruction_freenough_footer_unification.md モバイルA案：アコーディオン化はしない）。
            grid-cols-2だとコンテナ幅(max-w-7xl)いっぱいに列が引き伸ばされ、②③の
            flex-wrap justify-centerな行と横幅が揃わなかったため、同じflex justify-centerに
            揃える。ただし②③のflex-wrapをそのまま使うと、狭い画面で「一人法人を考える」列が
            下に折り返され縦積みになり、モバイルでも2カラム横並びを維持するA案の仕様に反するため、
            flex-nowrapを明示指定して折り返しを禁止する（instruction_freenough_footer_layout_fix.md）。 */}
        <div className="flex flex-nowrap justify-center gap-8 border-b border-white/10 pb-5 sm:gap-16 sm:pb-8">
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-400 sm:mb-3 sm:text-xs">FIREを考える</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><Link href="/" className="hover:text-white">資産シミュレーター</Link></li>
              <li><Link href="/tools" className="hover:text-white">ツール</Link></li>
              <li><Link href="/concerns" className="hover:text-white">お悩み</Link></li>
              <li><Link href="/blog" className="hover:text-white">ブログ</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-400 sm:mb-3 sm:text-xs">一人法人を考える</p>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href={HITORI_HOJIN_SITE_URL} className="hover:text-white">一人法人トップ</a></li>
              <li><a href={`${HITORI_HOJIN_SITE_URL}/blog`} className="hover:text-white">一人法人ブログ</a></li>
            </ul>
          </div>
        </div>

        {/* ②共有機能行 */}
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-b border-white/10 py-4 sm:gap-4 sm:py-6">
          <Link href="/app" className="hover:text-white">シミュレーター</Link>
          <Link href={ASSET_MANAGEMENT_PATH} className="hover:text-white">資産管理ツール</Link>
          <Link href="/guide" className="hover:text-white">使い方ガイド</Link>
          <Link href="/methodology" className="hover:text-white">計算ロジック</Link>
          <a href="https://x.com/freenough" target="_blank" rel="noopener noreferrer" className="hover:text-white">X</a>
          <a href="https://note.com/freenough" target="_blank" rel="noopener noreferrer" className="hover:text-white">Note</a>
        </nav>

        {/* ③ポリシー等の行 */}
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 border-b border-white/10 py-4 sm:gap-4 sm:py-6">
          <a href="https://www.freenough.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Freenoughについて</a>
          <Link href="/disclosure" className="hover:text-white">広告開示</Link>
          <Link href="/privacy-policy" className="hover:text-white">プライバシーポリシー</Link>
          <Link href="/disclaimer" className="hover:text-white">免責事項</Link>
          <Link href="/about" className="hover:text-white">運営者情報</Link>
        </nav>
      </div>

      {/* ④コピーライト: instruction_asset_simulator_lp_polish.md 6節。
          footer要素全体が既にbg-accentになったため、このdiv自体には色を付けない
          （上のリンク一覧と地続きの濃紺にするため）。footer自体のpb-*を上のコンテナ側に
          移し、このバンドがfooter要素の一番下端まで達するようにしている。 */}
      <div>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-4 py-4 text-center sm:gap-2 sm:py-6">
          <p className="text-white">© {new Date().getFullYear()} FREENOUGH</p>
          <p className="text-[11px] text-slate-300 sm:text-xs">本サービスは情報提供を目的としており、投資助言ではありません。</p>
        </div>
      </div>
    </footer>
  );
}
