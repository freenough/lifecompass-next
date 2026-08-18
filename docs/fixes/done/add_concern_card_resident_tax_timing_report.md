# 完了報告:concerns.ts への resident-tax-timing ツール用カード新規追加

`docs/fixes/active/add_concern_card_resident_tax_timing.md` の実装。

## 実装内容

`src/data/concerns.ts`に、既存の「退職前後」テーマのカード(`retirement-tax`・`ideco-withdrawal`・
`retirement-ideco-timing`、いずれも`stage: 'receiving'`)と同じ構造・文体パターンで新規カードを追加した。

```ts
{
  id: 'resident-tax-timing',
  stage: 'receiving',
  question: '退職後の住民税はいつ・いくらかかる?',
  outcome: '退職月別に、確保しておきたい現金の目安を試算できます',
  ctaType: 'lightTool',
  ctaLabel: '60秒で試算する',
  ctaUrl: '/tools/resident-tax-timing?utm_source=concerns&utm_medium=concern_card&utm_campaign=resident_tax_timing',
  articleUrl: '/blog/taishoku-yokunen-juminzei',
  featured: false,
},
```

- **文言**:既存カードの「〜はいくら?」「〜どっちが得?」という質問形式(`retirement-tax`の
  「退職金はいくら手元に残る?」等)に合わせ、「退職後の住民税はいつ・いくらかかる?」とした。
  指示書のたたき台文言(「退職後、住民税がいつ・いくらかかるか分からない」)は文の途中で終わる
  不安表現の形だったため、既存カード群が一貫して採用している「疑問文」の形式に寄せて調整した。
  `outcome`も既存パターン(「〜を試算できます」)に合わせた。
- **リンク先**:`toolMetadata.ts`の`resident-tax-timing`エントリ(`href: '/tools/resident-tax-timing'`)
  を参照し、他のlightToolカードと同じUTM命名規則(`utm_source=concerns&utm_medium=concern_card&
  utm_campaign={id}`)を適用した。
- **`articleUrl`**:直近公開した`taishoku-yokunen-juminzei`記事(`/blog/taishoku-yokunen-juminzei`)
  を設定した。
- **配置位置**:既存配列は`stage: 'receiving'`の退職金・年金関連カード(`pension-timing`・
  `retirement-tax`・`ideco-withdrawal`・`retirement-ideco-timing`)がまとまって並んでいる。
  この意図的なテーマ順を尊重し、そのクラスタの最後尾(`retirement-ideco-timing`の直後、
  `education-cost`の直前)に新規カードを挿入した。既存13件の内容・順序は一切変更していない。

## 検証結果

- `npx tsc --noEmit`: エラーなし
- `node scripts/full-verify.js`: 全ブロックPASS(既存の検証への影響なし)

### ブラウザ実機確認(`/asset-simulator/concerns`)
- 「受け取る」ステージのセクション内、`retirement-ideco-timing`カードの直後に新規カードが
  既存カードと同じ表示形式(見出し・説明文・ボタン・「詳しく読む→」リンク)で正しく表示される
  ことを確認した。
- 「60秒で試算する」ボタンをクリックし、`resident-tax-timing`ツールページ
  (`/asset-simulator/tools/resident-tax-timing?utm_source=concerns&utm_medium=concern_card&
  utm_campaign=resident_tax_timing`、basePath・UTMパラメータとも正しい)へ遷移することを確認した。
- 「詳しく読む→」リンクをクリックし、`taishoku-yokunen-juminzei`記事ページへ正しく遷移することを
  確認した。

### 検証中に発見・対応した問題(本タスクのコード変更とは無関係)
実機確認の1回目で、上記2つのリンクがいずれも404エラーになる事象が発生した。調査したところ、
`tsc`・`full-verify.js`はいずれも問題なくPASSしており、コード側の不具合ではなく、**長時間
起動し続けていた開発サーバー(ポート3000、起動から約24時間・多数回のホットリロードを経た
プロセス)が内部的に壊れた状態になっていた**ことが原因と判明した(`/asset-simulator/tools`
という無関係な一覧ページも同時に404になっており、本タスクの変更が原因ではないことを確認済み)。
このセッションで過去に確立した手順(全Node.jsプロセスの一括終了は行わず、ポート3000・3001に
`LISTEN`していた該当PIDのみを特定して終了)に従い、開発サーバーを再起動したところ、
両リンクとも正常に動作することを再確認した。

## 禁止事項の遵守

- 既存13件のカードの内容・順序は変更していない(新規1件の追加のみ)
- `docs/fixes/active/`フォルダは削除していない(本報告書もこのフォルダ内に作成)
