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

      {/* 基本の流れ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          基本の流れ
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 leading-relaxed">
          <li>左側の入力パラメータ(ライフプラン・家計・資産・運用方針とリスク)を入力します。数値を変えると、右側のKPIカードとグラフに自動で反映されます。</li>
          <li>まずは「固定モード」で、単一の利回り前提での結果を確認します。</li>
          <li>より現実的なばらつきを見たい場合は「MCモード」に切り替え、「1,000試行を実行」ボタンを押します。1,000通りの市場変動シナリオを計算し、グラフが資産推移の幅(p10〜p90)や破綻確率の表示に切り替わります。</li>
          <li>気になる年齢の詳細を見たい場合は年次資産テーブルを、複数の入力パターンを比較したい場合は感度分析やプロファイル管理を使います(詳細は後述)。</li>
        </ol>
      </section>

      {/* 入力パラメータの構成 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          入力パラメータの構成
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          入力パラメータは、以下の4つのカテゴリに分かれています。それぞれのカテゴリ内には「配偶者を入力する」の開閉欄があり、世帯で計算したい場合は該当カテゴリを開いて配偶者の情報を入力してください。
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">① ライフプラン</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-2">
              現在年齢・退職年齢・年金受給開始年齢・余命(終端年齢)を設定します。
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 leading-relaxed">
              <li><span className="font-medium text-slate-700">退職年齢</span>:シミュレーションの「取り崩し開始年齢」です。早期退職を検討している場合は、退職年齢を低めに設定して試してみてください。</li>
              <li><span className="font-medium text-slate-700">余命(終端年齢)</span>:資産が何歳まで持つかを確認するための、シミュレーションの終了年齢です。</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-1">② 家計</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-2">
              収入・支出・ライフイベントをまとめて設定します。
            </p>

            <p className="text-sm font-semibold text-slate-500 mb-1">収入</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 leading-relaxed mb-3">
              <li><span className="font-medium text-slate-700">年間手取り収入</span>:社会保険料・所得税・住民税を引いた後の実際の手取り金額を入力してください。収入はシミュレーション期間を通じて現在価格で固定されます(昇給・降給はライフイベントの「収入変化」で登録できます)。</li>
              <li><span className="font-medium text-slate-700">年金受給額</span>:公的年金の年間受給見込み額です。受給開始年齢はライフプランで設定します。</li>
            </ul>

            <p className="text-sm font-semibold text-slate-500 mb-1">支出</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 leading-relaxed mb-3">
              <li><span className="font-medium text-slate-700">年間生活費</span>:食費・光熱費・通信費・医療費など、毎年継続してかかる恒久的な生活費を入力します。住宅ローンや教育費のような期間が限定される支出は、ここには含めず「ライフイベント」で登録してください。生活費はインフレ率にしたがって毎年上昇していきます。</li>
              <li><span className="font-medium text-slate-700">インフレ率</span>:年間の物価上昇率です。デフォルトは2.0%(日銀の物価目標水準)です。生活費はこの率で複利上昇し、収入は固定のまま推移します。</li>
              <li><span className="font-medium text-slate-700">年間支出合計</span>:年間生活費と、現在進行中の継続支出(住宅ローンなど)を合算した、今年時点での年間支出額です。シミュレーションでは、ここから毎年インフレ率に応じて増加します。</li>
            </ul>

            <p className="text-sm font-semibold text-slate-500 mb-1">年間余剰CF</p>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">
              収入から支出・ライフイベント支出を差し引いた、その年の収支の余裕を自動計算で表示します(収入−生活費−イベント支出)。
            </p>

            <p className="text-sm font-semibold text-slate-500 mb-1">ライフイベント</p>
            <p className="text-slate-600 text-sm leading-relaxed mb-2">
              住宅ローン・教育費・退職金・収入変化など、特定の年齢に発生するイベントを登録します。登録したイベントはシミュレーションに自動的に反映され、タイムライン上に表示されます。
            </p>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex gap-2">
                <span className="font-medium text-slate-700 w-24 flex-shrink-0">住宅ローン</span>
                <span>借入額・金利・返済年数から月次返済額を自動計算します。返済期間中の年間支出として加算されます。</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-slate-700 w-24 flex-shrink-0">教育費</span>
                <span>子の大学進学などの年単位の支出です。期間と年間金額を指定します。</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-slate-700 w-24 flex-shrink-0">収入変化</span>
                <span>昇給・転職・副業開始などで手取り収入が変わる場合に登録します。</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-1">③ 資産</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-2">
              NISA・iDeCo・特定口座・現金の残高・積立設定と、退職金・iDeCoの受け取り設定をまとめます。
            </p>

            <p className="text-sm font-semibold text-slate-500 mb-1">保有資産</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 leading-relaxed mb-3">
              <li>各口座の現在残高と、年間積立額・積立終了年齢を設定してください。</li>
              <li><span className="font-medium text-slate-700">NISA(つみたて・成長投資枠)</span>:運用益・分配金が非課税です。年間積立上限は360万円(2024年制度)。売却時も課税されないため、取り崩し期の税負担が最も少ない口座です。</li>
              <li><span className="font-medium text-slate-700">iDeCo(個人型確定拠出年金)</span>:掛金全額が所得控除の対象になります。60歳まで引き出せない代わりに、積立時・運用時・受取時にそれぞれ税優遇があります。</li>
              <li><span className="font-medium text-slate-700">特定口座・現金</span>:特定口座は売却益に約20.315%の税金がかかります。現金は運用しない安全資産として扱われます。取り崩し時はNISA→特定口座→現金の順で優先的に使用されます。</li>
            </ul>

            <p className="text-sm font-semibold text-slate-500 mb-1">受け取り設定</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 leading-relaxed mb-2">
              <li><span className="font-medium text-slate-700">退職金</span>:勤続年数から退職所得控除を適用した手取り額を自動計算します。</li>
              <li><span className="font-medium text-slate-700">iDeCo受取方式・受取開始年齢</span>:一時金・年金のどちらで受け取るかを選択できます。受取方法によって税計算が異なり、シミュレーターは受取額の手取りを自動計算します。</li>
            </ul>

            <p className="text-slate-600 text-sm leading-relaxed mb-2">
              カテゴリの一番下に、現在の総資産合計が自動計算で表示されます。
            </p>

            <p className="text-slate-600 text-sm leading-relaxed">
              配偶者の資産(NISA・iDeCo・特定口座・現金)は、本人の同じ種類の口座と合算され、本人と同じ運用方針で計算されます。配偶者の年齢や退職年齢を入力しない場合は、本人と同じ値として扱われます。
            </p>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-1">④ 運用方針・リスク</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              NISA・iDeCo・特定口座それぞれの資産クラス配分(株式・債券などの比率)と、そこから自動計算される期待リターン・標準偏差を設定します。「現在のPF」「積立期のPF」「取崩期のPF」の3つを個別に設定でき、積立期と取崩期で運用方針を変える想定もシミュレーションに反映できます。モンテカルロモードで使う標準偏差は、自動計算値をそのまま使うことも、手動で上書きすることもできます。
            </p>
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
            <p>退職時の資産が何歳まで持つかを示します。余命(終端年齢)まで資産が残る場合は「枯渇なし」と表示されます。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">FIRE達成年齢・FIRE達成率</h3>
            <p className="mb-1"><span className="font-medium text-slate-700">FIRE達成年齢</span>は、取崩期を通じて総資産が「年間支出×25倍」を下回らない最速の退職年齢です。この水準を維持できれば、理論上は資産運用のみで生活できるという考え方(4%ルール)にもとづいています。</p>
            <p><span className="font-medium text-slate-700">FIRE達成率</span>は、資産が「年間支出×25倍」の何%に達しているかを示します。達成済みの場合はFIRE達成年齢時点、未達成の場合は退職予定年齢時点の資産をもとに計算されます。達成できない場合は「未達成」と表示されます。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">資産取り崩し開始</h3>
            <p className="mb-1">資産の取り崩しが始まる最初のタイミングです。年金受給開始などにより収支は変化するため、この年齢以降ずっと取り崩しが続くとは限りません。詳細は年次資産テーブルをご確認ください。</p>
            <p>退職以降ずっと収支が均衡し取り崩しが発生しない場合は「転換なし」と表示されます。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">初年度取崩率</h3>
            <p>退職直後の年間引き出し額が、退職時点の総資産に対して何%にあたるかを示します。一般に、この比率が低いほど資産が長持ちしやすいとされ、3%未満を目安とする考え方があります。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">破綻確率(モンテカルロ)</h3>
            <p>1,000通りの市場シナリオのうち、余命(終端年齢)までに資産が枯渇した割合です。5%未満を目安に安全圏とする考え方が一般的です。詳細は<Link href="/methodology" className="underline text-slate-500">計算ロジック</Link>をご覧ください。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">最終資産・資産ピーク</h3>
            <p><span className="font-medium text-slate-700">最終資産</span>は、余命(終端年齢)時点で残っている資産額です。<span className="font-medium text-slate-700">資産ピーク</span>は、シミュレーション期間中で資産が最も多くなった時点の金額と年齢です。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">iDeCo受取(手取り)</h3>
            <p>iDeCoを設定している場合、受取方式(一時金・年金)に応じた手取り額と、退職所得税等の内訳を確認できます。iDeCoを設定していない場合は、その旨が表示されます。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">改善案インパクト比較</h3>
            <p>支出削減・退職年齢の延長・余剰CFの投資など、いくつかの改善案を実行した場合に、最終資産や破綻確率がどう変化するかを比較できます。どの施策がFIRE達成に効果的かを確認するのに役立ちます。</p>
          </div>
        </div>
      </section>

      {/* その他の機能 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          その他の機能
        </h2>
        <div className="space-y-4 text-sm text-slate-600">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">年次資産テーブル</h3>
            <p>年ごとの資産残高・収支の詳細を一覧で確認できます。KPIカードは代表的な1つの数値を示すものなので、「なぜこの年齢でこの数値になっているのか」を詳しく確認したい場合は、年次資産テーブルをご覧ください。CSVとしてダウンロードすることもできます。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">感度分析</h3>
            <p>利回り・インフレ率・退職年齢などを個別に変化させたときに、FIRE達成年齢がどう変わるかを確認できます。どの変数がFIRE達成に最も影響するかを把握するのに役立ちます。</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">プロファイル管理</h3>
            <p>入力した内容をプロファイルとして保存し、複数のパターン(例:早期退職案・現状維持案)を切り替えたり比較したりできます。</p>
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
