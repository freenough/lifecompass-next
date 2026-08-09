# 指示ファイル:記事内リンクの絶対URL→相対パス統一に向けた事前調査(投資フェーズのみ)

## 種別
調査専用(コード変更・記事変更なし)

## 背景
現在、ブログ記事内の内部リンクには2つの書き方が混在している:

- **パターンA**(9記事・21件):`/asset-simulator/...`から始まる相対パス
  → `applyBasePathToHtml()`内の`href="/(?!\/|asset-simulator\b)`という正規表現
    で正しく処理される(既にbasePath付き扱いとして除外される)
- **パターンC**(14記事・27件):`https://freenough-lifecompass.vercel.app/...`
  形式の絶対URL
  → `applyBasePathToHtml()`内の以下2つの変換に依存している:
    ```js
    .replace(/https:\/\/freenough-lifecompass\.vercel\.app\//g, `${SITE_URL}/`)
    .split(`${SITE_URL}/simulator`).join(`${SITE_URL}/app`)
    ```

パターンCの最終的な表示URLが正しく`/asset-simulator`配下を指すかどうかは、
**`SITE_URL`定数の中身次第**という外部依存状態になっている。この依存を解消し、
全記事をパターンAと同じ「素の相対パス」形式に統一することで、basePath付与を
1つの正規表現だけに一本化したい(最終形)。

このタスクでは実装は一切行わず、**現状把握のための調査のみ**を行う。

## 調査内容

### 1. `SITE_URL`定数の定義値を確認
`SITE_URL`がどこで定義されているか(想定:`src/lib/`配下の設定ファイル)を
特定し、実際の値(例:`https://www.freenough.com/asset-simulator`なのか
`https://www.freenough.com`のみなのか)を報告する。

### 2. パターンC全27件(14記事)の現状の実URLを確認
前回調査(パターンC 14記事27件、うち7記事13件は`/simulator`→`/app`表記済みに
先日修正済み)を踏まえ、残りの記事も含めて全27件の絶対URLを再度洗い出す。
それぞれのURLが最終的にどのパスに変換されるかを、`SITE_URL`の実際の値を
使って手計算(または実際にビルド後のHTML出力を確認)し、**現在404になって
いるものがないか**を確認する。

参考:前回修正済みの7記事は`4percent-rule.md`, `dual-income-couple-fire.md`,
`fire-checklist.md`, `fire-inflation-sensitivity.md`, `ideco-nisa.md`,
`montecarlo-simulation.md`, `withdrawal-strategy-comparison.md`。残る7記事
(パターンC該当だが未修正)も洗い出し対象に含めること。

### 3. パターンA形式(相対パス)へ統一した場合の変換シミュレーション
パターンC全27件を仮に`/asset-simulator/...`形式の相対パスに書き換えたと
仮定した場合、それぞれ変換後にどのURLになるかをリストアップする
(実装はしない、机上シミュレーションのみ)。

### 4. `applyBasePathToHtml()`から削除可能になるロジックの特定
全記事がパターンA形式に統一された場合、以下2つの処理が不要になり削除
できると想定されるが、他に依存箇所(記事以外、例:固定ページや
コンポーネント内)がないか確認する:

```js
.replace(/https:\/\/freenough-lifecompass\.vercel\.app\//g, `${SITE_URL}/`)
.split(`${SITE_URL}/simulator`).join(`${SITE_URL}/app`)
```

`grep`等でリポジトリ全体を検索し、この2つの変換に依存している箇所が
記事以外にもないか確認すること(あれば報告に明記、それらは今回の統一
作業のスコープに含めるべきか、次回の設計判断材料として記録)。

### 5. AffiliateLinkコンポーネント等、記事以外の絶対URL使用箇所の再確認
前回調査で「AffiliateLinkコンポーネント由来のリンクは全て外部a8.net URLで
無関係」と確認済みだが、念のため今回のスコープ(社内ドメインのURL統一)に
影響する箇所が他にないか、`freenough-lifecompass.vercel.app`または
`freenough.com`を含む文字列でリポジトリ全体を検索し、記事(`src/content/blog/`)
以外でのヒットがあれば報告する。

## スコープ外(やらないこと)
- 記事内容の変更
- `applyBasePathToHtml()`の実装変更
- `SITE_URL`定数の変更
- Git commit/push

## 完了報告に含めるべき事項
- `SITE_URL`の実際の定義値と定義ファイルのパス
- パターンC全27件(14記事)の現状URL一覧と、現在404になっているものの有無
- 全27件を相対パスに統一した場合の変換後URLシミュレーション結果
- `applyBasePathToHtml()`内の2つの変換ロジックが記事以外で使われている箇所の有無
- 記事以外での`freenough-lifecompass.vercel.app`/`freenough.com`文字列の使用箇所(あれば)
- 総合所感:全記事を相対パス統一する作業の想定スコープ(影響ファイル数・作業規模感)
