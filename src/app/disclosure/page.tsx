export const metadata = {
  title: '広告・アフィリエイトに関する開示 | FREENOUGH 資産シミュレーター',
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
        <h2 className="text-xl font-semibold text-slate-900 mb-3">アフィリエイト広告について</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          本サイトでは、第三者配信のアフィリエイトサービス（A8.net、もしもアフィリエイト、アクセストレード等）を利用し、提携事業者の商品・サービスを紹介する場合があります。
        </p>
        <p className="text-slate-600 leading-relaxed mb-4">
          アフィリエイト広告を掲載する記事・ページには、広告であることが分かるよう「[PR]」「広告」等の表記を行います。
        </p>
        <p className="text-slate-600 leading-relaxed mb-4">
          本サイトで紹介する商品・サービスは、独自の調査・比較・検証に基づき、利用者の皆さまへの情報提供を目的として掲載しています。掲載内容は特定の商品・サービスへの申込みや契約を断定的に推奨するものではなく、最終的なご判断はご自身の責任においてお願いいたします。
        </p>
        <p className="text-slate-600 leading-relaxed mb-4">
          なお、現時点ではアフィリエイト広告の掲載は開始しておりません。提携ASPおよび広告主との提携が承認され、広告掲載を開始した際には、本ページの内容を適宜更新いたします。
        </p>
        <p className="text-slate-600 leading-relaxed">
          Amazonのアソシエイトとして、本サイトは適格販売により収入を得ています。
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

      <div className="text-sm text-slate-400 border-t border-slate-100 pt-6">
        <p>制定日：2026年7月1日</p>
        <p>最終更新日：2026年7月23日</p>
      </div>
    </div>
  );
}
