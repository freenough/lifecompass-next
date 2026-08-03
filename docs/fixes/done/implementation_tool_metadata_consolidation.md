# 実装指示書:ツールメタデータの単一情報源化(TOOLS配列の分散解消)

作成日: 2026-08-03
背景: ブログフィルタ再設計作業中に発見された技術的負債への対応。
このチャットでの決定事項(ChatGPTのレビューコメントを踏まえた案C採用)を反映済み。
方向性は確定しているため、本指示書は調査ではなく直接実装フェーズとする。

## 背景・問題

- 7つのツールページ(`src/app/tools/{compound,monthly-investment,fire-age,
  pension-timing,retirement-tax,ideco-withdrawal,education-cost}/page.tsx`)が、
  それぞれ`src/app/tools/page.tsx`の`TOOLS`配列にある値(topics等)を
  **手動でコピーして**各ページ内に個別に保持している
- 型による強制がないため、`TOOLS`配列側を将来変更・追加しても各ページの複製が
  追随せず、ビルドエラーにもならずにサイレントにズレる
- 今回のブログフィルタ改修時に7ツール全ページを目視確認した際に偶然発覚した問題で、
  通常の開発フローでは気づきにくい

## 決定した方針(案C)

topicsだけを切り出す(案B)のではなく、**`TOOLS`配列そのもの(slug/title/
description/topics等、ツールの全メタデータ)を単一の共有ファイルに切り出す**。
理由:topicsは「ツールというエンティティが持つ属性の一つ」に過ぎず、属性単位で
切り出すとメタデータが複数箇所に分散する構造を新たに作ってしまうため。

## 実装タスク

### 1. `src/lib/toolMetadata.ts`を新規作成

- 現在`src/app/tools/page.tsx`にある`TOOLS`配列(slug, title, description,
  href, icon, topics など、現状保持している全フィールド)をこのファイルに移動
- 併せて、slugをキーにしたルックアップ用の`TOOL_MAP`をexportする:
  ```ts
  export const TOOL_MAP = Object.fromEntries(
    TOOLS.map((t) => [t.slug, t])
  );
  ```
- 型定義(`ToolItem`インターフェース、現状`src/app/tools/page.tsx`にある想定)も
  このファイルに移すか、re-exportする形で整理する(配置はClaude Codeの判断に委ねる)

### 2. `src/app/tools/page.tsx`の更新

- `TOOLS`配列の定義を削除し、`src/lib/toolMetadata.ts`からimportする形に変更
- 一覧表示のロジック自体は変更しない(データの参照元だけ変わる)

### 3. 各ツールページ(7ページ)の更新

- 各ページ内にハードコードされているTOPICS定数を削除
- 代わりに`TOOL_MAP['該当slug'].topics`を参照して`getRelatedPostsForTopics()`に渡す
- 例(compoundページの場合):
  ```ts
  import { TOOL_MAP } from '@/lib/toolMetadata';
  const topics = TOOL_MAP['compound']?.topics ?? [];
  ```
- 7ページすべてで同様の置き換えを行う

### 4. 確認事項

- 置き換え後、7ツールページの関連記事表示が**変更前と完全に一致する**ことを
  目視確認する(データの参照元を変えただけで、値自体は変えていないため一致するはず)
- ブログ一覧ページ・ツール一覧ページの表示にも影響がないことを確認する
  (`TOOLS`配列の移動のみで、内容自体は変更していないため影響なしのはず)

## 制約・注意事項

- `simulate.ts`・`analyze.ts`には一切触れない
- `TOOLS`配列の**中身(各ツールのtopics値・title・description等)は一切変更しない**。
  今回はあくまで「どこに定義されているか」の整理であり、値の変更は対象外
- ブログ側の`blogTopics.ts`(前回の改修で新設)とは無関係の別ファイルとして扱う。
  統合・共通化は今回のスコープ外
- 既存のブログ記事frontmatter・`concerns.ts`には影響を与えない

## 完了報告に含めるべき事項

- 変更したファイル一覧(関数/コンポーネント名で記載。行番号は不要)
- `full-verify.js`の結果(0 failures確認)
- 7ツールページの関連記事表示が変更前後で一致することの確認結果
- `TOOL_MAP`・型定義を最終的にどう配置したか(コードスニペットで報告)

## 完了後の対応

- この指示書は完了後`docs/fixes/done/`へ移動
- コミットは指示書内では明示しない。完了報告後、このチャット側で
  コミット可否を判断する(これまでの運用と同様)
