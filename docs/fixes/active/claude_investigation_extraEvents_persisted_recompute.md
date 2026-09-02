# 調査依頼：法人取崩extraEventsの永続化データからの再計算 前提調査

作成日：2026-09-02
種別：**調査のみ（実装は行わない）**
関連：`claude_instruction_extraEvents_toggle_implementation.md`（前回実装、`useSimulatorStore`のライブ値に依存していたためページ跨ぎで機能しない不具合が判明）

---

## 0. 前提（判明した問題）

前回実装した`extraEvents`トグルは、`useSimulatorStore.getState().extraEvents`（ライブstateのみ、ページ間で永続化されない）に依存していた。資産管理ページ（`PlanManagerPanel.tsx`）でメインシミュレーターページの計算結果を参照する構成になっており、別ページから遷移してくると値が空になる。

`generatePlan()`が`simulatorProfile`を`loadSimulatorProfiles()`（永続化データ）から読んでいるのと同じパターンで、法人取崩の効果も**永続化データから都度再計算する**方式に変更する。そのために以下を確認してほしい。

---

## 1. 調査してほしいこと

### 1.1 `companyStateByProfile`の永続化構造

- 法人設定（`settings`）がどのキー・どの構造でlocalStorageに永続化されているか（`src/lib/hojinCompanyState/companyStateStore.ts`を確認）
- `simulatorProfileId`または`profileId`のどちらで紐づいているか
- 永続化データを読み出すための、`loadSimulatorProfiles()`に相当する既存の読み出し関数があるか（無ければ「無い」と報告するだけでよい）
- `settings.includeInPersonalSimulator`（トグルのON/OFF）自体もこの永続化データに含まれているか。含まれていない場合、ON/OFF状態はどこにも永続化されておらず、ページ跨ぎでは常に不明（デフォルト値頼み）になる可能性がある。実際の挙動を確認する

### 1.2 `simulateCorporateAssets()`と`buildCorporateGeneratedEventsFromSnaps()`の引数

- 両関数の実際のシグネチャ（引数名・型・戻り値の型）を、定義元のファイルから引用する
- `CorporateSettingsSection.tsx`のuseEffect内で渡されている`portfolio`・`events`・`profile`が、それぞれどこから来ている値か（ライブstoreか、`ProfileV3`のプロパティか）を確認する。特に、`generatePlan()`が既に受け取っている`rawProfile: ProfileV3`のプロパティだけで代用できるか（`curAge`・`lifeEx`・`portfolio`・`events`に相当するフィールドが`ProfileV3`にあるか）を確認する
- `effectiveTaxRate`がどこから来ているか（storeか、settings内の固定値か、デフォルト値か）を確認する

### 1.3 再計算のコスト

- `simulateCorporateAssets()`の処理コスト（Monte Carloのような重い計算か、軽い決定的計算か）を、実装を読んで判断する。「計画を保存」ボタン押下のたびに同期的に再計算しても実用上問題ないレベルかどうかを報告する

---

## 2. 報告フォーマット

- ファイルパス・関数名・関連コードを引用
- 1.1〜1.3それぞれについて確認できた事実を明記
- 特に「`includeInPersonalSimulator`が永続化されているか否か」は設計に直結するため、必ず実コードで確認して明言すること。不明瞭な場合は推測で埋めず、その旨を報告する

## 3. やらないこと

- コードの変更（前回実装の巻き戻しも含め、今回は一切行わない）
- 新しい再計算ロジックの実装

以上は、本調査結果をもとにこのチャットで設計を確定させたうえで、別途の実装指示書で依頼する。
