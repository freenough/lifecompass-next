# 調査報告：サイト内リンクのutm撤去とGA4クリックイベントへの置き換え（現状調査）

調査日：2026-09-25
対象：`lifecompass-next`（main、`7705742`）、`freenough-main`（main、`61b540a`、読み取りのみ）
指示書：`investigation.md`（同じフォルダ）

---

## 0. 開始時の状態

- `lifecompass-next`：`main`。未追跡は `docs/fixes/active/investigation.md` と `docs/fixes/done/budoux-phrase-break/`
  - `docs/fixes/done/budoux-phrase-break/` は**未追跡**（Git管理外）のフォルダとして存在していた。調査の範囲外として触れていない
- `freenough-main`：`main`、`nothing to commit, working tree clean`
- 指示書が `docs/fixes/active/` 直下にあったため、KENZOの指示で次だけを実行した
  ```
  mkdir docs/fixes/active/internal-utm-to-ga4-event
  mv docs/fixes/active/investigation.md docs/fixes/active/internal-utm-to-ga4-event/investigation.md
  ```
- 本調査で作ったファイルは、このフォルダ内の `report.md`・`ga-stub-results.json`・`stub-*-after-click.png` のみ。
  一時スクリプトはリポジトリ外（Claude Codeのスクラッチパッド）に置いた。既存ファイルの変更・コミット・pushはしていない
- `localStorage.clear()` などの破壊的な操作はしていない。devサーバーはClaude Codeが起動したポート3100のものだけを、PIDを確認して停止した（ポート3000は調査開始時点で空いていた）

---

## 前提の確認（方針が崩れる事実はあったか）

**事実**：方針（サイト内のutmをすべてやめる）の前提を崩す事実は見つからなかった。

| 確認した前提 | 結果 | 根拠 |
|---|---|---|
| 両リポジトリの測定IDが同じ | **同じ** | 3節 |
| utmを読んで動作を変えている処理がない | **ない**（両リポジトリとも0件） | 4節 |

ただし、次の2点は実装の制約として把握が必要（詳細は各節）。

- お悩みカードのutmは **`src/data/concerns.ts`（ロックファイル）** に直書きされている（16件）
- ブログ記事本文のutm付きリンクは、ページの再読み込みを伴う `<a>` で、**クリックイベントが付いていない**

---

## 1. utmの全件洗い出し

### 1-1. 使ったコマンド

```
git -C lifecompass-next grep -I -i -c "utm" -- . ':!**/raw-data/**'
git -C freenough-main  grep -I -i -c "utm" -- . ':!**/raw-data/**'
```

`git grep` はGit管理下のファイルだけが対象のため、`node_modules`・`.next` は自動的に除外される。
Git管理外のファイルは、両リポジトリとも未追跡が上記の調査用フォルダとBudouXの実測フォルダだけで、コードは含まない。

**ヒットのうち、utmではないもの（誤検出）**

- `inputMode="decimal"`（大文字小文字を区別しない検索で `inp-utM-ode` が一致）：ツールのフォーム10ファイル・計13件
- `package-lock.json:2819`（`integrity` のハッシュ値の一部）
- `freenough-main/package-lock.json` の `es-set-tostringtag` 等は、`utm` を含まない（`gtag` の検索でのみ一致）

### 1-2. コード・定数（`lifecompass-next`）

URLを組み立てる関数・ヘルパーは**なかった**（`URLSearchParams` の使用はブログ一覧の絞り込み条件のURL化だけで、utmは扱わない。
`git grep -n -E "URLSearchParams|searchParams\.(set|append)" -- src scripts` の結果は `src/components/blog/BlogListClient.tsx:22,32,195` のみ）。
utmはすべて、完成したURL文字列の直書き。

| ファイル:行 | 種別 | リンク元のページ | リンク先 | サイト内/外部 | utmの値 | 同じクリックのGA4イベント |
|---|---|---|---|---|---|---|
| `src/app/hitori-hojin/page.tsx:105` | コード | 一人法人LP（下部CTA） | `/app?…`（`next/link`、basePath付与で `/asset-simulator/app`） | サイト内 | `source=hojin_lp`・`medium=referral`・`campaign=hitori_hojin_lp` | **なし** |
| `src/components/tools/*Cta.tsx:8`（10ファイル※1） | 定数（`SIMULATOR_HREF`） | 各ツールページ（10ツール） | `/app?…`（`next/link`） | サイト内 | `source=tools`・`medium=referral`・`campaign={ツール名}_tool` | `tool_to_simulator_cta_click`（パラメータなし） |
| `src/data/concerns.ts:36〜201`（16件、**ロックファイル**） | 定数（`ctaUrl`） | LPのお悩みブロック、お悩み一覧（`ConcernCard.tsx` 経由） | `/app?…` 5件、`/tools/…?…` 11件（`next/link`） | サイト内 | `source=lp`（4件）／`concerns`（12件）・`medium=concern_card`・`campaign={悩みのid}` | `concern_cta_click`（`concern_id`・`stage`・`cta_type`・`location`） |
| `src/app/privacy-policy/page.tsx:43` | 本文の文言 | プライバシーポリシー | —（リンクではない） | — | 「参照元URL・流入経路（UTMパラメータを含む）」 | — |

※1 `CompoundInterestCta`・`FireAgeCta`・`MonthlyInvestmentCta`・`education-cost/EducationCostCta`・`ideco-withdrawal/IdecoWithdrawalCta`・`pension-timing/PensionTimingCta`・`prepay-vs-invest/PrepayVsInvestCta`・`resident-tax-timing/ResidentTaxTimingCta`・`retirement-ideco-timing/RetirementIdecoTimingCta`・`retirement-tax/RetirementTaxCta`。campaignの値は `compound_interest_tool`・`fire_age_tool`・`monthly_investment_tool`・`education_cost_tool`・`ideco_withdrawal_tool`・`pension_timing_tool`・`prepay_vs_invest_tool`・`resident_tax_timing_tool`・`retirement_ideco_timing_tool`・`retirement_tax_tool`

`concerns.ts` の `source` の内訳：`lp` は `fire-age`・`semi-retirement`・`pension-timing`・`withdrawal-order` の4件（36・47・58・69行）、残り12件は `concerns`。
どちらもLPとお悩み一覧の両方に同じURLが表示される（`source` の値は表示場所を表していない）。

`scripts/` のutmは0件（`git grep -n -i "utm" -- scripts` の結果は0件）。

### 1-3. 記事本文（`lifecompass-next/src/content/`）

コマンド：`git grep -n -o -E "(\]\(|href=\"|href='|: ?)[^ )\"']*utm_[^ )\"']*" -- src/content`（73件。`git grep -n -i "utm" -- src/content` の件数とも一致）

- 形式：すべてMarkdownのリンク（`[文言](URL)`）。frontmatterにはutmなし
- 描画：`src/lib/blog.ts` の `applyBasePathToHtml()`（143行）を通した生HTMLの `<a>`。**クリックイベントは付いていない**（`src/app/blog/[slug]/page.tsx`・`src/app/hitori-hojin/blog/[slug]/page.tsx` に `trackEvent`・`onClick` なし）
- `src/content/blog/old/` の8ファイル（15件）は**公開されない**（`blog.ts:175` が `src/content/blog` 直下の `.md` だけを読むため）。旧URL `https://freenough-lifecompass.vercel.app/simulator?…` を含む

| 記事 | 件数 | 記事 | 件数 |
|---|---|---|---|
| blog/4percent-rule | 3 | blog/nisa-monthly-investment | 2 |
| blog/compound-interest-rate-vs-years | 2 | blog/pension-timing | 3 |
| blog/dual-income-couple-fire | 2 | blog/retirement-ideco-timing | 2 |
| blog/education-cost-fire-simulation | 3 | blog/retirement-tax-net-amount | 3 |
| blog/fire-checklist | 1 | blog/semi-retirement-blank-period | 3 |
| blog/fire-inflation-sensitivity | 2 | blog/sequence-of-returns-risk | 2 |
| blog/housing-loan-fire | 2 | blog/taishoku-yokunen-juminzei | 2 |
| blog/ideco-nisa | 3 | blog/withdrawal-strategy-comparison | 3 |
| blog/ideco-withdrawal | 2 | blog/zaishoku-rourei-nenkin | 2 |
| blog/montecarlo-simulation | 2 | hitori-hojin-blog（8記事） | 各1 |
| blog/mortgage-prepay-vs-invest | 3 | blog/old/（8ファイル、非公開） | 計15 |
| blog/nisa-achievement-age | 3 | | |

**公開中の記事：ブログ21記事で50件、一人法人ブログ8記事で8件、計58件。**

パターン（値の組み合わせ）：

| リンク先 | source / medium | campaign | content | 件数（公開中） |
|---|---|---|---|---|
| `/asset-simulator/tools/{ツール}` | blog / referral | `{記事のテーマ}_blog` 等（例：`retirement_tax_blog`・`housing_loan_blog`・`nisa_achievement_age`） | なし、または `mid_cta`・`bottom_cta` | 27 |
| `/asset-simulator/app` | blog / referral | `{記事のテーマ}_blog`、`{記事のテーマ}`（例：`4percent_rule`・`montecarlo`） | なし、`mid_cta`・`bottom_cta`、`mid`・`bottom` | 23 |
| `/asset-simulator`（LPトップ） | blog / referral | `hitori_hojin_{記事}_blog` | なし | 8（一人法人ブログ） |
| `https://freenough-lifecompass.vercel.app/simulator`（旧URL） | blog / referral | `ideco_nisa`・`fire-inflation-sensitivity`・`montecarlo`・`fire_checklist`・`4percent_rule` | `mid_cta`・`bottom_cta`・`mid`・`bottom` | 0（すべて `old/`） |

campaign・contentの付け方は記事によってばらつきがある（`_blog` の有無、`mid_cta` と `mid` の混在、区切りの `-` と `_` の混在）。

### 1-4. `freenough-main`

```
$ git -C freenough-main grep -I -i -c "utm"
docs/fixes/done/url_path_change_implementation.md:2
README.md:1
```

- `README.md:34`：create-next-appの雛形に含まれるVercelへの外部リンク（`utm_source=create-next-app`）。サイトには表示されない
- `docs/fixes/done/url_path_change_implementation.md:118,131`：note記事の旧URL（`utm_source=note`）がリダイレクト後も維持されることの確認手順。ドキュメントのみ
- **コード（`app/`）のutmは0件**。サイト内のリンク（`Header.tsx`・`Footer.tsx`・`page.tsx` の `/asset-simulator`・`/hitori-hojin` など）にはutmが付いていない

### 1-5. ドキュメント

`lifecompass-next`：`docs/` と `legal_pages.md` で64ファイル・181件（`git grep -I -i "utm" -- docs legal_pages.md`）。内訳は過去の指示書・記事の下書き（`docs/fixes/done/`）がほとんど。
運用ルールとして現役なのは **`docs/blog_article_template.md`**：

- 100行：シミュレーターへのリンクは「UTM付き」とする
- 182〜192行：「UTMパラメータの命名規則（v1.2で新設）」（`utm_source=blog&utm_medium=referral&utm_campaign={topic}_blog`）。note連載からの流入は `utm_source=note&utm_medium=article&…` を使う（外部から入ってくる用、方針の範囲外）
- 224行：チェックリスト「文中にUTMパラメータ付きのシミュレーターリンクを使っているか」

### 1-6. 集計

| 区分 | 件数 | 内訳 |
|---|---|---|
| **サイト内リンク** | **85件**（公開中の表示箇所） | コード：一人法人LP 1、ツールCTA 10、お悩みカード 16／記事本文：ブログ 50、一人法人ブログ 8 |
| サイト内リンク（非公開） | 15件 | `src/content/blog/old/`（旧URL宛て） |
| 外部へのリンク | 1件 | `freenough-main/README.md`（サイトに表示されない） |
| 外部から入ってくる用の文字列 | 0件（リポジトリ内） | note用の定型は `blog_article_template.md:192` に命名規則として記載があるだけ。note記事側のリンクはリポジトリ外 |
| ドキュメントのみ | lifecompass-next 181件（64ファイル）＋privacy-policyの文言1件、freenough-main 2件 | |

---

## 2. 既存のGA4イベントの実装

### 2-1. 送信の経路

- **共通ヘルパー**：`src/lib/gtag.ts` の `trackEvent(eventName, params?)`。`window.gtag` が関数のときだけ `window.gtag('event', …)` を呼ぶ（7〜15行）。コンポーネントから `window.gtag` を直接呼んでいる箇所はない（`git grep -n "gtag(" -- src` は `gtag.ts` と `AnalyticsScripts.tsx` の初期化だけ）
- **`gtag` が読み込まれていないとき**：`trackEvent` は何もしないで終わる。エラーにならない
- **`freenough-main`**：カスタムイベントは**1件もない**（`git grep -n -E "gtag|dataLayer|trackEvent" -- app` は `AnalyticsScripts.tsx` の初期化だけ）。`trackEvent` に当たるヘルパーもない（片方のリポジトリにしかない）

### 2-2. イベント一覧（`lifecompass-next`）

| イベント名 | 送信している場所 | パラメータ | リンクの種類・移動 |
|---|---|---|---|
| `blog_cta_click` | `src/components/blog/SimulatorCtaCard.tsx:20` | `location`：`sidebar`／`mobile_bottom`（`src/lib/blogTracking.ts` の `getBlogAsideLocation()`、画面幅1024px以上かで判定） | `next/link`、`/app`（**utmなし**） |
| `blog_post_click` | `src/components/blog/BlogListClient.tsx:143`、`FeaturedPostsList.tsx:29` | `post_slug`、`location`（`list`／`sidebar`／`mobile_bottom`）、`position`（1始まり） | `next/link`、`/blog/{slug}` |
| `blog_filter_click` | `BlogListClient.tsx:209,214` | `filter_type`（`topic`／`stage`）、`filter_value`、`state`（`on`／`off`） | リンクではない（絞り込みボタン） |
| `concern_cta_click` | `src/components/concerns/ConcernCard.tsx:28`（**ロックファイル**） | `concern_id`、`stage`、`cta_type`、`location`（`lp`／`concerns_list`） | `next/link`、`concerns.ts` の `ctaUrl`（**utmあり**） |
| `concern_article_click` | `ConcernCard.tsx:43`（ロックファイル） | `concern_id`、`stage`、`location` | `next/link`、`articleUrl` |
| `tool_to_simulator_cta_click` | 各ツールの `*Cta.tsx`（10ファイル、例：`FireAgeCta.tsx:27`） | **なし**（どのツールからのクリックかはイベントからは分からず、今はutmのcampaignで判別している） | `next/link`、`SIMULATOR_HREF`（**utmあり**） |
| `tool_to_nisa_cta_click` | 各ツールの `*Cta.tsx`（10ファイル、例：`FireAgeCta.tsx:38`） | なし | `<a target="_blank" rel="sponsored…">`（`AffiliateLink.tsx`、外部の新しいタブ） |
| `tool_calculate` | 各ツールの `*Tool.tsx`（10ファイル、例：`FireAgeTool.tsx:47`） | なし | リンクではない（入力が止まって500ms後） |

### 2-3. ページ移動の直前に送るイベントの扱い

- `transport_type: 'beacon'`・`event_callback` の指定は、どこにもない（`git grep -n -E "transport_type|event_callback|beacon" -- src` は0件）
- クリックで送るイベントは、すべて `next/link`（クライアント側の遷移で、ページは再読み込みされない）か、新しいタブで開く `<a target="_blank">` に付いている。**ページを離れる `<a>` に付いているイベントはない**。そのため、今の作りでは移動によって送信が失われる状況は起きにくい（5節の実測で、クリック後39〜75msにイベントが記録されてから移動していることを確認）
- 一方で、**クリックイベントが付いていない**サイト内リンクがある：
  - 一人法人LPの下部CTA（`next/link`、utmあり）
  - ブログ記事本文・一人法人ブログ本文のリンク（生HTMLの `<a>`、**ページの再読み込みを伴う**、utmあり）
  - 記事詳細ページ末尾のCTA（`src/app/blog/[slug]/page.tsx:159`、`next/link` の `/app`、utmなし・イベントなし）
  - 一人法人LPの記事の行（`HitoriHojinArticleList.tsx`、絶対URLの `<a>`、utmなし・イベントなし）

---

## 3. gtagの読み込み条件と測定ID

| | lifecompass-next | freenough-main |
|---|---|---|
| 読み込みの実装 | `src/components/layout/AnalyticsScripts.tsx`（`src/app/layout.tsx` から） | `app/components/AnalyticsScripts.tsx` |
| 条件 | `IS_PRODUCTION_BUILD`（`process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'`）かつ `location.hostname` が `www.freenough.com` | 同じ（`app/lib/analytics.ts`） |
| 測定IDの定義 | `src/lib/analytics.ts:5` に直書き（環境変数ではない） | `app/lib/analytics.ts:4` に直書き（環境変数ではない） |
| `gtag('config')` のオプション | なし（`linker`・`cookie_domain`・`send_page_view` の指定なし） | なし |

- **測定ID：両リポジトリで同じ。** 確認方法：両ファイルから `GA_MEASUREMENT_ID = '…'` の値を取り出し、文字列として比較（`同じ: true`）。IDそのものはこの報告に書いていない
- 両ファイルに「同じGA4プロパティを共有しているため、同じ値・同じ条件にそろえること」というコメントがある
- 同じプロパティの中の移動として扱われるか（コードから読み取れる範囲）：
  - `lifecompass-next` は `freenough-main` の rewrite（`/asset-simulator/*`・`/hitori-hojin/*`）を通して、**同じオリジン `https://www.freenough.com`** で表示される
  - 両方とも `cookie_domain` を指定していないため、gtag.js の既定のCookie（`_ga`）が同じドメインで共有される構成
  - したがって、`/asset-simulator` 配下と、それ以外（`freenough-main`）の間の移動は、同じプロパティ・同じユーザーの中の移動になる構成と読み取れる（実際の計測はVercel・GA4側を見ないと確認できない）

---

## 4. utmを受け取って使っている処理

**事実：ない（両リポジトリとも）。**

```
$ git -C lifecompass-next grep -n -E "useSearchParams|location\.search|searchParams|URLSearchParams|document\.referrer" -- src
src/app/app/page.tsx:4,40,42,45      … useSearchParams で 's'（プロフィールの共有URL）だけを読む
src/app/blog/page.tsx:44             … コメント
src/app/hitori-hojin/blog/page.tsx:20,22,36 … searchParams.series（連載の絞り込み）
src/components/blog/BlogListClient.tsx:7,22,23,25,32,185,189,190,193,195 … topics・stage（絞り込み）
src/components/hitori-hojin/HitoriHojinBlogListRows.tsx:13 … コメント

$ git -C lifecompass-next grep -n -E "\.get\(['\"]utm|utm_source|utm_medium|utm_campaign|utm_content" -- src ':!**/content/**'
（リンクのURL文字列以外は0件）

$ git -C freenough-main grep -n -E "useSearchParams|location\.search|searchParams|URLSearchParams|document\.referrer" -- app
（0件）
```

- `src/app/app/page.tsx:45` は `s` パラメータがあるときだけ、読み込み後に `history.replaceState` でURLを `/asset-simulator/app` に置き換える。utmとは関係しない（`s` がないときはURLを変えない）
- `middleware.ts` は両リポジトリともない
- utmをlocalStorageに保存する処理もない（`utm` の検索でリンク以外の該当なし）

---

## 5. 現在のイベント送信の実測

方法：Playwright（Chrome 153、1440px）で、`addInitScript` により `window.gtag` と `window.dataLayer` を記録用のスタブに置き換えた。
`trackEvent` は `window.gtag` が関数かどうかだけを見ているため、ホスト名の判定を回避するためのコード変更なしに記録できた
（localhostでは `AnalyticsScripts` がgtag.jsを読み込まないので、スタブ以外の `gtag` は定義されない）。
Google系のドメイン（`google-analytics.com`・`googletagmanager.com`・`googlesyndication.com`・`doubleclick.net`・`googleadservices.com`）への通信は遮断した（遮断されたリクエストは0件）。
記録の全文：`ga-stub-results.json`、クリック後の画面：`stub-1〜5-after-click.png`。

| 対象 | リンク | 移動先のURL（utm） | 移動の種類 | クリックで記録された呼び出し |
|---|---|---|---|---|
| ブログ一覧のCTA（`SimulatorCtaCard`） | `/asset-simulator/app` | `/asset-simulator/app`（**utmなし**） | クライアント側 | `gtag('event','blog_cta_click',{location:'sidebar'})`（クリック後39ms） |
| ツールページ→シミュレーター（fire-age） | `/asset-simulator/app?utm_source=tools&utm_medium=referral&utm_campaign=fire_age_tool` | 同じ（**utmあり**） | クライアント側 | `gtag('event','tool_to_simulator_cta_click')`（51ms、パラメータなし） |
| 一人法人LPの下部CTA | `/asset-simulator/app?utm_source=hojin_lp&utm_medium=referral&utm_campaign=hitori_hojin_lp` | 同じ（**utmあり**） | クライアント側 | **なし** |
| （参考）LPのお悩みカード1枚目 | `/asset-simulator/tools/fire-age?utm_source=lp&utm_medium=concern_card&utm_campaign=fire_age` | 同じ（**utmあり**） | クライアント側 | `gtag('event','concern_cta_click',{concern_id:'fire-age',stage:'saving',cta_type:'lightTool',location:'lp'})`（75ms） |
| （参考）ブログ記事本文の最初のutm付きリンク（4percent-rule） | `/asset-simulator/tools/retirement-tax?utm_source=blog&utm_medium=referral&utm_campaign=retirement_tax_blog` | 同じ（**utmあり**） | **ページの再読み込み** | **なし** |

補足（事実）：fire-ageのページでは、入力を操作していないのに、読み込みの約2秒後に `tool_calculate` が1回記録された。
コード（`FireAgeTool.tsx:41〜48`）は初回の描画では送らない作りのため、devサーバー（React Strict Modeで副作用が2回実行される）に特有の動きと推測する。
本番ビルドでも起きるかは確認していない。

---

## 提案（事実ではなく、実装方針の案）

1. **イベント名とパラメータ**：`blog_cta_click` と同じく、`trackEvent` で「どこから・どこへ」をパラメータで送る。
   - ツールCTA：`tool_to_simulator_cta_click` に `tool`（例：`fire_age`）を足す。今はcampaignでしか判別できないため、utmを外すとツール別の集計ができなくなる
   - 一人法人LPの下部CTA：新しいイベント（例：`hojin_lp_cta_click`）、または共通のイベントに `location: 'hitori_hojin_lp'` を付ける
   - お悩みカード：`concern_cta_click` が必要な情報（`concern_id`・`location`）をすでに送っているため、`concerns.ts` の `ctaUrl` からutmを外すだけでよい。ただし**ロックファイル**のため、KENZOの判断が必要（`concernCtaLabels.ts` と同じく、表示の直前に `ctaUrl` からクエリを取り除く方法もある）
2. **記事本文のリンク**：生HTMLの `<a>` で再読み込みを伴うため、イベントを付けるには、記事本文の中のクリックを1か所で拾う仕組み（記事の要素にクリックのリスナーを置き、`/asset-simulator/app`・`/tools/` へのリンクだけを送る）が必要になる。
   再読み込みを伴うため、`transport_type: 'beacon'` の指定を検討する（gtag.jsはブラウザが対応していればbeaconを使うとされるが、今回は確認していない）。
   あわせて、公開中の29記事・58件のリンクからutmを外す（`old/` の15件は非公開のため、外すかどうかは任意）
3. **ルールの更新**：`docs/blog_article_template.md` のv1.2の命名規則（100・182〜192・224行）を、サイト内リンクにはutmを付けないルールに改める。note用（外部から入ってくる用）の記述は残す
4. **freenough-main**：サイト内リンクにutmはなく、イベントもない。今回の方針での変更は不要。将来、`freenough-main` 側にもクリックイベントを置く場合は、`trackEvent` に相当するヘルパーを用意する必要がある

---

## KENZOへの確認事項（指示書のとおり、GA4の管理画面で確認）

1. カスタム定義：`location`・`concern_id`・`stage`・`cta_type`・`post_slug`・`position`・`filter_type`・`filter_value`・`state` などがカスタムディメンションとして登録されているか
2. utmに依存しているレポート：`utm_source=tools`・`blog`・`hojin_lp`・`lp`・`concerns`、`utm_medium=concern_card` で絞り込んでいる探索レポートや保存済みレポートがあるか
3. キーイベント：`tool_to_simulator_cta_click`・`blog_cta_click`・`concern_cta_click` などをキーイベントにしているか
4. （追加）拡張計測の「ブラウザの履歴イベントに基づくページの変更」がオンか。クライアント側の遷移（`next/link`）で `page_view` が送られるかどうかがこの設定で決まり、utm付きのURLが `page_view` に載るかどうかにも関わる（コードからは判断できない）
