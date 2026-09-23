# 実装指示：LP本文コンテナ幅の拡大・「毎月の資産を、記録する。」ブロック外枠削除

作成日：2026-09-22
種別：**実装（複数ファイルにまたがるレイアウト調整）**
関連：`instruction_lp_container_width_and_block_frame.md`（元の調査・方針依頼）

---

## 背景・調査結果の要約

`instruction_lp_container_width_and_block_frame.md`の1章調査により、以下が判明した。

- 本文コンテンツセクションの`max-w-5xl px-6`は**共有コンポーネントではなく、8箇所に直書き**されている（`src/app/page.tsx`内6箇所＋`ConcernBlockLP.tsx`＋`AssetManagementPromoSection.tsx`）
- ヘッダー・フッターは`max-w-7xl px-4`で完全に独立定義（今回変更しても巻き込まれない）
- 「使い方」セクションは`max-w-4xl`、CTAセクションは`max-w-xl`で、他と違う意図的な例外
- Heroのライブデモカード（デスクトップ幅）は`lg:w-[460px]`の固定値で、コンテナ幅とは連動していない
- `ConcernCard.tsx`・`AssetBreakdownDonut.tsx`・`AssetProgressBadges.tsx`はいずれもロックファイル対象外

上記を踏まえ、KENZOと相談の上、以下の方針で実装する。

---

## 1. `Container`コンポーネントの新設

`src/components/layout/Container.tsx`を新規作成する。

```tsx
import type { ReactNode } from 'react';

export type ContainerSize = 'default' | 'narrow' | 'xnarrow';

const SIZE_CLASS: Record<ContainerSize, string> = {
  default: 'max-w-(--lp-container-width)', // LP本文の基準幅。globals.cssの--lp-container-widthで一元管理
  narrow: 'max-w-4xl',  // 「使い方」セクション専用の意図的な例外（今回は未移行、将来の統一用に用意）
  xnarrow: 'max-w-xl',  // CTAセクション専用の意図的な例外（今回は未移行、将来の統一用に用意）
};

interface ContainerProps {
  size?: ContainerSize;
  className?: string;
  children: ReactNode;
}

export default function Container({ size = 'default', className = '', children }: ContainerProps) {
  return (
    <div className={`mx-auto w-full px-6 ${SIZE_CLASS[size]}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
```

- `size`のデフォルトは`'default'`（今回拡大する基準幅）。`narrow`/`xnarrow`は「使い方」「CTA」向けに用意するが、**今回はその2セクションをこのコンポーネントに移行しない**（後述4章の対象外を参照。将来この2箇所も統一する際に使う想定でのみ用意する）。
- `max-w-(--lp-container-width)`はTailwind v4のCSS変数参照ショートハンド（`max-w-[var(--lp-container-width)]`と同義）。Tailwindの名前付きテーマスケール（`--container-*`等）には依存しないため、命名の衝突・自動生成クラスの有無を気にせず安全に使える。

## 2. `globals.css`にコンテナ幅のCSS変数を追加

`src/app/globals.css`の`@theme`ブロック内（`--color-accent`等と同じ並び）に追加する。

```css
@theme {
  /* 既存のcolor/font変数はそのまま */

  /* LP本文コンテナの基準幅。6xl(72rem/1152px)⇄7xl(80rem/1280px)をこの1行で切り替えてPreview比較する。
     現状のmax-w-5xl(64rem/1024px)より広げる前提で導入。 */
  --lp-container-width: 72rem;
}
```

- まず`72rem`（`max-w-6xl`相当）でPreviewを確認し、必要なら`80rem`（`max-w-7xl`相当）に変更して比較する。**どちらか一方に決め打ちせず、この1行を書き換えるだけで両方を試せる状態を保つこと**（実装者はどちらが良いか自分で決めず、両方のスクリーンショットを完了報告に添付し、KENZOの判断を仰ぐこと）。

## 3. Heroのライブデモカード幅も同じ場所で調整可能にする

`src/app/page.tsx`のHeroデスクトップ用ラッパー（現在は`<div className="hidden lg:flex lg:w-[460px] lg:shrink-0">`）の`460px`もハードコードのままだと、コンテナ幅だけ広げてもグラフカードが相対的に小さく見える可能性がある。

- `globals.css`の`@theme`に、コンテナ幅の変数と並べてもう1つ変数を追加する。

```css
  /* Heroライブデモカードの幅（デスクトップのみ）。--lp-container-widthを広げた場合、
     左テキスト列とのバランスを見ながらこの値も一緒に調整する（数式で自動連動はさせない）。 */
  --lp-hero-chart-width: 460px;
```

- `page.tsx`側は`lg:w-[460px]`を`lg:w-(--lp-hero-chart-width)`に置き換える。
- **具体的な最終値は決め打ちしない。** コンテナ幅を72rem/80remそれぞれに変えた状態で、480px・520px・560px程度の候補をPreviewで見比べ、左テキスト列とのバランスが良いものを選ぶこと。完了報告に候補ごとのスクリーンショットを添付する。

## 4. 8箇所の`max-w-5xl px-6`を`Container`に置き換える（対象6セクションのみ）

### 対象（`Container size="default"`へ移行）

| ファイル | 現在の記述 | 変更後 |
|---|---|---|
| `src/app/page.tsx` ①Hero（197行目） | `<section className="mx-auto max-w-5xl w-full px-6 py-16">`（sectionタグ自体がコンテナ兼用） | `<section className="py-16"><Container>`…`</Container></section>`（`py-16`はsectionに残し、コンテナ関連クラスはContainerに委譲する形へ構造変更） |
| `src/app/page.tsx` ③差別化（239行目） | `<section className="mx-auto max-w-5xl px-6 py-12 w-full">` | `<section className="py-12"><Container>`…`</Container></section>`（同様の構造変更） |
| `src/app/page.tsx` ③.5 FIREガイド（260〜261行目） | `<section className="py-12"><div className="mx-auto max-w-5xl px-6">` | `<section className="py-12"><Container>`（内側の`div`を`Container`に置換するのみ、`section`側は変更不要） |
| `src/app/page.tsx` ③.6 かんたん計算ツール（280〜281行目） | `<section className="bg-slate-50 py-12"><div className="mx-auto max-w-5xl px-6">` | 同上パターン（`div`→`Container`のみ） |
| `src/app/page.tsx` ④あなたはどのタイプ（311〜312行目） | `<section className="bg-slate-50 py-12"><div className="mx-auto max-w-5xl px-6">` | 同上パターン（`div`→`Container`のみ） |
| `src/components/concerns/ConcernBlockLP.tsx`（10行目） | `<div className="mx-auto max-w-5xl px-6">` | `<Container>`（`ConcernCard.tsx`自体はロックファイルのため無変更） |
| `src/components/lp/AssetManagementPromoSection.tsx`（24行目） | `<div className="mx-auto max-w-5xl px-6">` | `<Container>`（5章の外枠削除と合わせて対応） |

### 対象外（現状維持・触らない）

- `src/app/page.tsx` ⑤使い方（415行目、`max-w-4xl`）
- `src/app/page.tsx` ⑥CTA（437行目、`max-w-xl`）
- `Header.tsx`／`Footer.tsx`（`max-w-7xl`、独立定義）

`Hero`と`③差別化`のみ、`<section>`タグ自体がコンテナを兼ねている特殊構造なので、`<section className="py-*"><Container>...</Container></section>`という他セクションと同じ入れ子構造に揃える（`py-*`の値・`w-full`の要否等、見た目に影響しない範囲で構造を統一する）。

## 5. 「毎月の資産を、記録する。」ブロックの外枠削除

`src/components/lp/AssetManagementPromoSection.tsx`

- 25行目の外側ラッパー`<div className="rounded border border-slate-200 bg-white p-8 sm:p-10">`を削除する（開始・終了タグのみ削除、中身のflex構造はそのまま`Container`直下に残す）
- 63行目の右カード自身のラッパー`<div className="rounded border border-slate-200 bg-white p-6">`（KPIバッジ3枠＋ドーナツを囲む枠）は**削除しない、そのまま維持**
- 左側テキスト列（見出し・本文・箇条書き・CTA・注記）の構造・スタイルは変更しない
- セクション自体（23行目`<section className="py-12">`）は現状`bg-*`指定なし＝デフォルト白背景のため、外枠削除後もHero等と同じ地色になる（追加のbg指定は不要）

### 左右位置の最終調整

- 左コピーの左端をHeroの見出し左端に、右カードの右端をHeroのチャートカード右端に、それぞれ水平位置を揃える（4章のコンテナ幅統一が完了していれば、同じ`Container`を使うことで自動的に揃うはず。ズレが残る場合のみ個別調整する）
- 調整後、左右の間（中央付近）の空白が目立つ場合は、余白をそのまま残さず、**右カード内のドーナツ（`AssetBreakdownDonut.tsx`）自体の横幅を広げて埋めることを優先する**（コンテナ幅・マージンの再調整より先に、中身のビジュアル要素を大きくする方向で対応すること）

---

## ブランチ運用

- ways-of-workingのブランチ運用ルールに従い、今回の変更は専用ブランチ`feature/lp-container-width`で作業する（`main`から分岐）
- このブランチ上でコミットまでは進めてよい。**push・Vercel Preview作成の実行はKENZOの指示を待つこと**

## 遵守事項

- ロックファイル（`simulate.ts`/`analyze.ts`/`PortfolioPanel.tsx`/`simulatorStore.ts`/`profile.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`/`ConcernCard.tsx`）への依存・変更は一切ゼロを維持すること
- ヘッダー・フッター・「使い方」・CTAセクションは今回の変更対象外。コードも触らない
- `Container`コンポーネントの`narrow`/`xnarrow`サイズは用意するのみでよく、既存の「使い方」「CTA」セクションをこのコンポーネントに移行する作業は今回のスコープに含めない
- コンテナ幅（6xl/7xl）・Heroグラフ幅（480/520/560px等）は、どちらか一方に決め打ちせず、複数パターンをPreviewで比較できる状態のまま完了報告に上げること（最終値の決定はKENZOが行う）
- コミット・push・Vercel Preview作成は、KENZOの確認・指示を受けるまで行わないこと

## 完了報告フォーマット

- 変更・新規作成したファイル一覧（該当コード抜粋つき）
- コンテナ幅 72rem(6xl)／80rem(7xl) それぞれのデスクトップ幅スクリーンショット（Hero・お悩み・かんたん計算ツール・ケーススタディの4セクション程度）
- Heroグラフカード幅の候補（480/520/560px等）ごとのデスクトップ幅スクリーンショット
- 「毎月の資産を、記録する。」ブロックの外枠削除後スクリーンショット（デスクトップ幅・モバイル幅）、左右位置がHeroと揃っていることが分かるもの
- モバイル幅（375px程度）で崩れがないことを確認したスクリーンショット
