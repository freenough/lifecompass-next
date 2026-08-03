# 追加指示書:残り4ツールへのTools↔ブログ動的関連記事表示の適用

作成日:2026-08-01
種別:実装可(既存パターンの横展開)
前提:`implementation_link_taxonomy.md`(パートC)の完了報告を受けての追加対応

---

## 背景

前回の実装指示書パートC-4で「各ツールページ側で、自身のtopics/primaryTopicを使って
関連ブログ記事を検索・表示する」よう依頼したが、完了報告を確認したところ、
実際に`getRelatedPostsForTopics()`による動的表示に切り替わったのは
`retirement-tax`・`ideco-withdrawal`・`pension-timing`の**3ツールのみ**だった
(この3つは前回「孤立ツール」として個別に扱っていたため)。

指示書側で「全7ツール対象」であることを明示していなかったための対応漏れであり、
Claude Code側のミスではない。今回、残り4ツールに同じ対応を横展開する。

---

## 対象ツール(4つ)

- `monthly-investment`
- `fire-age`
- `compound`
- `education-cost`

---

## やること

### 1. 現状調査
各ツールの関連記事表示部分(`RelatedArticles`コンポーネントの呼び出し箇所)が、
現状どうなっているか確認する:
- 旧ハードコード配列がそのまま残っているか
- 配列の中身が空か、古い記事名が入ったままか
- コンポーネント自体が呼ばれていないケースがないか

### 2. 実装
`retirement-tax`・`ideco-withdrawal`・`pension-timing`で使った実装パターン
(`page.tsx`で`getRelatedPostsForTopics()`をサーバー側で呼び出し、結果をpropsとして
`Tool→Cta`系クライアントコンポーネントへ渡す方式)を、そのまま4ツールに適用する。

各ツールの`primaryTopic`・`topics`は前回投入済みのデータをそのまま使用:

| ツール | primaryTopic | topics |
|---|---|---|
| monthly-investment | compound_interest | [nisa, compound_interest] |
| fire-age | fire_age | [fire_age] |
| compound | compound_interest | [compound_interest] |
| education-cost | education_cost | [education_cost] |

### 3. 動作確認(期待される出力の目安)

topics重なりで機械的に計算すると、以下のような記事が出るはずである
(実際のスコアリング結果と一致するか確認すること。一致しない場合は理由を報告):

| ツール | 重なりが期待される記事(参考) |
|---|---|
| monthly-investment | nisa-monthly-investment, ideco-nisa, nisa-achievement-age, withdrawal-strategy-comparison, compound-interest-rate-vs-years |
| fire-age | nisa-achievement-age |
| compound | compound-interest-rate-vs-years |
| education-cost | education-cost-fire-simulation |

`monthly-investment`は該当候補が5件あり`limit`(デフォルト3)を超えるため、
スコアリング上位3件が表示されることを確認する(どの3件が選ばれたかを報告に含める)。

### 4. 確認事項
- `full-verify.js`が0件失敗であること
- 7ツール全ページで実際にサーバーレンダリングされたHTMLを確認し、
  関連記事セクションの中身(記事タイトル一覧)を報告に含める
  (前回同様、curlでの取得または同等の確認方法でよい)
- 旧ハードコード配列が完全に削除されていること(コード上に残骸が残らないこと)

---

## 完了報告に含めること

- 変更ファイル一覧
- 4ツールそれぞれで実際に表示された関連記事タイトル一覧(サーバーレンダリング結果)
- 期待値表(上記3.)との差異があれば、その理由
- `full-verify.js`結果
