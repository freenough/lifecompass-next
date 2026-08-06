# 指示書:concerns.tsへの「繰上返済 vs 投資」項目追加

## 背景

`prepay-vs-invest`ツール・対応記事`mortgage-prepay-vs-invest`が公開済みと
なったため、`concerns.ts`(お悩み一覧)に新規concern項目を1件追加する。

これは以前追加した`housing-loan-fire`(既存記事のみ・フルシミュレーター
誘導)とは別の項目。今回はツール・記事ともに揃っているため、ツールへの
直接誘導(`lightTool`)が可能。

## 対象ファイル

`src/data/concerns.ts`(前回のセッションで、当初の指示書想定`src/lib/`では
なく実際には`src/data/`配下と判明済み)

## 変更内容

`CONCERNS`配列に以下の1件を追加する。挿入位置は既存の末尾でよい。

```ts
{
  id: 'prepay-vs-invest',
  stage: 'saving',
  question: '繰上返済と投資、どちらが得?',
  outcome: '同じ金額を繰上返済した場合と投資に回した場合の効果を、金利条件を入力して比較できます',
  ctaType: 'lightTool',
  ctaLabel: '60秒で試算する',
  ctaUrl: '/tools/prepay-vs-invest?utm_source=concerns&utm_medium=concern_card&utm_campaign=prepay_vs_invest',
  articleUrl: '/blog/mortgage-prepay-vs-invest',
  featured: false,
},
```

### 各フィールドの確認事項

- `id`: `'prepay-vs-invest'` — ツールslugと一致(既存のツール系concern項目
  の命名規則に準拠)
- `stage`: `'saving'` — 対応記事`mortgage-prepay-vs-invest.md`のstagesと
  揃えている
- `ctaType`: `'lightTool'` — ツールが実装済みのため直接誘導
- `ctaUrl`: `/tools/prepay-vs-invest`。basePathを含めないこと(ファイル
  冒頭のコメントのルールに従う)
- `articleUrl`: `/blog/mortgage-prepay-vs-invest`(basePath含めず)
- `featured`: `false` — `saving`ステージは既に`fire-age`が
  `featured: true`でLPカード枠を占めているため

## 実装後の確認事項(必須)

1. `ConcernStage`型・`STAGE_LABELS`・`STAGE_ORDER`など既存の型定義は変更
   しない
2. `full-verify.js`が全PASSすること
3. `tsc`がクリーンであること
4. `/concerns`一覧ページで新規カードが「貯める」(saving)セクションに正しく
   表示されること
5. `ctaUrl`(`/tools/prepay-vs-invest`)・`articleUrl`
   (`/blog/mortgage-prepay-vs-invest`)がbasePath込みで正しいリンク先に
   遷移すること(実機クリックで確認。前回の内部リンクbasePathバグの修正が
   このリンクにも正しく適用されているか、念のため確認すること)
6. 他の既存concern項目(特に`saving`ステージの`fire-age`)への影響がない
   こと

## 完了報告に含めるべき内容

- 変更したファイルパス
- `full-verify.js`・`tsc`の結果
- `/concerns`ページでの実機確認結果
- リンク遷移の実機確認結果

## スコープ外(今回やらないこと)

- 既存11件のconcern項目の変更
- 記事・ツール本体の変更
