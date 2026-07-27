# 指示書:ブログ記事10本目 公開配置

## 目的

作成済みの記事ファイル(`nisa-achievement-age.md`)とキャプション自動スタイリング
機能(`instruction_blog_image_caption_style.md`で実装済みのもの)を前提に、
記事10本目を公開可能な状態まで配置・検証する。

9記事目公開時(`instruction_article9_publish.md`)と同じ手順を踏襲すること。

---

## 1. frontmatterのフィールド名確認・修正

このチャットで作成した`nisa-achievement-age.md`のfrontmatterは以下の想定で
書かれているが、**実際のスキーマと異なる可能性が高い**。9記事目公開時にも
同様の不一致(`image`→`eyecatch`、`meta_description`→`description`、`date`欠落)が
見つかり、Claude Codeの判断で実装に合わせて修正した実績があるため、今回も
同様に対応すること。

```yaml
title: "新NISA、今のペースで積み立てたら何歳で3,000万円に届く?"
description: "..."
category: "シミュレーター活用"
slug: "nisa-achievement-age"
image: "/images/blog/nisa-achievement-age/eyecatch.png"
```

- 既存の公開済み記事(例:`nisa-monthly-investment.md`)のfrontmatterと
  フィールド名・型を突き合わせ、一致するように修正する
- `date`フィールドが必須な場合は、実際の公開日(本日)を追加する
- `slug`がファイル名から自動生成される仕組みの場合、frontmatter側の
  `slug`フィールドは不要な可能性がある。既存記事の実装パターンに合わせること

## 2. ファイル配置

- 記事本体:`src/content/blog/nisa-achievement-age.md`
- 画像:`public/images/blog/nisa-achievement-age/`配下
  (`public/images/`直下ではないので注意。9記事目で同様の思い違いがあった)
  - `eyecatch.png`(またはfrontmatterで指定した実際のファイル名)
  - `asset-distribution.png`(モンテカルロ分布図。本文中で参照している
    パスと一致させること)

※画像自体はまだ実ファイルが用意できていない場合がある。その場合は
プレースホルダー画像で配置してビルドが通ることだけ先に確認し、実画像は
差し替え可能な状態にしておくこと。

## 3. 画像キャプションのスタイリング確認

`instruction_blog_image_caption_style.md`の実装が本記事に正しく適用されて
いるかを確認する。

- 本文中の以下の1箇所が対象:
  ```markdown
  ![55歳時点の資産分布(モンテカルロ法・1,000試行)](/images/blog/nisa-achievement-age/asset-distribution.png)

  *本図は分布のイメージを示すものであり、各点の間隔は正確な縮尺ではありません。*
  ```
- ビルド後のHTML出力で、キャプション段落に`img-caption`クラス(または
  実装した実際のクラス名)が付与されているか確認する
- 本文中の通常のイタリック表現(本記事には現時点でないが、将来の記事のために)
  誤って小フォント化されていないことも合わせて確認する

## 4. 検証

- `scripts/full-verify.js` を実行し、既存フィクスチャ回帰に影響がないことを確認
- `scripts/check-raw-html-in-blog.js` を実行し、`<AffiliateLink>`以外の生HTMLが
  残っていないことを確認
- ローカルビルド(`npm run build`等)が通ることを確認

## 5. 内部リンクの相互設置

- 9記事目(`nisa-monthly-investment.md`、実際のファイル名は要確認)の末尾または
  関連箇所に、10記事目へのリンクを追加する
- 逆に10記事目側にも9記事目へのリンクがすでに本文冒頭にある
  (「前回の記事」として言及済み)ので、リンク先URLが正しいか確認する
  (このチャットでは`/blog/monthly-investment-amount`という仮のスラッグを
  使っているため、実際のスラッグに置き換えが必要)

## 6. 完了報告フォーマット

```
## 完了報告:記事10本目 公開配置

### frontmatter修正内容
(修正前→修正後を明記)

### ファイル配置
- 記事本体: (実際のパス)
- 画像: (実際のパス、プレースホルダーか実画像かも明記)

### 検証結果
- full-verify.js: PASS / FAIL
- check-raw-html-in-blog.js: PASS / FAIL
- ローカルビルド: 成功 / 失敗

### 内部リンク
- 9記事目→10記事目リンク追加: 済 / 未
- 10記事目→9記事目リンクのURL修正: 済 / 未

### 備考
(画像がプレースホルダーの場合、本番デプロイ前に実画像への差し替えが
必要である旨を明記)
```
