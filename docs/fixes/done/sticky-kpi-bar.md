# 指示: モバイル用スティッキーKPIバー ＋ 入力トグンの常時sticky化（修正版）

## 経緯
前回の指示書に記載していた `kpi` オブジェクト（`fireAge`/`assetLife`/`bankruptcyAge`/
`bankruptcyRate`/`mcEnabled`）および `DESIGN_AI_ANALYSIS.md` は誤り。
`DESIGN_AI_ANALYSIS.md` はAIパネル（Gemini分析）用の別ドキュメントで、本タスクとは無関係。
実施した事前確認の結果、以下の対応関係が正しいことが判明したため、これに従って実装する。

## 確認済みの前提（再確認不要・そのまま使う）

### レイアウトのブレークポイント
`src/app/simulator/page.tsx:117` の `lg:flex-row`（1024px）が縦積み⇔横並びの切り替え地点。
`sm:hidden`（640px）は入力トグン自体の表示/非表示の別条件であり、本タスクの対象ではない。
StickyKpiBarの表示条件は **`lg:`（1024px）を使うこと**。

### データソースの対応関係
| 表示したい値 | 参照するもの |
|---|---|
| FIRE達成年齢 | `analysis[strategy].fA`（`number \| null`） |
| 資産寿命／枯渇年齢 | `analysis[strategy].dA`（`null`なら枯渇なし、値があれば枯渇年齢） |
| MC破綻率 | `mcResult?.strategies[strategy]?.bankruptcyRate` |
| MC実行済みか | `mode === 'mc'`（`mode: 'fixed' \| 'mc'`） |

**新規の計算ロジックは一切追加しない。上記の既存値をそのまま参照するだけ。**

### 追加確認事項（実装前に必須・報告してから進めること）
`activeStrategies` が複数選択されている場合、`KpiGrid.tsx` が現在どの戦略の値を
主表示として使っているか（`[...activeStrategies][0]` のような先頭選択か、別の固定ロジックか）
を確認し、`strategy` の解決方法を特定すること。
**StickyKpiBarは必ずKpiGridと完全に同じ戦略解決ロジックを使うこと。**
ここがズレると、スクロールでバーとグリッドが入れ替わる瞬間に数値が食い違って見える。

## やること

### 1. StickyKpiBar コンポーネント新規作成
`src/components/simulator/StickyKpiBar.tsx` を新規作成。

- 上記「データソースの対応関係」表の値を、`KpiGrid.tsx` と同じ戦略解決ロジックで取得する。
- 表示内容:
  - 左スロット: `fA` が値を持つ場合 `FIRE達成: {fA}歳`、`null` の場合 `FIRE: 未達成`
  - 右スロット:
    - `mode !== 'mc'` の場合: `dA === null` なら `資産寿命: 枯渇なし`、
      値がある場合は `資産寿命: {dA}歳で枯渇`
    - `mode === 'mc'` の場合: `MC破綻率: {bankruptcyRate}%`
      （色分けは既存の `KpiGrid.tsx`／`kBR` の色分けロジック・カラー変数をそのまま再利用。
      5%未満／5〜15%／15%以上の3区分）
- 表示範囲: `lg:`（1024px）未満の縦積みレイアウトの間のみ。1024px以上では常に非表示。
- 位置: `fixed bottom-0 left-0 right-0`。`padding-bottom: env(safe-area-inset-bottom)` を追加。
  z-indexはヘッダー・入力トグン（後述）と重ならないよう調整。
- v1ではタップ時の挙動（スクロール連動等）は実装しない。純粋な情報表示のみ。

### 2. 表示/非表示の制御（IntersectionObserver）
`KpiGrid` コンポーネントのルート要素を監視するフックを実装（`StickyKpiBar.tsx` 内、
または `hooks/useInView.ts` として切り出しても良い）。

- `KpiGrid` が画面内に見えている間 → `StickyKpiBar` 非表示
- `KpiGrid` が画面外に出た瞬間 → `StickyKpiBar` 表示

`KpiGrid.tsx` 側に監視対象のrefを渡せるよう、必要であれば `ref` をforwardする。
**`KpiGrid.tsx` 自体の表示内容・計算ロジックには一切手を入れない。**

### 3. 「入力を編集/入力を閉じる」トグンの常時sticky化
現在このトグンはページの通常のスクロールフロー内にあり、スクロールすると
一緒に流れて見えなくなる（`sm:hidden` の条件で640px未満のみ存在）。
開閉状態に関わらず、常に `position: sticky; top: <ヘッダーの実際の高さ>` にし、
ヘッダー直下から常に押せる状態にする。

- 開いている間も閉じている間も同一の挙動（stickyのオン/オフを状態で切り替えない）
- 表示条件（640px未満）自体は変更しない。stickyにするかどうかだけの変更。
- z-indexはヘッダー・StickyKpiBarと重ならないよう調整すること

### 4. 配置
`simulator/page.tsx` に `<StickyKpiBar />` を追加。他のfixed要素と重ならない位置に配置。

## 制約・確認事項
- `simulate.ts` / `analyze.ts` は変更禁止（既存ルール通り）。
- 新しいKPI計算を追加しない。既存の `analysis`／`mcResult` の値をそのまま表示するだけ。
- 実装前に、「追加確認事項」（戦略解決ロジック）を確認した結果を報告してから次に進むこと。
- 完了後、`full-verify.js` がPASSすることを確認。
- 完了報告は自己申告ではなく、実装ファイルの該当箇所をgrep等で提示すること。

## 動作確認観点
1. iPhone幅・iPad幅（縦持ち、1024px未満）双方で、KpiGridをスクロールで隠すとバーが出現するか
2. 複数戦略選択時、StickyKpiBarとKpiGridが同じ戦略の値を表示しているか（数値が一致するか）
3. トグンで入力欄を開閉しても、KpiGridの可視判定と連動してバーが正しく出没するか
4. MCモードに切り替えて実行した場合、右スロットが資産寿命→MC破綻率に切り替わるか
5. 1024px以上（横並びレイアウト）ではバー・sticky化ともに常に無効のままか
6. iPhoneのセーフエリア（ホームインジケーター）とバーが重ならないか
7. 入力トグンが開閉どちらの状態でも、スクロール中ヘッダー直下から常に押せるか
8. トグン・バー・ヘッダーのz-index重なりに問題がないか
