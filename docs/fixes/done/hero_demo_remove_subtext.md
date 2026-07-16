# 実装：HeroDemo(LP)のFIRE達成カードからサブテキストを削除

## 背景

`HeroDemo.tsx`(LPヒーローセクション)のFIRE達成カードに、`sticky_kpi_bar_subtext.md`でサブテキスト(「FIRE達成後最低充足率{%}」)を追加したが、LPは初見のユーザーへの説得材料であり、`StickyKpiBar`(実際にシミュレーターを操作中のユーザー向け)とは役割が異なるため、この専門的な補足情報は不要と判断した。

**`StickyKpiBar.tsx`側のサブテキストはそのまま維持する。変更対象は`HeroDemo.tsx`のみ。**

## 実行内容

`HeroDemo.tsx`のFIRE達成カードから、サブテキスト(`kpiSubs`配列のindex 0相当、達成時「FIRE達成後最低充足率{%}」/未達成時「退職後最低充足率{%}」)を削除し、見出し(「{fA}歳で達成」/「未達成」)のみの表示に戻す。

- `hero_demo_kpi_layout_fix.md`で適用した`useEqualHeight`フックはそのまま残してよい(3枚とも見出しのみになれば自然に高さが揃うため、実質的な影響はないはずだが、念のため残す)
- `KpiGrid.tsx`(シミュレーター本体)・`StickyKpiBar.tsx`は変更しないこと

## 完了報告フォーマット

- 修正箇所(コンポーネント名)
- 削除後の表示確認(サブテキストが表示されていないこと)
- カード高さが3枚とも揃っていること(375px/PC幅)
- `StickyKpiBar.tsx`に変更がないことの確認
- 参照した関数・コンポーネント名(行番号ではなく)
- `full-verify.js`実行結果(全PASS必須)
- `npm run build`で型エラーがないことの確認

## 注意事項

- `simulate.ts`・`analyze.ts`・`improvement-search.ts`は変更禁止
- `StickyKpiBar.tsx`のサブテキストには一切触れないこと
