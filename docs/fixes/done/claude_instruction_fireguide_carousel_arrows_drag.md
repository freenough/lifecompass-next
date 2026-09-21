# 実装指示：FIREガイドカルーセルへの矢印ボタン＋ドラッグスクロールの追加

作成日：2026-09-21
種別：**実装（追加修正）**
関連：`claude_instruction_fireguide_carousel_implementation.md`（今回追加する対象。同じ`feature/lp-visual-refresh`ブランチ上での作業を想定）

---

## 背景

`claude_instruction_fireguide_carousel_implementation.md`に基づき実装したFIREガイドカルーセルを実機（PC）で確認したところ、スクロールバーを非表示にした結果、**PCのマウス操作ユーザーには横スクロールする手段が事実上存在しない**ことが判明した（`overflow-x: auto`単体ではクリック&ドラッグでのスクロールをブラウザがネイティブサポートしないため）。

矢印ボタンについては前回指示書で「様子を見てから追加」としていたが、この確認結果を受けて追加することを確定する。あわせて、クリック&ドラッグでのスクロール操作（他サイトでも一般的なパターン）も同時に実装し、**矢印ボタン＋ドラッグスクロールの両方**でPC操作性を確保する。

---

## 1. 矢印ボタンの追加

- カルーセルの左右端に、円形の矢印ボタンを重ねて配置する
  - サイズ：32px × 32px、`border-radius: 50%`
  - 背景：`var(--surface-2)`相当（白）、枠線：`var(--border-strong)`相当の薄いグレー、box-shadowなどの装飾は追加しない
  - アイコン：シェブロン（`<`/`>`）程度のシンプルなもの
  - 位置：カルーセルの左右外側に少しはみ出す形（サムネイル中央あたりの高さ）
- **タッチデバイスでは非表示にする**。`@media (pointer: fine)`でのみ表示すること：
  ```css
  .fireguide-arrow {
    display: none;
  }
  @media (pointer: fine) {
    .fireguide-arrow {
      display: flex;
    }
  }
  ```
- クリック時の挙動：カード1枚分の幅だけ`scrollBy({ left: ±cardWidth, behavior: 'smooth' })`でスクロールする
- `aria-label="前の記事へ"` / `aria-label="次の記事へ"`を付与すること
- ボタン自体の`mousedown`イベントが後述のドラッグスクロール処理に巻き込まれないよう、`stopPropagation()`で分離すること（矢印クリックがドラッグと誤認識されないようにするため）

---

## 2. ドラッグスクロールの追加

- カルーセルのトラック要素に対し、マウスでのクリック&ドラッグによる横スクロールを実装する
- 基本ロジック（`mousedown` / `mousemove` / `mouseup` / `mouseleave`を監視し、ドラッグ量に応じて`scrollLeft`を操作）：
  ```js
  let isDown = false, startX, scrollLeftStart, dragDistance = 0;

  track.addEventListener('mousedown', (e) => {
    isDown = true;
    dragDistance = 0;
    track.style.cursor = 'grabbing';
    startX = e.pageX - track.offsetLeft;
    scrollLeftStart = track.scrollLeft;
  });
  track.addEventListener('mouseleave', () => {
    isDown = false;
    track.style.cursor = 'grab';
  });
  track.addEventListener('mouseup', () => {
    isDown = false;
    track.style.cursor = 'grab';
  });
  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = x - startX;
    dragDistance = Math.abs(walk);
    track.scrollLeft = scrollLeftStart - walk;
  });
  ```
- カーソルスタイル：初期状態は`cursor: grab`、ドラッグ中は`cursor: grabbing`にし、「掴んで動かせる」ことを視覚的に示すこと
- **クリックとドラッグの区別（必須）**：カード自体が記事詳細ページへのリンクになっているため、ドラッグ操作でそのままリンク遷移してしまわないよう対処すること
  - ドラッグ距離（`dragDistance`）が閾値（目安：5px）を超えた場合は「ドラッグ」と判定し、その直後に発生するカードの`click`イベントを`preventDefault()`で無効化する
  - 閾値以下の移動（＝実質的なクリック）であれば、通常通りリンク遷移させる
  - 実装例（カード側のクリックハンドラ、またはトラック全体へのイベント委譲どちらでも可）：
    ```js
    track.addEventListener('click', (e) => {
      if (dragDistance > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    ```

---

## 3. 両者の共存に関する確認事項

- 矢印ボタンのクリックが、ドラッグスクロールの`mousedown`ハンドラに誤って反応しないこと（1節のstopPropagationで対応）
- ドラッグ後に発生する不要なクリック（記事への誤遷移）が発生しないこと（2節の閾値判定で対応）
- 上記2点は完了報告のスクリーンショット/動作確認で必ず個別に確認すること（後述）

---

## 4. 遵守事項

- 引き続き`feature/lp-visual-refresh`ブランチ上で作業すること（新規ブランチは作成しない）
- カルーセル用ライブラリ（Embla・Swiper等）は導入しないこと。今回もネイティブJS＋CSSのみで実装する
- ロックファイル（`blog.ts`等、既存の遵守事項に記載のもの）への依存・変更は一切ゼロを維持すること
- 既存テスト（`scripts/verify-*.js`、`full-verify.js`）が全てPASSすることを維持する
- モバイル（タッチ）側の既存スワイプ挙動に影響が出ていないことを確認すること（矢印非表示の切り替わりも含む）
- push・マージはKENZOの明示的指示を待つこと（今回も実装のみ、pushはしない）

---

## 5. 完了報告フォーマット

- 変更したファイル一覧
- 矢印ボタンの実装箇所（CSS・JSともに該当コード抜粋）
- ドラッグスクロールの実装箇所（該当コード抜粋、クリック/ドラッグ判定ロジックを含む）
- テスト結果（PASS/FAIL件数）
- 実機ブラウザでの動作確認（すべてスクリーンショット添付）：
  1. PCでマウスホバー時に矢印ボタンが表示されること
  2. 矢印ボタンのクリックでカード1枚分スクロールすること
  3. カード列をクリック&ドラッグして横スクロールできること（カーソルが`grab`/`grabbing`に変化することを含む）
  4. ドラッグ操作をしても記事ページへ誤遷移しないこと
  5. 通常のクリック（ドラッグなし）では記事ページへ正しく遷移すること
  6. スマホ幅（タッチ操作環境、可能であれば375〜414px実機）で矢印ボタンが表示されず、スワイプのみで操作できること
