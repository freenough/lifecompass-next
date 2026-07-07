/**
 * 単一値入力行（Field/DisplayField/RateField/LifeEventTimeline）で共有する単位列の固定幅。
 * 最長の単位表示「万円/年」「% / 年」が折り返し・省略なしで収まる幅を実測で決定している。
 * ここを変更すると全行の単位列幅が一括で揃う。
 */
export const UNIT_WIDTH_CLASS = 'w-14';

/**
 * 単一値行の数値入力欄の固定幅。Field/RateFieldで共有する。
 * ここを変更すると入力欄の幅が一括で揃う。
 */
export const INPUT_WIDTH_CLASS = 'w-24';
