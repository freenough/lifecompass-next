# 実装指示:ケーススタディセクションの刷新(人物イラスト導入・ストーリー形式レイアウト)

作成日:2026-09-21
種別:**実装(新規UI)**
関連:`claude_instruction_casestudy_illustration_investigation.md`(本指示の前提となる調査結果)

---

## 背景

LPトップの「ケーススタディ(あなたはどのタイプ?)」セクション(`src/app/page.tsx:256-318`、2×2グリッド、`@tabler/icons-react`の汎用アイコン使用)を、以下の方針で刷新する:

1. 2×2グリッドをやめ、縦に積む横長の帯(ストーリー形式)にする
2. 汎用アイコンを`react-peeps`(Open Peepsのnpm実装、MITライセンス)による人物イラストに差し替える
3. 引用文(「」内のセリフ)を主役にした見せ方にする

調査の結果、以下が確認済み:
- ペルソナデータは`page.tsx:82-114`のハードコード配列で、ロックファイルではないため自由に編集可能
- `react-peeps`はReact hooksを内部で使用しているため、`FireGuideCarousel.tsx`と同様に`'use client'`のClient Componentとして切り出す必要がある
- `viewBox`のx/y/width/height値は**文字列**で渡す必要がある(数値ではない)
- クロップ用の`viewBox`値が実機検証済み:`{ x: '125', y: '0', width: '600', height: '700' }`(72×72pxの円形フレーム、`overflow:hidden`、背景色`#DCEEF5`、CSSの`transform`は不要)
- 各カードのnote.comリンクは`<a target="_blank" rel="noopener noreferrer">`、佐々木さんのみ現状`href`なしのdiv(「近日公開」)として実装済み。この挙動は維持する
- `max-w-5xl px-6`は複数ファイルで使われている汎用コンテナ規約であり、そのまま流用してよい

---

## 1. 人物イラストコンポーネントの新規作成

- `src/components/PersonaAvatar.tsx`(または既存の命名規則に合わせた適切な名前)として、`'use client'`の新規Client Componentを作成する
- `react-peeps`の`Peep`コンポーネントをラップし、以下のpropsを受け取れるようにする:`body`・`hair`・`face`・`accessory`・`backgroundColor`・`strokeColor`(佐々木さん用にミュートカラーへの差し替えができるようにする)
- `viewBox`は調査で確定した`{ x: '125', y: '0', width: '600', height: '700' }`を固定値として使う(全ペルソナ共通)
- ラッパーのスタイル:72×72px、`border-radius: 50%`、`overflow: hidden`、`background-color`は`backgroundColor`propと同じ値(調査結果通り、追加のCSS transformは不要)

---

## 2. 各ペルソナのパーツ組み合わせ

| ペルソナ | body | hair | face | accessory | backgroundColor | strokeColor |
|---|---|---|---|---|---|---|
| 田中さん | BlazerBlackTee | Short | Calm | GlassRound | #DCEEF5 | #0F2A4A |
| 山本さん | Device | ShortMessy | Driven | GlassRoundThick | #DCEEF5 | #0F2A4A |
| 中村さん(夫) | ButtonShirt | Short | Smile | None | #DCEEF5 | #0F2A4A |
| 中村さん(妻) | PoloSweater | MediumLong | Smile | None | #DCEEF5 | #0F2A4A |
| 佐々木さん | ShirtCoat | GrayShort | Serious | None | #E5E7EB相当(既存のミュートトークン) | #6B7280相当(既存のミュートトークン) |

- 中村夫婦は2つの`PersonaAvatar`を横に少し重ねて配置する(夫を奥・妻を手前、またはその逆でよい。`z-index`と負のマージンで実装)
- 佐々木さんのフレームには、既存の他セクションのグレーアウト表現(点線ボーダー等があれば流用)を適用する。「Serious」表情は小サイズでは表情の視認性が低いという調査所感があるため、実装後に実機で見え方を確認し、視認しづらければ`face`を`Calm`に変更してよい(判断は実装側に委ねる)

---

## 3. レイアウトの変更

- 現在の`sm:grid-cols-2`によるグリッドを、縦積みのストーリー形式に変更する
- 各行は横長のフルワイド(`max-w-5xl px-6`のコンテナ幅いっぱい)とし、左右交互に配置する(奇数番目:アバター左・引用文右、偶数番目:アバター右・引用文左。`flex-row` / `flex-row-reverse`の切り替えで実装)
- 各行の内容:
  - アバター(`PersonaAvatar`、72×72px)
  - 引用文(「」内のセリフ):`var(--font-voice)`相当の書体、他のテキストより大きめのフォントサイズで主役として配置
  - 名前・属性(現行の「田中さん・42歳・既婚(サラリーマン)」相当):引用文より小さいキャプション扱い
  - 「公開中」/「近日公開」バッジ、note.comへのリンク(「note で読む →」等):行の右側または右下に配置
- 「記事一覧を見る→」に相当する一覧導線は追加しない(既存のセクション見出し部分の実装があればそのまま維持、なければ追加不要)
- 行と行の間に薄い区切り線(`border-top`)を入れ、視覚的に1件ずつ区切る

---

## 4. リンク挙動の維持

- 田中さん・山本さん・中村夫婦:カード全体(またはカード内の主要領域)をクリック可能にし、`target="_blank" rel="noopener noreferrer"`でnote.comの該当記事に遷移する挙動を維持する
- 佐々木さん:リンクなしのdivのまま維持し、カーソルもポインターにしない(クリックできないことが視覚的に伝わるようにする)

---

## 5. 遵守事項

- ロックファイル(`blog.ts`・`blogTopics.ts`・`concerns.ts`・`ConcernCard.tsx`・`simulate.ts`・`analyze.ts`・`PortfolioPanel.tsx`・`simulatorStore.ts`・`profile.ts`)への依存・変更は一切ゼロを維持すること
- 引き続き同じビジュアル変更用ブランチ(`feature/lp-fireguide-carousel`とは別の新規ブランチ、例:`feature/lp-casestudy-illustrations`)で作業し、`main`へ直接pushしないこと
- 既存テスト(`full-verify.js`等)が全てPASSすることを維持する
- `@tabler/icons-react`の旧アイコンは、このセクションでの使用箇所のみ削除する(他セクションで使われている場合はそちらに影響を与えないこと)
- push・マージはKENZOの明示的指示を待つこと

---

## 6. 完了報告フォーマット

- 変更・新規作成したファイル一覧(`PersonaAvatar.tsx`のコード全文を含む)
- ペルソナデータ配列の変更箇所(パーツ組み合わせを反映したコード抜粋)
- レイアウト変更箇所(ストーリー形式・左右交互配置の実装コード抜粋)
- テスト結果(PASS/FAIL件数)
- 実機ブラウザでの動作確認(スクリーンショット添付):
  1. 5件全てのアバターが72px円形フレーム内で崩れずに表示されていること(特に中村夫婦の重なり配置)
  2. 左右交互配置になっていること
  3. 田中さん・山本さん・中村夫婦のカードがnote.comへ正しく遷移すること
  4. 佐々木さんのカードがクリックできない見た目・挙動になっていること
  5. 佐々木さんの表情(Serious)が小サイズで視認できるか、できなければ変更後の表情で問題ないこと
