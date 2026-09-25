# 調査報告：`full-verify.js` で偶発的にFAILが出る原因の特定（現状調査）

調査日：2026-09-26
対象：`lifecompass-next`（main、`1790faf`）。`freenough-main` は読み取りのみ
指示書：`investigation.md`（同じフォルダ）

---

## 0. 開始時の状態

- ブランチ：`main`（`origin/main` と一致、`1790faf`）
- 未追跡：`docs/fixes/active/verify-seed-stability/`（本指示書）、`docs/fixes/done/budoux-phrase-break/`、`docs/fixes/done/internal-utm-to-ga4-event/`。
  後の2つは調査の範囲外として触れていない
- 指示書は `docs/fixes/active/investigation_verify_seed.md` にあったため、KENZOの指示で
  `mkdir docs/fixes/active/verify-seed-stability` と `mv … verify-seed-stability/investigation.md` を実行した
- 本調査で作ったファイル：このフォルダ内の `report.md` と `logs/`（`full-verify-run1〜10.log`・`yamamoto-mc-50runs.json`）。
  一時スクリプトはリポジトリ外（スクラッチパッド）。既存ファイルの変更・コミット・pushはしていない
- 指示書が参照している `technical-principles.md` はリポジトリ内に見つからなかった（`git ls-files | grep -i technical-principles` が0件）。
  「確定数値は本番関数を直接呼ぶ」の根拠は、`CLAUDE.md` の検証ルールと `reference/simulation_fixtures.md` の記述（本番関数を直接呼ぶ使い捨てスクリプトで算出）として扱った

---

## 前提の確認（途中で前提が崩れる事実はあったか）

**事実**：前提（乱数に依存する検証があり、同じコードでも実行ごとにFAILが出る）は**成り立つ**。10回中1回、表示上のFAILを再現した（3節）。

ただし、指示書の前提と違う点が2つある。

1. **`full-verify.js` のモンテカルロの判定（山本・中村・田中）は、PASS/FAILを表示するだけで、FAIL件数・終了コードに数えていない。**
   10回の実行はすべて終了コード0で、FAILを表示した回（run3）も終了コードは0だった。
   つまり「FAIL件数が変わる」のではなく、「ログに `FAIL` の文字が出たり出なかったりする」状態。
   完了報告で `grep FAIL` のようにログを数えると、実行ごとに結果が変わる
2. **Stop Hook（`.claude/settings.json`）が実行しているのは `verify-fixtures.js` だけで、乱数を使っていない**（`runMC`・`Math.random` の呼び出しなし、`mcStd: 0`）。
   CI（`.github/workflows/`）は存在しない。したがって「常にPASS」の強制が乱数で崩れる経路は、現状はない

---

## 1. 乱数の発生源（`src/`）

コマンド：

```
git -C lifecompass-next grep -n -E "Math\.random|getRandomValues|randomUUID|randomBytes|crypto\.random" -- src scripts
git -C freenough-main grep -n -E "Math\.random|getRandomValues|randomUUID|randomBytes" -- app   → 0件
git -C freenough-main grep -n -i -E "runMC|montecarlo" -- app                                    → 0件
```

`freenough-main` には乱数もモンテカルロもない。

### 1-1. シミュレーションの乱数（対象）

| ファイル:行 | 用途 | シード | 本番の共通関数か |
|---|---|---|---|
| `src/lib/helpers.ts:54〜59` `randNorm(mean, std)` | Box–Muller法で正規乱数を作る。`Math.random()` を直接2回呼ぶ | **なし**（内部で直接 `Math.random()`） | 共通の土台。下の3つから呼ばれる |
| `src/lib/montecarlo.ts:30〜32` `runMC()`（**ロックファイル**） | 試行×年数のZスコア行列（全口座共通のショック、相関=1の設計） | **注入口あり**：5番目の引数 `shockOverrides?: number[][]`。省略時だけ `randNorm(0,1)` で作る | **本番・記事の数値算出の共通関数**（UI：`simulatorStore.ts:174`・`HeroDemo.tsx:103`・`ImpactTable.tsx:82`、記事用スクリプト：`nakamura-rebuild.js`・`housing-loan-fire-numbers.js`・`blog11-*.js` など） |
| `src/lib/planSnapshot/generatePlan.ts:56〜58` `generateMcPercentiles()` | 予実比較のパーセンタイル | **注入口あり**：5番目の引数 `shockOverrides` | 本番（予実比較）。`runMC()` と同じ結果になることを `verify-plan-snapshot.js` が確認 |
| `src/lib/hojinCompanyState/mc.ts:85〜87` `runCombinedSimulation` 等（MCモード） | 個人＋法人の合算MCのZスコア行列 | **なし**（注入の引数なし、内部で `randNorm`） | 本番（シミュレーターの法人資産込み試算、`ImpactTable.tsx`） |

`runMC()` の `shockOverrides` はすでに記事用スクリプトで使われている（`blog11-nakamura-education-numbers.js:183`：3パターンで同じショック列を共有）。

### 1-2. シミュレーション以外の乱数（対象外）

いずれも一意なIDを作るためで、計算結果に関わらない。

- `src/components/assetManagement/AssetManagementPage.tsx:64`、`src/components/hojinCompanyState/CorporateEventTimeline.tsx:40`、`src/lib/assetManagement/csvHistory.ts:168`、`src/lib/hojinAssetManagement/transferLog.ts:18`（`Date.now()`＋`Math.random()` の文字列）
- `src/lib/assetManagement/profileStore.ts:67`、`src/lib/planSnapshot/generatePlan.ts:109`（`crypto.randomUUID()`）

---

## 2. 乱数に依存する検証

### 2-1. モンテカルロの結果を判定している検証

| ファイル:行 | 検証 | 期待値の種類 | FAIL件数・終了コードに数えるか | 10回の実測 |
|---|---|---|---|---|
| `scripts/full-verify.js:265,274,276` | 山本 利回り4%・σ10% の破綻率 | 範囲（14.3% ±3%） | **数えない**（表示だけ） | 12.8〜18.2%、**run3で18.2%（FAIL表示）** |
| `scripts/full-verify.js:269,275,277` | 山本 利回り7%・σ16% の破綻率 | 範囲（6.0% ±3%） | 数えない | 4.8〜6.8%、FAILなし |
| `scripts/full-verify.js:287,298〜299` | 中村 破綻率（90歳） | 範囲（20.4% ±5%） | 数えない | 20.5〜23.4%、FAILなし |
| `scripts/full-verify.js:553〜560` | 田中 MC 4シナリオの破綻率 | 範囲（HTML実機の値 ±5%） | 数えない | MCbase 23.5〜27.4%、MC-10% 8.9〜11.9%、MC+2years 10.1〜12.3%、MCCFall 18.0〜20.4%。FAILなし |
| `scripts/full-verify.js:300〜` | 中村 平均枯渇年齢・p10/p50/p90 など | 表示だけ | 数えない | — |
| `scripts/verify-companystate.js:410〜417`（`full-verify.js` から実行） | 3戦略の値が単純な複製ではない | 大小の判定（いずれかに差がある） | **数える**（`checkTrue`） | FAILなし |
| `scripts/verify-companystate.js:503〜512` | 支出10%削減で個人側の破綻率が1%以上変わる | 大小の判定（\|Δ\| ≥ 1） | **数える** | Δ＝−4.6〜−14.4%、FAILなし（別々の乱数列による2回のMCの差） |
| `scripts/verify-companystate.js:383〜384,444〜445` | 破綻率が有限数 | 性質の確認 | 数える | FAILなし（乱数に関わらず成り立つ） |

### 2-2. 乱数を「入力」に使っているが、判定は決定的なもの

乱数でテストケースを作り、同じ入力に対する2つの計算を比べる検証。どちらも正しければ、乱数の値によらず成り立つ。

| ファイル:行 | 内容 | 10回の結果 |
|---|---|---|
| `verify-compound.js:162〜165` | 100件のランダムな入力で往復計算の整合性（許容誤差あり） | FAILなし |
| `verify-finance-core.js:160〜163` | 100件 | FAILなし |
| `verify-fire-age.js:158〜161` | 100件 | FAILなし |
| `verify-pension-timing.js:238〜242` | 100件 | FAILなし |
| `verify-retirement-surplus-reinvestment.js:264〜268` | 100件 | FAILなし |
| `verify-retirement-tax-80man-floor.js:128〜129` | 100件 | FAILなし |
| `verify-plan-snapshot.js:96〜118` | ランダムなショック列を `runMC()` と `generateMcPercentiles()` の両方に同じく渡し、完全一致を確認 | FAILなし |

これらは、FAILした場合に**入力値がログに出る作り**（`record(label, ok, detail)` の `detail` に入力値を出力）。ただし再現用のシードはない。

### 2-3. 山本4%シナリオの追加の実測（50回）

`full-verify.js` の `MC4_P`・`MC7_P` と同じパラメータで、本番の `runMC()`（N=1000）だけを50回実行した（`logs/yamamoto-mc-50runs.json`）。

| | 平均 | 標準偏差 | 最小〜最大 | 許容範囲 | 範囲外 |
|---|---|---|---|---|---|
| 利回り4%・σ10% | 14.41% | 1.20 | 11.6〜17.2% | 11.3〜17.3% | 0/50 |
| 利回り7%・σ16% | 5.88% | 0.73 | 4.3〜7.7% | 3.0〜9.0% | 0/50 |

- 破綻率 p≈0.144、試行数 N=1000 の二項分布の標準偏差は √(0.144×0.856/1000) ≈ 1.11% で、実測の1.20とほぼ一致する
- 許容幅±3%は、標準偏差の約2.5倍。正規近似では、1回あたり約1%の確率で範囲外になる計算
- 一方で、`full-verify.js` の10回（平均15.35%）と、前回セッションで観測した11.1%を合わせると、範囲外は11回中2回（18.2%・11.1%）。50回の分布から見ると大きめの外れ方で、回数が少ないため、この差が偶然かどうかは判断できない（所見）

---

## 3. 再現の実測（`full-verify.js` を10回連続実行）

コマンド：`node scripts/full-verify.js > logs/full-verify-run{1..10}.log`（同じコード・同じ入力）

| 回 | 終了コード | 時間 | 山本4% | 山本7% | 中村 | 田中（base / -10% / +2years / CFall） | 数えたFAIL件数 | FAIL表示 |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 50秒 | 12.8% | 5.7% | 22.2% | 23.7 / 10.0 / 10.5 / 18.5 | 0 | なし |
| 2 | 0 | 46秒 | 14.4% | 5.9% | 22.5% | 26.4 / 10.9 / 10.1 / 18.7 | 0 | なし |
| **3** | **0** | 41秒 | **18.2%** | 5.8% | 22.8% | 26.1 / 10.4 / 12.3 / 19.4 | **0** | **山本4%（FAIL）** |
| 4 | 0 | 49秒 | 14.8% | 6.8% | 23.4% | 25.3 / 9.7 / 11.9 / 18.2 | 0 | なし |
| 5 | 0 | 42秒 | 14.4% | 5.2% | 20.5% | 23.5 / 9.0 / 10.9 / 19.7 | 0 | なし |
| 6 | 0 | 43秒 | 15.9% | 6.1% | 21.7% | 26.0 / 10.8 / 10.2 / 18.0 | 0 | なし |
| 7 | 0 | 43秒 | 14.9% | 6.2% | 20.7% | 25.4 / 11.9 / 11.2 / 20.1 | 0 | なし |
| 8 | 0 | 47秒 | 17.0% | 6.2% | 21.9% | 25.9 / 8.9 / 10.7 / 18.9 | 0 | なし |
| 9 | 0 | 52秒 | 15.0% | 4.8% | 21.7% | 27.4 / 10.4 / 12.0 / 19.7 | 0 | なし |
| 10 | 0 | 84秒 | 16.1% | 5.5% | 21.1% | 24.6 / 10.7 / 10.2 / 20.4 | 0 | なし |

「数えたFAIL件数」は、各 `verify-*.js` が出力する「N PASS / N FAIL」「PASS=N FAIL=N」の合計。

run3のFAILのログ（`logs/full-verify-run3.log`）：

```
  設定            | 期待破綻率 | 実際破綻率 | 許容±2% | 結果
  ----------------+------------+------------+---------+------
  利回り4%・σ10%  |    14.3%   |   18.2%   |  ±3%  | FAIL
  利回り7%・σ16%  |     6.0%   |   5.8%   |  ±3%  | PASS
  ※モンテカルロは乱数のため毎回微妙に変動します
```

（見出しは「許容±2%」だが、判定と各行の表示は±3%。`full-verify.js:272` と `274〜277` の不一致）

過去の観測：2026-09-25 の実行で、同じ山本4%が11.1%（FAIL表示）になり、続けて4回実行すると 13.2／14.0／14.6／14.3%（すべてPASS）だった。

---

## 4. 対処方針の選択肢（提案。事実ではない）

### 選択肢A：固定シードの乱数を、検証スクリプトから `shockOverrides` で渡す

- **本番コードの変更は不要**。`runMC()` にはすでに `shockOverrides` がある。検証スクリプトの中で、シード付きの疑似乱数（例：mulberry32＋Box–Muller）からZスコア行列を作って渡す。
  `montecarlo.ts`（ロックファイル）・`helpers.ts` のシグネチャは変えない。本番のUI・記事の算出は従来どおり `Math.random()` のまま
- 変更するファイル：`scripts/full-verify.js`（山本2件・中村1件・田中4件の `runMC` 呼び出し）と、共通のシード付き乱数を置く小さなヘルパー（例：`scripts/lib/seededShocks.js`）
- 結果は毎回同じになり、表示上のFAILはなくなる。期待値（14.3%など、HTML実機の値）との比較は、「固定シードでの値が±範囲に入ること」になる。シードを選び直すと値が変わるため、シードは固定して記録しておく必要がある
- `hojinCompanyState/mc.ts`（ロックファイルではない）には注入口がない。`verify-companystate.js` の2件の大小判定も固定したい場合は、`runMC()` と同じ形の任意引数を足す変更が必要（本番の呼び出し元は渡さないので挙動は変わらない）。現状の実測（Δ＝−4.6〜−14.4%に対して閾値1%）では、FAILの可能性は低い
- 乱数を入力に使う検証（2-2節）もシード付きにすれば、FAILしたときに同じ入力で再現できる（任意）
- リスク：本番の乱数の質には影響しない。一方で「固定シード1つ」だけを見ることになり、N=1000の統計的なぶれ自体は検証されなくなる

### 選択肢B：許容幅を統計的に見直す

- 二項分布の標準偏差 √(p(1−p)/N) から、許容幅を「期待値 ± 3.5〜4σ」にする。山本4%は σ≈1.1% なので ±4〜4.5%。中村・田中（p≈0.1〜0.26）は σ≈0.9〜1.4% で、現在の±5%はすでに約3.5σ以上ある
- 試行回数を増やす（例：N=10000）とσは約1/3（山本4%で約0.35%）になるが、`full-verify.js` の実行時間（現在40〜80秒）のうち、MCの部分が約10倍になる
- 変更するファイル：`scripts/full-verify.js` だけ。ロックファイルは触らない
- リスク：確率はゼロにならない（4σでも1回あたり約0.006%）。許容幅を広げると、実装の小さなずれ（例：課税の変更による1〜2%の変化）を見逃しやすくなる

### 選択肢C：MCの判定を「参考値」として分ける

- 現状、MCの判定はすでにFAIL件数・終了コードに数えていない（前提の確認1）。表示の `PASS`/`FAIL` を `参考: 範囲内`/`参考: 範囲外` に変え、完了報告でログの `FAIL` を数える運用と衝突しないようにするだけで済む
- 変更するファイル：`scripts/full-verify.js` だけ
- リスク：MCの回帰（実装が壊れて破綻率が大きく変わる）を、自動では検出しなくなる。現状も検出していないので、今より悪くはならない

### 所見（組み合わせの案）

- **A＋C** が影響とリスクのつり合いがよい。
  - 固定シードで決定的に回す判定を、数える判定に入れる（Aの利点：実装の回帰を検出できる）
  - これまでどおり `Math.random()` で回す判定は「参考値」として表示する（Cの利点：統計的なぶれも見える）
- `full-verify.js:272` の見出し「許容±2%」は、判定（±3%）と合っていないので、どの選択肢でもあわせて直すとよい
