# 実装指示：AssetManagerProfilePanelのハイドレーションエラー修正

作成日：2026-08-31
種別：**調査＋修正（原因パターンが既知のため、確認の上で修正まで許可）**
関連：`claude_instruction_phase2_yojitsu_v1_plan_and_compare.md`完了報告（`PlanManagerPanel.tsx`で同種のハイドレーションエラーが一度発見・修正済み）

---

## 背景

案A実装の完了報告で、`AssetManagerProfilePanel.tsx`のプロファイル名表示について、Next.jsの開発オーバーレイに「1 error」が出ていることが報告された。中身はサーバー側描画（"デフォルト"固定）とクライアント側描画（localStorageから読んだ実際のプロファイル名）の不一致によるハイドレーションエラー。

**これは初見のバグではない可能性が高い。** V1完了報告（1件目）で、`PlanManagerPanel.tsx`が全く同じ原因（`useAssetManagerProfileStore`のlocalStorage同期初期化由来の値をSSR/クライアント初回描画で直接条件分岐に使っていた）のハイドレーションエラーを起こしており、「マウント完了まで固定表示→`useEffect`で切替」という既存パターンで修正済みだった。今回`AssetManagerProfilePanel.tsx`側は、その時点では見つかっていなかった／このパターンが適用されていなかった箇所と考えられる。

---

## 調査・修正内容

- `AssetManagerProfilePanel.tsx`のプロファイル名表示箇所で、実際にハイドレーション不一致が起きているコードを特定する
- `PlanManagerPanel.tsx`修正時と同じ「マウント完了まで固定表示→`useEffect`で切替」パターンを適用し、修正する
- **重要**：`AssetManagerProfilePanel.tsx`・関連コンポーネント内に、同じパターンの他の箇所（`useAssetManagerProfileStore`由来の値を初回描画で直接使っている箇所）が他にも残っていないか、一度まとめて確認すること。1箇所ずつのモグラ叩きにしない

---

## 遵守事項

- ロックファイル・`ProfileDrawer.tsx`・`simulatorStore.ts`への変更はゼロ
- 検証は安全なテストデータで行うこと
- 既存テスト（`full-verify.js`）が全てPASSすることを維持する
- 完了報告には、修正前（エラー発生）・修正後（エラー解消）のブラウザコンソール・開発オーバーレイのスクリーンショットを添付すること

---

## 完了報告フォーマット

- ハイドレーション不一致の該当コード箇所
- 修正内容（該当コード抜粋）
- 他に同じパターンの箇所がなかったかの確認結果
- テスト結果（PASS/FAIL件数）
- 実機確認（修正前後のエラー表示比較）
