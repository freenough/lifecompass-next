# 実装指示：プロファイルJSONエクスポート/インポートにCompanyStateを含める

作成日：2026-09-05
種別：**実装**
関連：`instruction_phase2_companystate_rearchitecture.md`（CompanyStateをシミュレータープロファイル単位で保存する現行設計）

---

## 0. 背景

シミュレーター本体`ProfileDrawer`の「JSONでエクスポート」は、現在プロファイルの`params`/`portfolio`/`events`/`ui`のみを書き出しており、法人設定（CompanyState、`companyStateByProfile`にプロファイルIDをキーに別途保存されているデータ）が含まれていない。これにより、このJSONを別ブラウザ・別PC・localStorageクリア後の環境にインポートすると、個人側データは復元されるが法人設定は復元されない、という非対称な仕様になっている。KENZOの判断により、これを解消する。

---

## 1. エクスポート側の対応

- 対象のエクスポート処理（`ProfileDrawer.tsx`から呼ばれる「JSONでエクスポート」機能。`ProfileDrawer.tsx`自体はロック対象のため、エクスポートのロジック本体が別ファイル（例：`src/lib/storage.ts`や専用のexport/importユーティリティ）に切り出されている場合はそちらを修正し、`ProfileDrawer.tsx`は変更しないこと）を確認する
- 出力JSONに、新しい任意フィールド`companyState`を追加する。値は、エクスポート対象プロファイルのIDをキーに`getCompanyStateForProfile(profileId)`（`instruction_phase2_companystate_rearchitecture.md`で定義済みのアクセサ）を呼んだ結果とする
- 該当プロファイルに法人設定が存在しない場合（例：「法人資産を含める」を一度もONにしていない等）は、`companyState`フィールドを省略するか`null`とする（既存の空状態の扱いに合わせること）

## 2. インポート側の対応

- インポート処理で、プロファイル本体（`params`/`portfolio`/`events`/`ui`）の取り込み先プロファイルID確定後（既存ID上書き、または新規ID発行のいずれか、既存の重複判定ロジックはそのまま）、そのIDをキーに`companyStateByProfile`へ書き込む
- **後方互換性が必須**：インポートするJSONに`companyState`フィールドが存在しない（旧形式のエクスポート、または本改修前に作成されたバックアップファイル）場合、**その取り込み先プロファイルIDに既存の法人設定があっても一切変更・削除しないこと**（フィールドが無い＝「法人設定について何も言及しない」という扱いにし、誤って上書き・空にすることを避ける）
- `companyState`フィールドが存在し、値が`null`の場合は、明示的に「法人設定なし」を意味するため、取り込み先プロファイルIDの法人設定を`EMPTY_COMPANY_STATE`にリセットする（無いことが明示されているデータへの上書きなので、これは意図的な動作としてよい）

## 3. 確認事項

- 既存の（本改修前に作成された）JSONファイルをインポートしても、エラーにならず、かつ既存の法人設定を誤って消さないことを確認する
- 新形式でエクスポート→インポートし直した場合に、法人設定が正しく復元されることを確認する（プロファイルA・Bで異なる法人設定を用意し、Aをエクスポート→Bとして名前を変えてインポート→新規プロファイルとして法人設定込みで正しく作成されることを含む）

---

## 4. 遵守事項

- ロックファイル（`types.ts`/`profile.ts`/`PortfolioPanel.tsx`/`simulate.ts`/`analyze.ts`/`montecarlo.ts`/`blog.ts`/`blogTopics.ts`/`concerns.ts`）への依存・変更は一切ゼロを維持すること
- `ProfileDrawer.tsx`は変更しないこと（ロジックが分離されていない場合は、最小限の変更に留め、その旨を完了報告に明記すること）
- 既存テスト（`scripts/verify-*.js`、`full-verify.js`）が全てPASSすることを維持する。本改修に対する新規テスト（新形式エクスポート/インポートの往復確認、旧形式JSONインポート時に既存CompanyStateが保持されることの確認、`companyState: null`時のリセット確認）を追加すること
- 検証は本番相当の実データ環境を使わないこと
- 完了報告には、変更ファイル一覧・該当コード抜粋・テスト結果（PASS/FAIL件数）・実機ブラウザでの動作確認（新形式の往復・旧形式JSONの非破壊性）を必ず添付すること
