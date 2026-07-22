# 指示書: 正確なプロファイルJSONによる検算・全話再計算

作成日: 2026-07-22
対象: `lifecompass-next`
種別: 検算+再計算

---

## 提供する正確なプロファイルデータ

以下は、実際にシミュレーター画面(保存/読み込み機能)から書き出された、佐々木誠一(55歳退職ベースケース)の正確なプロファイルJSONです。

```json
{
  "id": 1784683442746,
  "name": "佐々木_55歳",
  "savedAt": "2026-07-22T01:57:32.925Z",
  "version": 3,
  "params": {
    "curAge": 53,
    "lifeEx": 90,
    "baseInc": 620,
    "baseExp": 360,
    "inflR": 1,
    "mcStd": 16,
    "mcStdR": 8,
    "rWNisa": 7,
    "rRNisa": 4,
    "rWIdeco": 7,
    "rRIdeco": 4,
    "rWTax": 7,
    "rRTax": 4,
    "rateSameAsWorking": false,
    "sigmaSameAsWorking": false,
    "pfManualFlags": {
      "rWNisa": true,
      "rWIdeco": true,
      "rWTax": true,
      "rRNisa": true,
      "rRIdeco": true,
      "rRTax": true,
      "mcStd": true,
      "mcStdR": true
    },
    "retAge": 55,
    "penAge": 65,
    "penAmtVal": 150,
    "bNisa": 1404,
    "cNisa": 120,
    "cNisaTo": 60,
    "bIdeco": 1312,
    "cIdeco": 27.6,
    "cIdecoTo": 60,
    "idecoYrs": 20,
    "sevYrs": 30,
    "idecoReceiveType": "pension",
    "idecoReceiveYears": 15,
    "idecoSplitRatio": 50,
    "idecoStartAge": 65,
    "bTax": 2461,
    "cTax": 0,
    "cTaxTo": 60,
    "bCash": 1712,
    "penAmt": 150,
    "spInc": 100,
    "spRetAge": 55,
    "spPenAge": 65,
    "spPenAmt": 80,
    "spCurAge": 51,
    "spNisaBal": 0,
    "spNisaCon": 0,
    "spNisaTo": 60,
    "spIdecoBal": 0,
    "spIdecoCon": 0,
    "spIdecoTo": 60,
    "spTaxBal": 0,
    "spTaxCon": 0,
    "spTaxTo": 60,
    "spSevYrs": 0,
    "spIdecoYrs": 0,
    "spIdecoReceiveType": "lump",
    "spIdecoReceiveYears": 10,
    "spIdecoSplitRatio": 50,
    "spIdecoStartAge": 60,
    "spCashBal": 0
  },
  "portfolio": {
    "current": { "nisa": [], "ideco": [], "tax": [], "spNisa": [], "spIdeco": [], "spTax": [] },
    "working": { "nisa": [], "ideco": [], "tax": [] },
    "retirement": { "nisa": [], "ideco": [], "tax": [], "sameAsWorking": true }
  },
  "events": [
    { "category": "income", "subtype": "severance", "name": "", "age": 55, "years": 1, "amount": 1500 }
  ],
  "ui": {
    "cmpMode": "strategy",
    "activeStrategies": ["proportional"],
    "activeScenarios": ["base"],
    "currentMode": "fixed",
    "balSync": { "nisa": false, "ideco": false, "tax": false, "cash": false }
  }
}
```

---

## 1. 検算

- 上記JSONを`profileToSimParams()`(または相当する変換関数)経由で`SimParams`に変換し、`simulate()`/`analyze()`で計算する
- 90歳時点資産が**8,761万円**と一致することを確認する
- 一致しない場合、原因(`portfolio.retirement.sameAsWorking: true`の扱い、`mcStd`/`mcStdR`の影響等、前回調査で見えていなかった要素)を特定し、報告すること

## 2. 60歳退職ケースの正確なプロファイルも必要

上記は55歳退職ケースのみのため、**60歳退職ケースの正確なプロファイルJSON(または該当箇所の差分)がまだない**。60歳退職ケースについては、以下のいずれかで対応すること:

- 上記JSONを元に、`retAge: 60`・退職金イベントを`age: 60, amount: 2000`に変更し、`cNisaTo`・`cIdecoTo`・`cTaxTo`(現状60)はそのままで計算する(退職年齢と積立終了年齢が一致するため、警告は出ないはずである)
- この方法で計算し、目標値(約2.0億円)に近い結果が出るか確認すること。もし大きく乖離する場合は、KENZOに60歳退職ケースの正確なプロファイルJSONの提供を依頼すること

## 3. 検算が取れたら、全話の再計算に進む

検算が一致したら、この正確な変換方法(`profileToSimParams()`経由)を使って、第3話・第4話・第6話・第8話・第9話・第10話、すべての数値を再計算すること。前回報告した仮定(第6話の収入設定・sidejobの使用等)はそのまま維持してよい。

---

## 報告フォーマット

```
## 検算・全話再計算 完了報告

### 検算結果
- 55歳退職ケース: (金額) - 8,761万円と一致: Yes/No
- 60歳退職ケース: (金額) - 約2.0億円と近似: Yes/No(使用した設定も記載)

### 全話の再計算結果
(前回と同じ形式、修正前後の差分も分かるように)

### 不明点・確認が必要な事項
- (60歳退職ケースの正確なプロファイルが必要な場合はここに記載)
```
