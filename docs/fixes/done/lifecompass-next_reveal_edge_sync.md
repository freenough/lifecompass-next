# 指示書：Revealの端のケース修正の同期と、LP2面の320px確認（lifecompass-next）

対象リポジトリ：lifecompass-next（basePath `/asset-simulator`、Next 14 / React 18 / Tailwind v4）
作業ブランチ：`fix/reveal-edge-sync`（mainから作成）
範囲：第1段階（ローカル確認・報告）まで。**commit・pushはKENZOの明示的な指示があってから。**

**着手の条件：freenough-mainの`Reveal.tsx`の修正差分（作業C）を、KENZOがレビューして承認してから。** 承認前は、作業Bだけ先に進めてよい。

---

## 作業A：`Reveal.tsx`の修正を同期（実装する）

対象：`src/components/motion/Reveal.tsx`

1. freenough-mainで承認された`app/components/Reveal.tsx`の差分と、**同じ内容**を適用する（両ファイルは同一内容を保つ運用）。
2. 確定値は変えない：24px／0.9秒／0.12秒の時間差、threshold 0.12、rootMargin `0px 0px -6% 0px`、4秒保険。
3. 検証（資産シミュレーターLP `.rv` 29個、一人法人LP `.rv` 7個のそれぞれで）：
   - 中ほどまでスクロールしてリロード、最下部でリロード、ハッシュ付きURLで直接開く → すべて表示される
   - 通常スクロールで演出が従来どおり
   - 「動きを減らす」設定、JS無効で、すべて表示される
   - 10幅（375, 390, 768, 799, 800, 1024, 1280, 1366, 1440, 1920）で崩れ・CLSなし
   - `npm run build`が通る

## 作業B：LP2面の320px幅の横あふれ確認（報告のみ・修正しない）

1. 資産シミュレーターLP（`/asset-simulator`）と一人法人LP（`/hitori-hojin`）を、幅 **320 / 360 / 375 / 390** で開き、横スクロールが出ていないか確認する。
   - 判定：`document.documentElement.scrollWidth > window.innerWidth`
2. あふれがあれば、原因要素と、はみ出している幅を報告する。通常状態と「動きを減らす」エミュレートの両方で確認する。
3. 過去に`fix/asset-simulator-hero-overflow`で一度直した経緯がある。同じ箇所が再発していないかも見る。
4. **修正はしない。** 原因と修正案（1〜2案）だけ報告する。

---

## 報告に含めること

- 作業A：変更差分、検証結果の表（2面×各状態）
- 作業B：各幅の判定結果と、あれば原因・修正案
- 気づいた点は、**修正せず報告だけ**にする。推測せず、実物から値を取る。

## 注意

- 公開リポジトリのため、readは匿名で足りる。
- `-D`・force pushは使わない。
