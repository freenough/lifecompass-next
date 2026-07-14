# 【追加調査・修正】KPIツールチップの右端はみ出し:Playwrightでは再現しないが実ブラウザでは常に再現する

## 状況

前回の調査(`kpi_tooltip_overflow_regression_investigation.md`)では、Playwright(devサーバー)での検証において、デスクトップ各種幅(1024〜1920px)・モバイル幅いずれでも右端はみ出しが再現しなかった。

しかし、KENZOが実際にWindows上のブラウザで操作したところ、「PCで普通に開いて、?マークを押しただけ。何度やっても右側が切れる」と、**単純な単発クリックで毎回確実に再現する**ことが報告されている。前回調査で言及された「複数ツールチップの同時オープンによる重なり」の可能性は、今回の報告(単発クリックのみ)から見て当てはまらない。

## 疑うべき原因:Playwrightと実ブラウザのスクロールバー幅の差

このプロジェクトでは既知の課題として、**Playwright/Chromiumでの検証と実際のブラウザ(Windows Chrome/Edge)とで、スクロールバー幅が約15〜17px異なる**という既知のギャップが`docs/known-issues.md`に記録されている。

`InfoTooltip.tsx`の右端クランプ計算(`Math.min(Math.max(8, b.left), window.innerWidth - TOOLTIP_WIDTH - 8)`)が`window.innerWidth`を基準にしている場合、以下の問題が起きている可能性が高い。

- `window.innerWidth`はブラウザによって、縦スクロールバーを含めた幅を返す場合と、除いた幅を返す場合とで挙動に差がある(仕様上はスクロールバーを含むビューポート幅だが、環境により実際に描画可能な幅とズレることがある)
- Playwrightのヘッドレス環境はWindowsの実ブラウザのスクロールバー(classic/overlay等の描画方式)と異なるため、同じ`window.innerWidth`の値でも、実際に見える横幅が異なり、Playwrightでは収まって見えても実ブラウザでは収まらない、という差が生まれている可能性がある

## 調査・修正してほしいこと

1. `InfoTooltip.tsx`の右端クランプ計算で使用している基準値を確認する。現在`window.innerWidth`を使っている場合、これを**`document.documentElement.clientWidth`**(スクロールバーを除いた実際の表示可能幅)に変更することを検討する。`clientWidth`はスクロールバーの有無・幅の環境差に影響されにくく、より実際の見た目に近い値になる
2. 変更後、**Playwrightだけでなく、可能であれば実際のブラウザ(Windows Chrome/Edge)に近い条件でも確認する**。Playwright単体での「再現しない」は、このプロジェクトの既知の検証ギャップにより当てにならない可能性があるため、`window.innerWidth`と`document.documentElement.clientWidth`の値をコンソールログ等で実際に比較し、差がどの程度あるか確認する
3. 縦方向のクランプ計算(`window.innerHeight`相当の箇所があれば)も同様の問題を抱えていないか、念のため確認する

## 動作確認したいポイント

- 修正後、詳細指標アコーディオンの一番右のカード(「年金開始までの年数」)で、単発クリックによるツールチップ表示が画面右端で切れないことを確認する
- Playwrightでの自動確認に加えて、可能であれば実ブラウザでの目視確認、またはKENZOへの確認依頼をお願いする

## 完了報告時にお願いしたいこと

- `window.innerWidth`と`document.documentElement.clientWidth`の実測差(あれば)
- 修正内容(該当コードの変更箇所)
- Playwrightでのスクリーンショット確認結果
- 実ブラウザでの確認が難しい場合は、その旨とKENZOに実機確認を依頼したい点を明記
