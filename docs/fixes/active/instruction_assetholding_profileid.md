# 実装指示：AssetHoldingへのprofileId追加（フェーズ1デプロイ前・独立タスク）

作成日：2026-08-29
種別：**実装（小規模・独立タスク）**
関連：`phase2_design_proposal_draft.md`（フェーズ2設計仕様v2）0節

---

## 背景

資産管理ツール（個人/法人）統合作業（フェーズ1）は実装・検証済みだが、本番デプロイ前の状態。

`AssetSnapshot`/`HojinAssetSnapshot`には、フェーズ2以降のプロファイル機能に備えたスキーマ下地として、既に`profileId: string`フィールドが存在する（フェーズ1では常に`'default'`固定。`storage.ts`に既存データへの後方互換補完ロジックがある）。

一方、`AssetHolding`（現在の保有資産）には`profileId`フィールドが一切無いという非対称があることが判明した。フェーズ2で本格的なプロファイル機能を実装する前に、この非対称を解消しておきたい。本番データがまだ存在しない今のうちに対応すれば、後からのデータマイグレーションが不要になる。

**このタスクはスキーマ下地の追加のみを目的とする。** プロファイルの切替UI・複数プロファイル管理機能そのものはフェーズ2で別途実装する。今回はそれに含めない。

---

## やること

1. `AssetHolding`型（`src/lib/assetManagement/types.ts`）に`profileId: string`フィールドを追加する
2. `AssetSnapshot`/`HojinAssetSnapshot`が既に持っている`profileId`の後方互換補完ロジック（`storage.ts`内、`loadSnapshots()`などで欠損時に`'default'`を補う処理）を確認し、**`AssetHolding`にも同じパターンを適用する**（`loadHoldings`/`loadHojinHoldings`の読み込み時に、既存データで`profileId`が無ければ`'default'`を補完して保存し直す）
3. 新規に`AssetHolding`を作成する箇所（保有資産の追加・編集ロジック）で、`profileId`に常に`'default'`をセットするようにする（フェーズ2でプロファイル切替が実装されるまでは、全データが単一の`'default'`プロファイルに属する状態で問題ない。これは現状の単一プロファイル運用と実質的に同じ挙動を維持するための対応であり、ユーザーから見た動作は一切変化しない）
4. 資産管理ツール側のexport/import・CSV・JSON・resetAll等、既存のロジックで`AssetHolding`を扱っている箇所を一通り確認し、型変更によるコンパイルエラーや見落としが無いか確認する（ただし、CSV/JSONに「プロファイルID」列・プロファイル単位の対応を追加する作業自体はフェーズ2のスコープであり、**今回は含めない**）

## やらないこと（スコープ外・重要）

- プロファイルの作成・切替・削除UIの実装
- CSV/JSONへの「プロファイルID」列・プロファイル単位対応の追加
- CompanyStateのプロファイル対応
- PortfolioPanelとの連携

これらはすべてフェーズ2（`phase2_design_proposal_draft.md`）で別途実装する。

---

## 遵守事項

- ロックファイル（`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）への依存・変更は一切ゼロを維持すること
- 既存のテスト（`scripts/verify-*.js`、`full-verify.js`）がすべてPASSすることを確認すること。型追加によって新たに必要になる検証があれば、既存のverify-*.jsのパターンに沿って追加すること
- 本対応によって、**フェーズ1の既存動作（見た目・挙動）が一切変わらないこと**を確認する（`profileId`は内部的に追加されるだけで、UI上は何も変化しないはず）
- 検証は本番相当の実データ環境を使わないこと

---

## 完了報告フォーマット

- 変更したファイル一覧
- `AssetHolding`型定義の差分（該当コード抜粋）
- 後方互換補完ロジックの実装箇所（該当コード抜粋）
- テスト結果（PASS/FAIL件数）
- 実機ブラウザでの動作確認結果（既存の資産管理ツールの見た目・挙動が変わっていないことのスクリーンショット等）
