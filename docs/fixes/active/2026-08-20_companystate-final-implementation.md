# 実装指示書：CompanyState 最終版（個人シミュレーター統合・法人MC対応）

作成日：2026-08-20

**この指示書は、既存実装（`2026-08-20_companystate-implementation.md`で作成済みの`src/lib/hojinCompanyState/`・`src/components/hojinCompanyState/`・`/hitori-hojin/simulate`ページ）を踏まえた、設計変更・追加実装の指示書である。ゼロから作るのではなく、既存ファイルを拡張・一部作り直しする。**

---

## 1. 今回の変更の全体像

前回実装からの主な変更点：

1. CompanyStateの独立ページ（`/hitori-hojin/simulate`、試算結果欄含む）を廃止し、個人シミュレーター本体（`/app`）の左側「個人設定欄」に統合する
2. 法人資産を「投資分（μ・σで成長）」と「現金分（成長なし）」に分離する（`cashBalance`新設）
3. 「①現在PF」の初期値を、資産管理ツール（`hojinAssetManagement`）の法人保有資産からインポートできるようにする
4. 法人資産にもモンテカルロ変動を実装する。個人・法人で同じ年次市場ショックZスコアを共有し、それぞれの資産クラス構成から算出したσでスケールする
5. 個人シミュレーターのメイングラフ・年次表・KPIカードに、法人資産（合算後）を表示レイヤーとして追加する

---

## 2. 絶対に守ること（ロックファイル制約、変更なし）

`simulate.ts` / `analyze.ts` / `types.ts` / `profile.ts` / `PortfolioPanel.tsx` / `simulatorStore.ts` / `blog.ts` / `blogTopics.ts` / `concerns.ts` は変更しないこと。ただし以下は明示的に許可する：

| ファイル | 扱い |
|---|---|
| `simulate.ts` | **import**して呼び出す（変更しない） |
| `types.ts` | **型定義の読み取り・import（型としての利用）のみ許可**。ファイル自体への追記・変更は禁止 |
| `simulatorStore.ts` | **唯一の例外**：`extraEvents: LifeEvent[]`（デフォルト空配列）というstateと、`setExtraEvents(events)`というsetterのみ新規追加してよい。`runAll()`内で`profile.events`と`extraEvents`をマージしてから`simulate()`/`analyze()`に渡すよう変更してよい。**それ以外の変更は一切不可**（`runMonteCarlo()`には触れない。理由は4.3参照） |
| `PortfolioPanel.tsx` | 一切変更しない |

`montecarlo.ts`はロック対象ファイル一覧に含まれていないが、**今回も変更しないこと**。法人MCは新規の独立したロジックとして`hojinCompanyState`配下に実装し、`montecarlo.ts`には触れない（4.3参照）。

---

## 3. 既存ファイルの変更内容

### 3.1 `src/lib/hojinCompanyState/types.ts`

- `CompanyStateSettings`を以下のように変更：
  - `initialBalance`を`investedBalance`にリネーム（意味を明確化：投資に回っている資産のみ）
  - `cashBalance: number`（法人保有現金、デフォルト0）を新規追加
  - `retirementAge`（前回実装済み）はそのまま維持
  - `includeInPersonalSimulator: boolean`（「法人資産を含める」トグルの状態、デフォルトfalse）を新規追加。このトグル状態はここ（`companyStateStore`側）で保持する
- `CorporatePortfolioPhase`はそのまま（`rows: {assetClass, pct}[]`）。金額は`CompanyStateSettings.investedBalance`側で一元管理し、`rows`はあくまで％配分のみを保持する設計を維持

### 3.2 `src/lib/hojinCompanyState/corporateGrowth.ts`

年次成長計算を以下のロジックに変更：

```
各年の処理順序：
1. investedBalance = investedBalance × (1 + μ + Z×σ)
   ※ retirementAge未満は「②積立期PF」のμ・σ、以降は「③取崩期PF」のμ・σを使用
   　（個人側のrW/rRと同じ考え方。retirementAgeはCompanyStateSettingsの値を使用し、
   　  useSimulatorStoreのretAgeは一切参照しないこと）
   ※ Zは固定計算モードでは0、MCモードでは4.3で生成する値を使用
2. cashBalance += その年の事業利益（タイムラインイベント kind: 'business_profit'の合計）
3. cashBalance -= その年の取崩額（タイムラインイベント kind: 'withdrawal'の合計）
   cashBalanceが不足する場合、不足分はinvestedBalanceから取り崩す（現金優先）
   investedBalanceも不足する場合は0円を下限とし、それ以上は取り崩さない
   （エラーは出さない、静かに0円で打ち止め）
```

- μ・σの算出は`portfolioMath.ts`（既存、複製済みロジック）をそのまま使用
- 実効税率変換（取崩額×(1-実効税率)を個人側へ渡す部分）は`buildCombinedSimulationInput.ts`の役割のまま変更なし

### 3.3 `src/lib/hojinCompanyState/storage.ts` / `companyStateStore.ts`

- 3.1の型変更に合わせて永続化・ストアのフィールドを更新
- `initialBalance`から`investedBalance`への移行時、既存localStorageデータとの後方互換は不要（Stage A実装からまだ日が浅く、実データはKENZO自身のテスト入力のみのため、マイグレーション処理は書かなくてよい）

### 3.4 `src/components/hojinCompanyState/CorporatePortfolioPanel.tsx`

- 「①現在PF」セクション内に以下を追加：
  - `investedBalance`（投資分）と`cashBalance`（現金分）を分けて入力する欄
  - 「資産管理ツールからインポート」ボタン（3.6で仕様を定義）
- σ入力欄を**表示する**（前回検討では非表示案もあったが、法人MC実装に伴い表示する）
- 資産クラス一覧は`hojinAssetManagement`の既存定義をそのまま使用（変更なし、前回確定通り）

### 3.5 `src/lib/hojinCompanyState/buildCombinedSimulationInput.ts`

- 変更なし（取崩額を税引き後の`other_inc`イベントとして組み立て、`profile.events`とマージする関数）。ただし呼び出され方が変わる（3.7参照）ため、呼び出し元の変更に合わせてインターフェースを調整してよい

### 3.6 新規：`src/lib/hojinCompanyState/importFromAssetManagement.ts`

資産管理ツール（`hojinAssetManagement`）の法人保有資産データを、CompanyStateの「①現在PF」に変換するワンショットの関数。

```
変換ルール：
- 法人証券口座 ＋ その他法人資産（不動産等） → 資産クラス％配分に変換し、
  CorporatePortfolio.current.rowsにセット。合計額はinvestedBalanceにセット
- 法人預金 ＋ 保険積立金 ＋ 貸付金・仮払金 → 合計してcashBalanceにセット
```

- 資産管理ツールの既存Export/Import基盤（同一オリジン内のlocalStorage直接読み取り、ファイル選択なし）と同じ方式で実装する
- ボタン押下時に一括上書きするワンタイム処理とし、自動同期は行わない（Phase1資産管理ツールの「個人データをインポート」と同じ思想）

### 3.7 新規：`src/lib/hojinCompanyState/mc.ts`（法人MC・合算MC）

固定計算とMC計算を統合的に扱う、CompanyStateの計算エントリーポイント。

```
概要（実装時に正確な型・シグネチャを詰めること）：

runCombinedSimulation(p: SimParams, evs: LifeEvent[], strategy, corporateSettings, corporatePortfolio, corporateEvents, mode: 'fixed' | 'mc'):

固定計算モード（mode: 'fixed'）：
  1. corporateGrowth.ts（Z=0固定）で法人資産の年次残高を算出
  2. buildCombinedSimulationInput()で税引き後取崩をother_incイベント化、profile.eventsとマージ
  3. simulate(p, mergedEvents, strategy) → analyze() を1回実行
  4. 個人側の年次資産（snaps）＋法人側の年次資産（corporateGrowthの出力）を、
     表示用に両方返す

MCモード（mode: 'mc'）：
  1. N=1000回分、シミュレーション対象年数ぶんのZスコア行列を生成
     （src/lib/helpers.tsのrandNorm(0, 1)をimportして使用。独自の乱数実装はしないこと）
  2. 各試行tについて：
     - simulate(p, mergedEvents, strategy, zMatrix[t]) を実行（個人側、
       zMatrix[t]の配列長は p.lifeEx - p.curAge + 1 と厳密に一致させること。
       調査で判明した通り、長さが合わないと結果がNaNで静かに壊れるため、
       生成時に必ず正しい長さで作ること）
     - corporateGrowth.tsの計算をzMatrix[t]を使って実行（法人側、同じZ値を使用）
     - 個人側最終資産＋法人側最終資産を合算した値を記録
  3. 1000試行の合算値から、p10/p50/p90等のパーセンタイルを算出する
     （小さな独自関数を新規に書く。montecarlo.tsのpct()相当のロジックは
     わずか数行のため複製で問題ない。montecarlo.ts自体はimportしない）
  4. 個人側単独の結果（simulatorStore.mcResult相当）と、合算後の結果の両方を返す
```

- **重要**：`simulatorStore.ts`の`runMonteCarlo()`には一切触れない。合算MCの結果は`companyStateStore`側で保持し、表示コンポーネント側で「トグルONなら合算結果、OFFなら`simulatorStore.mcResult`」を切り替えて表示する（3.8参照）

### 3.8 表示コンポーネントの拡張（`AssetChart.tsx` / `YearlyTable.tsx` / `KpiGrid.tsx`、いずれも非ロック）

- 3つのコンポーネントに、法人資産の年次残高（固定計算時）または合算MC結果（MC時）を受け取れる、新しいoptionalなpropsを追加する
- `includeInPersonalSimulator`トグルがONの場合のみ、これらのpropsが渡され、表示に反映される（法人資産の系列をグラフに追加、年次表に列追加、KPIカードに合算値を追加）
- OFFの場合は今まで通り、個人分のみの表示のまま変更がないこと
- 具体的な表示デザイン（グラフの重ね方、KPIカードの追加位置等）は実装時にVisualizerでモックアップ確認済みの内容に従うか、既存デザインと一貫性のある形で判断してよい（過度に凝った可視化は不要、まずは正しい数値が出ることを優先する）

### 3.9 `SimulatorForm.tsx`（非ロック）への統合

- 既存の4大セクション（ライフプラン／家計／資産／運用方針・リスク）と同じ`Section`コンポーネントを使い、新しいセクション「法人資産（一人法人）」を最後に追加する
- セクション冒頭に「法人資産を含める」トグルを配置。ONにすると、法人設定の入力欄（事業タイムライン・法人ポートフォリオ・実効税率・資産管理ツールからのインポートボタン）が展開表示される
- `CorporateEventTimeline.tsx`・`CorporatePortfolioPanel.tsx`（既存、非ロック）をこの新セクション内に組み込む形で再利用する
- トグルの状態・変更は`companyStateStore`から読み書きする（`simulatorStore`には一切依存しない）
- トグルON時、またはON状態で法人側の入力値が変更された時、以下を実行する（明示的な呼び出しであり、Zustandの`subscribe`によるストア間の自動連携は使わないこと。あくまで、この新セクションのコンポーネント内のロジックとして行う）：
  1. `buildCombinedSimulationInput()`で法人取崩イベントを算出
  2. `simulatorStore.getState().setExtraEvents(生成したイベント配列)`を呼ぶ
  3. トグルOFFにした瞬間は、即座に`setExtraEvents([])`を呼び、個人分のみの試算に戻す
- MCの実行（法人トグルON時）は、既存の「モンテカルロ実行」ボタン押下時に、通常の`simulatorStore.runMonteCarlo()`ではなく、3.7の`runCombinedSimulation(..., mode: 'mc')`を呼ぶよう分岐させる。この分岐ロジックも、`SimulatorForm.tsx`または新セクションコンポーネント側に置く（`simulatorStore.ts`は変更しない）

### 3.10 `/hitori-hojin/simulate`ページの扱い

- 既存の`CompanyStateSimulatorPage.tsx`（旧・試算結果欄を含む独立ページのコンテンツ）は削除する
- `src/app/hitori-hojin/simulate/page.tsx`は、`/app`へのリダイレクトページに置き換える（外部からのリンクはまだ存在しない認識だが、念のため404にはせずリダイレクトとする）

---

## 4. 検証要件

- `full-verify.js` 全件PASS（既存のCompanyStateセクションのテストケースを、今回の変更内容に合わせて更新すること。特に3.7の合算MCロジックについて、新しいテストケースを追加すること）
- `tsc --noEmit` クリーン
- `npm run build` 成功
- 第2章のロックファイルの差分：`simulatorStore.ts`は「`extraEvents`state・setter追加、`runAll()`内の1行変更」以外に差分がないことを確認し、`git diff`の該当箇所を完了報告に添付すること。それ以外のロックファイル（`simulate.ts`/`analyze.ts`/`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）は差分ゼロを確認すること
- `montecarlo.ts`の差分がゼロであることも確認すること
- 手動シナリオ確認（固定計算・MCの両方）：
  1. 固定計算：法人取崩200万円/年・実効税率25%（前回確認済みのシナリオ）が、統合後も同じ結果になることを再確認
  2. MC：法人トグルON時とOFF時で、個人分単独の分布（NISA/iDeCo/特定口座のみ）の統計的性質（p10/p50/p90のオーダー感）が大きく変わっていないこと（法人を混ぜても個人単独の計算ロジック自体は変化していないことの確認）を目視で確認し、報告する
  3. `zMatrix`の配列長が意図通り生成されていること（調査で判明したNaN汚染リスクへの対策が機能していること）をテストケースとして追加し、結果を報告する

---

## 5. 完了報告のフォーマット

1. 変更・新規作成したファイル一覧
2. ロックファイル（`simulatorStore.ts`含む）の差分内容・差分ゼロの確認結果
3. `full-verify.js`/`tsc`/`build`の結果
4. 4章の手動シナリオ確認結果（固定計算・MC両方）
5. 指示書からの逸脱・判断が必要だった箇所
6. 未実装・保留にした項目
