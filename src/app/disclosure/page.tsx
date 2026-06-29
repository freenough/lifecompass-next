export const metadata = {
  title: '広告・アフィリエイトに関する開示 — LifeCompass',
};

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">広告・アフィリエイトに関する開示</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">広告について</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          本サイトではGoogle AdSenseによる広告を掲載する場合があります。
          広告収入はサービスの運営・改善費用に充てられます。
        </p>
        <p className="text-slate-600 leading-relaxed">
          Googleが広告配信にCookieを使用することがあります。
          広告のカスタマイズを無効にする場合は
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Googleの広告設定ページ
          </a>
          からオプトアウトできます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">アフィリエイトについて</h2>
        <p className="text-slate-600 leading-relaxed">
          現時点でアフィリエイトプログラムへの参加はありません。
          将来参加した場合は、本ページに追記します。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">情報提供について</h2>
        <p className="text-slate-600 leading-relaxed">
          本サイトに掲載している情報は情報提供・教育目的であり、
          特定の金融商品・サービスへの投資を勧誘するものではありません。
          投資判断はご自身の責任において行ってください。
        </p>
      </section>

      <p className="text-sm text-slate-400 border-t border-slate-100 pt-6">制定日：2026年7月1日</p>
    </div>
  );
}
