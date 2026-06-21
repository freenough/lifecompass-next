# 回帰テスト用 確定データ

このファイルにある数値は、旧HTML版（STEP35まで）のシミュレーターから実際にCSV出力して確認済みの値、または
SIMULATION_GUIDE.mdに記録された確定値です。Next.js版の計算結果がこれと一致するかどうかが、
移植が正しく完了したかの判定基準になります。

新しい数値をここに追加する場合も、独立計算ではなく必ず旧HTML版のCSV出力で確認したものだけを記載してください。

---

## 検証用ロジック（参考：旧版の簡易検証スクリプト）

固定利回りシナリオの3つのFIRE定義（最低限・最速・安心）を計算する参考ロジック。
実際の移植先エンジンはこれと同じ結果を返す必要がある。

```javascript
function getThreeDefinitions(p) {
  const needed = p.baseExp * 25;
  let def1 = null, def2 = null, def3 = null;

  for (let retAge = p.curAge + 1; retAge <= 80; retAge++) {
    let nisa = p.nisaBal, cash = p.cashBal;
    for (let age = p.curAge; age < retAge; age++) {
      nisa += nisa * (p.rW / 100);
      const avail = p.baseInc - p.baseExp;
      const con = Math.min(p.nisaCon, Math.max(0, avail + cash));
      nisa += con; cash += avail - con;
      nisa = Math.max(0, nisa); cash = Math.max(0, cash);
    }

    const retTotal = Math.round(nisa + cash);
    if (!def1 && retTotal >= needed) def1 = retAge;

    let nisa2 = nisa, cash2 = cash;
    let survived90 = true, neverBelow = true;
    for (let age = retAge; age <= 90; age++) {
      nisa2 += nisa2 * (p.rR / 100);
      const pension = age >= p.penAge ? p.penInc : 0;
      const netExp = p.baseExp - pension;
      const total2 = nisa2 + cash2;
      if (total2 <= 0) { survived90 = false; neverBelow = false; break; }
      const ratio = nisa2 / total2;
      const draw = Math.min(netExp, total2);
      nisa2 -= draw * ratio;
      cash2 -= draw * (1 - ratio);
      nisa2 = Math.max(0, nisa2); cash2 = Math.max(0, cash2);
      const t = Math.round(nisa2 + cash2);
      if (t <= 0) survived90 = false;
      if (t < needed) neverBelow = false;
    }
    if (!def2 && survived90) def2 = retAge;
    if (!def3 && neverBelow) def3 = retAge;
    if (def1 && def2 && def3) break;
  }
  return { def1, def2, def3 };
}
```

---

## 山本恒一シリーズ（確定・厳密検証可能）

### 初期条件
```javascript
const base = {
  curAge: 34, nisaBal: 400, cashBal: 420,
  nisaCon: 120, rW: 4, rR: 4,
  baseInc: 456, baseExp: 264,
  penAge: 65, penInc: 100
};
// 余剰456-264=192万 >= 積立120万
```

### 全シナリオ確定値（①最低限／②最速／③安心）

| シナリオ | ①最低限 | ②最速 | ③安心 |
|---|---|---|---|
| 基本（支出264万） | 55歳 | 51歳 | 57歳 |
| 支出288万（+月2万） | 58歳 | 52歳 | 59歳 |
| 支出228万（-月3万） | 51歳 | 48歳 | 53歳 |
| 支出180万（極限） | 46歳 | 44歳 | 49歳 |
| 利回り4%（基本） | 55歳 | 51歳 | 57歳 |
| 利回り5% | 54歳 | 49歳 | 54歳 |
| 利回り6% | 53歳 | 47歳 | 53歳 |
| 利回り7% | 51歳 | 45歳 | 51歳 |
| 転職（積立170万・手取506万） | 52歳 | 48歳 | 53歳 |
| 転職+生活上昇（支出320万） | 58歳 | 52歳 | 58歳 |
| 34歳開始（基準） | 55歳 | 51歳 | 57歳 |
| 40歳開始 | 61歳 | 55歳 | 62歳 |
| 44歳開始 | 65歳 | 58歳 | 65歳 |
| 積立156万（+月3万） | 54歳 | 50歳 | 55歳 |

### モンテカルロ確定値（CSV実測・年金100万/年・65歳から）

| 設定 | 破綻確率 | 備考 |
|---|---|---|
| 利回り4%・標準偏差10% | 14.3% | 中央値最終資産4,756万 |
| 利回り7%・標準偏差16% | 6.0% | 中央値最終資産2.78億 |

---

## 中村夫婦シリーズ（確定・厳密検証可能）

### 初期条件
```javascript
const NAKAMURA = {
  curAge: 38, lifeEx: 90,
  spCurAge: 36,
  baseInc: 480, spInc: 355,
  baseExp: 360,
  retAge: 58, spRetAge: 56,
  penAge: 65, penAmt: 170,
  spPenAge: 65, spPenAmt: 120,
  inflation: 2,
  nisaBal: 600, nisaCon: 180,
  idecoBal: 300, idecoCon: 0,
  taxBal: 400, taxCon: 0,
  cashBal: 900,
  rW: 7, rR: 4,
  mcStd: 16, mcStdR: 8,
};

const EVENTS = [
  { type:'loan',    s:38, e:68, amt:158 },  // ← mortgage type: 元本4100万・金利1%・30年（=158.25万/年）
  { type:'edu1',    s:49, e:53, amt:250 },
  { type:'edu2',    s:52, e:56, amt:250 },
  { type:'nursing', s:55, e:58, amt:100 },
  { type:'base_change', age:68, amt:240 },
  { type:'severance_m', age:58, amt:2299 },  // 退職金2299万(sevYrs≥42で控除後=2299万、非課税)
  { type:'ideco_pension', s:65, e:80, amt:58 },
];
// Next.js版での確定パラメータ（2026-06-21 CSV突き合わせ完了）:
// loan: subtype:'mortgage', principal:4100, rate:1.0, termYears:30 → 158.25万/年
// idecoYrs:13, sevYrs:42（KENZOの「勤続5年」は物語上の設定・CSV整合には42が必要）
// iDeCo: receiveType:'pension', receiveYears:15, startAge:65
// MC 破綻率 ~22-24%（≈20.4%+特定口座課税バイアス2-3%）
```

### 確定数値（中立シナリオ・決定論的）

| 翔太年齢 | 総資産 | 収入 | 支出 | 備考 |
|---------|--------|------|------|------|
| 38歳 | 2,608万 | 835万 | 518万 | 開始 |
| 49歳 | 7,930万 | 835万 | 856万 | 子1大学開始 |
| 52歳 | 8,986万 | 835万 | 1,133万 | 子1+子2重複 |
| 55歳 | 10,547万 | 835万 | 1,012万 | 介護費開始 |
| 56歳 | 11,345万 | 835万 | 772万 | 美咲退職 |
| 57歳 | 12,192万 | 835万 | 783万 | 翔太のみ収入 |
| 58歳 | 14,272万 | 2,299万 | 693万 | 両者退職・退職金計上 |
| 65歳 | 12,409万 | 228万 | 773万 | 年金+iDeCo年金開始 |
| 68歳 | 12,367万 | 348万 | 435万 | ローン完済・生活費240万 |
| 80歳 | 15,677万 | 290万 | 551万 | iDeCo年金終了 |
| 90歳 | 18,685万 | 290万 | 672万 | 終端・資産枯渇なし |

### MC確定値（実機・1,000試行）

| 指標 | 値 |
|------|-----|
| 破綻率（90歳時点） | 20.4% |
| 枯渇試行の平均枯渇年齢 | 80歳 |
| 枯渇試行の最短枯渇年齢 | 64歳 |
| 90歳時点 p10 | 0万円（破綻） |
| 90歳時点 中央値 | 1.14億円 |
| 90歳時点 p90 | 5.04億円 |

### 重要な実装上の注意（中村夫婦シリーズで判明）
- 積立期：全口座共通でrW（フィールド値）を使う。口座ごとに別利回りを設定しない。
- 取崩期：全口座共通でrR+shockを使う。ただし特定口座の課税（約20%）により、スクリプト上の想定破綻率より実機破綻率が数%高くなる場合がある。

---

## 田中誠シリーズ（要追加・未確定）

SIMULATION_GUIDE.mdに確定設定ブロックが見つかりませんでした。
note記事内に埋め込まれた数値（55歳セミリタイア、9,369万円等）はありますが、本ファイルの基準とするには
旧HTML版で再度CSV出力して確認する必要があります。移植作業に着手する前に、KENZOに以下を依頼してください。

- [ ] 田中誠シリーズの初期パラメータ（curAge, nisaBal, cashBal, baseInc, baseExp等）を旧HTML版に入力
- [ ] 各話で使われた主要シナリオ（支出見直し・教育費込み・インフレ2%・モンテカルロ）のCSVを出力
- [ ] 本ファイルに山本・中村と同じ形式で追記

## 佐々木誠一シリーズ（要追加・未確定）

田中シリーズと同様、確定設定ブロックが見つかりませんでした。同じ手順で追記が必要です。

- [ ] 初期パラメータ（53歳・資産6,889万円等）を旧HTML版に入力
- [ ] 主要シナリオ（55歳/60歳退職比較、支出増額、医療・介護費上乗せ）のCSVを出力
- [ ] 本ファイルに追記
