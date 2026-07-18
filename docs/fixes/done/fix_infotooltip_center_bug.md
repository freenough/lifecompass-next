# 指示書: InfoTooltip(children使用時)のテキスト中央寄せバグ修正

作成日: 2026-07-19
対象: `lifecompass-next`の`src/components/simulator/InfoTooltip.tsx`
種別: バグ修正

---

## 1. 発生している問題

FIRE達成カードの改善案メッセージ(例:「支出22%減または退職+13年で達成」)が、2行に折り返した際、各行が中央寄せで表示されてしまう。他のKPIカードのテキスト(左寄せ)と見た目が揃わない。

## 2. 原因

`InfoTooltip.tsx`で、`children`が渡された場合(改善案メッセージのように、テキスト自体をトリガーにするモード)のボタンに、明示的な`text-align`指定がない。ブラウザのデフォルトスタイルシートでは`<button>`要素に`text-align: center`が適用されており、Tailwindのリセット(Preflight)もこれを上書きしないため、暗黙的に中央寄せになっている。「?」1文字のみのモードでは折り返しが起きないため気づかれなかったが、複数行に折り返す長文モードで問題が表面化した。

## 3. 対応内容

- `InfoTooltip.tsx`の、`children`が渡された場合のボタンのclassNameに`text-left`を追加する

```tsx
className={children
  ? 'underline decoration-dotted decoration-slate-400 underline-offset-2 text-inherit bg-transparent cursor-help text-left'
  : '...(変更なし)'}
```

## 4. 確認

- 改善案メッセージが2行に折り返すケース(実際に「支出◯%減または退職+◯年で達成」のような長めのメッセージが出る入力)で、各行が左寄せになっていることを確認する
- 「?」アイコンのみのモード(他のツールチップ)に意図しない見た目の変化がないことも確認する

---

## 5. 受け入れ基準

- [ ] 改善案メッセージが折り返した場合、各行が左寄せで表示される
- [ ] 他の「?」アイコン型ツールチップに見た目の変化がない
- [ ] `npm run build`が型エラーなしで通る

---

## 6. 完了報告フォーマット

```
## 完了報告: InfoTooltipテキスト中央寄せバグ修正

### 変更したファイル
- (ファイルパスと変更概要)

### 確認事項
- npm run build: PASS/FAIL
- 見た目確認: 確認済み/未確認

### 不明点・確認が必要な事項
- (あれば記載)
```
