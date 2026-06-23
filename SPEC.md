# SPEC.md — UI刷新フェーズ（Phase 3: Next.js + Tailwind）

## 機能名

LifeCompass Next.js版 UI刷新（Phase 3）

---

## 背景・目的

- ロジック移植フェーズ（Phase 2）が完了し、全4シリーズ・全チェックポイントがPASSした。
  CLAUDE.mdの大原則「ロジック移植とUI刷新は同時にやらない」の条件が満たされたため、
  このフェーズに移行する。
- 旧HTML版（STEP35）のUIは単一HTMLファイルで開発を重ねた結果、初見UXとモバイル対応に
  課題がある（ROADMAP.md「弱み」セクション参照）。
- 将来的にnote.com→自サイト（シミュレーター＋ブログ＋アフィリエイト）への移行を見据え、
  集客・マネタイズに耐える設計にする。

---

## スコープ

### 含むもの

**シミュレーターUI**
- 全機能をNext.js/TypeScriptコンポーネントとして再実装（Tailwind CSS使用）
- 初回アクセス時はサンプルプロファイルが自動読み込みされた状態でグラフを表示する
  （モーダルは廃止。「これはサンプルデータです」の一行をフォーム冒頭に表示）
- localStorageに保存済みのプロファイルがある場合はそちらを優先して読み込む
- グラフ・KPIの視覚的整理（余白・タイポグラフィの改善）
- モバイル完全対応（全機能。デスクトップと同等機能を維持）

**サイト構造の基礎**
- シミュレーターページ（/simulator）
- ブログ一覧・記事ページの骨格（/blog、/blog/[slug]）
- アフィリエイト開示ページ（/disclosure）
- 広告枠のコードを設計に組み込む（初期は非表示。Google AdSense審査後に有効化）

**デザイン方針**
- 白主体、青系アクセント、薄い灰色系のカラーパレット（3色以内）
- 余白を広く取る（Playing with FIRE・Projection Lab参考）
- タイポグラフィで読みやすさを優先（日本語対応：Noto Sans JP or システムフォント）
- Tailwindのベースユーティリティを活用

### 含まないもの（スコープ外）

- 新機能の追加（SP-ACCOUNT、CUSTOM-ASSET等）— 移植完了後に別SPECで対応
- ブログ記事のCMS連携・実コンテンツ投入 — Phase 6で対応
- メールリスト機能 — 登録動機の設計ができるまで保留
- 有料会員・ゲートコンテンツ
- 銀行口座の自動連携などの外部API連携
- ポッドキャスト・YouTube連携
- Vercelデプロイ設定 — Phase 5で対応

---

## 影響するファイル・コンポーネント

### 既存ロジック（変更なし）
- `lib/simulate.ts` — simulate()・analyze()のコアロジック。このフェーズでは触らない
- `reference/simulation_fixtures.md` — 既存の確定値。このフェーズで数値変化があってはならない

### 新規作成・再実装対象
- `components/simulator/` — シミュレーター全体のコンポーネント群
  - `SimulatorForm.tsx` — 入力フォーム
  - `AssetChart.tsx` — 資産推移グラフ（Recharts採用。旧版と同等の描画が困難な場合はChart.jsにフォールバック）
  - `KpiGrid.tsx` — KPIグリッド
  - `LifeEventTimeline.tsx` — ライフイベントタイムライン
  - `SensitivityPanel.tsx` — 感度分析パネル
  - `PortfolioPanel.tsx` — ポートフォリオ①②③
  - `MonteCarloPanel.tsx` — モンテカルロ結果
  - `YearlyTable.tsx` — 年次資産テーブル
- `components/layout/` — ヘッダー・フッター・ナビゲーション
- `app/simulator/page.tsx` — シミュレーターページ
- `app/blog/page.tsx` — ブログ一覧（骨格のみ）
- `app/blog/[slug]/page.tsx` — ブログ記事（骨格のみ）
- `app/disclosure/page.tsx` — アフィリエイト開示ページ

---

## データ構造の変更

なし。このフェーズはUI層の変更のみ。
`YearSnapshot`・`simulate()`・`analyze()`のシグネチャは一切変更しない。
`reference/simulation_fixtures.md`の確定値に影響する変更は禁止。

---

## UI/UX 設計方針

### オンボーディング（Welcomeモーダル廃止）
- 初回アクセス時：サンプルプロファイル（汎用35歳会社員）が自動読み込みされた状態でグラフを表示
- フォーム冒頭に「これはサンプルデータです。あなたの数字に変えてみてください」を一行表示
- localStorageに保存済みのプロファイルがある場合はそちらを優先して読み込む（バナーは非表示）
- 「サンプルを読み込む」ボタンは引き続き提供する（上書きリセット用）
- 旧HTML版のWelcomeモーダル（closeWelcome・loadSampleAndClose）は廃止

### 入力フォーム
- 旧HTML版の「ラベル左・入力右」の原則を継承
- 入力項目の優先度付け：基本情報（年齢・資産・年収・生活費）を最上位に、
  ポートフォリオ詳細・感度分析は折りたたみ or 下部配置
- モバイルでは全項目を操作可能にする（非表示にしない）

### グラフ・KPI
- KPIグリッドはシミュレーター結果の「読み取り口」として視認性を最優先
- 破綻確率KPIには判定基準の凡例を追加（15%以上：要改善 / 5〜15%：注意 / 5%未満：安全圏）
- 資産推移グラフのFIREライン・必要資産ラインの2本表示を継承

### デザイントークン
- 背景：白（#FFFFFF）主体
- アクセント：青系（例：#334155 相当。実装時にKENZOが確認して最終決定）
- サブカラー：薄い灰色系（例：#F3F4F6 相当）
- フォント：Noto Sans JP（日本語）/ システムフォントにフォールバック
- 余白の基本単位：Tailwindのspacing scale（4px基準）

### モバイル
- ブレークポイント：600px以下をモバイルとして扱う（旧HTML版から継承）
- DOM・input要素の複製は行わない（旧HTML版から継承した原則）
- グラフはモバイルでも表示・操作可能にする（Rechartsのレスポンシブ設定を活用）
- ポートフォリオ①②③はモバイルでアコーディオン表示（旧HTML版STEP34の設計を継承）

### 広告枠
- Google AdSense用のdivをレイアウトに組み込む（クラス・ID付きで配置）
- 初期状態は`display:none`または空コンポーネントで非表示
- 審査通過後にKENZOがコードを有効化する想定。実装時にフラグ管理の方法を確認する

---

## エッジケース

- 旧HTML版でlocalStorageに保存済みのプロファイル（version: 3）を
  Next.js版で読み込めるか（applyProfile()の互換性）
- URLシェア機能（`?s=`パラメータ）の継承
- Gemini AI分析（APIキーをlocalStorageに保存する仕組み）の継承
- 既存4シリーズ（田中・山本・中村・佐々木）のプロファイルJSONを
  読み込んだ際に年次資産表が旧版と一致することの確認

---

## 検証方法

### ロジック回帰（最重要）
- UI刷新後も `scripts/full-verify.js` が全シリーズPASSすることを確認
- verify-migrationスキルとStop Hookによる強制確認を維持
- UIの変更がsimulate()/analyze()の呼び出し方に影響していないことを確認

### UIの動作確認
- 旧HTML版STEP35と同じプロファイル（田中・山本・中村・佐々木の各基本ケース）を
  Next.js版に入力し、グラフ・KPIの数値が一致することをKENZOが実機で確認
- モバイル幅（375px・428px・600px）での表示をKENZOが実機確認
- URLシェア・CSV/PNGエクスポートの動作確認
- 初回アクセス時にサンプルプロファイルが正しく読み込まれることを確認
- localStorage保存済みプロファイルがある場合に正しく復元されることを確認

---

## スコープ外・将来検討

| 優先度 | ID | 内容 |
|---|---|---|
| Phase 5 | DEPLOY | Vercelデプロイ・カスタムドメイン設定 |
| Phase 6 | BLOG-CMS | ブログ記事のCMS連携・実コンテンツ投入 |
| 将来 | SP-ACCOUNT | 配偶者口座の独立化（別SPECで対応） |
| 将来 | CUSTOM-ASSET | カスタム資産クラス（別SPECで対応） |
| 将来 | SHORT-VIDEO | ショート動画→サイト流入（流入安定後に検討） |
| 将来 | EMAIL-LIST | メールリスト（登録動機の設計ができてから） |
| 将来 | ADSENSE | Google AdSense審査申請（記事10〜20本揃った時点） |

---

## 参考サイト

| 観点 | サイト |
|---|---|
| デザイン・余白感 | Playing with FIRE（playingwithfire.co）、Projection Lab（projectionlab.com）|
| シミュレーターUX | Projection Lab、Monarch（monarch.com）|
| サイト構造 | Projection Lab |
| マネタイズ・ブログ構成 | lifeplan-lab.jp |
