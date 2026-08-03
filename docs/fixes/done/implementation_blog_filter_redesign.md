# 実装指示書:ブログ一覧フィルタ再設計(category廃止→topics主軸+stages維持)

作成日: 2026-08-03
前段の調査指示書(`investigation_blog_filter_redesign.md`、完了済み・`docs/fixes/done/`)を
踏まえた実装フェーズ。このチャットでの決定事項を反映済み。

## 決定事項サマリー(この指示書の前提)

- `category`(FIRE基礎知識/シミュレーター活用)をフィルタ軸から廃止する
- `topics`(12種、スコアリング専用フィールド)は**一切変更しない**。frontmatterも
  型定義もそのまま。新たに「表示用グループへの静的マッピング表」をコード側に
  1つ追加するのみ(調査結果の「第3の選択肢」を採用)
- `stages`はフィルタ軸としてそのまま維持
- 新2軸構成:「主題(topicsを5グループに集約した表示用ラベル)」×「ステージ(stages)」
- グループ判定は**primaryTopicではなくtopics配列全体**で行う(1記事が複数グループに
  同時所属してよい。stage軸の`.includes()`判定と同じ考え方)
- category軸削除に伴い、フィルタバーからcategoryタブを削除する。ただし記事カード上の
  categoryバッジ表示(既存実装、96〜111行目付近)はそのまま残す(変更不要)

## 確定した5グループ構成

| 表示グループ | 対応する topics 値 | 該当記事数(participant) |
|---|---|---|
| NISA・積立投資 | `nisa`, `compound_interest` | 3 |
| iDeCo・退職金 | `ideco`, `retirement_tax` | 2 |
| 年金・老後の資産計画 | `pension`, `withdrawal`, `dual_income` | 4 |
| 教育費 | `education_cost` | 1(先行枠。今後の記事追加を見込み維持) |
| シミュレーションの考え方 | `montecarlo`, `fire_basics`, `inflation`, `fire_age` | 4 |

**重要**:`dual_income`は当初案(iDeCo・退職金グループ)から「年金・老後の資産計画」グループへ
配置変更済み。理由:`dual-income-couple-fire.md`の本文は共働き夫婦の退職タイミングと
資産推移が主題で、iDeCo・退職金の話は一切登場しないため。実装時にこの対応表を
間違えないよう注意すること。

## 実装タスク

### 1. トピック→表示グループのマッピング定数を新規追加

- 配置場所:`src/lib/blog.ts`など、既存の`topics`関連ロジックに近い場所が適切
  (具体的な配置はClaude Codeの判断に委ねる)
- 内容:上記5グループ表をコード上のマッピング定数として実装。
  例:`TOPIC_GROUP_MAP: Record<string, string>`のような形で、
  12種のtopics値それぞれが5グループのいずれかに対応する形
- 記事の`topics`配列から、該当する表示グループの集合を導出するヘルパー関数も
  合わせて実装する(例:`getDisplayGroupsForPost(post): string[]`)。
  1記事のtopicsが複数グループにまたがる場合は複数グループを返す
- **frontmatter・`BlogPostMeta`型定義への変更は一切行わない**

### 2. `BlogListClient.tsx`の改修

- 現状:`selectedCategory: string`(単一選択)と`selectedStage: ConcernStage | 'all'`
  (単一選択、判定は`.includes()`)の2軸
- 変更後:
  - `selectedCategory`関連のstate・`CATEGORY_OPTIONS`定数・フィルタ判定式の
    該当項をすべて削除
  - 新たに`selectedTopics: string[]`(複数選択可能、初期値は空配列=フィルタなし)を追加
  - フィルタUIをタブ形式からトグル可能なタグ形式に変更
    (クリックで配列に追加/削除。既存のstage軸ボタンのUIパターンを流用してよい)
  - 判定式:`(selectedTopics.length === 0 || getDisplayGroupsForPost(post).some(g => selectedTopics.includes(g))) && (selectedStage === 'all' || post.stages.includes(selectedStage))`
    のようなOR/AND混在ロジックになる想定(タグは複数選択でOR、ステージは単一選択)
- 記事カード上の既存categoryバッジ表示はそのまま維持(変更しない)
- **各フィルタグループにラベルテキストを追加する**:
  - 上段(topics由来のタググループ)の上に「テーマで絞り込む(複数選択可)」
  - 下段(stage)の上に「ステージで絞り込む」
  - モバイルでの折り返し時にも、ラベルによってどこまでが上段グループ・
    下段グループかが視覚的に固定されるようにするため
- **形状は上段・下段で統一する(変更しない)**。単一/複数選択の違いはラベル文言と
  選択時の挙動(下記チェックマーク)で示す。ボタンのborder-radius等の形状差別化は
  今回行わない
- 上段(topics複数選択)のタグは、選択済み状態でチェックマークアイコン
  (Tabler `ti-check`など、既存アイコンライブラリがあればそれに準拠)を表示し、
  「これは複数選択可能」であることが操作時に体感的に伝わるようにする。
  下段(stage単一選択)は既存の見た目(選択中は塗りつぶし表示)のままでよい

### 3. リード文言の差し替え

- 対象:`src/app/blog/page.tsx` 20行目付近の`<p>`要素のみ
- 変更前:「FIREと資産形成の情報を発信しています。」
- 変更後:「制度の解説だけでなく、独自シミュレーターでの試算結果もあわせて紹介しています。」
- `<h1>`(見出し「ブログ」)は変更しない
- `metadata.description`(8行目)・RSSフィードの`<description>`(`src/lib/blog.ts`294行目)は
  **今回のスコープ外。変更しない**(別途、後片付けバックログで扱う)

### 4. ツール側クロスリンクへの影響確認(変更は行わない)

- 7ツールページ(`src/app/tools/{compound,monthly-investment,fire-age,pension-timing,
  retirement-tax,ideco-withdrawal,education-cost}/page.tsx`)が使う
  `getRelatedPostsForTopics(topics)`のロジック・呼び出し元は**一切変更しない**
- 実装完了後、念のため7ツールページの関連記事表示が今回の変更前後で
  同じ結果になることを目視確認し、完了報告に一言添えること
  (12種のtopics値・スコアリングロジック自体は無変更のため、結果は変わらないはず)

## 制約・注意事項

- `simulate.ts`・`analyze.ts`には一切触れない
- 既存14記事のfrontmatterは一切変更しない
- `concerns.ts`・LP側の悩みブロック実装には影響を与えない
- 完了報告には以下を明記すること:
  - 変更したファイル一覧(関数/コンポーネント名で記載。行番号は不要)
  - `full-verify.js`の結果(0 failures確認)
  - ツール側クロスリンクの目視確認結果(上記4番)
  - 5グループのマッピング定数が最終的にどう実装されたか(コードスニペットで報告)

## 完了後の対応

- この指示書は完了後`docs/fixes/done/`へ移動
- 「TOOLS配列とツールページ側TOPICS定数の手動複製がズレるリスク」は今回のスコープ外の
  既存の技術的負債。今回の実装が完了してから、別途「軽微な後片付け」バックログに
  追加する(今回の指示書には含めない)
