# 完了報告:resident-tax-timing 追加対応(.gitignore整備・給与所得控除注記の定量化・非課税基準警告)

`impl_resident_tax_timing_addendum.md` の実装完了報告。

## 対応1: .gitignore整備

- `docs/fixes/active/betsuhyo5-extraction/`直下にあった生XML(16MB)・中間データ11ファイルを
  `raw-data/`サブディレクトリへ移動。指示書・報告書(`investigation_report.md`)、抽出スクリプト
  (`extract_betsuhyo5.py`・`check_boundaries.py`)はそのまま直下に残した。
- ルート`.gitignore`に`docs/fixes/**/raw-data/`を追加。`git add -n`で確認したところ、
  `raw-data/`配下は正しくステージング対象から除外され、スクリプト・報告書のみが対象になることを確認済み。
- 両スクリプトの読み込み・書き込みパスを`raw-data/shotokuzei_raw.xml`等に更新し、再実行して
  従来通り動作することを確認済み(境界値照合8点、行数抽出とも変化なし)。

## 対応2: 給与所得控除の注記文言を定量化

- `src/lib/tax/residentTaxTiming.ts`に`calcSalaryDeductionApproxMaxError(incomeYen)`を新設。
  収入が属する区分(190万円以下/190万円超〜360万円以下/360万円超〜660万円以下/
  660万円超〜850万円以下/850万円超)に応じて、別表第五との誤差上限(0円/1,200円/800円/400円/0円)
  を返す。根拠は`docs/fixes/active/betsuhyo5-extraction/investigation_report.md`の8点照合結果。
- **動的表示を実装**(指示書が「望ましい」とした方式を採用): `salaryDeductionApproxNote()`が
  波1・波2それぞれの実際の収入から該当区分を判定し、その区分の上限のみを`assumptionNotes`に
  追加する(誤差ゼロの区分では何も追加しない)。全区分を並べる静的な併記文言は不採用。
- `ResidentTaxTimingResult.tsx`の「計算根拠を見る」アコーディオン内の説明文も、
  「1円刻みの対応表」→「4,000円刻みの区分表」という正確な記述に修正し、
  「最大1,200円程度に収まることを確認済み」という定量的な文言に更新した。

## 対応3: 住民税非課税基準の警告表示

### 確認した一次情報
- **総務省「個人住民税について」(令和7年5月15日、税制調査会説明資料)2ページ**
  `https://www.cao.go.jp/zei-cho/content/7zen5kai2.pdf`
  「非課税ライン(単身者の場合)」の表に、基本額等45万円(令和7年度改正でも変更なし)+
  給与所得控除65万円(令和8年度分から適用)=給与収入110万円、と明記されている。
  当初は`soumu.go.jp`の該当ページ・PDFへの直接アクセスがエンコーディングエラーで失敗したため、
  内閣府(`cao.go.jp`)にホストされている総務省作成のこの説明資料を代替の一次情報として使用した
  (総務省が税制調査会向けに作成・提出した資料であり、内容の一次性に問題はないと判断)。
- 単身・扶養なしの場合、均等割・所得割の非課税限度額はいずれも「35万円×1+10万円=45万円」で
  一致することを、大阪市・練馬区の公式ページ(いずれも令和8年度課税分の表記)でも重複確認した
  (所得割側の+32万円、均等割側の+21万円の加算は、いずれも扶養親族がいる場合のみ発生するため)。
  したがって「均等割と所得割で基準額が異なる場合は低い方を採用する」という指示に対しては、
  両者が同額のため一意に45万円を採用した。
- **確認した具体的な金額: 給与所得(給与所得控除後・基礎控除前)45万円以下**
  (`NON_TAXABLE_SALARY_INCOME_THRESHOLD = 450_000`円としてコードに定数化)。

### 実装内容
- `checkNonTaxable(incomeYen)`を波1・波2共通のロジックとして実装(二重実装なし)。
  波1は`incomeBasisAmount`、波2は`retirementYearIncome`(月割り推計値または上書き値)を
  それぞれ判定対象にした。
- `CurrentYearTax`・`NextYearTax`の両方に`nonTaxableWarning: NonTaxableWarning`
  (`{ mayBeNonTaxable, message }`)フィールドを追加。
- `ResidentTaxTimingResult.tsx`で、`mayBeNonTaxable: true`の場合に各波の数値表示の直下へ
  アラート形式(amber系の警告ボックス)で警告文を表示。税額そのものは非表示にしていない
  (指示書の方針通り)。
- 警告文には必ず「単身・扶養なしを前提とした全国共通の簡易基準(1級地)であり、実際の判定は
  お住まいの自治体(級地区分)・扶養状況により異なります」という限定条件を含めている。

## 検証結果

- `node scripts/verify-resident-tax-timing-tool.js`: **144 PASS / 0 FAIL**
  (既存104件+今回追加40件: 非課税基準の定数値・低年収パターン(年収100万円、波1・波2とも
  `mayBeNonTaxable: true`)・既存400/600/800万円パターン全12通りでの`mayBeNonTaxable: false`
  ※ただし1月退職の波2のみ月割り推計が45万円を下回り`true`になる現実的な挙動を確認・明記、
  誤差上限関数の境界値5点、assumptionNotesへの動的反映)
- `node scripts/full-verify.js`: **全PASS(exit code 0)**、既存フィクスチャへの回帰なし
- `npx tsc --noEmit`: エラーなし

## 副次的な発見(検証要件外だが記録)

既存の400/600/800万円×1/5/9/12月マトリクスのうち、**1月退職の波2(退職翌年の新規課税)は
年収帯によらず全て`mayBeNonTaxable: true`になる**ことが判明した。これは「年収÷12×1ヶ月分」
という月割り推計が、どの年収帯でも45万円の非課税ラインを下回るためであり、バグではなく
モデルの現実的な挙動(退職年に1ヶ月しか働いていなければ、その年の給与所得は実際に低くなる)
である。既存の検証テーブル(`NEXT_YEAR_TOTAL`)の1月退職パターンが軒並み所得割0円+均等割
5,000円=5,000円になっていた既存の実測結果とも整合している。
