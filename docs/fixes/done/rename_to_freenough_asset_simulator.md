# 指示書: サービス名変更(LifeCompass → FREENOUGH 資産シミュレーター)

作成日: 2026-07-19
対象: `freenough-main`・`lifecompass-next`(両リポジトリにまたがる)
種別: 名称変更(表示名のみ。URLパス`/lifecompass`は今回対象外・変更しない)

---

## 前提

- サービス名を「LifeCompass」から**「FREENOUGH 資産シミュレーター」**に変更する
- **URLパス(`freenough.com/lifecompass`)は今回変更しない**。あくまで表示名・メタデータ・構造化データのみが対象
- LPのキャッチコピー「あなたのFIREは、何歳?」は変更しない(入口の訴求文として維持)
- ページタイトルは「FIREシミュレーター|FREENOUGH 資産シミュレーター」のような、SEO重視の別立てで統一する(サービス名そのものと完全一致させなくてよい)
- コンパスロゴ画像はそのまま使用(ロゴ自体の変更は不要)
- 開発上の名称(GitHubリポジトリ名`lifecompass-next`、内部の変数名・関数名等)は変更不要(ユーザーに見えないため)

---

## A. freenough-main側の修正

- Freenoughトップページの「現在提供中」カードの名称:「LifeCompass」→「資産シミュレーター」(見出しとして。カード自体のURL・リンク先は変更なし)
- カードの一言メッセージ:必要であれば「資産シミュレーター」という言葉と自然に繋がるよう文言調整(現状の「あなたの"足りる"を、シミュレーションで確かめる。」がそのまま使えるか確認し、不自然であれば微調整)
- ボタン文言:「LifeCompassを見る →」→「資産シミュレーターを見る →」
- ヘッダーナビの「LifeCompass」リンク文言:「資産シミュレーター」に変更

## B. lifecompass-next側:表示テキスト

- `src/components/Header.tsx`のロゴ横テキスト:「LifeCompass」→「資産シミュレーター」(ロゴ画像自体は変更なし)
- 各ページの`<title>`タグ・メタデータ:「FIREシミュレーター|FREENOUGH 資産シミュレーター」のような形に統一する(全ページで一貫した命名規則にすること)
- OGP画像・Twitterカード画像:もし画像内に「LifeCompass」という文字が焼き込まれている場合、差し替えが必要。画像内にテキストが焼き込まれていない場合(ロゴのみ等)は対応不要

## C. lifecompass-next側:既存ページの本文

対象ページ:`/about`・`/methodology`・`/disclosure`・`/privacy-policy`・`/disclaimer`

- 各ページ内で「LifeCompass」と言及している箇所をすべて洗い出す
- 単純な文字列置換ではなく、**文脈を見て自然な形に調整すること**(「資産シミュレーター」という言葉が近くで重複しないか、機械的に置換した結果が不自然な文章になっていないか確認する)
- 判断に迷う箇所(言い換え方が複数考えられる、文脈上どちらとも取れる等)があれば、実装を止めて確認すること

## D. 構造化データ(JSON-LD): SoftwareApplication / WebApplication

- `name`フィールドが「LifeCompass」になっている箇所を「FREENOUGH 資産シミュレーター」に変更する
- 該当ファイルを洗い出して報告すること(layout.tsxやページ個別のJSON-LD出力箇所など)

## E. favicon・PWA関連

- `manifest.json`(または相当するファイル)内の`name`・`short_name`フィールドに「LifeCompass」が含まれている場合、修正する
- favicon自体(画像)の変更は不要(ロゴは維持)

## F. 構造化データ(JSON-LD): Organization / WebSite

- `name`・`alternateName`フィールドに「LifeCompass」が含まれている場合、「FREENOUGH 資産シミュレーター」に修正する
- `Organization`のnameが本来「FREENOUGH」であるべき箇所と、サービス名として「FREENOUGH 資産シミュレーター」であるべき箇所を混同しないよう、フィールドごとに何を表しているか確認しながら修正すること

---

## G・H(今回の指示対象外・別途段階的に対応)

- ブログ記事本文6本・note記事本文4本の「LifeCompass」という言及は、今回の指示の対象外とする
- これらは自然文であり、機械的な置換では「資産シミュレーターでシミュレーションし」のような重複・不自然な表現が生まれるリスクがあるため、1本ずつ目視確認しながら段階的に対応する(新規記事から新名称を使い、既存記事は手が空いたタイミングで見直す)

---

## 受け入れ基準

- [ ] freenough-mainのカード名称・ボタン文言・ナビ文言が「資産シミュレーター」に統一されている
- [ ] Header.tsxの表示名が変更されている(ロゴ画像は変更なし)
- [ ] 全ページのtitleタグが「FIREシミュレーター|FREENOUGH 資産シミュレーター」の命名規則で統一されている
- [ ] about・methodology・disclosure・privacy-policy・disclaimerの本文が、不自然な重複なく修正されている
- [ ] JSON-LD(SoftwareApplication/WebApplication)のnameが更新されている
- [ ] manifest.jsonのname・short_nameが更新されている(該当があれば)
- [ ] JSON-LD(Organization/WebSite)のname・alternateNameが、フィールドの意味を踏まえて正しく更新されている
- [ ] URLパス(`/lifecompass`)は変更されていない
- [ ] 両リポジトリとも`npm run build`が型エラーなしで通る

---

## 完了報告フォーマット

```
## 完了報告: サービス名変更(LifeCompass → FREENOUGH 資産シミュレーター)

### 変更したファイル(freenough-main)
- (一覧)

### 変更したファイル(lifecompass-next)
- (一覧)

### 実装内容
- A〜Fそれぞれの対応内容

### 確認事項
- npm run build(両リポジトリ): PASS/FAIL
- URLパスに変更がないことの確認: 確認済み/未確認

### 不明点・確認が必要な事項
- (C項目で判断に迷った箇所があれば、必ずここに記載すること)
```
