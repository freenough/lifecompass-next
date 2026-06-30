import Link from 'next/link';

export const metadata = {
  title: '使い方ガイド | LifeCompass',
  description: 'LifeCompassの入力項目・タイムライン登録・結果の読み方を解説します。',
};

export default function GuidePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-sm text-slate-400 mb-2">
        <Link href="/" className="hover:underline">LifeCompass</Link> &rsaquo; 使い方ガイド
      </p>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">使い方ガイド</h1>
      <p className="text-slate-500 text-sm mb-10">
        LifeCompassの基本的な入力方法と、結果の読み方を説明します。
      </p>

      {/* 基本パラメータ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          基本パラメータの入力
        </h2>

        <div className="space-y-5">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">年間手取り収入</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              社会保険料・所得税・住民税を引いた後の実際の手取り金額を入力してください。
              収入はシミュレーション期間を通じて現在価格で固定されます（昇給・降給はタイムラインで登録できます）。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-1">年間生活費</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              食費・光熱費・通信費・医療費など、毎年継続してかかる恒久的な生活費を入力します。
              住宅ローンや教育費のような期間が限定される支出は、ここには含めず「タイムライン」で登録してください。
              生活費はインフレ率にしたがって毎年上昇していきます。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-1">インフレ率</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              年間の物価上昇率です。デフォルトは2.0%（日銀の物価目標水準）です。
              生活費はこの率で複利上昇し、収入は固定のまま推移します。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-1">退職年齢・平均余命</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              シミュレーションの「取り崩し開始年齢」と「終了年齢」です。
              平均余命まで資産が持つかどうかを確認するための設定です。
              早期退職を検討している場合は退職年齢を低めに設定して試してみてください。
            </p>
          </div>
        </div>
      </section>

      {/* 口座・積立 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          口座残高・積立設定
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          NISA・iDeCo・特定口座・現金の4口座を個別に管理します。
          各口座の現在残高と、年間積立額・積立終了年齢を設定してください。
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">NISA（つみたて・成長投資枠）</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              運用益・分配金が非課税です。年間積立上限は360万円（2024年制度）。
              売却時も課税されないため、取り崩し期の税負担が最も少ない口座です。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">iDeCo（個人型確定拠出年金）</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              掛金全額が所得控除の対象になります。60歳まで引き出せない代わりに、積立時・運用時・受取時にそれぞれ税優遇があります。
              受取方法（一時金／年金）によって税計算が異なり、シミュレーターは受取額の手取りを自動計算します。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">特定口座・現金</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              特定口座は売却益に約20.315%の税金がかかります。現金は運用しない安全資産として扱われます。
              取り崩し時はNISA→特定口座→現金の順で優先的に使用されます。
            </p>
          </div>
        </div>
      </section>

      {/* タイムライン */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          タイムライン（ライフイベント登録）
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          住宅ローン・教育費・退職金・収入変化など、特定の年齢に発生するイベントを登録します。
          登録したイベントはシミュレーションに自動的に反映されます。
        </p>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex gap-2">
            <span className="font-medium text-slate-700 w-24 flex-shrink-0">住宅ローン</span>
            <span>借入額・金利・返済年数から月次返済額を自動計算。返済期間中の年間支出として加算されます。</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-slate-700 w-24 flex-shrink-0">教育費</span>
            <span>子の大学進学などの年単位の支出。期間と年間金額を指定します。</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-slate-700 w-24 flex-shrink-0">退職金</span>
            <span>退職時の一時収入。退職所得控除を適用した手取り額を自動計算します。</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-slate-700 w-24 flex-shrink-0">収入変化</span>
            <span>昇給・転職・副業開始などで手取り収入が変わる場合に登録します。</span>
          </div>
        </div>
      </section>

      {/* 結果の読み方 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          結果の読み方
        </h2>
        <div className="space-y-4 text-sm text-slate-600">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">資産寿命</h3>
            <p>退職時の資産が何年で枯渇するかを示します。平均余命まで上回っていれば安心の目安です。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">FIRE達成年齢</h3>
            <p>総資産が「年間生活費×25倍」を恒久的に上回り始める年齢です。この水準を維持できれば、理論上は資産運用のみで生活できます（4%ルール）。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">破綻確率（モンテカルロ）</h3>
            <p>1,000通りの市場シナリオのうち、平均余命までに資産が枯渇した割合です。5%未満を目安に安全圏とする考え方が一般的です。詳細は<Link href="/methodology" className="underline text-slate-500">計算ロジック</Link>をご覧ください。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">感度分析</h3>
            <p>利回り・インフレ率・退職年齢を変化させたときの影響を比較できます。どの変数が最もFIRE達成に効くかを確認するのに役立ちます。</p>
          </div>
        </div>
      </section>

      <div className="border-t border-slate-200 pt-6 flex gap-4 text-sm">
        <Link href="/methodology" className="text-slate-500 hover:underline">
          → 計算ロジック・前提を読む
        </Link>
        <Link href="/simulator" className="text-slate-500 hover:underline">
          → シミュレーターを開く
        </Link>
      </div>
    </main>
  );
}
