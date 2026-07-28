import Link from 'next/link';

export const metadata = {
  title: '計算ロジック・前提 | FREENOUGH 資産シミュレーター',
  description: 'FREENOUGH 資産シミュレーターの計算モデル・前提条件・税金の扱いを解説します。',
};

export default function MethodologyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <p className="text-sm text-slate-400 mb-2">
        <Link href="/" className="hover:underline">資産シミュレーター</Link> &rsaquo; 計算ロジック・前提
      </p>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">計算ロジック・前提</h1>
      <p className="text-slate-500 text-sm mb-10">
        FREENOUGH 資産シミュレーターがどのように計算しているかを説明します。
        シミュレーター結果を正しく解釈するためにお読みください。
      </p>

      {/* 収入・支出モデル */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          収入・支出モデル
        </h2>
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">収入：現在価格で固定</h3>
            <p>
              入力した手取り収入は、シミュレーション期間を通じて名目額が固定されます。
              昇給・転職・副業開始などで収入が変わる場合は、タイムラインの「収入変化」イベントで登録してください。
              収入は社会保険料・税金控除後の手取り額を想定しており、シミュレーター内での再計算は行いません。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">支出：インフレ率で毎年上昇</h3>
            <p>
              入力した年間生活費は、現在年齢を起点にインフレ率で複利上昇します。
              たとえばインフレ率2%・生活費360万円の場合、10年後の生活費は約439万円として計算されます。
              タイムラインに登録した住宅ローン・教育費はインフレ連動せず、登録した名目額がそのまま加算されます。
            </p>
          </div>
        </div>
      </section>

      {/* 資産運用モデル */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          資産運用モデル
        </h2>
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">ポートフォリオ設定</h3>
            <p>
              NISA・iDeCo・特定口座の3口座それぞれに資産配分（株式・債券・REITなど）を設定できます。
              各資産クラスの期待リターン（μ）と標準偏差（σ）から口座全体のμ・σが自動集計されます。
              積立期と取り崩し期でポートフォリオを変えることもできます。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">資産クラスのデフォルト値</h3>
            <p>
              各資産クラスのデフォルトμ・σはJP Morgan LTCMA（長期資本市場仮説）2026年版を参考に設定しています。
              ポートフォリオパネルから手動で変更することもできます。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">現金口座</h3>
            <p>
              現金はμ=0・σ=0として扱われます（運用しない安全資産）。
              口座残高は変動せず、取り崩し時に最後に使用されます。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">配偶者口座との合算</h3>
            <p>
              配偶者のNISA・iDeCo・特定口座・現金の残高は、本人の同じ種類の口座と合算した上で、本人が設定したポートフォリオ（期待リターン・標準偏差）で運用されます。
              配偶者専用の運用方針を別途設定することはできません。
              取り崩し時も合算後の残高から選択した戦略（比例取崩・現金優先・課税優先）で引き出し、その後は元の残高比率で本人・配偶者に配分し直されます。
              モンテカルロモードの市場変動も、本人・配偶者で共通の1つの変動として適用されます（口座間の相関を1とみなす設計のため）。
            </p>
            <p className="mt-2">
              配偶者の現在年齢・退職年齢・iDeCo受取開始年齢を入力しない場合は、本人と同じ値として計算されます。
            </p>
          </div>
        </div>
      </section>

      {/* 税金の扱い */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          税金の扱い
        </h2>
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-medium text-slate-700 mb-1">特定口座：売却益課税</h3>
            <p>
              特定口座からの取り崩しには、売却益に対して約20.315%（所得税15%＋住民税5%＋復興特別所得税0.315%）の課税を自動適用します。
              売却益は「取崩額 − 取得原価」で計算し、取得原価は簿価平均法で管理します。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">iDeCo：受取時の税計算</h3>
            <p>
              一時金受取の場合は退職所得控除を適用します。控除額は「40万円×20年＋70万円×（加入年数−20年）」が基本です。
              年金受取の場合は公的年金等控除を適用します。
              いずれも控除後の手取り額をシミュレーターが自動計算して表示します。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">NISA：非課税</h3>
            <p>
              NISA口座の運用益・売却益は非課税のため、取り崩し時の税負担はゼロとして計算します。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">NISA・iDeCoの拠出上限に関する入力チェック</h3>
            <p>
              NISA・iDeCoにはそれぞれ制度上の拠出・投資上限があります。本シミュレーターでは、NISAの年間積立が360万円（成長投資枠240万円＋つみたて投資枠120万円）を超える場合、およびiDeCoの年間積立が会社員の一般的な上限（27.6万円、自営業等は上限が異なります）を超える場合に、入力欄で警告を表示します。いずれも入力時の目安表示であり、計算上は入力された値がそのまま使用されます。なお、NISAには生涯非課税投資枠1,800万円の上限もありますが、本シミュレーターは投資元本（簿価）を追跡していないため、この上限に対する自動チェックは行っていません。実際の上限・ご自身の利用状況は、勤務先・国民年金の加入区分や証券会社のマイページ等でご確認ください。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-700 mb-1">退職金</h3>
            <p>
              タイムラインに登録した退職金には退職所得控除を適用し、手取り額を自動計算します。
              iDeCoの一時金と退職金を同年に受け取る場合の扱いには注意が必要です（詳細は税理士等にご確認ください）。
              配偶者の退職金・iDeCo一時金についても、本人と同様に退職所得控除等を適用した手取り額を自動計算します。
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
            <h3 className="font-medium text-slate-700 mb-2">計算上の留意事項</h3>
            <ul className="space-y-3 text-slate-600 text-xs leading-relaxed list-none">
              <li>
                <span className="font-medium">① 税率は簡易計算</span>
                <p className="mt-0.5">
                  実際の退職所得は、退職所得控除・1/2課税適用後、所得税（累進課税）・住民税・復興特別所得税により税額が決まります。
                  本シミュレーターでは、長期の資産シミュレーションを高速に実行するため、課税退職所得（控除・1/2適用後）に一律20.315%を適用する簡易計算モデルを採用しています。
                  そのため、実際の税額と差が生じる場合があります。
                  正確な税額を確認したい場合は、<Link href="/tools/retirement-tax" className="hover:underline">退職金手取り計算ツール</Link>をご利用ください。
                </p>
              </li>
              <li>
                <span className="font-medium">② 退職所得税計算（近似実装）</span>
                <p className="mt-0.5">
                  本シミュレーターでは、退職金およびiDeCo一時金は、それぞれ独立して退職所得控除を計算します。
                  実際の税制に存在する退職所得控除の重複調整（19年ルール・9年ルール）は実装していません。
                  そのため、対象となるケースでは実際より税負担が軽く表示される場合があります。
                </p>
              </li>
              <li>
                <span className="font-medium">③ 個人の税務状況は考慮しない</span>
                <p className="mt-0.5">
                  他の所得（不動産・副業など）や扶養控除・生命保険料控除等は考慮していません。
                  実際の手取り額は税理士または公認会計士にご確認ください。
                </p>
              </li>
              <li>
                <span className="font-medium">④ 表示値について</span>
                <p className="mt-0.5">
                  本シミュレーターは、万円単位での概算表示を目的としています。
                  内部では小数点以下の精度で計算を行っていますが、画面上の表示は万円単位で四捨五入しています。
                  そのため、各口座の表示値を手動で合計した値と総資産の表示値が、最大で1万円程度異なる場合があります。
                  これは、小数演算に伴う丸め処理および浮動小数点演算の特性によるものであり、計算上の仕様です。
                </p>
              </li>
              <li>
                <span className="font-medium">⑤ 資産枯渇（破綻）の判定について</span>
                <p className="mt-0.5">
                  NISA・特定口座・現金をすべて使い切り、かつiDeCoがまだ受給開始年齢に達していない場合、その年をもって「資産が枯渇した」と判定します。iDeCo自体の残高が残っていても、法律上その時点では引き出すことができないため、生活費の原資にはならないと考えるためです。
                </p>
                <p className="mt-0.5">
                  破綻と判定された年以降は、iDeCoを含むすべての口座残高を0円として表示します。
                </p>
              </li>
              <li>
                <span className="font-medium">⑥ 改善案提案機能（退職延長）の近似</span>
                <p className="mt-0.5">
                  改善案提案機能で退職延長を試算する際、延長期間中の新規積立はNISA・iDeCo分も含めて特定口座に計上しています。口座別利率の有利・不利を考慮した最適配分ではなく、簡略化した近似です。
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FIRE判定 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          FIRE判定（4%ルール）
        </h2>
        <div className="text-sm text-slate-600 leading-relaxed space-y-3">
          <p>
            FIRE達成年齢は「総資産が年間生活費×25倍を、その年以降ずっと下回らなくなる最初の年齢」として定義しています。
          </p>
          <p>
            年間生活費×25倍は「4%ルール」から導かれる水準です。資産の4%を毎年取り崩しても資産が30年以上持続するという米国の研究（トリニティスタディ）に基づいています。
            FREENOUGH 資産シミュレーターでは住宅ローン・教育費などの一時的な支出を判定から除外し、恒久的な生活費のみを基準としています。
          </p>
          <p>
            グラフ上のFIREライン（ピンク破線）は「その年のインフレ調整後の生活費×25」を示しています。
          </p>
        </div>
      </section>

      {/* モンテカルロ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          モンテカルロシミュレーション
        </h2>
        <div className="text-sm text-slate-600 leading-relaxed space-y-3">
          <p>
            固定シミュレーションは平均的な利回りを使った1つのシナリオです。
            モンテカルロモードでは年率リターンを確率的に変動させ、1,000通りのシナリオを計算します。
          </p>
          <p>
            各試行で毎年の運用リターンを正規分布からランダムに生成し（平均μ・標準偏差σ）、
            平均余命までに資産がゼロになった試行の割合を「破綻確率」として表示します。
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mt-2">
            <p className="font-medium text-slate-700 mb-1 text-xs">破綻確率の目安</p>
            <div className="space-y-1 text-xs">
              <div className="flex gap-3"><span className="text-slate-600 font-medium w-16">5%未満</span><span>概ね安全圏</span></div>
              <div className="flex gap-3"><span className="text-slate-600 font-medium w-16">5〜15%</span><span>要注意</span></div>
              <div className="flex gap-3"><span className="text-slate-600 font-medium w-16">15%以上</span><span>要改善</span></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">運用期間・資産配分・取り崩し額によって異なります。</p>
          </div>
          <p>
            複数の取り崩し戦略（定額・定率・バケット法など）を比較する場合、同一の乱数列を共有して計算することで、戦略間の比較を公平に行っています（Common Random Numbers法）。
          </p>
        </div>
      </section>

      {/* 免責 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-700 border-b border-slate-200 pb-2 mb-4">
          免責・注意事項
        </h2>
        <div className="text-sm text-slate-600 leading-relaxed space-y-3">
          <p>
            FREENOUGH 資産シミュレーターは将来の資産推移を試算するツールです。実際の運用成果・税額・社会保障給付額を保証するものではありません。
          </p>
          <p>
            税制・制度は変更される場合があります。iDeCoの控除計算や退職金の課税など、個別の状況による差異が生じる場合は税理士・FP等の専門家にご確認ください。
          </p>
          <p>
            本ツールは投資助言を行うものではありません。投資判断はご自身の責任で行ってください。
          </p>
        </div>
      </section>

      <div className="border-t border-slate-200 pt-6 flex gap-4 text-sm">
        <Link href="/guide" className="text-slate-500 hover:underline">
          → 使い方ガイドを読む
        </Link>
        <Link href="/app" className="text-slate-500 hover:underline">
          → シミュレーターを開く
        </Link>
      </div>
    </main>
  );
}
