# 調査指示書：JSON再インポートが反映されない不具合（実行時トレース）

作成日：2026-08-26
種別：**調査のみ（実行時トレースによる原因特定。修正は原因判明後に別途指示）**

---

## 0. 背景

以下の再現手順で、2回目のJSONインポートが正しく反映されない不具合が報告されている：

1. JSONをExportする（バックアップ取得）
2. 元々保有資産が無かったカテゴリに、新しい行を追加する
3. 手順1で取得したバックアップファイル（同一ファイルであることは確認済み）を、再度JSONインポートする
4. 確認ダイアログが表示され、OKを押す
5. **しかし、手順2で追加した行が消えず、バックアップ時点の状態に戻らない**

`AssetManagementPage.tsx`・`exportImport.ts`（`applyJsonPayload`）・`AssetExportImportControls.tsx`・
`AssetHoldingCard.tsx`・`HojinTransferHelper.tsx`を確認したが、静的なコードリーディングでは
原因を特定できなかった（いずれも構造的には正しく実装されているように見える）。実行時の状態を
直接追跡して原因を特定すること。

---

## 1. 調査方法：実行時トレース

以下の再現手順を実際にブラウザで行い、**各タイミングでの実際の値をログ出力・記録すること**：

1. `applyJsonPayload`関数の先頭と末尾に、一時的な`console.log`を追加する
   - 先頭：`raw.holdings`の内容（インポートしようとしているファイルの中身）
   - 末尾：returnする直前の`holdings`変数の内容（適用後、返す値）
2. `AssetManagementPage.tsx`の`handleImported`関数の先頭に、一時的な`console.log`を追加する
   - 受け取った`result.holdings`の内容
3. 上記の再現手順を実際に行い、ブラウザのコンソールログを**そのまま記録**すること：
   - 手順1（Export）直後の状態
   - 手順2（行追加）直後の`holdings` state・`localStorage.getItem('lifeCompassAssetHoldings')`の中身
   - 手順3〜4（再インポート）実行時の、上記1・2で仕込んだログの出力内容
   - 手順4完了直後の`holdings` state・`localStorage.getItem('lifeCompassAssetHoldings')`の中身
4. ログの内容から、以下のどの段階で「追加した行」が消えていないかを特定すること：
   - (a) `applyJsonPayload`に渡される`raw.holdings`の時点で、既に追加した行が含まれてしまっている
     （＝ファイルの読み込み自体がおかしい、またはファイルが実は最新のものになっている）
   - (b) `applyJsonPayload`は正しく処理しているが、returnする`holdings`に追加行が紛れ込んでいる
   - (c) `applyJsonPayload`のreturn値は正しいが、`handleImported`が受け取った時点で既に狂っている
   - (d) `handleImported`は正しく`setHoldings`しているが、それ以降の再レンダリング・他の処理が
     追加行を含む古い状態で再度`saveHoldings`を呼び出し、上書きしてしまっている（`useEffect`の
     多重発火、React 18のStrict Modeによる二重実行、他のコンポーネントの副作用等を疑うこと）
5. 原因が特定できたら、一時的に追加したログを削除する前に、その内容を完了報告にそのまま含めること

---

## 2. 特に疑ってほしい点

- React 18の開発モード（Strict Mode）では、`useEffect`が意図的に2回実行される。もし
  `includeCorporate`判定用の`useEffect`（`AssetManagementPage.tsx`79-81行目）や、他に見落として
  いる`useEffect`が、`holdings`に依存する形で何らかの保存処理を行っていないか確認すること
- `handleImported`が呼ばれた後、他のどこかで意図せず`saveHoldings`（または`updateHoldings`）が
  再度呼ばれていないか、`saveHoldings`の呼び出し箇所すべてに一時的なログを仕込み、
  再現手順の中で何回・どの順番で呼ばれているかを記録すること

---

## 3. 今回のスコープ

- 原因の特定と、実行時ログの記録・報告のみを行うこと
- 原因が判明しても、この指示書の範囲では修正しないこと。原因を報告した上で、次の指示を待つこと
- 一時的に追加したデバッグ用の`console.log`は、原因特定後（報告に必要な分を記録した後）に
  必ず削除すること。ただし、報告にはログの実際の出力内容をそのまま含めること

---

## 4. ロックファイル制約（厳守・変更なし）

`types.ts` / `profile.ts` / `PortfolioPanel.tsx` / `simulate.ts` / `analyze.ts` / `montecarlo.ts` / `blog.ts` / `blogTopics.ts` / `concerns.ts` は一切import・改変しないこと（デバッグログも含め、これらのファイルには一切触れないこと）。

---

## 5. 完了報告時に必要なもの

- 1章の再現手順を実際に行った際の、コンソールログの実際の出力内容（省略なし）
- 上記ログから特定できた原因（(a)〜(d)のどれに該当するか、または別の原因か）の説明
- デバッグ用ログを削除したことの確認
