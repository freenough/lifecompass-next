# Next.js版 機能差分調査・修正指示

## 背景

旧HTML版（`STEP35_simulator.html`）からNext.js版への移植において、
細かい機能差分が残っている。個別報告を受けて1件ずつ直すのではなく、
**コードを直接比較して差分を網羅的に洗い出し、一括修正**してほしい。

参照ファイル: プロジェクトルートの `STEP35_simulator.html`

---

## 既知の差分（着手済みのもの）

以下はすでに把握済み・修正済みのため対象外：
- ポートフォリオパネルのσ計算バグ（口座concat問題）→修正済み
- 利回り設定の取崩期表示（sameAsWorking）→修正済み
- ハイドレーションエラー（page.tsx mounted対応）→修正済み

---

## 調査・修正対象

### 1. 住宅ローンイベントモーダル（最優先・確認済み差分）

**旧HTML版の住宅ローンモーダル仕様：**
- 借入額（万円）・金利（年率%）・返済年数（年）・返済開始年齢 の4入力
- `calcMortgagePreview()` でリアルタイム試算表示：
  - 月次返済額・年次返済額・総返済額
- 旧HTML `calcMortgage(principal, rate, termYears)` 関数：
  ```js
  function calcMortgage(principal, rate, termYears) {
    // 元利均等返済（annuity formula）
    const r = rate / 100 / 12;
    const n = termYears * 12;
    if (r === 0) return principal / termYears;
    const monthly = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return Math.round(monthly * 12); // 年間返済額を返す
  }
  ```
- イベントのsubtypeは `'mortgage'`、保存フィールド: `principal`, `rate`, `termYears`, `age`, `years`（=termYears）
- タイムライン表示: `住宅ローン 41〜61歳 / 200万`（年次返済額）

**Next.js版の現状：**
- 住宅ローンイベントのモーダルが旧版の4入力+試算表示になっていない
- シンプルな金額入力のみになっている可能性

**修正方針：**
`src/components/simulator/LifeEventTimeline.tsx` の住宅ローンモーダル部分を
旧HTML版と同等の仕様に修正する。
- 4入力フィールド（借入額・金利・返済年数・返済開始年齢）
- リアルタイム試算表示（月次・年次・総返済額）
- 注意書き: 「元利均等返済のみ対応。繰上返済・ボーナス払いは非対応。返済額は名目固定額として計算します（変動金利による変動は非対応）。金利変動リスクは支出イベントで別途登録してください。」

---

### 2. 全コンポーネントの機能差分調査

以下のコンポーネントについて、旧HTML版と比較して**実装漏れ・仕様差異**がないか調査し、
差分があれば修正してほしい。

#### 調査方法
各コンポーネントの対応する旧HTML実装を `STEP35_simulator.html` から `grep` + `sed` で確認し、
Next.js版の実装と突き合わせる。

#### 調査対象コンポーネント

| Next.js版ファイル | 旧HTMLの対応機能 | 調査観点 |
|---|---|---|
| `src/components/simulator/LifeEventTimeline.tsx` | ライフイベント追加・編集・削除、住宅ローンモーダル | イベント種別・入力項目・表示形式 |
| `src/components/simulator/MonteCarloPanel.tsx` | MC実行・結果表示・バンド表示 | 試行数・表示項目 |
| `src/components/simulator/SensitivityPanel.tsx` | 感度分析スライダー・チャート | パラメータ範囲・表示 |
| `src/components/simulator/YearlyTable.tsx` | 年次資産テーブル | 列構成・数値フォーマット |
| `src/components/simulator/ImpactTable.tsx` | 改善案インパクト比較 | 比較項目・計算方法 |
| `src/components/simulator/CashFlowChart.tsx` | キャッシュフローグラフ | 表示項目・凡例 |
| `src/components/simulator/AssetChart.tsx` | 資産推移グラフ | FIREライン・表示項目 |
| `src/components/simulator/SimulatorForm.tsx` | 基本入力フォーム | 全入力項目の網羅性 |

#### 調査手順（各コンポーネントに対して）

1. Next.js版コンポーネントの実装を読む
2. 旧HTMLから対応する機能部分を `grep` + `sed` で確認
3. 差分（実装漏れ・仕様差異）をリストアップ
4. 差分があれば修正

---

### 3. 優先順位

1. **住宅ローンモーダル**（既に画面で確認済み）
2. **LifeEventTimeline全般**（イベント種別・編集・削除の動作）
3. **その他コンポーネント**（調査結果に応じて）

---

## 注意事項

- 旧HTMLの機能をそのまま移植する。新機能追加はしない
- 数値計算ロジック（calcMortgage等）は旧HTMLと**完全一致**させること
- シミュレーション計算（simulate.ts・analyze.ts）には触らない
- 修正後は `npm run build` で型エラーがないことを確認すること
- 差分調査の結果は修正前にまとめて報告してほしい（大きな変更の場合は承認を取る）
