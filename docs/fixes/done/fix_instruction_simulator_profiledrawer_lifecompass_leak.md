# 修正指示書：既存シミュレーター本体（ProfileDrawer.tsx）のLifeCompass表記漏洩

作成日：2026-08-18
対象：Claude Code
前提：資産管理ツールPhase1の修正作業中に発見された、既存シミュレーター本体の別件バグ

---

## 0. 位置づけ

資産管理ツールとは無関係の、既存の資産シミュレーター本体（プロファイル機能）で見つかった軽微な修正。資産管理ツールのロックファイル制約（`profile.ts`/`PortfolioPanel.tsx`/`simulatorStore.ts`/`simulate.ts`/`analyze.ts`）とは別件で、`ProfileDrawer.tsx`はこのロック対象に含まれていないため、通常通り編集してよい。

このプロジェクトでは、内部開発コードネーム「LifeCompass」はユーザー向けのテキスト・URL・ファイル名など、外部に見える箇所に一切表示してはならないというルールがある。

---

## 1. 修正内容

`src/components/simulator/ProfileDrawer.tsx`の78行目付近、プロファイルのJSON Export機能で、ダウンロードファイル名が以下のように内部コードネームを含んだ状態になっている。

```js
a.download = `lifecompass_${profile.name}.json`
```

これを、ユーザー向けブランド名に沿った命名に変更すること（例：`freenough-profile-${profile.name}.json`、または資産管理ツールで採用した命名規則（英語スネークケース・日付サフィックス・ブランド名なし）に近い形など、既存コードベースの他の命名パターンと違和感のないものにする）。

---

## 2. 横断確認

このファイル以外にも同様の「lifecompass」文字列がユーザー向けの出力（ファイル名・表示テキスト・URL等）に混入していないか、資産シミュレーター本体全体（`lifecompass-next`リポジトリ全体）を対象に`grep -ri lifecompass`で横断確認すること。

- localStorageのキー名（`lifeCompassProfiles`等）は、DevTools以外では見えない内部実装のため、本指示書の対象外（変更不要）。ユーザーが直接目にする、または保存・共有する可能性のある箇所（ファイル名、画面表示、URL等）のみを対象とする
- 見つかった場合は本指示書の対応内容に準じて修正し、完了報告に一覧で明記すること
- 資産管理ツール側（`docs/fixes/active/`の他の指示書で対応済みの`exportImport.ts`等）は対象外（対応済みのため）

---

## 3. 検証要件

1. プロファイルのJSON Exportで、ダウンロードされるファイル名に「lifecompass」が含まれていないことを実機で確認する
2. 横断確認（`grep -ri lifecompass`）の結果、他に修正が必要な箇所がないか、あった場合はすべて対応済みであることを確認する
3. `tsc --noEmit` / `npm run build` / 既存の`full-verify.js`が引き続きクリーンであること
4. 資産管理ツールのロックファイル（`profile.ts`/`PortfolioPanel.tsx`/`simulatorStore.ts`/`simulate.ts`/`analyze.ts`）に変更が及んでいないこと（`ProfileDrawer.tsx`自体はロック対象外だが、念のため周辺への影響がないか確認）

---

## 4. 完了報告に含めるべき内容

- 修正後の実際のファイル名
- 横断確認（`grep -ri lifecompass`）の結果、他に見つかった箇所とその対応内容（なければ「他になし」と明記）
- 修正・変更したファイル一覧
- 検証要件（3章）の結果

---

## 5. 次のステップ

1. KENZOによる実装レビュー
2. commit/push（要承認）
