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

### 確定数値（中立シナリオ・決定論的）※iDeCo取崩前ロック修正後 proportional (2026-07-01)

| 翔太年齢 | 総資産 | 収入 | 支出 | 備考 |
|---------|--------|------|------|------|
| 38歳 | 2,608万 | 835万 | 518万 | 開始 |
| 49歳 | 7,930万 | 835万 | 856万 | 子1大学開始 |
| 52歳 | 8,986万 | 835万 | 1,133万 | 子1+子2重複 |
| 55歳 | 10,547万 | 835万 | 1,012万 | 介護費開始 |
| 56歳 | 11,345万 | 835万 | 772万 | 美咲退職 |
| 57歳 | 12,192万 | 835万 | 783万 | 翔太のみ収入 |
| 58歳 | 14,271万 | 2,299万 | 693万 | 両者退職・退職金計上 |
| 65歳 | 12,404万 | 254万 | 773万 | 年金+iDeCo年金開始（iDeCo保護により年金額増） |
| 68歳 | 12,350万 | 374万 | 435万 | ローン完済・生活費240万 |
| 80歳 | 15,563万 | 290万 | 551万 | iDeCo年金終了 |
| 90歳 | 18,521万 | 290万 | 672万 | 終端・資産枯渇なし |

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

## 田中誠シリーズ（確定・厳密検証可能）

### 初期条件
```javascript
const TANAKA = {
  curAge: 42, lifeEx: 90,
  baseInc: 650, baseExp: 480,
  retAge: 55, penAge: 65, penAmt: 150,
  spInc: 200, spRetAge: 55, spPenAge: 65, spPenAmt: 80, spCurAge: 40,
  nisaBal: 700, nisaCon: 120,
  idecoBal: 350, idecoCon: 27.6,
  taxBal: 550, taxCon: 52,
  cashBal: 900,
  rW: 4, rR: 4,  // 全口座共通（HTMLエンジンは取崩期も単一rRを使用）
  idecoYrs: 13, sevYrs: 5,
  idecoReceiveType: 'lump', idecoStartAge: 65,
};
// 退職金: 800万（税引後739万）
// severanceNet計算(2026-07-10 retirementTaxCalc受取年判定修正後): 退職金(55歳)とiDeCo一時金(65歳)は別年受取のため
//   控除は合算せずsevYrs=5のみを使用。sevDed(sevYrs=5)=200万 → taxable=(800-200)/2=300万 → tax≈61万 → net≈739万
//   （修正前は別年でもdcYears=13が混入しdcDed=520万で計算・net=772万だった。旧HTML版の実挙動を継承した値だが
//   税制上不正確なため、AUDIT_severance_ideco_deduction_mixup.md / FIX_retirement_tax_calc_final.mdの調査を経て
//   2026-07-10に「同一年受取のみ控除一本化」に修正。詳細はsrc/lib/helpers.tsのretirementTaxCalcコメント参照）
// 重要: HTMLエンジンは取崩期も全口座共通rRを使う。プロファイルにrRNisa/rRIdeco/rRTax別設定があっても無視
```

### 完全FIREシナリオ確定値（inflR=1%・教育費なし・退職金800万・retAge=55）※retirementTaxCalc受取年判定修正後 proportional (2026-07-10)

| 翔太年齢 | 総資産 | 収入表示 | 支出 | 備考 |
|---------|--------|------|------|------|
| 42歳 | 2,934万 | 850万 | 480万 | 開始 |
| 45歳 | 4,272万 | 850万 | 495万 | |
| 54歳 | 8,710万 | 850万 | 541万 | 積立最終年 |
| 55歳 | 9,336万 | 939万 | 546万 | 退職・退職金739万計上（939=200配偶者+739） |
| 56歳 | 9,219万 | 200万 | 552万 | 配偶者のみ就労（spAge=54<55） |
| 57歳 | 8,892万 | 0万 | 557万 | 配偶者退職（spAge=55） |
| 65歳 | 5,878万 | 150万 | 603万 | 年金開始・iDeCo一括受取（iDeCo保護により受取額増） |
| 67歳 | 5,252万 | 230万 | 616万 | 配偶者年金開始（spPenAge=65・sp65歳時） |
| 82歳 | 0万 | 230万 | 715万 | 資産枯渇 |
| 90歳 | 0万 | 230万 | 715万 | 終端 |

### セミリタイヤシナリオ確定値（生活費base_change→300万・inflR=1%）※retirementTaxCalc受取年判定修正後 proportional (2026-07-10)

| 翔太年齢 | 総資産 | 収入表示 | 支出 | 備考 |
|---------|--------|------|------|------|
| 42歳 | 2,934万 | 850万 | 480万 | 開始 |
| 55歳 | 9,336万 | 939万 | 546万 | 退職（FIREと同値） |
| 56歳 | 9,429万 | 200万 | 345万 | 生活費300×(1.01)^14≈345万 |
| 57歳 | 9,321万 | 0万 | 348万 | |
| 65歳 | 8,368万 | 150万 | 377万 | 年金・iDeCo受取 |
| 67歳 | 8,351万 | 230万 | 385万 | 配偶者年金 |
| 90歳 | 8,848万 | 230万 | 484万 | 終端・資産枯渇なし |

### インフレ2%シナリオ確定値（セミリタイヤ+教育費250万×2・inflR=2%）※retirementTaxCalc受取年判定修正後 proportional (2026-07-10)

イベント: edu1@45（4年・250万）、edu2@48（4年・250万）、base_change@56（300万）、退職金@55（800万）

| 翔太年齢 | 総資産 | 収入表示 | 支出 | 備考 |
|---------|--------|------|------|------|
| 42歳 | 2,934万 | 850万 | 480万 | 開始 |
| 45歳 | 3,993万 | 850万 | 759万 | 子1大学開始（480×1.02^3+250=759万） |
| 48歳 | 4,316万 | 850万 | 1,041万 | 子1・子2重複（480×1.02^6+500=1,041万） |
| 52歳 | 5,368万 | 850万 | 585万 | 教育費終了 |
| 55歳 | 6,840万 | 939万 | 621万 | 退職（480×1.02^13=621万） |
| 56歳 | 6,874万 | 200万 | 396万 | 生活費300×(1.02)^14≈396万 |
| 84歳 | 0万 | 230万 | 676万 | 資産枯渇 |
| 90歳 | 0万 | 230万 | 676万 | 終端 |

### 重要な実装上の注意（田中シリーズで判明・中村で予告済み）
- HTMLエンジンは取崩期も全口座共通でrRを使う（プロファイルのrRNisa/rRIdeco/rRTaxは無視）
- 田中プロファイルにrRIdeco=2%, rRTax=1%が保存されているが、CSV検証ではrR=4%（全口座共通）が正解
- base_changeのamountはcurAge時点の現在価値で記述。インフレ係数は「eventAge - curAge」年分ではなく「eventAge - curAge」年分のinflM全体で掛ける（検証済み）
- **2026-07-10: retirementTaxCalc（`src/lib/helpers.ts`）の受取年判定を修正**。旧HTML版は退職金とiDeCo一時金が別年受取でも常に`max(dcYears, sevYears)`で控除を一本化していたが（実際の税制とは不整合）、修正後は同一年受取の場合のみ一本化し、別年受取はそれぞれ自分の年数のみを使う。田中誠シリーズは退職金(55歳)とiDeCo一時金(65歳)が別年のため、この修正で退職金の税引後手取りが772万円→739万円に変化し、以降の年の総資産も追随して変化した（上記表は修正後の値）。詳細は`docs/fixes/done/FIX_retirement_tax_calc_final.md`参照。

### MCシナリオ確定値（HTML実機突き合わせ済み・2026-06-22）

**重要な発見**: HTMLのMCシナリオはsameAsWorking=false状態で実行されていた。
取崩期rR: rRNisa=4%, rRIdeco=2%, rRTax=1%（口座別）、mcStdR=16%（ポートフォリオσ=16%から自動設定）。
これは決定論的検証（rR=4%全口座共通）とは異なるパラメータ。HTML画面でsameAsWorkingをOFFにした状態で計算している。

| シナリオ | HTMLの変更内容 | HTML破綻率 | 備考 |
|---------|------------|---------|------|
| MCbase  | セミリタイヤ基本（retAge=55, sev@55, base_change@56=300万） | 25.4% | rRNisa=4/rRIdeco=2/rRTax=1/mcStdR=16 で ~24-25% 再現 |
| MC-10%  | base_change=270万（生活費10%削減） | 10.5% | 同上パラメータで ~10% 再現 |
| MC+2years | retAge=57・spRetAge=57・sev@57・base_change@58=300万 | 9.8% | 配偶者も同時に57歳退職、同上rRパラメータで ~10% 再現 |
| MCCFall | rRTax=4（積立期と同利回り・特定口座積立は52万のまま） | 20.6% | cTax=52, rRTax=4（rRNisa=4/rRIdeco=2据え置き）で ~18% 再現（差2.5pp、±5%PASS） |

**Next.js移植版での再現パラメータ（MCシナリオ用）**:
- rRNisa=4, rRIdeco=2, rRTax=1（sameAsWorking=false時の保存値）
- mcStdR=16（ポートフォリオσ=16%から自動設定）
- MCCFall: cTax=52（変更なし）+ rRTax=4（rWTax=4と同じ値に変更）のみ

※ 決定論的シナリオ（年次資産表・Section5）はrR=4%全口座共通が正解（CSV検証済み）。
※ MCシナリオは上記の別パラメータで実行されていた。全口座rR=4%で計算した場合の破綻率は ~17-18%（mcStdR=16）または ~5%（mcStdR=10）。

## 佐々木誠一シリーズ（確定・厳密検証可能）

### 初期条件
```javascript
const SASAKI = {
  curAge: 53, lifeEx: 90,
  baseInc: 620, baseExp: 360,
  inflR: 1,
  retAge: 60, penAge: 65, penAmt: 150,
  spInc: 100, spRetAge: 60, spPenAge: 65, spPenAmt: 80, spCurAge: 51,
  nisaBal: 1200, nisaCon: 120, nisaToAge: 60,
  idecoBal: 1200, idecoCon: 27.6, idecoToAge: 60,
  taxBal: 2300, taxCon: 0, taxToAge: 60,
  cashBal: 1500,
  rW: 7, rR: 4,  // 全口座共通
  idecoYrs: 20, sevYrs: 30,
  idecoReceiveType: 'pension', idecoReceiveYears: 15, idecoStartAge: 65,
};
// 退職金: 2000万（税引後1949万）
// sevDed = 800+70*(30-20)=1500万 → taxable=(2000-1500)/2=250万 → tax≈51万 → net=1949万
// プロファイルJSONにはseveranceのみ保存。CSV生成時に再雇用2つが追加されていた。
```

### イベント（CSV生成時に使用）
```javascript
const EVENTS = [
  { category: 'income', subtype: 'severance', age: 60, amount: 2000 },
  { category: 'income', subtype: 'reemploy',  age: 61, years: 5, amount: 350 },  // 再雇用①
  { category: 'income', subtype: 'reemploy',  age: 66, years: 5, amount: 100 },  // 再雇用②
];
```

### 確定数値（中立シナリオ・決定論的）※iDeCo取崩前ロック修正後 proportional (2026-07-01)

| 翔太年齢 | 総資産 | 収入表示 | 支出 | 備考 |
|---------|--------|------|------|------|
| 53歳 | 6,889万 | 720万 | 360万 | 開始 |
| 59歳 | 11,734万 | 720万 | 382万 | 積立最終年 |
| 60歳 | 13,742万 | 2,049万 | 386万 | 退職・退職金1949万計上（2049=100配偶者+1949） |
| 61歳 | 14,163万 | 450万 | 390万 | 再雇用①開始（450=100配偶者+350再雇用） |
| 62歳 | 14,492万 | 350万 | 394万 | 配偶者退職（spAge=60）・再雇用①のみ |
| 65歳 | 15,655万 | 646万 | 406万 | 年金開始・iDeCo年金開始（iDeCo保護により年金額増） |
| 66歳 | 15,883万 | 402万 | 410万 | 再雇用①終了・再雇用②開始 |
| 67歳 | 16,196万 | 489万 | 414万 | 配偶者年金開始（spAge=65） |
| 70歳 | 17,160万 | 509万 | 426万 | 再雇用②最終年 |
| 71歳 | 17,390万 | 417万 | 431万 | 再雇用②終了・iDeCo年金のみ |
| 79歳 | 19,352万 | 488万 | 466万 | iDeCo年金最終年（受取開始から15年目） |
| 80歳 | 19,654万 | 230万 | 471万 | iDeCo年金終了（230=150+80配偶者年金のみ） |
| 90歳 | 23,235万 | 230万 | 520万 | 終端・資産枯渇なし |

### 重要な実装上の注意（佐々木シリーズで確認）
- iDeCo年金は `残高/残年数` 方式（各年の残高×rRで運用後に払出）
- iDeCo年金の収入表示はNET（公的年金等控除後の課税済み額）
- `calcPensionTaxDiff(penAmt, idecoAnnual, age)` は「iDeCo年金追加による差分税額」を返す
- 配偶者年金開始タイミング: spCurAge=51、spPenAge=65 → 主人公が67歳時（spAge=65）から年金受取
