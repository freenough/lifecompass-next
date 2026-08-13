# 完了報告:「退職後の住民税はいくら?」ブログ記事の公開

`docs/fixes/active/publish_taishoku_yokunen_juminzei.md` の実装。

## 1. frontmatterの確定

`src/content/blog/taishoku-yokunen-juminzei.md`に、既存記事(特に直近の`zaishoku-rourei-nenkin.md`・
`retirement-ideco-timing.md`・`pension-timing.md`)と同じスキーマ(`src/lib/blog.ts`の
`BlogPostMeta`)で正式なfrontmatterを記載した。

```yaml
title: "退職後の住民税はいくら?翌年も請求される仕組みと退職月別の試算"
date: "2026-08-14"
slug: "taishoku-yokunen-juminzei"
category: "シミュレーター活用"
description: "退職すると住民税はいつ・いくら発生するか。退職前年の年収600万円のケースを退職月(3月・6月・9月・12月)別に試算し、確保しておきたい現金の目安を解説します。"
eyecatch: "/images/blog/eyecatch-taishoku-yokunen-juminzei.png"
excerpt: "退職月によって変わる、確保しておきたい現金の目安"
stages: ["receiving"]
featured: false
readingTime: 6
primaryTopic: "resident_tax_timing"
topics: ["resident_tax_timing"]
```

(仮frontmatterにあった`publishedAt`という項目名は存在せず、実際のスキーマでは`date`が正しいフィールド名。
`BlogPostMeta`型を確認して修正した。)

### `category`:「シミュレーター活用」で確定
`src/content/blog/*.md`全19記事(`old/`除く)の`category`を実際に集計したところ、
「FIRE基礎知識」「シミュレーター活用」の2種類のみが使われており、後者が多数派(13/19記事)。
本記事は全ての数値が`resident-tax-timing`ツールの本番出力そのものであり、指示書が示した判定基準
(「記事の核となる数値が本番シミュレーター/ツール実出力由来か」)にそのまま合致するため、
「シミュレーター活用」を採用した(独自の判断ではなく、指示書の指定通り)。

### `topics`/`primaryTopic`:**新規に`"resident_tax_timing"`を採用(判断理由・要確認事項)**
指示書は「在職老齢年金記事(`pension`トピック)を参考にしつつ判断」としていたが、実際に調べた結果、
**`pension`をそのまま流用するのは不適切**と判断した。理由:

- `src/app/tools/resident-tax-timing/page.tsx`が`getRelatedPostsForTopics(TOOL_MAP['resident-tax-timing'].topics)`
  を呼んでおり、`toolMetadata.ts`側で`resident-tax-timing`ツール自体が既に
  `primaryTopic: 'resident_tax_timing'`・`topics: ['resident_tax_timing']`という**専用の独立トピック**
  を使っている(過去セッションで、退職金一時金の`retirement_tax`とは「別軸のため相乗りしない」と
  明示的に決めた経緯がある)。
- ツール側のトピックと記事側のトピックが完全一致していないと、`getRelatedPostsForTopics()`の
  スコアリング(トピック文字列の完全一致)が働かず、ツールページの「あわせて読みたい」に
  本記事が出てこない(逆に記事ページの関連記事にもツールが出てこない)。`pension`を使うと、
  この記事同士・記事⇔ツールの導線が事実上切れてしまう。

したがって、記事側も`primaryTopic: "resident_tax_timing"`・`topics: ["resident_tax_timing"]`とし、
ツールの既存トピックとの完全一致を優先した。**この判断について、KENZOさんに確認をお願いしたい点が
1つある**:今後この`resident_tax_timing`トピックを他の記事でも使う想定はあるか(単発なら現状のままで
問題ないが、シリーズ化する場合は`pension`グループとの関係を再整理した方がよいかもしれない)。

### `blogTopics.ts`への追加(表示グループの新規マッピング)
`resident_tax_timing`は`src/lib/blogTopics.ts`の`TOPIC_GROUPS`(ブログ一覧のフィルタUI用)に
存在しなかったため、追加しないとフィルタメニューから本記事が探せなくなる
(`getRelatedPostsForTopics()`のスコアリング自体はTOPIC_GROUPSに依存しないため機能はするが、
一覧ページの表示グルーピングには載らない)。CLAUDE.mdの設計原則
(「表示用途への転用はfrontmatter非変更が基本…コード側のマッピングテーブル(`blogTopics.ts`の
`TOPIC_GROUPS`)で対応する」)に従い、`topics`配列自体は変更せず、`blogTopics.ts`側に
`resident_tax_timing`を追加する形で対応した。

```diff
- { label: '年金・老後の資産計画', topics: ['pension', 'withdrawal', 'dual_income'] },
+ { label: '年金・老後の資産計画', topics: ['pension', 'withdrawal', 'dual_income', 'resident_tax_timing'] },
```

**判断理由(要確認)**:退職金一時金(`retirement_tax`)とは別軸という既存方針を踏襲し、
「iDeCo・退職金」グループには入れなかった。「年金・老後の資産計画」を選んだのは、本記事のテーマ
(退職後の資金繰りタイミング)が同グループ内の`pension`(年金受給タイミング)・`withdrawal`(取り崩し)
と読者の関心軸が近いと判断したため。新規に単独グループ(例:「税金」)を作る案も検討したが、
現時点で該当記事が1本のみのため見送った。**この分類が適切かはKENZOさんの確認をお願いしたい。**

### `slug`:添付時のファイル名`taishoku-yokunen-juminzei`をそのまま採用
既存slugは英単語が大半だが、`zaishoku-rourei-nenkin`という「対応する自然な英語表現がない日本語の
制度用語をローマ字化する」前例が既にあるため、本記事も同じパターンとして問題ないと判断した。

### `stages`:`["receiving"]`
`retirement-ideco-timing.md`・`pension-timing.md`という同じ「退職前後の受け取り」テーマの
既存記事と同じステージタグに揃えた。

## 2. 画像の配置

`public/images/blog/`(既存記事と同じ物理ディレクトリ)に、直近の命名規則
(`eyecatch-{slug}.png`/`inline-{slug}-{説明}.png`、`zaishoku-rourei-nenkin.md`・
`retirement-ideco-timing.md`が採用しているパターン)に合わせて改名・配置した。

| 元ファイル(`docs/fixes/active/`) | 配置先 |
|---|---|
| `eyecatch-juminzei-taimurag.png` | `public/images/blog/eyecatch-taishoku-yokunen-juminzei.png` |
| `juminzei-timeline-12gatsu.png` | `public/images/blog/inline-taishoku-yokunen-juminzei-timeline-12gatsu.png` |
| `juminzei-bar-600man.png` | `public/images/blog/inline-taishoku-yokunen-juminzei-bar-600man.png` |

frontmatter・本文中の画像参照は、他記事と同じくbasePathを含まないルート相対パス
(`/images/blog/...`)で記載した(`getAllPosts()`/`getPostBySlug()`側の`withBasePath()`・
`applyBasePathToHtml()`が配信時に自動でbasePathを付与するため)。

### ⚠ 画像サイズの相違点(要報告)
アイキャッチ画像(`eyecatch-juminzei-taimurag.png`)の実際のピクセルサイズを確認したところ、
**1264×843pxであり、記事コメント・指示書が主張していた「1536×1024px」ではなかった**
(PowerShellの`System.Drawing.Image`で実測)。他の2枚の図版(`juminzei-timeline-12gatsu.png`・
`juminzei-bar-600man.png`)はいずれも実測1536×1024pxで、記載通り。

ただし、**アスペクト比は1264:843 ≈ 1.4993、1536:1024 = 1.5と、実質的に同じ3:2比率**であるため、
`blog_article_template.md`が懸念するLPサムネイル枠のトリミング崩れ(比率が違うことによる意味のある
部分の欠落)は発生しない見込み(比率自体は正しいため)。実機のブラウザ確認でも、表示崩れは
確認されなかった(下記6.参照)。絶対解像度が小さい分、大きく引き伸ばして表示する用途では
やや解像度不足になる可能性があるが、現状のブログ記事の表示サイズでは視覚的な劣化は確認できなかった。
**この解像度の相違自体は本記事の公開をブロックする問題とは判断しなかったが、事実として報告する。**
気になる場合は、1536×1024pxで再生成したアイキャッチに差し替え可能。

## 3. 内部リンクの確認(basePath適用)

本文中の2箇所のツールリンク(mid-CTA・終盤CTA)について、実機で以下を確認した:

- レンダリング後のDOM上の`href`属性を直接検査し、いずれも
  `/asset-simulator/tools/resident-tax-timing?utm_source=blog&utm_medium=referral&utm_campaign=resident_tax_timing_blog`
  と、`/asset-simulator`のbasePathが正しく付与された状態になっていることを確認した。
- 実際に両リンクをクリックし、正しくツールページへ遷移すること、UTMパラメータがURLに保持されたまま
  遷移することを確認した(過去に判明していた「hrefにbasePathが適用されないケースがある」バグの
  再発なし)。
  - これは、記事内リンクが既に`/asset-simulator/tools/...`という形でbasePathを直接含めて
    書かれているため(`applyBasePathToHtml()`の`href="/(?!\/|asset-simulator\b)"`という
    否定先読み条件により、この形式は正規表現の書き換え対象から除外され、確実に安全)。
- UTMパラメータの命名規則(`utm_source=blog&utm_medium=referral&utm_campaign=resident_tax_timing_blog`)
  は、`blog_article_template.md`の規則(`utm_campaign={topic}_blog`)通り、記事のtopic
  (`resident_tax_timing`)と一致させた。

## 4. 関連記事セクションについて

本文末尾に手動の「関連記事」セクションは追加していない(サイト側で自動生成されるため)。

## 5. `concerns.ts`への追記チェック

`src/data/concerns.ts`の全14件を確認したが、「退職後の住民税」「resident-tax-timing」に
対応する既存カードは存在しなかった。指示書の記載通り(「該当する項目が現状なければ、対応不要」)、
**既存カードへの`articleUrl`追加は行っていない。**

なお、`concerns.ts`は「1ツール=1カード」の運用がほぼ徹底されており(`retirement-tax`・
`ideco-withdrawal`・`retirement-ideco-timing`等、`toolMetadata.ts`の各ツールに対応するカードが
存在)、`resident-tax-timing`ツールだけが唯一カードを持たない状態になっている。指示書の対象範囲
(既存カードへの追記チェックのみ)を超えるため今回は新規カードを作成していないが、**この
ギャップ自体は完了報告として明記しておく**(新規カード追加が必要かはKENZOさんの判断次第)。

## 6. ブラウザ実機確認

`http://localhost:3000/asset-simulator/blog/taishoku-yokunen-juminzei`で確認:

- タイトル・カテゴリバッジ(「シミュレーター活用」)・公開日(2026-08-14)が正しく表示
- アイキャッチ画像・2枚の本文中図版(タイムライン図・積み上げ棒グラフ)がいずれも正しく表示され、
  崩れなし
- 表の数値(3表:600万円退職月別、400/600/800万円比較)が全て表示通り
- 「今回の試算で分かったこと【結論】」「まとめ」の新規追加セクション(下記7.参照)を含め、
  全見出しが正しい順序でレンダリングされている
- 2箇所のCTAリンクのクリック遷移・basePath・UTMパラメータを確認(上記3.参照)
- ツールページ(`/asset-simulator/tools/resident-tax-timing`)の「あわせて読みたい」に本記事が
  表示されることを確認(トピックの完全一致による双方向リンクが機能していることの実証)
- ブログ一覧ページ(`/asset-simulator/blog`)で、フィルタ「年金・老後の資産計画」をクリックすると
  本記事が正しく表示されることを確認(`blogTopics.ts`への追加が機能していることの実証)

## 7. テンプレート準拠のための追加(指示書の範囲を超える構造上の補完)

添付されたドラフト(`taishoku-yokunen-juminzei.md`)を、直近3記事(`zaishoku-rourei-nenkin.md`・
`retirement-ideco-timing.md`・`pension-timing.md`)の見出し構成と突き合わせたところ、
`blog_article_template.md`が★必須と定めている2つの要素が欠けていることが分かった:

1. **「◯◯で分かったこと【結論】」の独立ブロック**(H2-4、単独引用可能な結論の明示。
   3記事とも例外なく含んでいた)
2. **「まとめ」セクション**(H2-7、3行程度の箇条書き。3記事とも例外なく含んでいた)

指示書は「既存のブログ記事と同じ構成・検証フローで公開する」ことを目的として明記していたため、
この2点を補完区分として追加した(元のドラフトの文章・数値は一切変更せず、新規の結論・まとめの
2ブロックのみを追加する形)。追加した「今回の試算で分かったこと【結論】」の数値は、記事内で既に
使われていた実出力データをそのまま再構成しただけで、新しい試算・独自の再計算は一切行っていない。

## 8. 使用した数値の照合(独自再計算がないことの確認)

記事内で使用されている12パターンの数値(400/600/800万円×3/6/9/12月退職の①②合計)全てを、
`docs/fixes/active/resident_tax_timing_article_data.md`(本番`calcResidentTaxTiming()`の実出力を
まとめたデータ収集結果)と1件ずつ突き合わせ、完全一致することを確認した。記事内に手計算・
独自再現の数値は混入していない。

## 9. 検証結果

- `npx tsc --noEmit`: エラーなし
- `node scripts/full-verify.js`: 全ブロックPASS(記事追加・`blogTopics.ts`変更が既存の検証に
  影響していないことを確認)
- `node scripts/check-raw-html-in-blog.js`: 本記事に関する警告なし(既存の別記事にあった
  無関係な警告〈`education-cost-fire-simulation.md`の`<br>`タグ〉のみ、本記事は影響なし)

## 10. チェックリスト充足状況(`publish_taishoku_yokunen_juminzei.md`記載分)

- [x] TL;DR(この記事の結論)がリード文の直後にあるか
- [x] 本文中盤・終盤にツールへのCTAがあるか(2箇所、実機クリック確認済み)
- [x] FAQが3〜5個、簡潔な回答で配置されているか(4問)
- [x] 使用した数値がすべて本番ツールの実出力からの引用であること(`resident_tax_timing_article_data.md`
      と全12パターン照合済み)
- [x] 「です・ます調」で統一されているか
- [x] 経験者的な言い切り表現になっていないか、断定表現には試算条件が明示されているか
      (「(退職後給与収入なし・独身・扶養家族なし・社会保険料控除を概算料率で考慮した場合)」等、
      条件を都度明示)
- [△] アイキャッチ画像が1536×1024px(3:2)であるか:**実測1264×843px(比率は3:2で一致、
      絶対サイズは相違)。上記2.参照**
- [x] 図版の主要数値が実データと一致しているか(実機確認・データ照合済み)
- [x] `full-verify.js`が全PASSであること

## 禁止事項の遵守

- 記事内の数値の独自再計算・手計算での修正は行っていない(データ収集結果との照合のみ)
- 本文末尾への手動の関連記事セクションは追加していない
- `docs/fixes/active/`フォルダは削除していない(本報告書もこのフォルダ内に作成)
