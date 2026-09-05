# 実装指示：CompanyStateの再設計（シミュレータープロファイル単位への移行）

作成日：2026-08-30
種別：**実装（既存設計の手戻り・再設計）**
関連：`instruction_phase2_profile_foundation.md`（CompanyStateが資産管理ツール側プロファイルに紐づく、という当初設計。**本指示書はこの前提を覆す**）／`instruction_phase2_profile_linking.md`（自動連動・手動セレクター。**本指示書は3節の大部分を取り消す**）／`instruction_phase2_ui_safety_hardening.md`・`instruction_phase2_ui_finalize.md`（CompanyState専用の保存UI。**本指示書はこのUIを撤去する**）／`phase2_profile_yojitsu_requirements.md`（今回の再設計に至った要件整理の第一稿）

---

## 0. 背景・この指示書の位置づけ

一連の実装（CompanyStateの明示保存化、資産管理ツールプロファイルとの自動連動、手動セレクター）の完了後、KENZOとの設計協議で、そもそもの利用シーンに立ち返って再検討した結果、**CompanyStateの「持ち方」自体が誤っていた**という結論に至った。

これまでの設計：CompanyStateは資産管理ツール側のプロファイル（`useAssetManagerProfileStore`の`currentProfileId`）に紐づく。資産管理ツールを使わないユーザーの裏側にも、自動生成された単一の「デフォルト」プロファイルが存在し、シミュレーターで複数シナリオ（プロファイルA・B…）を作っても、法人設定だけは全シナリオで共有されてしまっていた（あるシナリオで法人設定を編集すると、他のシナリオの法人設定まで意図せず書き換わる）。

あるべき設計：個人側の「①現在PF」（`ProfileV3.portfolio.current`、ロック対象）は、シミュレータープロファイル自体の一部として保存・呼び出しされ、資産管理ツールとは一切自動連携しない（保有資産を反映したい場合は、明示的な「インポート」操作を都度行う）。CompanyStateもこれと全く同じ扱いにする。すなわち、**CompanyStateはシミュレータープロファイル単位で持ち、資産管理ツールとの関係は「明示的な手動インポート」1つに絞る**。

この指示書は、上記関連ドキュメントで実装した内容のうち、この新しい設計と矛盾する部分を取り消し・作り直す。**手戻りは織り込み済みであり、既存実装を守ることよりも、あるべき設計に揃えることを優先すること。**

**今回のスコープに含まれないもの**（次フェーズで別途指示する）：
- シミュレーション結果（予測カーブ）を「計画」として資産管理ツール側に保存する機能
- 資産管理ツール側の「実績×計画」予実比較ビュー

---

## 1. CompanyStateをシミュレータープロファイル単位のキー管理に変更する

### 1.1 保存構造

CompanyStateを、シミュレータープロファイルのID（`useSimulatorStore.currentProfileId`、`instruction_phase2_profile_linking.md`1節で追加済み）をキーとした形で保存する。localStorageに新しいキー（例：`companyStateByProfile`、既存のキー命名規則に合わせること）で`Record<number, CompanyState>`のような構造を持たせる。

### 1.2 切替・保存のタイミング

`ProfileDrawer.tsx`は変更禁止のため、`instruction_phase2_profile_linking.md`1節と同じ考え方で、`src/store/simulatorStore.ts`の`loadProfile()`/`saveProfile()`（`ProfileDrawer.tsx`から呼ばれる、`currentProfileId`を更新している箇所）に処理を追加する。

- `loadProfile()`内：読み込んだプロファイルのIDをキーに、`companyStateByProfile`から対応するCompanyStateを取り出し、`companyStateStore`のstateを丸ごと差し替える（該当エントリが無ければ`EMPTY_COMPANY_STATE`で初期化）
- `saveProfile()`内：保存先プロファイルのID（新規保存なら新しいID、上書き保存ならそのID）をキーに、その時点の`companyStateStore`の現在の値を`companyStateByProfile`へ書き込む
- 「別名で保存」（新規IDが発行されるケース）の場合、新IDには**現在メモリ上にあるCompanyStateの値がそのままコピーされる**こと（個人側PFが新IDに現在の入力値をそのまま持っていく既存挙動と同じ）。新IDに対して空のCompanyStateを紐づけてしまう実装ミスに注意すること

### 1.3 資産管理ツール側プロファイルとの自動連動を撤去する

`instruction_phase2_profile_linking.md`2節で実装した「シミュレーター側プロファイル読込→資産管理ツールプロファイルへの自動切替」ロジック、および`companyStateStore.ts`が資産管理ツール側プロファイル切替を`subscribe`している配線（`switchAssetManagerProfileGuarded`まわり）を撤去する。CompanyStateの切替は、以後1.2節の「シミュレータープロファイルのID」だけをトリガーにする。資産管理ツール側で今どのプロファイルがアクティブかは、CompanyStateの内容に一切影響しない。

`linkedSimulatorProfileId`フィールドや資産管理ツール側の「リンク切れ」表示自体は、今回のスコープでは削除しなくてよい（実害はなく、削除すると別のUI箇所に波及するため）。ただし、これらを使った自動切替の配線は完全に撤去すること。

---

## 2. CompanyState専用の保存UIを撤去し、個人側と同じ扱いに統一する

`instruction_phase2_ui_safety_hardening.md`・`instruction_phase2_ui_finalize.md`で実装した、CompanyState専用の下書き方式（`isDirty`/`saveDraft()`/`discardDraft()`）、`CorporateSettingsSection.tsx`の「未保存の変更があります」バナーと保存ボタン、`useUnsavedChangesGuard(isDirty)`による離脱警告・SPAナビゲーションガードを、**すべて撤去する**。

理由：1節の変更により、CompanyStateはシミュレータープロファイル本体の一部として、`simulatorStore.saveProfile()`（＝ユーザーがシミュレーター側で行う唯一の保存操作）のタイミングでまとめて保存されるようになる。これは個人側の他の入力項目（①現在PF含む）が、それ自体の保存ボタンを持たず、シミュレーター全体の保存操作にまとめて乗る、という既存の（ロック対象・実機確認済みの）挙動と完全に同じである。CompanyStateだけ専用の保存ボタン・未保存表示を持つのは、この統一性を崩す。

**これはKENZOが以前示した「自動保存はしない」という方針と矛盾しない。** あの方針が否定したのは「バックグラウンドで勝手に保存され続ける」ことであり、今回はユーザーが明示的に行う唯一の保存操作（シミュレーター側の保存）に相乗りするだけで、保存操作の数を1つに統一するものである。

具体的な撤去対象：
- `companyStateStore.ts`の`isDirty`/`saveDraft()`/`discardDraft()`と、それに依存する状態管理
- `CorporateSettingsSection.tsx`の未保存バナー・保存ボタン・トースト表示（117〜146行目付近）
- `useUnsavedChangesGuard(isDirty)`の呼び出し

個人側の他フィールドに、シミュレーター全体としての「未保存の変更」表示が別途存在するならそれに揃え、存在しないなら、CompanyStateについても新たに追加しないこと（個人側との整合性を最優先する）。

---

## 3. 「法人資産」セクションのプロファイルセレクターを、インポート元選択に転用する

`CorporateSettingsSection.tsx`冒頭の資産管理ツールプロファイルの`<select>`（`instruction_phase2_profile_linking.md`3節で実装、選ぶと即座に資産管理ツール側プロファイルを切り替える現在の挙動）を撤去する。かわりに、5節で追加する「インポート」ボタンに付随する形で、「どの資産管理ツールプロファイルからインポートするか」を選ぶだけのセレクターに置き換える。選んでも即座に何かが切り替わることはなく、インポート実行時にその選択が使われるだけとする。

`switchAssetManagerProfileGuarded`とその呼び出し（`handleAssetProfileSelect`）はこの用途では不要になるため、削除する。

---

## 4. ①現在PFの表示形式を金額ベースに修正する

`hojinCompanyState/types.ts`の`CorporatePortfolioRow`に、任意フィールドとして金額を追加する。

```ts
export interface CorporatePortfolioRow {
  assetClass: string;
  pct: number;
  amount?: number; // ①現在PFのみ使用。単位：万円（個人側AssetRowのamountと同じ考え方）
}
```

②積立期・③取崩期は引き続き`pct`のみを使う（変更なし）。①現在のみ、`CorporatePortfolioPanel.tsx`の該当箇所（`AssetCard`の`current`フェーズ表示）を、資産クラス＋金額の入力・表示に変更する。個人側`PortfolioPanel.tsx`の①現在PFのUIパターン（ロック、変更しない）を踏襲すること。合計額（`investedBalance`/`cashBalance`）とこの行別金額の整合性（合計が一致するか）の扱いは、個人側の既存PFが行っている検証・丸めルールがあればそれに合わせ、無ければ「行の金額合計をinvestedBalanceとして自動算出する」方式（現状の`BalanceInput`による手入力の扱いをどうするか含め）を実装者側で個人側の慣習と照らして判断し、完了報告に明記すること。

---

## 5. インポート機能の見直しと個人側への追加

### 5.1 `importFromAssetManagement()`の修正

現在、資産管理ツール側で"今アクティブな"プロファイル（`useAssetManagerProfileStore.getState().currentProfileId`）を暗黙に参照している。3節でセレクターが「切替」ではなく「インポート元の明示的な選択」に変わるため、この関数は引数として`profileId`を明示的に受け取るように変更する。

```ts
export function importFromAssetManagement(profileId: string): ImportedCorporateAssets
```

呼び出し側（`CorporatePortfolioPanel.tsx`の`handleImport`）は、3節のセレクターで選ばれたプロファイルIDを渡す。

### 5.2 個人側インポート機能の新規追加

個人側の①現在PF（`ProfileV3.portfolio.current`、ロック対象）にも、法人側と同じ「資産管理ツールから今の資産をインポート」を追加する。`PortfolioPanel.tsx`自体はロックのため、ボタン・セレクターは`SimulatorForm.tsx`側（非ロック、パネルを囲む側）に配置すること。

**マッピングルール**（資産管理ツールの保有資産`accountCategory`→個人側の格納先）：

| accountCategory | 格納先 |
|---|---|
| 現金（本人） | `profile.params.bCash` |
| 現金（配偶者） | `profile.params.spCashBal` |
| NISA（本人） | `portfolio.current.nisa`（資産クラス別の行として、`amount`に金額） |
| NISA（配偶者） | `portfolio.current.spNisa` |
| iDeCo（本人） | `portfolio.current.ideco` |
| iDeCo（配偶者） | `portfolio.current.spIdeco` |
| 特定口座（本人） | `portfolio.current.tax` |
| 特定口座（配偶者） | `portfolio.current.spTax` |
| その他（本人） | `portfolio.current.tax`（特定口座に合算。資産クラスは元のassetClass文字列をそのまま使う） |
| その他（配偶者） | `portfolio.current.spTax` |

「その他」（不動産・暗号資産等を含む）を特定口座に合算する理由：個人側の型（ロック）にはNISA/iDeCo/特定口座の3口座しか存在せず、税制上の性質から「特定口座」が最も一般的な課税口座であるため。この合算方針が実態と合わないとKENZOが判断する場合は、実装前に確認すること。

このマッピングが、資産管理ツール側の実際のカテゴリ体系（`accountCategory`の値の集合、および本人/配偶者の持ち方）と一致しているか、実装前に資産管理ツール側の該当コンポーネント・型定義で確認すること。

法人側と同様、この関数もプロファイルIDを明示的に受け取る形にする（資産管理ツール側の"今アクティブな"プロファイルを暗黙に参照しない）。

### 5.3 インポートの性質（両側共通）

インポートは**その場限りの一括上書き**であり、以後の自動同期は一切行わない（既存の法人側の設計方針を踏襲）。インポート後、資産管理ツール側の保有資産が変化しても、シミュレーター側のPFには反映されない。ユーザーが明示的に再度インポートを実行しない限り、値は独立している。この仕様は「バグ」ではなく意図した設計であることを、UI上の説明文等で明示すること。

---

## 6. 資産クラスの追加：不動産・暗号資産

### 6.1 不動産

`src/lib/profile.ts`の`ASSET_CLASSES`に、日本REITと同じ値で追加する。

```ts
{ key: '不動産', mu: 4.5, sigma: 16.2, group: 'reit_jp' },
```

新規の相関グループは不要（`reit_jp`に相乗り）。

### 6.2 暗号資産

同じく`ASSET_CLASSES`に追加するが、期待リターン・σは意図的に未設定（ダミー値）とする。

```ts
// 暗号資産：期待リターン・σの前提は業界内でも大きく割れており（例：Bitwise社は10年
// CAGR28.3%、VanEck社は25年ベースケース15%〈弱気2%〜強気29%〉を提唱するが、いずれも
// 暗号資産運用会社自身による予測であり中立的な前提とは言えない）、他の資産クラスと
// 同列に既定値を置かない。mu/sigmaは0のダミー値とし、この資産クラスをPFに含めた口座は
// 6.3節のバリデーションにより手動入力への切替を促す。
{ key: '暗号資産', mu: 0, sigma: 0, group: 'crypto' },
```

`ASSET_CORR`に`crypto`グループを新設する。相関係数はBitwise社の過去10年実績ベースの値を暫定採用する（要出典明記）。

```ts
crypto: { stock: 0.3, bond: 0.0, reit_dev: 0.15, reit_jp: 0.15, gold: 0.07, cash: 0.0, crypto: 1.0 },
```

（既存5グループの各行にも`crypto`列を追加すること。値は上記のcryptoの行と対称になるようにする。）

### 6.3 暗号資産使用時の手動入力誘導バリデーション

`src/lib/profile.ts`の`getUnconfiguredAccounts()`に、次のケースを検出対象として追加する：口座（NISA/iDeCo/特定口座、積立期・取崩期）のPF行に`assetClass === '暗号資産'`が含まれているにもかかわらず、その口座が「PF計算値を使う（自動）」のままになっている（該当する`pfManualFlags`がfalse）場合。

検出時のメッセージ例：「暗号資産は既定の期待リターンを設定していません。◯◯（口座名）を手動入力に切り替えて、ご自身の想定利回りを入力してください。」既存の未設定口座警告と同じ経路（MC実行前のバリデーション）で表示する。新しいUI部品は追加せず、既存の「PF計算値を使う/手入力」切替への誘導のみとする。

法人側（`portfolioMath.ts`、`getEffectivePhaseMetrics`等が定義されているファイル）にも、資産クラス一覧・μ/σテーブルが存在するか確認し、存在する場合は同様に「不動産」「暗号資産」の追加と、法人側の`useManualMu`未使用時の誘導警告（法人側に既存の同種チェック機構があればそこに追加、無ければ新設）を行うこと。法人側の資産クラステーブルの実態が、想定と異なる場合（例：`assetManagement/categories.ts`と共有している等）は、実装前に報告すること。

---

## 7. 遵守事項

- ロックファイル（`types.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）への変更は行わないこと
- `profile.ts`は本指示書の範囲（6節：`ASSET_CLASSES`・`ASSET_CORR`への追加、`getUnconfiguredAccounts()`への検出ケース追加）に限り変更を許可する。それ以外のロジック（`calcMu`/`calcPortfolioMetrics`/`profileToSimParams`等の計算式そのもの）は変更しないこと
- `ProfileDrawer.tsx`は一切変更しない
- 1節の変更は、`simulatorStore.ts`の`loadProfile()`/`saveProfile()`への追加処理に限定し、`ProfileDrawer.tsx`から見た既存の挙動（読込・保存・削除等の見た目）を変えないこと
- 既存テスト（`scripts/verify-*.js`、`full-verify.js`）が全てPASSすることを維持する。1〜6節それぞれの新機能・変更に対する検証を追加すること
- 検証は本番相当の実データ環境を使わないこと
- 完了報告には必ず実際のコード抜粋・テスト結果・実機確認結果（スクリーンショット含む）を添付すること（文章のみの報告は不可）

---

## 8. 完了報告フォーマット

- 変更したファイル一覧
- 1節：`companyStateByProfile`のキー管理実装、`loadProfile()`/`saveProfile()`への追加箇所（コード抜粋）、自動連動撤去箇所
- 2節：撤去した保存UI関連コードの一覧、撤去後のCompanyState編集〜保存の実際の流れの説明
- 3節：セレクターの転用箇所（コード抜粋）
- 4節：`CorporatePortfolioRow`の型変更、①現在PFの金額表示UI（コード抜粋）
- 5節：`importFromAssetManagement()`のprofileId引数化、個人側インポート機能の実装（コード抜粋、マッピングルールの実装箇所）
- 6節：`ASSET_CLASSES`・`ASSET_CORR`への追加箇所、バリデーション追加箇所（コード抜粋）、法人側の資産クラステーブルの調査結果と対応内容
- テスト結果（PASS/FAIL件数、全体の集計件数を含む）
- 実機ブラウザでの動作確認：①シミュレーターで複数プロファイル（A・B）を作り、それぞれ異なる法人設定を入力・保存し、A→B→Aと切り替えても互いの法人設定が混ざらないこと、②CompanyStateの編集後、シミュレーター側の通常の保存操作（保存ボタン等）でCompanyStateも一緒に保存されること（専用の保存ボタンが無いこと）、③個人側で資産管理ツールからのインポートを実行し、①現在PFに反映されること、④法人側の①現在PFが金額表示になっていること、⑤「不動産」「暗号資産」が資産クラスの選択肢に表示され、暗号資産をPFに含めた口座で自動計算のままにしていると警告が出ること、の5点は必ず確認しスクリーンショットを添付すること
