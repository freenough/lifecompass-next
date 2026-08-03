# Product Spec: 「悩み×解決」ブロック(LP + 一覧ページ)

作成日: 2026-08-02
対象リポジトリ: lifecompass-next
このドキュメントはClaude Codeへの実装指示用。investigation-only phaseと実装phaseに分けて渡すことを想定。

---

## 1. 背景・目的

- シミュレーターLP(`/asset-simulator`)は現状「機能訴求(1,000通りのモンテカルロ)→CTA」の流れになっており、Problem(悩みへの共感)が欠けている。
- 「こんな悩みはありませんか?」という共感ブロックを挟み、悩みとシミュレーターで分かることを1枚のカードで対応づけることで、Problem→Solution→Actionの流れを作る。
- 同じデータ構造を、LP(厳選4枚)と一覧ページ(全件)の両方で再利用する。

---

## 2. 情報設計(IA)

### 2.1 ページ構成

```
/asset-simulator (LP)
  Hero
  特徴(1,000通りの市場変動)
  悩み×解決ブロック(featured: true の4枚、1ステージ1枚)
  CTA(無料で試算する)
  ブログ(4枚)
  ツール(4枚)
  末尾に「その他のお悩みを見る →」リンク → /asset-simulator/concerns

/asset-simulator/concerns (新規、一覧ページ)
  ステージ軸で4ブロックに分割、各ブロック内に全カードを表示
  - 貯める
  - 判断する
  - 受け取る
  - 取り崩す
```

`/concerns/[slug]` の個別ページは今回のスコープ外(将来検討)。一覧ページのカードから直接ツール/記事に遷移する。

### 2.2 ステージ軸の定義(タグ)

| タグID | 表示名 |
|---|---|
| `saving` | 貯める |
| `deciding` | 判断する |
| `receiving` | 受け取る |
| `drawdown` | 取り崩す |

将来的にブログのタグ体系もこの4軸へ寄せていく想定(本スペックのスコープ外、別途検討)。

---

## 3. データ構造

`src/data/concerns.ts`(仮)に配列として定義。LPと一覧ページの両方でこのデータをimportして使う。

**investigation結果を反映:** `src/data/` ディレクトリは現状リポジトリに存在せず、`concerns.ts` が最初のファイルになる(既存の踏襲すべき規約は無いが、ブロッカーでもない)。

```typescript
export type ConcernStage = 'saving' | 'deciding' | 'receiving' | 'drawdown';

export type ConcernCTAType = 'lightTool' | 'fullSimulator';

export interface Concern {
  id: string;                    // 一意のslug、例: 'fire-age'
  stage: ConcernStage;
  question: string;              // 悩みの一文、例: '今のペースで資産は足りる？'
  outcome: string;                // 一言の答えの手触り、例: '今のペースなら何歳でFIRE達成か分かります'
  ctaType: ConcernCTAType;
  ctaLabel: string;               // 例: '60秒で試算する' / '詳しく試算する'
  ctaUrl: string;                 // ツール or 本格シミュレーターのURL(UTM付き)
  articleUrl?: string;            // 記事URL。無ければ「詳しく読む」を非表示
  featured: boolean;              // LPに出すかどうか
}
```

---

## 4. カードデータ(初期投入分)

**URL記法の注意(investigation結果を反映):** `next.config.mjs` に `basePath: '/asset-simulator'` が設定されており、`src/app/` 配下のルートには自動でこのprefixが付与される。そのため `concerns.ts` 内の `ctaUrl` / `articleUrl` は **`/asset-simulator` を含めずに書く**(`<Link>` がbasePathを自動付与するため、含めると二重prefixになる)。以下の表は分かりやすさのため `/asset-simulator/...` の形で記載しているが、実装時は先頭の `/asset-simulator` を取り除いた値(例: `/tools/fire-age?utm_source=...`)をコードに入れること。

### 4.1 LP掲載(featured: true、4枚、各ステージ1枚)

| id | stage | question | outcome | ctaType | ctaLabel | ctaUrl(実装時は/asset-simulator除去) | articleUrl(同上) |
|---|---|---|---|---|---|---|---|
| `fire-age` | saving | 今のペースで資産は足りる? | 今の積立ペースなら何歳でFIRE達成できるか分かります | lightTool | 60秒で試算する | `/asset-simulator/tools/fire-age?utm_source=lp&utm_medium=concern_card&utm_campaign=fire_age` | `/asset-simulator/blog/nisa-achievement-age` |
| `semi-retirement` | deciding | 55歳で辞めても生活できる? | 退職年齢を変えて、資産寿命と破綻確率まで確認できます | fullSimulator | 詳しく試算する | `/asset-simulator/app?utm_source=lp&utm_medium=concern_card&utm_campaign=semi_retirement` | `/asset-simulator/blog/semi-retirement-blank-period` |
| `pension-timing` | receiving | 年金は繰上げ・繰下げどっちが得? | 損益分岐年齢と、運用に回した場合の資産全体への影響まで分かります | lightTool | 60秒で試算する | `/asset-simulator/tools/pension-timing?utm_source=lp&utm_medium=concern_card&utm_campaign=pension_timing` | `/asset-simulator/blog/pension-timing` |
| `withdrawal-order` | drawdown | 資産は何年持つ? | 取り崩す順番によって、資産が何年持つかが変わることを確認できます | fullSimulator | 詳しく試算する | `/asset-simulator/app?utm_source=lp&utm_medium=concern_card&utm_campaign=withdrawal_order` | `/asset-simulator/blog/withdrawal-strategy-comparison` |

### 4.2 一覧ページのみ掲載(featured: false)

(4.1と同様、下表のURLも実装時は先頭の `/asset-simulator` を除去すること)

既存ツール・記事に基づき、以下を追加投入(過不足はClaude Codeの投入時に前後の記事内容と照合し文言調整可)。

| id | stage | question | outcome | ctaType | ctaLabel | ctaUrl | articleUrl |
|---|---|---|---|---|---|---|---|
| `monthly-investment` | saving | 毎月いくら積み立てればいい? | 4つの条件から、必要な毎月積立額を逆算できます | lightTool | 60秒で試算する | `/asset-simulator/tools/monthly-investment?utm_source=concerns&utm_medium=concern_card&utm_campaign=monthly_investment` | `/asset-simulator/blog/nisa-monthly-investment` |
| `compound` | saving | 積み立てたら将来いくらになる? | 積立額・利回り・年数から将来の資産額を試算できます | lightTool | 60秒で試算する | `/asset-simulator/tools/compound?utm_source=concerns&utm_medium=concern_card&utm_campaign=compound` | `/asset-simulator/blog/compound-interest-rate-vs-years` |
| `ideco-nisa` | saving | NISAとiDeCo、どっちを優先すべき? | 目的別の優先順位の考え方が分かります | fullSimulator | 詳しく試算する | `/asset-simulator/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=ideco_nisa` | `/asset-simulator/blog/ideco-nisa` |
| `dual-income` | deciding | 夫婦どちらがいつ辞めるべき? | 退職時期の組み合わせによる資産推移の違いを比較できます | fullSimulator | 詳しく試算する | `/asset-simulator/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=dual_income` | `/asset-simulator/blog/dual-income-couple-fire` |
| `retirement-tax` | receiving | 退職金はいくら手元に残る? | 退職金の税引き後の手取り額を試算できます | lightTool | 60秒で試算する | `/asset-simulator/tools/retirement-tax?utm_source=concerns&utm_medium=concern_card&utm_campaign=retirement_tax` | *(なし、記事化後に追加)* |
| `ideco-withdrawal` | receiving | iDeCoは一時金・年金・併用どれが得? | 受け取り方式ごとの手取り額の差を試算できます | lightTool | 60秒で試算する | `/asset-simulator/tools/ideco-withdrawal?utm_source=concerns&utm_medium=concern_card&utm_campaign=ideco_withdrawal` | *(なし、記事化後に追加)* |
| `education-cost` | drawdown | 教育費があると何歳まで働く必要がある? | 教育費のピーク時期と、資産計画への影響を試算できます | lightTool | 60秒で試算する | `/asset-simulator/tools/education-cost?utm_source=concerns&utm_medium=concern_card&utm_campaign=education_cost` | `/asset-simulator/blog/education-cost-fire-simulation` |
| `inflation` | drawdown | 物価上昇で資産はどれだけ減る? | インフレ率の違いによる資産寿命への影響を確認できます | fullSimulator | 詳しく試算する | `/asset-simulator/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=inflation` | `/asset-simulator/blog/fire-inflation-sensitivity` |

`retirement-tax` / `ideco-withdrawal` は `articleUrl` 未設定 = 「詳しく読む」非表示の実例として扱う。

---

## 5. コンポーネント仕様

### 5.1 `ConcernCard`

**investigation結果を反映:** リポジトリに `src/components/ui/` 等の共通デザインシステムは存在せず、`/tools` グリッド・`/blog` グリッド・tools indexのカードはいずれも `<Link>` + インラインTailwindのone-off実装(ページごとに重複)。`ConcernCard` も同じ慣習に合わせ、**新規の独立コンポーネントとして作成し、以下の既存クラス文字列(LPのtoolsグリッド・tools indexページで共通使用)をそのまま踏襲する**:

```
rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all
```

新しいビジュアル言語を発明せず、既存カードと見た目を完全に揃えること。

- Props: `Concern` 1件
- 表示要素:
  - 悩み文(`question`)
  - 一言の答え(`outcome`)
  - 主CTAボタン(`ctaLabel` → `ctaUrl`、塗りボタン)
  - 「詳しく読む →」(`articleUrl` がある場合のみ表示、テキストリンク、主CTAより弱い視覚重み)
- `articleUrl` の有無でカード高さがズレる問題は、`src/app/blog/page.tsx` に既存の対処パターン(`min-h-[...]` 固定 + `line-clamp`)があるため、それを流用する。
- 実装イメージ:

```tsx
{concern.articleUrl && (
  <Link href={concern.articleUrl}>詳しく読む →</Link>
)}
```

### 5.2 `ConcernBlockLP`(LP用)

- `concerns.ts` から `featured === true` のもの(4件)をフィルタして `ConcernCard` を4枚グリッド表示
- 末尾に一覧ページへのリンク「その他のお悩みを見る →」(`/asset-simulator/concerns`)

### 5.3 `/concerns`(一覧ページ、ファイルパスは `src/app/concerns/page.tsx`。basePathにより公開URLは `/asset-simulator/concerns`)

**investigation結果を反映:** `src/app/tools/page.tsx` に「タグでグルーピング→セクションごとに表示」という直接の前例が既にある(`GROUP_ORDER` 配列 + `GROUP_LABELS` マップ + `.filter(item => item.group === g)` のパターン)。これを `ConcernStage` / `STAGE_ORDER` / `STAGE_LABELS` にそのまま置き換えて流用する(新規パターンを設計する必要はない)。

- 全件を `stage` ごとに4セクションに分けて表示(見出し: 貯める/判断する/受け取る/取り崩す)
- 各セクション内は `ConcernCard` を並べるだけ(グリッド、件数制限なし)
- ページ全体のmeta情報・パンくずは既存の `/tools`, `/blog` と同様の構成に揃える

---

## 6. GA4イベント

**investigation結果を反映(要対応の差分):** `src/lib/gtag.ts` の `trackEvent()` は現状イベント名のみを受け取る仕様(`trackEvent(name: string)`)で、既存の呼び出し箇所は全て `trackEvent('tool_calculate')` のようにパラメータ無しで発火している。本Specの `concern_cta_click` / `concern_article_click` は `concern_id` / `stage` / `cta_type` / `location` といったパラメータが必須のため、**`trackEvent` のシグネチャ変更(`trackEvent(name: string, params?: Record<string, unknown>)`)が実装に必要**。既存の呼び出し箇所(パラメータ無し)は後方互換のため影響を受けない想定だが、変更時は既存呼び出しが壊れないことを確認すること。

既存のToolsセクションのイベント命名規則(`tool_calculate`, `tool_to_simulator_cta_click`, `tool_to_nisa_cta_click`)に準拠し、以下を新設。

| イベント名 | 発火タイミング | 主要パラメータ |
|---|---|---|
| `concern_card_view` | カードが表示された(任意、実装コスト次第で見送り可) | `concern_id`, `stage`, `location`(`lp` or `concerns_list`) |
| `concern_cta_click` | 主CTA(試算する)クリック時 | `concern_id`, `stage`, `cta_type`, `location` |
| `concern_article_click` | 「詳しく読む」クリック時 | `concern_id`, `stage`, `location` |

`location` パラメータでLP経由か一覧ページ経由かを判別し、後日「LPに残すべき4つ」の入れ替え判断に使う(前段の合意通り、記事公開後もすぐには入れ替えず、クリック率を見てから判断)。

---

## 7. UTM命名規則

**investigation結果を反映:** UTM文字列は既存でも各 `*Cta.tsx` にハードコードされたリテラル(例: `SIMULATOR_HREF = '/app?utm_source=tools&utm_medium=...'`)として埋め込まれる方式が既に慣習化されており、本Specの「`ctaUrl` にUTMクエリを直書きする」というアプローチは既存実装と完全に一致する。新規ヘルパー関数は不要。

既存の `{tool_name}_tool` パターンに合わせ、悩みブロック由来のCTAクリックは以下で統一する。

- `utm_source`: `lp`(LP掲載時) / `concerns`(一覧ページ掲載時)
- `utm_medium`: `concern_card`
- `utm_campaign`: `{concern_id}`(スネークケース)

## 7.1 LPへの組み込み位置(investigation結果を反映)

`src/app/page.tsx` の現状の描画順は Hero → 特徴 → (コメントアウト済み `AD_SLOT_A`) → ブログ → ツール → ... 。Section 2.1のIA通り、`ConcernBlockLP` は「特徴」の直後・「ブログ」の直前に配置する。

---

## 8. スコープ外(今回やらないこと)

- `/concerns/[slug]` 個別ページの作成
- `retirement-tax` / `ideco-withdrawal` の記事執筆(別タスク)
- ディープリンクによるシミュレーター入力のプリフィル(V2候補として保留)
- ブログタグ体系のステージ軸への全面移行

---

## 9. 実装フェーズの分け方(投資家メモ的な進め方に準拠)

1. **investigation-only**: 既存LPコンポーネント構造・ブログ/ツールセクションの実装パターンを調査し、`ConcernCard` をどう既存デザインシステムに合わせるか報告(新規スタイル作成 vs 既存コンポーネント流用の判断)
2. **実装**: `concerns.ts` データファイル → `ConcernCard` → `ConcernBlockLP`(LP組み込み)→ `/asset-simulator/concerns` 一覧ページ → GA4イベント実装
3. **検証**: `full-verify.js` 通過、LighthouseやPlaywrightでの表示確認(実ブラウザでの最終確認は別途)、GA4イベント発火確認
