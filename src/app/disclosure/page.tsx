import { SITE_URL } from '@/lib/siteConfig';

export const metadata = {
  title: '広告・アフィリエイトに関する開示 | FREENOUGH 資産シミュレーター',
  alternates: {
    canonical: `${SITE_URL}/disclosure`,
  },
};

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">広告・アフィリエイトに関する開示</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">広告について</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          本サイトでは、Google AdSenseによる広告を掲載する場合があります。広告収入は、本サイトの運営および改善のために活用いたします。
        </p>
        <p className="text-slate-600 leading-relaxed">
          Googleおよびそのパートナーは、Cookie等を利用して利用者の興味・関心に応じた広告を配信することがあります。広告のパーソナライズを無効にしたい場合は、
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Googleの広告設定
          </a>
          から変更できます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">アフィリエイト広告について</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          本サイトでは、第三者配信のアフィリエイトサービス（A8.net、もしもアフィリエイト、アクセストレード等）を利用し、提携事業者の商品・サービスを紹介する場合があります。
        </p>
        <p className="text-slate-600 leading-relaxed mb-4">
          Amazonのアソシエイトとして、本サイトは適格販売により収入を得ています。
        </p>
        <p className="text-slate-600 leading-relaxed mb-4">
          アフィリエイト広告を掲載する記事・ページには、「[PR]」等の表記を行い、広告であることが分かるよう配慮します。
        </p>
        <p className="text-slate-600 leading-relaxed">
          本サイトでは、公開情報や独自の調査・比較等をもとに情報を掲載しています。掲載内容は、特定の商品・サービスへの申込みや契約を推奨・保証するものではありません。最終的なご判断は、ご自身の責任においてお願いいたします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">情報提供について</h2>
        <p className="text-slate-600 leading-relaxed">
          本サイトに掲載している情報は、一般的な情報提供・教育を目的としたものであり、特定の金融商品・サービスへの投資勧誘や助言を目的とするものではありません。投資判断は、ご自身の責任において行ってください。
        </p>
      </section>

      <div className="text-sm text-slate-400 border-t border-slate-100 pt-6">
        <p>制定日：2026年7月1日</p>
        <p>最終更新日：2026年7月24日</p>
      </div>
    </div>
  );
}
