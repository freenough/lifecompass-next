# 実装指示：フェーズ2① プロファイル基盤・移行処理・CompanyStateのプロファイル対応

作成日：2026-08-29（改訂：ChatGPTレビューを客観検証の上で反映）
種別：**実装**
関連：`phase2_design_proposal_draft.md`（フェーズ2設計仕様v2）／`investigation_profile_phase2_results.md`（調査結果）
前提：フェーズ1（資産管理ツール個人/法人統合）は本番デプロイ済み。`AssetHolding`/`AssetSnapshot`/`HojinAssetSnapshot`は既に`profileId: string`フィールドを持ち、現状すべて`'default'`固定。

---

## 背景・このタスクの位置づけ

資産管理ツールに、複数の「プロファイル」（本人・別人物いずれも想定、シミュレーター側プロファイルとの連携は任意）を導入する。1プロファイル＝1人物の保有資産・スナップショット履歴・法人設定（CompanyState）をまとめる単位。

設計フェーズでは実装を「①プロファイル基盤＋移行処理」「②CompanyStateのマップ化」「③CSV/JSON対応」「④予実可視化グラフ」の4つに分ける案だったが、①と②は**同じデプロイに含めないと中間状態でアプリが壊れる**（CompanyStateのストレージ形式だけ変わって読み込み側が対応していない、という状態を作らないため）。そのため本指示書では①＋②をまとめて扱う。③（CSV/JSON）と④（予実可視化グラフ）は別の指示書とする。

---

## 1. データモデル

```
AssetManagerProfile {
  id: string              // 下記2節参照。'default'は移行専用の予約ID（後述）
  name: string
  birthDate: string | null   // "YYYY-MM-DD"
  linkedSimulatorProfileId: number | null
}
```

グローバル管理データ（保存先キー名は既存の命名規則に沿って実装側で決めてよいが、既存の`lifeCompassAssetHoldings`/`hojinAssetHoldings`/`hojinCompanyState`とは別の新規キーにすること）：
- `assetManagerProfiles`：`AssetManagerProfile[]`
- `assetManagerCurrentProfileId`：現在選択中のプロファイルを指す明示的ポインタ（新設）
- `assetManagerMigrationVersion`：移行処理のバージョン管理フラグ

---

## 2. ID発行方式

- 新規作成するプロファイルのidは`crypto.randomUUID()`等のUUID方式で発行する
- **`'default'`という文字列は、既存の`profileId: 'default'`データとの互換性を維持するための移行専用の予約IDであり、新規作成では絶対に使用しない**（4節参照）
- シミュレーター側`ProfileDrawer.tsx`の`Date.now()`方式・「同名なら上書き」という挙動には一切合わせない。資産管理ツール側では名前の重複を許容してよい（idで一意性を担保するため）
- シミュレーター側のコード（`ProfileDrawer.tsx`／`src/store/simulatorStore.ts`／`src/lib/storage.ts`）は一切変更しないこと（リンク先idの存在確認のために読み取り参照するのは可）

---

## 3. 移行処理（migration）— 冪等・自己修復方式

**「`assetManagerProfiles`が空なら実行」という単純な条件では不十分。** 例えば「デフォルトプロファイルの作成は成功したが、直後に`currentProfileId`の保存やCompanyStateの変換が完了する前にタブが閉じられた」場合、`assetManagerProfiles`は空でなくなるため、次回起動時に移行処理がスキップされ、不完全な状態のまま残ってしまう。

**要件（必須）**
- `assetManagerMigrationVersion`が目標バージョンに達していない場合、**現在の実際の状態を検査し、不足している処理だけを補完する**方式にする（「まだ何もない状態でだけ1回実行する」のではなく、途中まで実行された状態からでも安全に再実行・復旧できるようにする）
- 具体的には、バージョン未達時に毎回以下を（既に満たされていればスキップしつつ）順に確認・実行する：
  1. `assetManagerProfiles`にデフォルトプロファイル（4節参照）が存在しなければ作成する
  2. `assetManagerCurrentProfileId`が未設定なら、デフォルトプロファイルのidを設定する
  3. `hojinCompanyState`の中身が旧形式（プロファイル対応前の単一設定オブジェクト）であれば、新形式（`{ [profileId]: CompanyStateSettings }`）に変換する。既に新形式であれば何もしない（5節の判定ロジックを使う）
  4. 上記すべてが完了した後、最後に`assetManagerMigrationVersion`を更新する
- **この移行処理を2回連続で実行しても結果が変わらない（冪等である）ことを、そのままテストケースとして書くこと**（例：`migrate(); const s1 = getState(); migrate(); const s2 = getState(); expect(s1).toEqual(s2)`に相当する検証）
- 検証は本番相当の実データ環境を使わないこと（安全なテストデータ・ロジック単体検証で行う）

---

## 4. 'default' ID（移行専用の予約ID）

`AssetHolding`/`AssetSnapshot`は既に`profileId: 'default'`という固定文字列で埋まっている（前回タスクの成果）。この既存データをUUIDへ書き換えるのではなく、**移行で作られる最初の（デフォルト）プロファイルだけ、idを`'default'`という予約文字列にする**。これにより`AssetHolding`/`AssetSnapshot`側のデータを一切書き換えずに済み、既存の`profileId: 'default'`がそのまま「デフォルトプロファイルに属する」ことを意味するようになる。

- **`'default'`は新規プロファイル作成には一切使用しない。** 新規プロファイルは常に`crypto.randomUUID()`で発行する
- この方針で実装を進めてよいが、コードベースと照らして矛盾や違和感がないか（例えば`id`がUUID形式であることを前提にした処理が別にあり衝突する等）実装前に確認すること。成立しない場合は実装を進めず、理由と代替案を添えて先に報告すること

---

## 5. CompanyStateのプロファイル対応

- 現状：`hojinCompanyState`という単一グローバルキー（`src/lib/hojinCompanyState/storage.ts`）に、法人設定オブジェクトがそのまま保存されている
- 変更後：**キー名`hojinCompanyState`は変更せず**、中身を`{ [profileId]: CompanyStateSettings }`というマップ構造に変更する
- **新旧形式の判定は、バージョンフラグだけに頼らず、実際のデータ形状から判定できる仕組みにすること。** 旧形式（`CompanyStateSettings`が直接トップレベルに存在）と新形式（`profileId`をキーとするマップ）はどちらもJavaScriptのobjectであり`typeof`では区別できないため、`CompanyStateSettings`が実際に持つ既知のプロパティ（実コードを見て判断すること）を使った判定関数（例：`isCompanyStateSettings(value)` / `isCompanyStateMap(value)`）を用意する。これは3節の冪等な移行処理が、バージョンフラグと実データの状態がずれていても正しく動作するための安全策
- アクセサ層を新設：`getCompanyState(profileId)` / `saveCompanyState(profileId, state)` / `deleteCompanyState(profileId)`。内部実装（マップ構造であること）はこの層に閉じ込め、呼び出し側がストレージの実装詳細を意識しなくてよい形にする
- 移行時、既存の（マップ化前の）単一設定オブジェクトを、デフォルトプロファイルのid（`'default'`）をキーとしてマップに格納する
- `CompanyStateSettings`を直接読み書きしている既存箇所（`CorporateSettingsSection.tsx`、`companyStateStore.ts`等）を洗い出し、新アクセサ層＋現在選択中プロファイル（`assetManagerCurrentProfileId`）経由で読み書きするよう書き換える
- `companyStateStore.ts`が`useSimulatorStore`を一切参照しないという既存の設計原則（調査2で確認済み）は維持すること。資産管理ツール側のプロファイル切替に追従させるのであって、シミュレーター側プロファイルとの連動ではない

---

## 6. currentProfileIdのリアクティブ管理（重要）

`assetManagerCurrentProfileId`をlocalStorage等へ永続化するだけでは、Reactアプリ上で保有資産一覧・スナップショット履歴・グラフ・CompanyState表示等が自動的に再レンダリングされるとは限らない。

- `assetManagerCurrentProfileId`（および`assetManagerProfiles`）は、永続化と同時に、**React UIから購読可能なリアクティブな状態**として管理すること（専用のstore、または既存の`companyStateStore.ts`と同系統の作り方でよい）
- **`useSimulatorStore`には依存しないこと**（シミュレーター側との完全分離を維持する既存原則の延長）
- プロファイル切替時には、保有資産一覧・スナップショット履歴・資産推移グラフ・CompanyState・プロファイル表示など、プロファイルに依存する全てのUIが即座に切り替わることを実機で確認すること

---

## 7. 既存表示のプロファイルフィルタ対応

- 資産管理ツールの保有資産一覧・スナップショット履歴・資産推移グラフ等、既存の表示コンポーネントを、現在選択中プロファイル（`assetManagerCurrentProfileId`、6節のリアクティブな状態経由で購読）でフィルタするように変更する（`AssetHolding`/`AssetSnapshot`は既に`profileId`を持っているので、フィルタ条件を追加するだけでよいはず）
- 個人・法人（「法人資産を含める」トグル）双方に同様の対応を行うこと

---

## 8. プロファイル管理UI（新規・最小限）

- **一覧表示**：現在存在するプロファイルの一覧と、現在選択中のプロファイルが分かる表示
- **作成**：名前（必須）・生年月日（任意）・リンク先シミュレータープロファイル（任意、`lifeCompassProfiles`から選択するドロップダウン等）を入力して新規作成
- **切替**：一覧から選んで`assetManagerCurrentProfileId`を更新（6節のリアクティブなstore経由）
- **削除**：選択したプロファイルとそれに属する保有資産・スナップショット・CompanyStateをカスケード削除する。**リンク先のシミュレータープロファイル自体は絶対に削除しない**（参照であり所有関係ではないため）。「取り消せない」旨を明記した確認ダイアログを設けること（既存の`AssetResetControls.tsx`の確認ダイアログパターンを踏襲）。削除対象が`assetManagerCurrentProfileId`と一致する場合、**削除後は残存プロファイル配列の先頭（`remainingProfiles[0]`）を新しいcurrentProfileIdとする**（プロファイルが0件にならないようにする。0件になる操作自体を禁止してもよい）
- **リンク切れ表示**：`linkedSimulatorProfileId`が設定されているが`lifeCompassProfiles`内に該当idが存在しない場合、エラーにはせず「リンク切れ」の状態としてUI表示する。**この場合でも`linkedSimulatorProfileId`の値自体を自動でnullにしないこと**（何にリンクしていたかの情報を失わないため）。nullにするのは、ユーザーが明示的に行う「リンク解除」操作のときのみとする（本タスクで「リンク解除」ボタン／操作を新設すること）
- 見た目は既存のUIパターン（`ProfileDrawer`、`AssetResetControls`等）との一貫性を意識すること。細部のレイアウト判断は実装側の裁量でよい

---

## 9. 今回やらないこと（次の指示書へ）

- CSV/JSONへの「プロファイルID」列・プロファイル単位対応
- シミュレーター側予測値との予実可視化グラフ（`PortfolioPanel`関連）
- シミュレーター側`curAge`との自動整合チェック（フェーズ2で見送り済み）
- 全データリセット機能のプロファイルスコープ選択（現在のプロファイルのみ／全プロファイル）の追加
- **新規プロファイル作成時の生年月日サジェスト機能（今回は完全にスコープ外。「余裕があれば」の対応も含めて実装しないこと）**

---

## 10. 遵守事項

- ロックファイル（`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）への依存・変更は一切ゼロを維持すること
- シミュレーター側`ProfileDrawer.tsx`／`simulatorStore.ts`／`storage.ts`（`lifeCompassProfiles`関連）は変更しない
- 既存テスト（`scripts/verify-*.js`、`full-verify.js`）が全てPASSすることを維持する。新機能に対する検証はこのパターンで追加すること（3節の冪等性テストを必ず含める）
- 検証は本番相当の実データ環境を使わない
- 完了報告には必ず実際のコード抜粋・テスト結果・実機確認結果を添付すること（推測や文章のみの報告は不可）

---

## 11. 完了報告フォーマット

- 変更・新規作成したファイル一覧
- `AssetManagerProfile`型定義、移行処理（3節の冪等な自己修復ロジック）、CompanyStateの新旧判定ロジック、アクセサ層、6節のリアクティブなプロファイルstore、それぞれの該当コード抜粋
- 4節の`'default'` id方針について、採用した実装（またはこの方針が成立しなかった場合はその理由と代替案）
- 移行処理の冪等性テスト結果（2回連続実行で結果が変わらないことの確認）を含む、テスト結果全体（PASS/FAIL件数）
- 実機ブラウザでの動作確認：プロファイル作成→切替→削除のひと通りのフロー（切替時に一覧・グラフ等が即座に更新されること含む）、CompanyStateがプロファイルごとに独立して保持されること、リンク切れ表示とリンク解除操作、の3点は必ず確認しスクリーンショット等を添付すること
