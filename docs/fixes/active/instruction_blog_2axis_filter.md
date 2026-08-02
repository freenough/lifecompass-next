# 実装指示: ブログ一覧の2軸フィルタ(category × stage)+ tagsフィールド削除

## 背景

investigation結果を踏まえ、以下を実装する。フィルタ機能は既存に前例が無いため新規実装、`tags`は不要なフィールドとして削除する。

---

## 1. `tags`フィールドの削除

- `src/lib/blog.ts` の `BlogPostMeta` インターフェースから `tags?: string[]` を削除
- 13記事全てのfrontmatterから `tags:` の行を削除
- `tags` を参照している箇所がコード中に無いか確認(investigation結果では「どこにも読まれていない」とのことだが、削除前に念のため grep で再確認すること)

---

## 2. `stages: ConcernStage[]` フィールドの追加

- `src/data/concerns.ts` で定義済みの `ConcernStage` 型(`'saving' | 'deciding' | 'receiving' | 'drawdown'`)をそのまま import して再利用する(新しい型を作らない)
- `BlogPostMeta` に `stages: ConcernStage[]`(必須、配列、1つ以上)を追加
- `getAllPosts()` / `getPostBySlug()` のfrontmatterパース処理に `stages` を追加(`category` のparseと同様の書き方に合わせる)
- 型のバリデーション(配列の各要素が `ConcernStage` の値のいずれかであること)があれば既存の `category` チェックと同様の形で追加

### 13記事へのstages割り当て(frontmatterに追記する値)

| slug | stages |
|---|---|
| `4percent-rule` | `['saving', 'drawdown']` |
| `ideco-nisa` | `['saving']` |
| `montecarlo-simulation` | `['saving']` |
| `fire-checklist` | `['saving']` |
| `withdrawal-strategy-comparison` | `['drawdown']` |
| `fire-inflation-sensitivity` | `['drawdown']` |
| `semi-retirement-blank-period` | `['deciding', 'drawdown']` |
| `dual-income-couple-fire` | `['deciding']` |
| `nisa-monthly-investment` | `['saving']` |
| `nisa-achievement-age` | `['saving']` |
| `pension-timing` | `['receiving']` |
| `education-cost-fire-simulation` | `['saving', 'drawdown']` |
| `compound-interest-rate-vs-years` | `['saving']` |

---

## 3. ブログ一覧の2軸フィルタ実装

### 現状(investigation結果より)

`src/app/blog/page.tsx` はサーバーコンポーネントで、`getAllPosts()` を呼び全記事をフラットな `<ul>` に描画するのみ。フィルタUIは無く、`category` はカード上の静的バッジ表示のみ(クリック不可)。

### 実装方針

- `src/app/blog/page.tsx` はサーバーコンポーネントのまま維持(`getAllPosts()` の呼び出しは変更しない)
- 記事一覧の描画部分を新規クライアントコンポーネント `BlogListClient`(仮名)に切り出す
  - Props: `posts: BlogPostMeta[]`
  - 内部で `useState` を2つ持つ:
    - `selectedCategory: string`(初期値 `'all'`)
    - `selectedStage: ConcernStage | 'all'`(初期値 `'all'`)
  - この2つの `useState` パターンは、`Header.tsx` のモバイルメニュー用 `useState` と同様の書き方に揃える(このリポジトリにURLクエリパラメータ駆動のフィルタ前例が無いため、useState方式で統一する)
  - フィルタUIは2段のボタン行:
    1. `すべて` / `FIRE基礎知識` / `シミュレーター活用`(`category` を選択)
    2. `すべて` / `貯める` / `リタイアする` / `受け取る` / `取り崩す`(`stage` を選択、ラベルは `concerns.ts` の `STAGE_LABELS` をそのまま再利用。`STAGE_LABELS`側は`id: 'deciding'`の表示名を「リタイアする」に変更済みであること前提)
  - 絞り込みロジック(AND、両方独立):
    ```
    posts.filter(p =>
      (selectedCategory === 'all' || p.category === selectedCategory) &&
      (selectedStage === 'all' || p.stages.includes(selectedStage))
    )
    ```
  - 絞り込み結果が0件の場合、記事グリッドの代わりに「該当する記事がありません」等のメッセージを表示し、両方のフィルタを `'all'` に戻すリセットボタンを添える

### 見た目

- フィルタボタンの見た目は、既存のバッジ(`category` バッジ)のスタイルや、他ページのボタンスタイルと大きく乖離しないよう既存クラスを踏襲する
- 選択中のボタンは非選択のものと視覚的に区別できるようにする(色反転など)

---

## 4. 確認事項

- `tsc --noEmit` クリーン、`next build` 成功
- `full-verify.js` 37/37 PASS維持
- 2軸フィルタの組み合わせをいくつか実際に試し、AND絞り込みが意図通り動作するか確認(特に0件になる組み合わせでのメッセージ表示)
- 目視確認が必要な項目(スクリーンショットで報告してほしい):
  1. フィルタボタンの見た目(選択中/非選択の区別)
  2. 0件時のメッセージ+リセットボタンの表示
