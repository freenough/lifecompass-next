import { SITE_URL } from '@/lib/siteConfig';

export const metadata = {
  title: '免責事項 | FREENOUGH 資産シミュレーター',
  alternates: {
    canonical: `${SITE_URL}/disclaimer`,
  },
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">免責事項</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. 情報の正確性について</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          FREENOUGH 資産シミュレーター（以下「本サービス」）が提供するシミュレーション結果は、
          利用者が入力した数値をもとに計算した<strong>参考情報</strong>です。
          将来の資産額・退職時期・税額等を保証するものではありません。
        </p>
        <p className="text-slate-600 mb-2">以下の点にご注意ください。</p>
        <ul className="list-disc list-inside text-slate-600 space-y-2 pl-2">
          <li>シミュレーション結果は、入力値・設定に基づく試算であり、実際の運用結果とは異なります</li>
          <li>税制・社会保険制度は変更される場合があり、本サービスの計算が最新の制度を反映していない場合があります</li>
          <li>モンテカルロシミュレーションの結果は確率的な試算であり、将来の市場動向を予測するものではありません</li>
          <li>iDeCo・NISAの税制優遇・拠出限度額等は、制度改正により変更される場合があります</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. 投資・財務アドバイスではありません</h2>
        <p className="text-slate-600 leading-relaxed">
          本サービスは情報提供・教育目的のツールであり、
          <strong>投資助言・財務アドバイス・税務相談には該当しません。</strong>
          具体的な資産運用・税務処理については、
          金融機関・ファイナンシャルプランナー・税理士等の専門家にご相談ください。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. 損害について</h2>
        <p className="text-slate-600 leading-relaxed">
          本サービスの利用または利用不能により生じた損害について、
          当方は一切の責任を負いません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. 外部リンクについて</h2>
        <p className="text-slate-600 leading-relaxed">
          本サービスおよび関連コンテンツ（note.com掲載記事等）には
          外部サイトへのリンクが含まれる場合があります。
          リンク先のサービス・コンテンツについて当方は責任を負いません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. コンテンツの著作権</h2>
        <p className="text-slate-600 leading-relaxed">
          本サービスおよびfreenoughが公開するコンテンツの著作権は当方に帰属します。
          無断転載・複製はお断りします。
        </p>
      </section>

      <p className="text-sm text-slate-400 border-t border-slate-100 pt-6">制定日：2026年7月1日</p>
    </div>
  );
}
