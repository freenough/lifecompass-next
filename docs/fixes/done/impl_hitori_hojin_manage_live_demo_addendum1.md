# 追加指示（addendum1）：一人法人LP 法人資産ブロック リード文の修正と証跡の移動

作成日：2026-09-26
種別：**実装（文言修正1か所＋ファイル移動）**
対象ブランチ：`feature/hitori-hojin-manage-live-demo`（作業中のまま続ける。新しいブランチは作らない）
関連：`docs/fixes/done/impl_hitori_hojin_manage_live_demo.md`（本体の指示書・実装済み）

---

## 1. リード文を修正する

`src/components/hitori-hojin/HitoriHojinManageSection.tsx`のリード文を、カードの内容（内訳）に合わせて変更する。

- 変更前：法人に保有している資産を記録し、個人資産と合わせたFIRE進捗を確認できます。
- 変更後：法人に保有している資産を記録し、個人資産と合わせた内訳を確認できます。

見出し「法人の資産も、FIREの進捗に。」・箇条書き・ボタン・注記・カードは変更しない。

## 2. 証跡を`done/`へ移動する

- `docs/fixes/active/hitori-hojin-manage-live-demo/`（スクリーンショット）を、`docs/fixes/done/hitori-hojin-manage-live-demo/`へ移動する
- 移動後、`docs/fixes/active/`には`.gitkeep`だけが残ること。`active/`フォルダ自体は削除しない
- この追加指示書も、処理後に`docs/fixes/done/`へ移動してよい

## 検証

- `npm run build`が通ること
- 1440px・375pxで、リード文が変わったことが分かるスクリーンショットを、Artifactでインライン表示すること
- ブラウザを自動操作する検証では、localhost以外のすべてのドメインへの通信を遮断する（許可リスト方式）
- 資産管理ツールの画面は開かない。localStorageには触れない
- devサーバーを停止する場合は、ポートからPIDを特定して個別に停止する
- `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す

## 完了報告

- `git diff`（リード文の差分）
- スクリーンショット（Artifactでインライン表示）
- 終了時の`git status`
- ローカルのファイルパスを含めないこと
- **コミット・pushはしないこと**
