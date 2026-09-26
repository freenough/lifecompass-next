# 実装指示：一人法人LP 法人資産ブロックのカードを「本物の計算＋デモデータ」で動かす

作成日：2026-09-26
種別：**実装（見た目の変更を含む）**
対象リポジトリ：`lifecompass-next`
関連：`investigation_hitori_hojin_hero_live_demo.md`（調査・完了済み）
起点テンプレート：`docs/fixes/INSTRUCTION_TEMPLATE.md`（検証環境の安全ルールは同テンプレートに従うこと）
作業ブランチ：`feature/hitori-hojin-manage-live-demo`（mainから作成）

---

## 背景

一人法人LPの法人資産ブロック（「法人の資産も、FIREの進捗に。」、`src/components/hitori-hojin/HitoriHojinManageSection.tsx`）にある「個人＋法人 合算」カードは、バーの比率と「68%」がファイル先頭の定数（`PERSONAL_PCT = 68`、`HOJIN_PCT = 14`）で、計算していない。

調査の結果、次のことが分かった。

- ツールが実際に見せているのは、個人と法人の**内訳**（合計を100%とした割合）で、計算は純粋関数`calcCompositionPercentages()`（`lib/hojinAssetManagement/compositionBar.ts`）にある
- ツールの「目標までの進捗」は個人資産÷目標額で、法人資産は入らない

KENZOとの設計チャットで、次の方針に確定した。

- カードは、ツールの実際の機能どおり**「個人と法人の内訳バー＋合計金額」**にする。「目標までの進捗◯%」は外す
- 内訳の計算は本物の`calcCompositionPercentages()`を使い、バーの描画はLP側で行う（今の濃紺＋斜線のデザインを維持する）
- デモの人物は、資産シミュレーターLPと同じ人物（`DEMO_PROFILE`・`demoHoldings.ts`）に法人資産を足す
- アニメーションは、資産シミュレーターLPの進捗カード（`AssetProgressBadges.tsx`）と同じく、画面に30%入った時点で始める
- `useCountUp`を「動きを減らす」設定（`prefers-reduced-motion`）に対応させる
- 箇条書き2つ目の文言を、実際の機能に合わせて直す

---

## 1. 法人のデモデータを追加する

- 新規ファイル`src/lib/lp/demoHojinHoldings.ts`を作り、法人のデモ資産を定義する
  - 法人預金：300万円
  - 法人名義の証券口座：200万円
- 型は`calcCompositionPercentages()`が受け取る形に合わせる
- 個人資産は既存の`src/lib/lp/demoHoldings.ts`の値をそのまま使い、複製しないこと
- 完了報告に、個人資産の合計・法人資産の合計・`calcCompositionPercentages()`が返した割合を、実際の出力として載せること

## 2. `useCountUp`を「動きを減らす」設定に対応させる

- `src/hooks/useCountUp.ts`で、`prefers-reduced-motion: reduce`が有効な場合は、カウントアップせずに最初から最終値を表示する
- 通常の設定では、`HeroDemo.tsx`・`AssetProgressBadges.tsx`の見た目と動きが変わらないこと

## 3. カードをクライアントコンポーネントとして作り直す

- 新規コンポーネント（例：`src/components/hitori-hojin/HojinCompositionDemo.tsx`）を作る
  - 1のデモデータと個人資産を`calcCompositionPercentages()`に渡して割合を求める
  - バーは今のカードと同じデザイン（個人資産＝濃紺、法人保有資産＝斜線）で描き、幅を計算結果の割合にする。合計が100%になるので、今の「残り（灰色）」部分はなくなる
  - 凡例は今のまま（個人資産／法人保有資産）。それぞれに金額と割合を添えてよい
  - 下の白いボックスは「目標までの進捗 68%」をやめ、「個人＋法人 合計」と合計金額（万円）を表示する
  - IntersectionObserverで画面に30%入ったら、バーの幅が0から伸びる動きと、合計金額のカウントアップ（`useCountUp`）を始める。一度始まったら再発火しない。仕組みは`AssetProgressBadges.tsx`に合わせること
  - `prefers-reduced-motion`が有効な場合は、バーも最初から最終の幅で表示する
- `HitoriHojinManageSection.tsx`（サーバーコンポーネント）からは、`dynamic(..., { ssr: false })`で読み込む。資産シミュレーター側と同じやり方にすること
- 読み込みの間にレイアウトがずれないよう、カードと同じ高さの枠を確保すること
- `PERSONAL_PCT`・`HOJIN_PCT`の定数は、使われなくなったら削除する
- ツール側の`HojinAssetCompositionBar`・`compositionBar.ts`は変更しないこと

## 4. 箇条書き2つ目の文言を直す

- 変更前：個人資産と合算して、FIRE進捗をまとめて確認
- 変更後：個人資産と合わせて、資産全体の内訳を確認
- 見出し「法人の資産も、FIREの進捗に。」・他の箇条書き・ボタン・注記は変更しない

---

## 変更してはいけないもの

- ロックファイル（`simulate.ts`・`analyze.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`・`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`ほか、既存の指示書で定められたもの）
- 法人資産管理ツール側のファイル（`compositionBar.ts`・`HojinAssetCompositionBar`・`HojinAssetProgressPanel.tsx`・`personalization.ts`）
- `/hitori-hojin/*`へのリンクを追加・変更する場合は、basePath対策として`HITORI_HOJIN_SITE_URL`を使った絶対URLの`<a>`タグにすること（今回は原則リンクの変更はない）

---

## 検証

- `npm run lint`・`npm run build`が通ること
- `node scripts/full-verify.js`を実行し、合計行と終了コードを報告すること
- 次のスクリーンショットをArtifactでインライン表示すること
  - デスクトップ（1440px）：アニメーション前（画面外）→画面に入った後の最終状態
  - 375px：同上
  - `prefers-reduced-motion: reduce`をエミュレートした状態で、最初から最終値が表示されていること
  - 資産シミュレーターLPの`HeroDemo`と進捗カード（通常設定）で、見た目が変わっていないこと
- 検証環境の安全ルール（`INSTRUCTION_TEMPLATE.md`に準拠）
  - ブラウザを自動操作する検証では、localhost以外のすべてのドメインへの通信を遮断する（許可リスト方式。遮断したURLはログに残す）
  - 法人資産管理ツール・資産管理ツールの画面は開かない。localStorageには触れない
  - devサーバーを停止する場合は、ポートからPIDを特定して個別に停止する
  - `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す

---

## 完了報告

- 変更・新規作成したファイルの一覧と`git diff --stat`
- 1〜4それぞれの実装のコード抜粋
- 1のデモデータの計算結果（実際の出力）
- 上記のスクリーンショット（Artifactでインライン表示）
- `full-verify.js`の合計行と終了コード
- ローカルのファイルパス（`C:\...`等）を含めないこと
- **コミット・pushはしないこと。** KENZOがスクリーンショットを確認してから、コミットとpush（Vercel Preview作成）を指示する
- 処理済みのこの指示書は`docs/fixes/done/`へ移動してよいが、`docs/fixes/active/`フォルダ自体は削除しないこと
