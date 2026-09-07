# 実装指示書: LP再設計 Phase 1 の全面差し戻し

## 背景

`instruction_lp_typography_and_hero.md`(Phase1-A タイポグラフィ、Phase1-B Hero再設計)について、全体を一旦白紙に戻したい。**直前に出した「放射状ラインだけ差し戻す」指示は取り消し、こちらに置き換える。**

## やること

- `feature/lp-visual-refresh` ブランチ上のコミット `b8fd23b`(Phase1-A: タイポグラフィ基盤)、`98dc88b`(Phase1-B: Hero再設計)を、両方とも元の状態(このPhaseに着手する前)に戻す。
- タイポグラフィ(Zen Kaku Gothic New / Space Grotesk)、Hero再設計(コピー拡大・チャート比率変更・放射状ライン)、全て今回は元に戻す対象に含む。
- 資産シミュレーターLP(`/asset-simulator`)が、LP再設計に着手する前の状態と同じ見た目になっていることを確認する。
- 戻し方は `git revert` でも、ブランチを一旦破棄して作り直すのでも、確実に元の状態に戻ることが確認できればどちらでもよい。

## 検証(証跡必須)

- 差し戻し後のLP(PC・モバイル)のスクリーンショットを報告し、フォント・Hero見た目ともに差し戻し前(今回のPhase1着手前)の状態と一致していることを確認する。
- Vercel Preview URL(またはmainの状態、戻し方に応じて)を報告する。
- 既存の他機能(シミュレーター本体、資産管理ツール等)に影響が出ていないことを確認する。

## やってはいけないこと

- mainに何らかの形で今回のPhase1の変更が残っていないか、念のため確認すること。
- 証跡なしの完了報告をしないこと。

## 今後について

LP再設計は一旦ここで立ち止まる。再開する場合は、方向性を練り直してから改めて指示する。

---

## 実施結果（2026-09-07・完了）

### 戻し方
`feature/lp-visual-refresh`ブランチ上で`git revert --no-edit`を新しいコミットから順に適用：
1. `98dc88b`（Phase1-B: Hero再設計）を`1cd99b8`でrevert
2. `b8fd23b`（Phase1-A: タイポグラフィ基盤）を`13256d1`でrevert

新規追加していたファイル（`LpKpiCard.tsx`・`NumberText.tsx`・`RadialLinesBackground.tsx`）は
revertにより自動的に削除された。両コミットが触っていたファイル集合はほぼ重複がなく
（tsconfig.tsbuildinfoのみ両方に含まれる）、コンフリクトなくクリーンにrevertできた。
force-pushは使わず、通常のrevertコミット2件をpush（履歴は保持、破壊的操作なし）。

### 検証結果
- `git diff main -- <Phase1で変更した全ファイル>`が空であることを確認（page.tsx・layout.tsx・
  globals.css・ConcernBlockLP.tsx・AssetManagementPromoSection.tsx・HeroDemo.tsxがmainと
  完全一致）。新規追加していた3ファイルも削除済みで存在しないことを確認。
- `tsc --noEmit`・`npm run build`とも成功。
- ローカル実機（PC幅・モバイル幅545px）で、フォント・Hero見た目ともにPhase1着手前と
  見た目が一致することをスクリーンショットで確認（H1サイズ・コピー/チャート比率・
  放射状ラインなし・見出しフォント・数値フォントいずれもPhase1以前の状態）。
- `/asset-simulator/app`（シミュレーター本体）のコンソールエラーなし、表示に影響なし
  であることを確認。

### mainへの影響確認
- `git branch --contains b8fd23b`・`git branch --contains 98dc88b`とも
  `feature/lp-visual-refresh`のみを返し、`main`は含まれないことを確認
  （そもそも一度もマージしていない）。
- `git show main:src/app/page.tsx`にfont-heading・RadialLinesBackground等Phase1の痕跡が
  存在しないことを確認。mainは最初から無傷。

### Vercel Preview
差し戻し後のpushにより、`feature/lp-visual-refresh`のPreviewデプロイは本番(main)と
同一内容になる。Preview URL: `https://freenough-lifecompass-6ahchxwuw-kenzokakinuma-3674s-projects.vercel.app`
（Vercel SSO認証必要、差し戻し後のコミットが反映されたら中身は現行本番と同じになる）。
