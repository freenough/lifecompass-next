export const metadata = {
  title: '運営者情報 — LifeCompass',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">運営者情報</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">サービス名</h2>
        <p className="text-slate-600">LifeCompass（ライフコンパス）</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">運営者</h2>
        <p className="text-slate-600">freenough（フリーナフ）</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">運営者について</h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          FIREや資産形成をテーマに、シミュレーターツールとシミュレーション結果に基づいたコンテンツを制作・公開している個人運営者です。
          「自分の数字で考える」ための情報を届けることを目的としています。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">主なコンテンツ</h2>
        <ul className="text-slate-600 space-y-2 pl-2">
          <li>
            <strong>LifeCompass</strong>：モンテカルロシミュレーション対応のFIRE・資産シミュレーター
          </li>
          <li>
            <strong>note連載</strong>：田中誠・山本恒一・中村夫婦・佐々木誠一のFIRE挑戦シリーズ
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">SNS・連絡先</h2>
        <ul className="text-slate-600 space-y-2 pl-2">
          <li>
            X（旧Twitter）：
            <a
              href="https://twitter.com/freenough"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              @freenough
            </a>
          </li>
          <li>
            note：
            <a
              href="https://note.com/freenough"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              freenough
            </a>
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-400">※個別の財務・投資相談はお受けしておりません。</p>
      </section>

      <p className="text-sm text-slate-400 border-t border-slate-100 pt-6">公開日：2026年7月1日</p>
    </div>
  );
}
