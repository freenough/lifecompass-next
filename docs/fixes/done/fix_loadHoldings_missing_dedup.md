# 修正指示書：loadHoldings()の重複排除欠如（根本原因特定済み）

作成日：2026-08-24
種別：**実装（原因特定済み・修正のみ）**
背景：ユーザーがstorage.ts／csvHistory.ts／exportImport.tsを直接アップロードし、
このチャット側でコードを読んで根本原因を特定した。

---

## 0. 特定できた根本原因

`src/lib/assetManagement/storage.ts`の`loadSnapshots()`は、読み込むたびに
`migrateBadDateLabels`・`dedupeSnapshotsByDate`で自己修復し、変化があれば
`saveSnapshots()`で保存し直す仕組みを持っている。

一方、同じファイルの`loadHoldings()`には、この自己修復処理が一切ない：

```ts
export function loadHoldings(): AssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    return raw ? (JSON.parse(raw) as AssetHolding[]) : [];
  } catch {
    return [];
  }
}
```

このため、これまでの一連の修正（CSVインポート時の`mergeById`重複排除等）が入る前に
`lifeCompassAssetHoldings`へ書き込まれてしまった重複データは、新規の書き込みが起きない限り
永久に残り続ける。ユーザーが実際にエクスポートしたCSVで、この重複（同一ID・同一年月グループ内に
2〜3件）が実機で確認されている。

---

## 1. 修正内容

`loadHoldings()`に、`loadSnapshots()`と同様の自己修復パターンを追加すること：

```ts
export function loadHoldings(): AssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssetHolding[];
    const deduped = mergeById([], parsed); // 既存のmergeByIdをそのまま再利用（id一致→後勝ちで1件に収束）
    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
      saveHoldings(deduped);
    }
    return deduped;
  } catch {
    return [];
  }
}
```

- 新しいロジックを書き起こす必要はない。既存の`mergeById`（`csvHistory.ts`からimport済み）を
  `mergeById([], parsed)`の形で呼ぶだけで、「同一IDは後勝ちで1件に収束」という重複排除が実現できる
  （`loadSnapshots`が`migrateBadDateLabels`内で同じ関数を同じ考え方で使っているのと同一パターン）

---

## 2. 法人側にも同一の修正を適用すること

`src/lib/assetManagement/storage.ts`（個人版）は今回直接確認できたが、法人版の対応するストレージ
モジュール（`hojinAssetHoldings`キーを扱っているファイル）についても、**同一の構造上の欠陥が
存在する可能性が高い**。該当ファイルを確認し、同様に`loadHoldings`相当の関数に自己修復処理が
入っているか確認し、入っていなければ同じ修正を適用すること。

---

## 3. 確認事項

- 修正後、現在ユーザーの環境（個人ページ）に既に存在する重複データが、**ページを開いただけで**
  （再インポート等の追加操作なしに）自動的に解消されることを確認すること
- 同様の欠陥が他の`load〜`系関数（`loadTargetAmount`等）に無いか、念のため全関数を確認し、
  あれば併せて報告すること（対応は本指示書の範囲内で構わない）
- `full-verify.js`に、「壊れた重複データを含む状態から`loadHoldings()`を呼ぶと、
  自動的に重複排除されて保存し直される」ことを検証する単体テストを追加すること
  （`loadSnapshots`の同種のテストが既にあれば、それと対になるテストとして追加）

---

## 4. ロックファイル制約（厳守・変更なし）

`types.ts` / `profile.ts` / `PortfolioPanel.tsx` / `simulate.ts` / `analyze.ts` / `montecarlo.ts` / `blog.ts` / `blogTopics.ts` / `concerns.ts` は一切import・改変しないこと。

---

## 5. 完了報告時に必要なもの

- 修正後、実際にエクスポートしたCSV（個人・法人とも）の中身をこの場にそのまま貼り付けること
  （スクリーンショットに加え、前回同様テキストでの提示を必須とする）
- 修正前に重複していたユーザーの実データが、ページを開くだけで解消されたことを示す
  Before/AfterのCSVまたはlocalStorageの値
- `full-verify.js`・`tsc --noEmit`の結果
- ロックファイル依存ゼロのgrep確認結果
