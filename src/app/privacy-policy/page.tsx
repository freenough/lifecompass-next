import { SITE_URL } from '@/lib/siteConfig';

export const metadata = {
  title: 'プライバシーポリシー | FREENOUGH 資産シミュレーター',
  alternates: {
    canonical: `${SITE_URL}/privacy-policy`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">プライバシーポリシー</h1>

      <p className="text-slate-600 leading-relaxed mb-8">
        freenough（以下「当方」）は、FREENOUGH 資産シミュレーター（以下「本サービス」）における
        利用者の個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">1. 基本方針</h2>
        <p className="text-slate-600 leading-relaxed">
          本サービスは、利用者が入力した資産情報・収入情報等のシミュレーションデータを
          <strong>サーバーに送信・保存しません。</strong>
          すべての計算処理は利用者のブラウザ上で完結し、入力データは端末内にのみ保存されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">2. 収集する情報</h2>

        <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
          (1) アクセス解析情報（Google Analytics 4）
        </h3>
        <p className="text-slate-600 leading-relaxed mb-3">
          本サービスでは、Googleが提供するアクセス解析ツール「Google Analytics 4」を使用しています。
          Google Analytics 4はCookieを使用してアクセス情報を収集します。
          収集される情報は匿名であり、個人を特定するものではありません。
        </p>
        <p className="text-slate-600 mb-2">収集される情報の例：</p>
        <ul className="list-disc list-inside text-slate-600 space-y-1 mb-3 pl-2">
          <li>ページの閲覧数・滞在時間</li>
          <li>参照元URL・流入経路（UTMパラメータを含む）</li>
          <li>使用デバイス・ブラウザの種類</li>
          <li>おおよその地域情報</li>
        </ul>
        <p className="text-slate-600 leading-relaxed mb-1">
          Google Analytics 4のデータ収集を無効にする場合は、
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Googleアナリティクスオプトアウトアドオン
          </a>
          をご利用ください。
        </p>
        <p className="text-slate-600 leading-relaxed">
          Googleのプライバシーポリシーについては
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            こちら
          </a>
          をご確認ください。
        </p>

        <h3 className="text-base font-semibold text-slate-800 mt-6 mb-2">
          (2) 広告配信情報（Google AdSense）
        </h3>
        <p className="text-slate-600 leading-relaxed">
          本サービスでは、Googleが提供する広告配信サービス「Google AdSense」を使用しています。
          Google AdSense は Cookie を使用して、利用者の興味に基づいた広告を表示します。
          広告のカスタマイズを無効にする場合は、
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            広告設定
          </a>
          をご利用ください。
        </p>

        <h3 className="text-base font-semibold text-slate-800 mt-6 mb-2">
          (3) ブラウザのローカルストレージ
        </h3>
        <p className="text-slate-600 leading-relaxed">
          シミュレーションのプロファイルデータ（入力値）は、利用者の端末のローカルストレージに
          保存される場合があります。このデータは当方のサーバーには送信されず、
          利用者が端末のブラウザデータを削除することで消去されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">3. 情報の利用目的</h2>
        <p className="text-slate-600 mb-2">収集したアクセス解析情報は、以下の目的で利用します。</p>
        <ul className="list-disc list-inside text-slate-600 space-y-1 pl-2">
          <li>本サービスの利用状況の把握・改善</li>
          <li>コンテンツの充実・利便性向上</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">4. 第三者への情報提供</h2>
        <p className="text-slate-600 leading-relaxed">
          当方は、法令に基づく場合を除き、収集した情報を第三者に提供しません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Cookieについて</h2>
        <p className="text-slate-600 leading-relaxed">
          本サービスではGoogle Analytics 4およびGoogle AdSenseのためにCookieを使用しています。
          ブラウザの設定からCookieを無効にすることができますが、
          一部機能が利用できなくなる場合があります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">6. プライバシーポリシーの変更</h2>
        <p className="text-slate-600 leading-relaxed">
          当方は、本プライバシーポリシーを予告なく変更する場合があります。
          変更後のプライバシーポリシーは、本ページに掲載した時点から効力を生じるものとします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">7. お問い合わせ</h2>
        <p className="text-slate-600 leading-relaxed">
          本プライバシーポリシーに関するお問い合わせは、
          X（旧Twitter）
          <a
            href="https://twitter.com/freenough"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            @freenough
          </a>
          までお願いします。
        </p>
      </section>

      <p className="text-sm text-slate-400 border-t border-slate-100 pt-6">制定日：2026年7月1日</p>
    </div>
  );
}
