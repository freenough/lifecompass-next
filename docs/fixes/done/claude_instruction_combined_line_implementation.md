# 実装指示：予実比較への「合算（法人含む）」線の追加

作成日：2026-09-03
種別：**実装指示**
関連：
- `claude_instruction_extraEvents_toggle_implementation_v2.md`（法人取崩トグル、実装済み）
- `claude_investigation_combined_line_prereq.md`（合算計算の前提調査）
- `claude_investigation_double_counting_check.md`（二重計上なしを確認済み）

---

## 0. この指示書で実現すること

予実比較グラフに、既存の資産管理ページ上部の「表示：個人のみ／合算」トグルと連動する形で、法人残高を含めた「合算」線（計画・実績それぞれ）を追加する。合わせて、保存済み計画一覧に「法人取崩を織り込んだ計画かどうか」のバッジと、比較グラフ上に「この計画がいつ作られたか」の表示も追加する。

**確定済みの前提（再掲）**：
- 個人化想定比率（`personalizationRatio`）は使わない。法人残高はそのまま100%加算する
- MCモードの合算線は中央値のみ（P10〜P90帯は作らない）。既存のシミュレーター画面の実装と同じ簡略化
- 二重計上は起きない（`corporateSnaps[i].total`は取崩差引後の値、`buildCorporateGeneratedEventsFromSnaps()`は差分額のみを個人側に変換しているため）
- ただし「法人取崩を織り込む」チェックOFFで保存された計画には、法人取崩の予測系列が存在しない。この場合、合算表示は提供できない

---

## 1. `PlanSnapshot`型の拡張（後方互換を必ず維持すること）

`src/lib/planSnapshot/types.ts`

- 以下2つの**任意（optional）フィールド**を追加する：
  - `includesHojinDrawdown?: boolean`：保存時に「法人取崩を織り込む」チェックがONだったかどうか
  - `corporateSnaps?: CorporateYearSnap[]`：保存時点で計算された法人残高の年次系列（`src/lib/hojinCompanyState/corporateGrowth.ts`の`CorporateYearSnap`型をそのまま再利用）。チェックOFFで保存された計画にはこのフィールド自体を含めない（`undefined`のまま）
- **重要**：これらは既存の`PlanSnapshot`に対する追加専用の変更とし、既存フィールドの型・意味は一切変更しない。**過去に保存済みの計画（これら新フィールドを持たないデータ）を読み込んでもエラーにならないこと**を必ず確認すること。読み込み側は`includesHojinDrawdown`が`undefined`または`false`の場合、「合算非対応の計画」として扱う

## 2. `generatePlan()`の拡張

`src/lib/planSnapshot/generatePlan.ts`

- `opts`に以下を追加：
  - `includesHojinDrawdown?: boolean`
  - `corporateSnaps?: CorporateYearSnap[]`
- これらは計算には使わず（計算自体は既存の`opts.extraEvents`のマージロジックのまま）、**そのまま戻り値の`PlanSnapshot`にコピーして保存するだけ**でよい
- `generatePlan()`自身は引き続き`useSimulatorStore`・`useCompanyStateStore`を一切importしない

## 3. `PlanManagerPanel.tsx`の変更

- 前回実装済みの`extraEvents`計算ロジック（`getCompanyStateForProfile()` → `simulateCorporateAssets()` → `buildCorporateGeneratedEventsFromSnaps()`）はそのまま維持する
- `simulateCorporateAssets()`の戻り値（`corporateSnaps`、既に計算済みでこれまで捨てていたもの）を、チェックがONの場合に限り`generatePlan()`の`opts`に`corporateSnaps`としてそのまま渡す。あわせて`includesHojinDrawdown: checked`（チェックボックスの状態）も渡す
- チェックOFFの場合は、`includesHojinDrawdown: false`のみ渡し、`corporateSnaps`は渡さない（`undefined`のまま）

## 4. 保存済み計画一覧の表示

同じく`PlanManagerPanel.tsx`（計画一覧部分）

- 各計画に、`includesHojinDrawdown`に応じたバッジを追加する：「法人取崩込み」／「個人のみ」
- 戦略名の表示を、内部識別子（`proportional`等）ではなく日本語ラベルに変更する。`src/components/simulator/AssetChart.tsx`の`STRATEGY_LABELS`をimportして使うこと（新しいマッピングを作らない）

## 5. `PlanComparisonSection.tsx`の変更

### 5.1 新規props

- `displayScope: AssetDisplayScope`（`AssetManagementPage.tsx`が既に持っている`displayScope`をそのまま渡す。新しいUI要素は作らない）
- `hojinSnapshots: HojinAssetSnapshot[]`（法人の実績データ、合算実績の計算に使う）

`AssetManagementPage.tsx`側で、`PlanComparisonSection`をレンダリングしている箇所（既存の`displayScope`が計算済みの関数スコープ内）に、上記2つのpropを追加で渡すこと。

### 5.2 合算線の描画ロジック

`displayScope === 'combined'`のとき、かつ選択中の計画が`includesHojinDrawdown === true`かつ`corporateSnaps`を持つときのみ、以下を**既存の個人計画・個人実績の線に加えて**追加描画する：

- **合算計画（点線）**：個人の計画カーブ（固定モードなら`curve`、MCモードなら`percentiles.p50`）の各年齢に、対応する`corporateSnaps`の同じ年齢の`total`を加算した値。個人の色より薄い／別の色調にする（凡例で区別できること）
- **合算実績（実線＋小マーカー）**：`personalSnapshots`と`hojinSnapshots`を、直近の法人トグルバグ修正で作った`getMergedRecordDates()`と同じ考え方（日付の和集合、片方が無い月は0円扱いまたは対応する側のみの値）で合成した、個人合計＋法人合計の時系列

`displayScope === 'combined'`だが選択中の計画が`includesHojinDrawdown !== true`（チェックOFFで保存された計画、または新フィールドを持たない過去の計画）の場合：

- 合算線は描画しない（個人のみの2本のまま）
- グラフ上またはその付近に、「この計画には法人取崩が含まれていません」という一言を表示する

`displayScope === 'personalOnly'`のときは、これまで通り個人の2本のみ（合算線は一切描画しない）。

### 5.3 MCモードでの合算

- 合算計画線は、固定モード・MCモードどちらでも中央値相当の1本の点線のみ（P10〜P90の帯は作らない、既存のシミュレーター画面の実装と同じ簡略化）
- MCモードの個人側P10-P90帯（既存のArea）は、合算表示の有無に関わらずこれまで通り描画する（変更しない）

### 5.4 凡例

- `renderDashAwareLegend()`に、合算線が描画されている場合のみ「合算計画」「合算実績」の2項目を追加する

### 5.5 計画の作成日表示

- 選択中の計画の作成日時を、グラフの近く（ヘッダー行など）に表示する。既存の保存済み計画一覧に既にある日時表示（例：「2026-09時点」）と同じ形式でよい。新しい日時フォーマットを発明しない

## 6. 変更しないもの

- 個人単体の計画・実績の計算ロジック・線のスタイル（案A）は一切変更しない
- `simulate.ts`・`simulatorStore.ts`（locked files）は変更しない
- `useCompanyStateStore`・`companyStateStore.ts`・`storageByProfile.ts`・`corporateGrowth.ts`・`buildCombinedSimulationInput.ts`の実装は変更しない（読み出すだけ）
- `個人化想定比率`（`personalizationRatio`）は合算計算に一切関与させない

---

## 7. 検証すべきケース

実機で確認し、スクリーンショットを添付すること（テキストでの報告のみは不可）。

1. 「法人取崩を織り込む」チェックONで新しく計画を保存し、保存済み計画一覧に「法人取崩込み」バッジが表示されること。戦略名が日本語（比例取崩／現金優先／課税優先）で表示されること
2. 上記の計画を選択し、資産管理ページ上部の表示を「合算」に切り替えると、個人の計画・実績に加えて「合算計画」「合算実績」の線が追加で表示されること。「個人のみ」に戻すと合算線が消え、元の2本に戻ること
3. 上記2の状態で、合算計画線の値が「個人計画の値＋その年齢の法人残高」と一致すること（電卓で数点検算する）
4. チェックOFFで保存した計画（またはフィールド追加前の古い計画があれば、それ）を選択した状態で「合算」に切り替えても、エラーにならず「この計画には法人取崩が含まれていません」等の案内が出て、個人のみの2本のままであること
5. MCモードに切り替えた状態で合算を表示し、合算計画線が中央値の1本のみ（帯が無い）であること。個人側のP10-P90帯は従来通り表示されていること
6. 選択中の計画の作成日時がグラフ付近に表示されていること
7. **回帰確認**：既存の個人のみ・法人トグルOFF時の予実比較表示が、これまでと変わらないこと

## 8. 完了報告のフォーマット

- 修正したファイルパス・関数名を明記
- `full-verify.js`のPASS結果
- `tsc`のクリーン結果
- locked filesを変更していないことの確認
- 既存の保存済み計画（新フィールドを持たないもの）を読み込んでもエラーが出ないことの確認方法・結果
- 上記7の検証ケース1〜7それぞれについて、実機スクリーンショットを添付
- コミット・プッシュは行わず、承認を待つこと
