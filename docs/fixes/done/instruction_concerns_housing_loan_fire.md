# 指示書:concerns.tsへの住宅ローン関連項目追加

## 背景

`concerns.ts`(お悩み一覧12件)に住宅ローン関連の項目が0件だった。既存記事
`housing-loan-fire`(住宅ローンを抱えたままFIREしても大丈夫?3パターンで
シミュレーションして比較してみた)は公開済みだが、concernsには未掲載だった
ため、新規に1件追加する。

**注意:** この記事は`prepay-vs-invest`ツール(繰上返済 vs 投資比較)の開発前に
書かれたものであり、ツールへの言及や繰上返済機能は使用していない。そのため
今回追加するconcern項目のCTAは**フルシミュレーター誘導(`fullSimulator`)**と
する。`prepay-vs-invest`ツールに対応する記事は別途企画中(未着手)であり、
それが公開された際は別途もう1件、`lightTool`型のconcern項目を追加する想定
(今回のタスクとは別)。

## 対象ファイル

`src/lib/concerns.ts`(プロジェクト内の実際のパスをClaude Code側で確認・
特定すること。過去のやり取りでは`concerns.ts`という名称で言及されている)

## 変更内容

`CONCERNS`配列に以下の1件を追加する。挿入位置は既存の末尾
(`id: 'inflation'`の後)でよい。

```ts
{
  id: 'housing-loan-fire',
  stage: 'deciding',
  question: '住宅ローンを残したままFIREして大丈夫?',
  outcome: '賃貸継続・ローンを残す・完済してからFIREの3パターンで、資産の減り方の違いを比較できます',
  ctaType: 'fullSimulator',
  ctaLabel: '詳しく試算する',
  ctaUrl: '/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=housing_loan_fire',
  articleUrl: '/blog/housing-loan-fire',
  featured: false,
},
```

### 各フィールドの確認事項

- `id`: `'housing-loan-fire'` — 記事slugと一致させている(既存項目の命名規則
  に準拠)
- `stage`: `'deciding'` — 「住宅ローンという制約があっても退職できるか」と
  いう退職可否判断のテーマであり、既存の`semi-retirement`/`dual-income`と
  同じ構造のため
- `ctaUrl`: `/app`遷移。basePath(`/asset-simulator`)を含めないこと(ファイル
  冒頭のコメント「URLはbasePathを含めずに書く」のルールに従う)
- `articleUrl`: `/blog/housing-loan-fire`(basePath含めず)
- `featured`: `false` — `deciding`ステージは既に`semi-retirement`が
  `featured: true`でLPカード枠を占めているため

## 実装後の確認事項(必須)

1. `ConcernStage`型・`STAGE_LABELS`・`STAGE_ORDER`など既存の型定義は変更
   しない(今回は配列へのエントリ追加のみ)
2. `full-verify.js`が全PASSすること
3. `tsc`がクリーンであること
4. ローカルビルドで`/concerns`一覧ページに新規カードが正しく表示されること
   (stage=「リタイアする」フィルタで表示されるか、question/outcome文言が
   崩れていないか)
5. `ctaUrl`(`/app`)・`articleUrl`(`/blog/housing-loan-fire`)がbasePath込みで
   正しいリンク先に遷移すること(実機クリックで確認)
6. 他の既存concern項目(特に`semi-retirement`)への影響がないこと

## 完了報告に含めるべき内容

- 変更したファイルパス(正確な実パス)
- `full-verify.js`・`tsc`の結果
- `/concerns`ページでの実機確認結果(スクリーンショット等があれば尚可)
- 他ステージのfeatured項目に意図しない変更が生じていないことの確認結果

## スコープ外(今回やらないこと)

- `prepay-vs-invest`ツール用の新規記事企画・執筆(別タスク)
- 既存11件のconcern項目の文言・stage・featured設定の変更
- `STAGE_LABELS`/`STAGE_ORDER`など型定義側の変更
