# 実装指示書:住宅ローン+FIRE記事の公開配置+topicsグループ追加

作成日: 2026-08-05
種別: 実装(コミット・pushはこのチャットの明示判断を待つこと。このタスクでは行わない)
対象リポジトリ: lifecompass-next

---

## タスク1:`blogTopics.ts`への新規グループ追加

`src/lib/blogTopics.ts`の`TOPIC_GROUPS`配列に、以下のグループを追加すること。

```ts
{ label: '住宅・ローン', topics: ['housing_loan'] },
```

追加位置は既存5グループの末尾でよい。他ファイルの変更は不要(先行調査で
`BlogListClient.tsx`はグループ数非依存のflex-wrapレイアウトのため、UI側の
改修は発生しないことを確認済み)。

---

## タスク2:記事の公開配置

### frontmatter(確定)

```yaml
title: "住宅ローンを抱えたままFIREしても大丈夫?3パターンでシミュレーションして比較してみた"
slug: housing-loan-fire
category: "シミュレーター活用"
topics: ["housing_loan"]
description: "住宅ローンを抱えたままFIREすべきか、繰り上げ返済してから辞めるべきか。資産シミュレーターで3パターン(賃貸継続/ローン残しFIRE/完済後FIRE)を比較し、モンテカルロ法で破綻確率を試算しました。"
eyecatch: /images/blog/housing-loan-fire-eyecatch.png
date: 2026-08-05
```

(dateは実際の公開予定日に合わせて調整して構わない)

### 本文

このチャットで作成済みの本文ドラフト(添付`housing-loan-fire-draft.md`)を使用する。
本文中の見出し構成・数値・UTMリンク(`utm_campaign=housing_loan_blog`)はすべて
確定済みのため、変更せずそのまま使用すること。

### 画像

`eyecatch: /images/blog/housing-loan-fire-eyecatch.png`および本文中2枚の画像
(資産推移グラフ・モンテカルロ枯渇確率グラフ)は、このチャット側で画像生成プロンプトを
別途用意し、KENZOがChatGPT/Geminiで生成後に配置する。**このタスクの実行時点では
画像ファイルがまだ存在しない可能性が高い。** 画像未配置の場合:
- 記事本体の配置・frontmatter確認・`full-verify.js`実行は画像なしでも進めてよい
  (`full-verify.js`が画像ファイル存在チェックを含む場合はその項目のみFAILとして報告し、
  他の検証は通常通り実施すること)
- 画像配置後に再度`full-verify.js`を実行し、全PASSを確認する(これは今回のタスクの
  範囲外、次回の指示で行う)

---

## タスク3:画像生成用の年次データ抽出(このタスクに含む)

このチャットが画像生成プロンプトを作成する際に、資産推移グラフの正確な数値が必要。
前回のデータ収集タスクで出力済みの以下3ファイルから、35/40/45/50/55/60/65/70/75/80/85/90歳
時点の資産総額(万円、整数に丸めてよい)を抽出し、表形式で報告すること:

- `docs/fixes/active/housing_loan_output/pattern1_35to90.csv`
- `docs/fixes/active/housing_loan_output/pattern2_35to90.csv`
- `docs/fixes/active/housing_loan_output/pattern3_35to90.csv`

パターン1(賃貸)は82歳で資産が0になるため、82歳の行も追加で抽出すること。

報告フォーマット例:

| 年齢 | パターン1(賃貸) | パターン2(35年ローン) | パターン3(20年ローン) |
|---|---|---|---|
| 35 | | | |
| 40 | | | |
| ... | | | |
| 90 | | | |

---

## 検証

- `full-verify.js`実行、結果を報告(画像未配置によるFAILは許容、その他は全PASS必須)
- `check-raw-html-in-blog.js`実行、結果を報告
- `tsc`クリーン確認

## このタスクのゴール

1. `blogTopics.ts`にグループ追加完了
2. 記事が`/asset-simulator/blog/housing-loan-fire`として配置完了(画像は後追いでも可)
3. タスク3の年次データ抽出結果の報告

**コミット・pushはこのタスクでは行わないこと。このチャットでの確認後、別途指示する。**
