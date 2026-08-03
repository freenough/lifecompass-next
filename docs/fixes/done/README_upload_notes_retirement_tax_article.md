# retirement-tax記事:アップロード用ファイル一覧・配置指示

## 同梱ファイル

- `retirement-tax-net-amount.md` — 記事本文(frontmatter付き、確定版)
- `images/retirement-tax-eyecatch.png` — アイキャッチ画像(1536×1024px)
- `images/retirement-tax-deduction-flow.png` — 本文中図版(退職所得控除の計算フロー図)

## 配置先

- 記事本文 → `content/blog/`配下、他記事と同じ命名規則でファイル名を決定(slug化)
- 画像2点 → `public/images/blog/`配下に、frontmatterの`eyecatch`パスおよび本文の画像パスと一致するファイル名で配置
  - `retirement-tax-eyecatch.png`
  - `retirement-tax-deduction-flow.png`

## 公開前に確認・対応してほしいこと

1. **`stages: ["receiving"]`は要検証**。`concerns.ts`内の実際のstage id文字列(「受け取る」に対応するid)を確認し、異なる場合は正しいidに修正すること
2. **`category: "シミュレーター活用"`で確定**。過去記事の実態(専属ツールで比較データを検証している記事はテーマを問わずこのカテゴリになっている)と一致させた
3. `full-verify.js`・`scripts/check-raw-html-in-blog.js`のパスを通すこと
4. 「LifeCompass」「FIRE達成」の文言が本文に混入していないかgrep確認(本文執筆時点では未使用を確認済みだが、念のため)
5. 公開後、`concerns.ts`内の退職金手取り系カードに`articleUrl`を追加すること
6. 本文中のUTMリンク(`utm_campaign=retirement_tax_blog`)が正しく機能するか、公開後に実機で1回クリックして確認すること

## 数値の算出方法(記録)

本文中のすべての確定数値(勤続15/20/25/35年のケース)は、`src/lib/tax/retirement.ts`の`calcRetirementIncomeTax()`を直接importして算出したもの(投資調査時にnode -eでインライン実行・検証済み)。独自の再現スクリプトは使用していない。
