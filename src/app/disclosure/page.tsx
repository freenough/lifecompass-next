export const metadata = { title: '広告開示 — LifeCompass' };

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 prose prose-slate">
      <h1>アフィリエイト・広告に関する開示</h1>
      <p>
        本サイトはAmazon.co.jpアソシエイト・プログラムの参加者です。
        商品リンクをクリックして購入された場合、運営者が紹介料を受け取ることがあります。
      </p>
      <p>
        また、Googleアドセンスによる広告を掲載する場合があります。
        広告収入はサイト運営費に充てられます。
      </p>
      <p>
        掲載している情報は情報提供を目的としており、特定の金融商品・サービスへの投資を勧誘するものではありません。
        投資判断はご自身の責任において行ってください。
      </p>
    </div>
  );
}
