# 指示書：CTAボタンの寸法・色をそろえる（一人法人LP／資産シミュレーターLP）

作成日：2026-10-03
対象：lifecompass-next
置き場所：`docs/fixes/active/fix_cta_button_unify.md`

## 0. 進め方（先に読む）

- **第1段階（ローカル確認・報告）で止まる。commit・pushはKENZOの明示的な指示があってから。**
- 作業ブランチ名：`fix/cta-button-unify`（main の先頭から切る）。
- 間違いを認めるときは「間違えました。すみません。」と書く。
- この指示書の数値は、ソースを読んで見積もったもの。**本番・ローカルの実物で測り直してから**手を付ける。

## 1. 背景

一人法人LPのCTAボタン3つの縦・横・色がそろっていない。KENZOの判断：**Heroのボタンの寸法に合わせ、色は `#334155` に統一する。**

| ボタン（一人法人LP） | 場所 | 現状 |
|---|---|---|
| 「シミュレーターで試算」 | Hero（`page.tsx`） | `px-8 py-4 text-base font-semibold shadow`、`#334155`、ホバーで浮き上がる（基準） |
| 「法人資産管理ツールを開く →」 | `HitoriHojinManageSection.tsx` | 寸法はHeroと同じ。色が濃紺 `#0F2A4A`（`NAVY`）、ホバー演出なし |
| 「シミュレーターで試算」 | 最下部（`HitoriHojinSimulatorCta`の既定クラス） | `px-8 py-3 font-bold`、`#0F2A4A`、影なし、ホバーは透明度 |

横幅はどれも「文言の長さ＋左右32px」で決まるため、そろわない。

## 2. 変更内容

### A. 一人法人LP（本題）

目標の見た目（3つとも同じ）：
`inline-block min-w-[min(19rem,100%)] rounded bg-[#334155] px-8 py-4 text-center text-base font-semibold text-white shadow transition-all duration-150 ease-out whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg`

- 縦56px（`py-4`）、文字は `text-base font-semibold`、影・ホバー演出はHeroと同じ。
- 最小幅は `min-w-[min(19rem,100%)]`（304px。本文が狭い幅では本文幅が上限）。**freenough-main（TOP）のボタンと同じ値。** 文字は中央揃え（`text-center`）。
- 色は3つとも `#334155`。

実装上の注意：
1. **クラス文字列の定数は、`'use client'` のファイルに置かない。** `HitoriHojinSimulatorCta.tsx` は `'use client'` のため、そこから `export` した文字列を、サーバーコンポーネント（`page.tsx`、`HitoriHojinManageSection.tsx`）で `import` すると、文字列ではなくクライアント参照になる。定数は `src/lib/` の通常のtsファイル（例：`src/lib/ctaButtonClass.ts`）に置く。置き場所は実物を見て決めてよい。
2. Heroのボタンは `mt-6` を含むクラスを渡している。余白（`mt-*`）は共通クラスに含めず、呼び出し側で足す。
3. 最下部は `<Reveal>` がボタンの外側にある（ホバーの `transition-all` と干渉させないため）。この構造は変えない。
4. `HitoriHojinManageSection.tsx` の `NAVY` は、ボタンの `style` でだけ使われている。ボタンの色を変えたら、この定数は不要になる。
5. **濃紺 `#0F2A4A` は、ボタン以外（`HojinCompositionDemo.tsx` の内訳バー、`HitoriHojinForkDiagram.tsx`、ブログの見出し等）では使われている。それらは変えない。** `HojinCompositionDemo.tsx` の「濃紺（CTAボタンと同色）。`HitoriHojinManageSection.tsx` の `NAVY` と同じ値」というコメントは、事実と合わなくなるので書き直す。`HitoriHojinSimulatorCta.tsx` の `BOTTOM_CTA_CLASS` のコメントも合わせる。
6. GA4イベント（`hojin_lp_cta_click`、`location: 'hero' | 'bottom'`）の `onClick` は変えない。

### B. 資産シミュレーターLP（KENZOの確認事項への提案。不要なら、この節ごと実施しない）

3つのボタン（`src/app/page.tsx` のHero・最下部、`src/components/lp/AssetManagementPromoSection.tsx`）は、縦（`py-4`）・文字・色（`#334155`）・影・ホバーがすでに同じ。違うのは**横幅だけ**（文言の長さによる）。

- 3つのクラスに `min-w-[min(19rem,100%)] text-center` を足す。それ以外は変えない。
- 余白（Heroだけ `mt-12`、ほかは `mt-8`）は、周囲の文脈が違うため変えない。
- 文言が304pxより長いボタン（「今すぐシミュレーションする →」等）は、最小幅が効かず、見た目は変わらない見込み。

## 3. 検証（実物で確かめる）

### 3-1. 変更前に測る（mainのまま）
- 一人法人LP・資産シミュレーターLPの各3ボタンについて、幅・高さ・背景色・`font-weight` を、320 / 360 / 375 / 768 / 1024 / 1440px で測る（`getBoundingClientRect`、`getComputedStyle`）。
- 全幅のスクリーンショットを、広告・計測スクリプトを止めて撮る（資産シミュレーターLPのHeroのチャートは乱数で描き直される。検証用ブラウザの中だけで乱数を固定し、変更前を2回撮って差0を確かめてから比べる）。

### 3-2. 変更後
- **一人法人LP：** 3ボタンとも高さ56px、背景 `rgb(51, 65, 85)`、`font-weight: 600`、幅が `max(文言＋64px, min(304px, 本文幅))` になっていること。
- **資産シミュレーターLP：** 高さ・色は変更前と同じ。幅は、最小幅（304pxまたは本文幅）以上になり、文言が304pxより長いボタンは変更前と同じ。
- **横あふれ：** 320 / 360 / 375 / 768 / 1024 / 1440 に、10幅（375, 390, 768, 799, 800, 1024, 1280, 1366, 1440, 1920）を加えて、`document.documentElement.scrollWidth > window.innerWidth` を確認。通常と「動きを減らす」の両方。
  - 資産シミュレーターLPの320pxは、もともとCTA（約291px）が右の余白に入り込んでいる（引き継ぎ資料 項目7）。**悪化していないこと**を確認する。
- **スクリーンショット差：** ボタンの領域以外は、変更前と差0であること。一人法人LPの最下部CTAは、縦が48→56pxになるため、その下（フッター）が約8px下がる。これは想定内として、差が出る範囲を報告に書く。
- **動作：** 3ボタンのホバー（浮き上がり・影）、クリックでのGA4イベント送信（`hojin_lp_cta_click`、`location` の値）が、変更前と同じであること。最下部のRevealの表示（6/6相当）。
- `npx tsc --noEmit`、`npx eslint` は変更したファイルに対して。ビルドも通ること。

## 4. 報告に含めること
- 3-1の実測値（変更前）と、3-2の実測値（変更後）
- 想定外の差が出た場合は、その範囲と原因
- 定数の置き場所と、その理由
- **ここで止まる。** commit・pushの指示はKENZOから出る。

## 5. 以降の流れ（KENZOの指示が出てから）
作業ブランチ → ブランチだけcommit・push → Previewで確認 → `--no-ff` でmainへマージ → mainをpush → 指示書を `docs/fixes/done/` へ移して**別commit** → 本番確認 → ブランチ削除（`git branch -d` のみ。`-D`・force pushは使わない）。
