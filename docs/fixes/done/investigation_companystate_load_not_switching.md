# 調査指示：プロファイル読込時に法人PF(CompanyState)が切り替わらない不具合

作成日：2026-09-04
種別：**調査のみ（実装は行わない）**
関連：`instruction_phase2_companystate_rearchitecture.md`（2026-08-30、CompanyStateをシミュレータープロファイル単位で保存する設計に変更した指示書。**本調査はこの実装が正しく機能しているかを検証するもの**）／`NEXT_CHAT_PROMPT_phase2_yojitsu.md`（再設計完了の引き継ぎ）／`NEXT_CHAT_PROMPT_phase2_yojitsu_v2_completed.md`（今回の不具合報告の起点となった、V2完了時点の未着手バックログ項目(2)）

---

## 0. 背景・症状

KENZOから、以下の症状が報告された：

- シミュレーター側で複数プロファイル（個人＋法人設定を含む）を使い分けている
- 前回入力した値（法人PF・法人設定など）が画面にそのまま残っているように見える
- しかし、プロファイル一覧から別のプロファイルを「読込」した際、法人資産PF（CorporatePortfolioPanel、①現在PF等）の値が、そのプロファイルとして保存されていたはずの断面の値に切り替わっていない
- 結果として、KENZOの体感としては「プロファイルを呼び出しても法人設定が保持されておらず、毎回入力し直すことになる」

`instruction_phase2_companystate_rearchitecture.md`の設計では、`simulatorStore.ts`の`loadProfile()`が、読み込んだプロファイルIDをキーに`companyStateByProfile`からCompanyStateを取り出し、`companyStateStore`のstateを丸ごと差し替えることになっている。設計通りに実装・結線されていれば起こらないはずの症状であり、**設計との乖離（実装ミス・結線漏れ・タイミング問題等）を特定することが本調査の目的**。

**今回のスコープは調査のみ。原因を特定し、次のいずれかに該当するかを判定した上で報告すること。実装（修正）は行わない：**
- (a) `loadProfile()`内のCompanyState読込ロジック自体に不具合がある
- (b) `loadProfile()`は正しく`companyStateStore`のstateを更新しているが、`CorporatePortfolioPanel.tsx`等のUIコンポーネント側がその更新を正しく購読・再描画していない（stale closure、ローカルstateとの二重管理等）
- (c) 初回ページロード時（`loadInitialProfile()`、配列末尾を暗黙的に読み込む経路）と、ユーザーが明示的に「読込」ボタンを押す経路（`loadProfile()`）とで処理が分岐しており、初回ロード時は`currentProfileId`が正しく設定されない／CompanyStateの読込が行われない
- (d) 保存側（`saveProfile()`）で、その時点の`companyStateStore`の値が正しく`companyStateByProfile`に書き込まれていない（保存自体が空または古い値になっている）
- (e) 上記いずれでもない、別の原因

---

## 1. 調査項目

### 1.1 `loadProfile()`の実装確認

- `src/store/simulatorStore.ts`の`loadProfile()`を確認し、`instruction_phase2_companystate_rearchitecture.md`の指示通り、読込プロファイルIDをキーに`companyStateByProfile`からCompanyStateを取得し、`companyStateStore`のstateを差し替える処理が**実際に存在するか**を確認する
- 存在する場合、その処理が確実に実行される順序・タイミングになっているか（例：プロファイル読込処理の途中で早期returnしている、非同期処理の待ち合わせ漏れ等がないか）を確認する

### 1.2 `loadInitialProfile()`（初回ページロード経路）の確認

- `loadInitialProfile()`（配列の最後の要素を暗黙的に読み込む、現状の初期化ロジック）が、`loadProfile()`と同じCompanyState読込処理を通っているか、それとも別経路で個人側プロファイルのみ読み込んでいるかを確認する
- 別経路であれば、それが今回の症状（特にブラウザ再訪問時に法人設定が反映されない）の原因である可能性が高いため、その旨を明記する

### 1.3 `companyStateStore`の購読側（UIコンポーネント）の確認

- `CorporatePortfolioPanel.tsx`・`CorporateSettingsSection.tsx`等、CompanyStateを表示・編集するコンポーネントが、`companyStateStore`の変更を正しく購読しているか（Zustandのselector経由で最新値を取得しているか、マウント時の初期値をuseStateにコピーしたまま更新を反映していない、といった実装になっていないか）を確認する
- 特に、`useState`の初期化関数にstore値を直接渡しているだけで、store側が後から変わってもコンポーネントの表示が追従しない、というパターン（本プロジェクトで過去に類似のハイドレーションバグが複数回発生している）がないか重点的に確認する

### 1.4 `saveProfile()`の実装確認

- `saveProfile()`が、保存時点の`companyStateStore`の現在値を正しく取得し、`companyStateByProfile`へ書き込んでいるかを確認する
- 特に、保存操作のタイミングで`companyStateStore`から値を読み取るコードが、古い（stale）参照を使っていないか確認する

### 1.5 再現テストの実施

- 実データ環境を使わないテスト用データで、以下を再現できるか確認する：
  1. プロファイルAを作成し、法人PFに固有の値を入力して保存
  2. プロファイルBを作成し、法人PFに別の固有の値を入力して保存
  3. プロファイルAを「読込」→法人PFの表示がAの保存値になっているか確認
  4. プロファイルBを「読込」→法人PFの表示がBの保存値になっているか確認
  5. ブラウザをリロード（初回ロード経路）した場合に、直前にアクティブだったプロファイルの法人PFが正しく表示されるか確認
- 上記5パターンそれぞれで、期待通りか・症状が再現するかを報告する

---

## 2. 遵守事項

- **今回は調査のみ。修正の実装は行わないこと。** 原因箇所を特定し、修正方針の選択肢があれば提示した上で、実装は次の指示を待つこと
- ロックファイル（`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）は調査のため参照するのみで変更しないこと
- 検証は本番相当の実データ環境を使わないこと。テスト用に作成したプロファイル・localStorageデータは、調査終了後に削除すること
- 推測ではなく、実際のコード抜粋・実機（またはローカル検証環境）での再現結果に基づいて報告すること

---

## 3. 報告フォーマット

- 0節(a)〜(e)のどれに該当するか（複数該当する場合はすべて）
- 該当箇所の実コード抜粋
- 1.5節の再現テスト5パターンそれぞれの結果（期待通りか、症状が再現したか）
- 原因が特定できた場合、修正方針の選択肢（複数あれば）とそれぞれの影響範囲・リスクの簡単な説明（実装はしない）
- 原因が特定できなかった場合、切り分けのために追加で必要な情報・調査手段
