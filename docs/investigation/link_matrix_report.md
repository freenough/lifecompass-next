# サイト内部リンク構造マトリクス調査レポート

作成日:2026-08-01
種別:調査専用(コード変更なし)。`investigation_link_matrix.md`への回答。
調査対象:`freenough-main`(絶対パスで直接参照)・`lifecompass-next`の両リポジトリを横断。

---

## 0. 重要な前提の訂正:「LP」は実質2階層に分かれている

指示書のA-1は「LP(freenough-main)にキャラクターカード(田中誠・山本恒一・中村夫婦・佐々木誠一)がある」という前提だったが、`freenough-main/app/page.tsx`を実際に読んだところ、**キャラクターカードは存在しない**。同ページはヒーロー文言+シミュレーターへの単一CTA+フッターのみの、ごく簡素な構成だった。

キャラクターカード(田中さん・山本さん・中村夫婦・佐々木さん)は、実際には**`lifecompass-next`側の`src/app/page.tsx`**(`/asset-simulator`のルート、basePath配下のホーム)に実装されていた。つまり「LP」と呼ばれているものは:

- **`freenough.com/`**(`freenough-main`。ミニマルな入口ページ)
- **`freenough.com/asset-simulator`**(`lifecompass-next`の`page.tsx`。キャラクターカード・FIREガイド・かんたん計算ツールブロックを持つ、実質的な「本体側ホーム」)

の2層構造になっている。以下のマトリクスでは、この2つを区別して扱う。

---

## 1. 調査概要

- 調査ファイル数:約25ファイル(freenough-main 6ファイル、lifecompass-next 約19ファイル+ブログ記事13本のfrontmatter)
- 主なgrepクエリ:`href=`、`note\.com`、`RelatedArticles`、`getRelatedPosts`、`/tools/`、`category:`/`tags:`(frontmatter)
- 読み取り専用操作のみ。コード変更は一切行っていない。

---

## 2. マトリクス(B)

凡例:○=実装済み(サイト全体で一貫)、△=部分的、✗=未実装

| From ＼ To | LP(freenough-main) | シミュレーター系(/asset-simulatorホーム・`/app`) | Tools(一覧/個別) | ブログ(一覧/個別) | note | 静的ページ |
|---|---|---|---|---|---|---|
| **LP**(freenough-main `page.tsx`+`Header.tsx`) | - | ○ Header nav「シミュレーター」+本文CTA1件(`page.tsx`) | ○ Header navのみ(「ツール」) | ○ Header navのみ(「ブログ」) | ○ Header+Footer(`note.com/freenough`固定) | ○ Footer(about/disclosure/privacy-policy/disclaimer) |
| **シミュレーター系**(`/asset-simulator`ホーム=`src/app/page.tsx`、`/app`本体) | ✗(逆方向リンクなし。Header/Footerはlifecompass-next側の別コンポーネント) | - | ○ ホーム`page.tsx`の「かんたん計算ツール」ブロック(4/7ツールのみ抜粋掲載)。ただし`/app`本体(入力画面)からは**✗**(本文中リンク皆無、グローバルnavのみ) | ○ ホーム`page.tsx`の「FIREガイド」ブロック(featured記事4本)。`/app`本体は**✗** | △ ホームのキャラクターカードのみ、4件中2件(田中誠・山本恒一)が実リンク、中村夫婦・佐々木誠一は「近日公開」でリンクなし。`/app`本体は✗ | △ Footer(About/広告開示/プライバシー/免責事項/使い方ガイド/計算ロジック)経由のみ |
| **Tools**(7種) | ✗(グローバルHeader/Footer経由のみ、ページ本文からのLP直リンクなし) | ○ 各ツール共通Ctaコンポーネントの「資産シミュレーターで確認する」ボタン(`tool_to_simulator_cta_click`計測付き、7/7ツール共通) | ✗ ツール同士の相互リンクなし(0/7) | △ **3/7ツールのみ**:ideco-withdrawal(2本)・pension-timing(1本)・retirement-tax(2本)がCta内`RelatedArticles`で記事リンクあり。fire-age・monthly-investment・compound・education-costは**0本** | ✗ | △ methodologyページから**逆方向**(static→tools)に3箇所(ideco-withdrawal×2・retirement-tax×1)あるが、tools側からstaticへのリンクは0 |
| **ブログ**(13記事) | ✗ | ○ 全記事末尾の固定CTA(`/app`への誘導、`src/app/blog/[slug]/page.tsx`の共通テンプレート、13/13) | △ **5/13記事のみ**本文中に直リンク:compound-interest-rate-vs-years→compound、education-cost-fire-simulation→education-cost、nisa-achievement-age→fire-age、nisa-monthly-investment→monthly-investment、pension-timing→pension-timing。retirement-tax・ideco-withdrawalへのリンクは**0記事** | ○ 自動生成「関連記事」(`getRelatedPosts()`、`category`完全一致、最大3件、13/13記事に表示ロジックあり) | △ **5/13記事**(4percent-rule・fire-checklist・ideco-nisa・montecarlo-simulation・withdrawal-strategy-comparison。いずれも田中誠シリーズへの言及のみ) | ✗ 記事本文から静的ページへのリンクなし |
| **静的ページ**(guide/methodology/about/disclosure/privacy-policy/disclaimer) | ✗ | ○ guide・methodologyから`/app`へ、guide⇔methodology相互リンクあり | △ **methodologyのみ**3箇所(ideco-withdrawal×2・retirement-tax×1)。guide/about/disclosureは0 | ✗ 全ページ0 | △ aboutのみ(`note.com/freenough`固定リンク) | △ guide⇔methodologyの相互リンクのみ。about/disclosure/privacy-policy/disclaimerは他の静的ページへのリンクを持たず孤立 |

---

## 3. frontmatterフィールド一覧(ブログ13記事)

| 記事slug | category | tags |
|---|---|---|
| 4percent-rule | FIRE基礎知識 | 4%ルール, 取り崩し戦略 |
| compound-interest-rate-vs-years | シミュレーター活用 | 複利計算, 利回り, 積立シミュレーション |
| dual-income-couple-fire | シミュレーター活用 | 共働き夫婦, 退職タイミング |
| education-cost-fire-simulation | シミュレーター活用 | 教育費, 私立公立, 子育て世帯 |
| fire-checklist | FIRE基礎知識 | FIRE計画, チェックリスト, 見落とし |
| fire-inflation-sensitivity | シミュレーター活用 | インフレ率, 資産寿命 |
| ideco-nisa | FIRE基礎知識 | NISA, iDeCo |
| montecarlo-simulation | FIRE基礎知識 | モンテカルロシミュレーション, 破綻確率 |
| nisa-achievement-age | シミュレーター活用 | *(なし)* |
| nisa-monthly-investment | シミュレーター活用 | *(なし)* |
| pension-timing | シミュレーター活用 | *(なし)* |
| semi-retirement-blank-period | シミュレーター活用 | セミリタイア, 早期退職, 年金 |
| withdrawal-strategy-comparison | シミュレーター活用 | 取り崩し戦略, NISA, モンテカルロ |

`category`は2値のみ(FIRE基礎知識=4本、シミュレーター活用=9本)。`tags`は11/13記事に存在するが自由記述の日本語文字列で、**現状どのロジックからも参照されていない**(`getRelatedPosts()`は`category`の完全一致のみを見ている)。

---

## 4. C. タグ/トピック設計への転用可否

**1. ブログの`category`/`tags`の現状**:上記3節の通り。`category`は既に`getRelatedPosts()`で使われているが2値しかなく粒度が粗い(9記事が同一カテゴリに集中)。`tags`はデータとして存在するが未使用。

**2. Toolsのテーマ分類に使えるメタデータ**:`src/app/tools/page.tsx`の`TOOLS`配列に`group: 'accumulate' | 'receive' | 'optimize'`という3値のグループ分類がある(一覧ページの見出し分け用)。ブログの`tags`(NISA・iDeCo・教育費等の具体的トピック)とは粒度が異なり、そのままでは対応付けできない。Tools側には現状、記事のtagsに相当する「具体的な制度名・トピック名」の構造化データは存在しない。

**3. 「関連記事」コンポーネントをTools/他コンテンツ横断に拡張する場合の改修規模所感:中**

理由:
- `getRelatedPosts()`は`BlogPostMeta[]`(`getAllPosts()`の戻り値)専用に書かれており、戻り値も`slug`/`title`/`category`というブログ固有の形。Toolsを混ぜるには、ブログ・Tools両方を包含できる共通の型(例:`{ title, href, kind: 'blog'|'tool', topics: string[] }`)への設計変更が必要。
- 現在のマッチングロジック(`category`完全一致)を、タグ交差数によるスコアリング等に変更する必要がある。
- Tools側(7ページ分)に`tags`相当のフィールドを新規に追加する必要がある(現状ゼロから設計)。
- レンダリング側は、ブログ記事ページの「関連記事」セクション(`src/app/blog/[slug]/page.tsx`)と、Tools側の`RelatedArticles`コンポーネント(現状ブログ記事専用、`src/components/tools/RelatedArticles.tsx`)の2箇所が別実装になっており、統一するなら共通コンポーネント化も必要。
- 一方で、データの器(frontmatterのフィールド、配列構造)自体は既に存在しているため、アーキテクチャ的な作り直しは不要。追加・配線作業(9ファイル程度:Tools7本+`blog.ts`+`blog/[slug]/page.tsx`)が中心になる見込み。

---

## 5. 気づいた「穴」(任意所感)

- **`/app`(実際の入力画面)本体に、他コンテンツへのリンクが一切ない。** Header/Footerのグローバルnav以外、シミュレーションの最中にツールやブログへ誘導する導線が存在しない。「入力に迷ったら簡単ツールも」のような文脈的誘導は現状ゼロ。
- **retirement-tax・ideco-withdrawalの2ツールは、ブログ記事から一度もリンクされていない。** 逆にmethodologyページからはこの2ツールへのリンクがある、という非対称な状態。
- **Tools同士の相互リンクが完全にゼロ。** 「この計算をしたら次はこのツールも」という導線が一切なく、`/tools`一覧ページに戻らないと他のツールに辿り着けない。
- **note.comへのリンクが偏っている。** 5記事が言及しているが、いずれも田中誠シリーズのみ。山本・中村夫婦・佐々木誠一シリーズへの言及はブログ記事側からは0件(LP側のキャラクターカードにのみ山本恒一への直リンクがある)。
- **中村夫婦・佐々木誠一のキャラクターカードは「近日公開」のままリンクが無い。** note側の連載状況次第だが、放置されたままだと機会損失になりうる。

---

## 6. 参考:主なソースファイル

- `freenough-main/app/page.tsx`・`Header.tsx`
- `lifecompass-next/src/app/page.tsx`・`src/components/layout/Header.tsx`
- `lifecompass-next/src/app/app/page.tsx`(`/app`本体)
- `lifecompass-next/src/app/tools/page.tsx`・`src/components/tools/**/*.tsx`(各Cta含む)
- `lifecompass-next/src/app/blog/page.tsx`・`src/app/blog/[slug]/page.tsx`・`src/lib/blog.ts`(`getRelatedPosts()`)
- `lifecompass-next/src/content/blog/*.md`(frontmatter・本文リンク)
- `lifecompass-next/src/app/guide/page.tsx`・`methodology/page.tsx`・`about/page.tsx`・`disclosure/page.tsx`
