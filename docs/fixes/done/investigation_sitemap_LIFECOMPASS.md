# 調査依頼(シミュレーター側/lifecompass-next):AdSense「有用性の低いコンテンツ」原因調査

作成日:2026-08-01
対象リポジトリ:**lifecompass-next**(Vercelプロジェクト名:
`freenough-lifecompass`、`freenough.com/asset-simulator`配下を配信)
種別:**調査専用(実装は一切行わない)**

---

## 1. 背景

FREENOUGH全体(`freenough.com`)がAdSense審査で「有用性の低いコンテンツ」
により却下されている。原因調査の一環として、本リポジトリ
(`/asset-simulator`配下)のsitemap・ページ構成の実態を確認したい。

すでに判明している事実:

- `https://www.freenough.com/asset-simulator/sitemap.xml`
  (と推定されるURL)には、以下が含まれている:
  - `/asset-simulator`
  - `/asset-simulator/app`
  - `/asset-simulator/blog`(一覧)
  - `/asset-simulator/guide`
  - `/asset-simulator/methodology`
  - `/asset-simulator/disclosure`
  - `/asset-simulator/privacy-policy`
  - `/asset-simulator/disclaimer`
  - `/asset-simulator/about`
  - `/asset-simulator/blog/`配下の記事10本
    (pension-timing, nisa-achievement-age, nisa-monthly-investment,
    dual-income-couple-fire, semi-retirement-blank-period,
    fire-inflation-sensitivity, withdrawal-strategy-comparison,
    fire-checklist, montecarlo-simulation, ideco-nisa, 4percent-rule)
- **ただし、ツールページ(`/asset-simulator/tools/monthly-investment`、
  `/asset-simulator/tools/fire-age`、`/asset-simulator/tools/compound`と
  推定)が、このsitemap.xmlに1件も含まれていない**。これらのツールページは
  実在するはずで(過去のプロジェクト記録では相応の解説文・CTA・
  AffiliateLinkを含む実コンテンツがある)、sitemap上だけ不可視になっている
  状態

---

## 2. 調査してほしいこと

### 2-1. sitemap.ts(またはsitemap.xml生成ロジック)の実装確認

- `sitemap.ts`(または相当ファイル)の実装内容を確認し、ツールページ
  (`/tools/*`)がなぜ含まれていないのか原因を特定すること
  - ツールページの実装自体は存在するか(存在する場合、正確なURLパスを
    すべて報告すること。過去の記録では
    `/asset-simulator/tools/fire-age`というパス表記も見られたため、
    実際の正確なパスを確認すること)
  - sitemap生成ロジックの対象ディレクトリ/データソースにツールページが
    含まれていない設計になっていないか(ブログ記事は動的列挙されている
    のに対し、ツールページのルーティング方式が異なるために対象外に
    なっている、といった構造的な原因がないか)

### 2-2. 全ページの実在確認(ground truth の作成)

`/asset-simulator`配下で実際にビルド/ルーティングされている全ルートの
一覧を、コードベースから直接洗い出して報告すること(sitemapの中身では
なく、実際に存在するルート一覧)。特にツールページ配下の正確なURLパスを
明記すること。

### 2-3. robots.txtの確認

本リポジトリに独自の`robots.txt`(またはNext.jsのrobots生成ロジック)が
あるか確認し、あれば中身を報告すること。特に`/tools`配下を
disallowしていないか確認すること。

### 2-4. sitemapの構造確認

- 現在のsitemap.xmlが、`basePath`(`/asset-simulator`)を考慮した絶対URL
  (`https://www.freenough.com/asset-simulator/...`)を正しく生成できて
  いるか
- ツールページ追加時に、他の動的ページ(ブログ記事等)と同じパターンで
  追加できる設計になっているか、それとも別途対応が必要な設計かを報告

---

## 3. 絶対にやってはいけないこと

- **実装・修正は一切行わないこと**。本指示書は調査専用。sitemap.tsの
  修正などは、この後の実装フェーズで別途指示する
- 独自に再実装したスクリプトで検証しないこと。既存のコード・設定ファイルを
  読んで報告すること

---

## 4. 完了報告のフォーマット

1. sitemap.tsの現状実装と、ツールページが含まれない原因
2. 本リポジトリ(`/asset-simulator`配下)で実在する全ページURL一覧
   (ground truth、ツールページの正確なパス含む)
3. robots.txtの中身(disallow設定の有無、存在しなければその旨)
4. sitemap.xmlのbasePath/絶対URL生成方式の確認結果
5. 上記を踏まえた、次の実装フェーズで対応すべき項目の箇条書き(判断は
   KENZOとこのチャットで行うため、選択肢の提示に留め、独断で優先順位を
   つけないこと)

---

## 5. 補足

同時に`freenough-main`側にも同様の調査を別途依頼している
(`investigation_sitemap_MAIN.md`)。両方の結果が揃った時点で、
このチャットで統合して次の実装方針を決める。
