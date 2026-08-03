# 投資調査指示書: topics/primaryTopicフィールドの実態調査

作成日: 2026-08-03
種別: investigation-only(実装・ファイル変更は一切行わないこと)

---

## 背景

retirement-tax記事の実装完了報告で、以下の記述があった:

> src/content/blog/retirement-tax-net-amount.md — copied the draft, adding the
> missing slug, primaryTopic: "retirement_tax", topics: ["retirement_tax"]
> fields (the draft lacked these; without them the retirement-tax tool page's
> crosslink section and the blog's related-posts algorithm — both keyed on
> topics — would have silently skipped this article)

つまり、`topics`/`primaryTopic`という、このチャット側では把握していなかった
フィールドが既にBlogPostMeta型に存在し、かつツールページのクロスリンクや
関連記事アルゴリズムのキーとして実際に使われている、ということが分かった。

これは、直近のセッションで議論していた「category軸(FIRE基礎知識/シミュレーター
活用)をtopicベースの軸(教育費/退職金/NISA/iDeCo/年金など)に置き換えるべきか」
という将来検討事項と重複・あるいは先行する仕組みである可能性が高い。
この機能の実態を把握しないまま、将来のカテゴリ軸見直しを判断すると、
車輪の再発明や設計の二重化が起きるリスクがあるため、まず現状を正確に調査する。

---

## 調査してほしいこと

### 1. フィールドの定義

- `topics`・`primaryTopic`はどの型定義ファイルに存在するか(`BlogPostMeta`型、
  またはそれに類する型定義の場所)
- それぞれの型(単数の文字列か、配列か、Union型で許容される値が固定されているか、
  自由記述の`string`型か)
- `retirement_tax`のような値の命名規則(スネークケース?ハイフン?)が
  どこかに定義・制約されているか(TypeScriptのUnion型リテラルで制限されている場合、
  そのリストを全て報告してほしい)

### 2. 既存記事での設定状況

- 全13(+今回のretirement-tax記事で14)記事のうち、`topics`/`primaryTopic`が
  設定されている記事は何本か、設定されていない記事は何本か
- 設定されている場合、各記事にどんな値が入っているか一覧で報告してほしい
  (例: 4percent-rule.md → topics: [...])
- 未設定の記事がある場合、それらの記事は関連記事アルゴリズム・クロスリンクの
  対象から実質的に除外されている状態なのか(今回のretirement-tax記事の
  ケースと同様の問題が既に他の記事でも起きている可能性がないか)

### 3. 使われ方(クロスリンク・関連記事アルゴリズム)

- 「retirement-taxツールページのクロスリンクセクション」の実装箇所
  (ファイルパス・コンポーネント名)と、`topics`をどう参照しているか
- 「ブログの関連記事アルゴリズム」の実装箇所と、`topics`をどう参照しているか
  (完全一致か、部分一致か、スコアリングのようなロジックがあるか)
- この2つの機能以外に、`topics`/`primaryTopic`を参照している箇所が
  他にもあるか(例: サイトマップ、SEO関連、将来のフィルタUIなど)

### 4. category(FIRE基礎知識/シミュレーター活用)との関係

- `topics`/`primaryTopic`と、既存の`category`フィールドは、コード上
  完全に独立した別のフィールドか、それとも何らかの関係・依存があるか
- ブログ一覧ページのUIには現在`topics`を使ったフィルタや表示は一切存在しないか
  (存在する場合、どこにどう表示されているか)

---

## 報告してほしい形式

- フィールド定義の詳細(ファイルパス・型)
- 全記事の設定状況一覧表(記事名 / topics値 / primaryTopic値 / 設定有無)
- クロスリンク・関連記事アルゴリズムの実装概要(ファイルパス・ロジックの要約)
- categoryフィールドとの関係の有無
- 「このフィールドが将来のtopic軸カテゴリ検討にそのまま使えそうか、
  それとも別物として扱うべきか」についてのClaude Code自身の所感があれば
  併記してほしい(調査結果に基づく感想の範囲でよい)

---

## 注意事項

- **この指示書は調査専用。ファイルの作成・変更は一切行わないこと**
- 独自に推測で埋めず、コード上で確認できたことのみを報告すること
- 完了後、この指示書は`docs/fixes/active/`から`docs/fixes/done/`へ移動してよい
