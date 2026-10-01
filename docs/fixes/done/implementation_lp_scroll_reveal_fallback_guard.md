# 実装指示書：Revealの4秒保険を、`.rv`のあるページだけで働かせる修正

作成日：2026-10-01
種別：**実装指示**（対象：`lifecompass-next`リポジトリ、`feature/lp-scroll-reveal`ブランチ）
前提：`implementation_lp_scroll_reveal.md`の実装は完了報告を受領済み（commit・push前）。今回はその報告の「気づいた点」3番目への対応。

---

## 0. 今回の内容

`layout.tsx`のインラインスクリプトは、4秒後に`Reveal`が動き出していなければ`html`から`js-reveal`を外す。この保険が、**`.rv`要素のないページでも働く**ため、次の問題がある。

- `/tools`などに4秒以上いてから、サイト内リンクでLPへ移動すると、すでに`js-reveal`が外れていて、LPが**演出なしで表示される**（内容は消えないが、演出が効かない）。

対応：保険を、**そのページに`.rv`要素があるときだけ**働かせる。

## 1. 作業上の絶対ルール

1. 引き続き`feature/lp-scroll-reveal`ブランチで作業する。
2. **ローカル確認・報告のみ。commit・pushはKENZOの明示的な指示があってから。**
3. `tsconfig.tsbuildinfo`が書き換わった場合は元に戻す。
4. **この修正以外は変えない。** 気づいた点は、修正せず報告だけにする。

## 2. 修正内容

### 2-1. `src/app/layout.tsx`のインラインスクリプト

現在：
```js
(function(){var d=document.documentElement;d.classList.add('js-reveal');
setTimeout(function(){if(!window.__rvReady)d.classList.remove('js-reveal');},4000);})();
```

変更後の方針（表記は実装に合わせて整えてよい）：
```js
(function(){var d=document.documentElement;d.classList.add('js-reveal');
setTimeout(function(){
  if(!window.__rvReady && document.querySelector('.rv')) d.classList.remove('js-reveal');
},4000);})();
```

- 4秒の時点で、**`.rv`要素がDOMにあり、かつ`Reveal`が動き出していない**場合だけ、`js-reveal`を外す（ハイドレーション失敗時の保険）。
- `.rv`要素がないページ（`/tools`など）では、`js-reveal`を外さない。あとからLPへクライアント遷移した場合、`Reveal`がマウントされて、演出が動く。
- `.rv`要素がないページに`js-reveal`が残っても、他のページの見た目は変わらない（`.js-reveal .rv:not(.in)`は`.rv`にしか効かない）ことを確認する。

### 2-2. 変えないもの
- `Reveal.tsx`、`globals.css`、`page.tsx`などは、変更しない。
- 4秒という値、`window.__rvReady`の仕組みは、そのまま。

## 3. 検証

Playwrightなど、前回と同じ方法でよい。全幅の再検証は不要（見た目のレイアウトは変わらないため）。ただし、次の動きは実際に確認する。

1. **サイト内遷移（今回の修正の本題）**
   - `/tools`を通常読み込みし、**5秒以上待つ**。
   - そのあと、サイト内のリンク（ロゴなど）でLPへ移動する。
   - `html`に`js-reveal`が付いたままであること。
   - LPで、スクロール前の要素が非表示で始まり、画面に入ると現れること（演出が効いている）。
2. **ハイドレーション失敗の保険（従来の動きが壊れていないこと）**
   - `/`で全JSチャンクをブロックし、3.5秒では内容が非表示、**5.5秒では`js-reveal`が外れて全要素が表示**されること（前回と同じ結果）。
3. **通常読み込みのLP**
   - `/`を通常に読み込み、演出が従来どおり動くこと。4秒以降も`js-reveal`が付いたままであること。
4. **JS無効、動きを減らす設定**：前回と同じく、全要素が表示されること。
5. **他ページ**：`/tools`、`/concerns`、`/hitori-hojin`で、5秒待っても表示が変わらないこと（1つの幅でよい）。
6. `npm run build`が通ること。

## 4. 完了報告の形式

1. 変更したファイルと、最終的なスクリプトの全文
2. 3の1〜6の結果（1は、遷移後の`html`のクラスと、要素の表示状態を含める）
3. `npm run build`の結果
4. 気づいた点があれば別枠で記載。修正はせず報告のみ

commit・pushは、KENZOの明示的な指示があってから行う。
