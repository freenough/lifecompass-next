# 調査専用タスク：/hojin セクションの物理配置調査

## 位置づけ
これは**調査専用**の指示です。実装・ファイル作成・既存ファイルの変更は一切行わないでください。
調査結果をレポートとして返してください。設計判断はこのチャット側で行います。

## 背景
FREENOUGHに新セクション `/hojin`（一人法人×FIRE向けコンテンツ）を追加する。
将来的なツール追加も見据え、「最初から最終形の箱（URL構造・ディレクトリ構造）」で作りたい。
ただし中身（ツール・LP装飾）は段階的に増やす前提。まずはブログ記事から開始する。

現状:
- `lifecompass-next` リポジトリ配下に `/asset-simulator`（メインシミュレーター・10ツール・16+記事）
- `freenough-main` リポジトリが TOP ページ（freenough.com）を担当、Vercel Multi Zones構成
- `/asset-simulator` の構造は `src/lib/toolMetadata.ts`（TOOLS配列/TOOL_MAP）、`src/lib/blogTopics.ts`（TOPIC_GROUPS）、`src/lib/siteCopy.ts`、`src/data/concerns.ts`、`src/app/sitemap.ts` が中心的な管理ファイル

## 調査してほしいこと

### 1. Multi Zones構成の現状把握
- `freenough-main` と `lifecompass-next` が現在どう Vercel Multi Zones で接続されているか（`next.config.js` の rewrites設定、vercel.json等）を確認し、報告してください
- `/asset-simulator` のパスがどちらのリポジトリ・どちらのVercelプロジェクトにルーティングされているか、設定ファイルの実際の記述を示してください

### 2. /hojin配置の選択肢の整理
以下2パターンについて、実装コストと制約を調査・整理してください。実装はまだ行わず、選択肢の比較のみ。

**パターンA: lifecompass-next 内に /hojin を追加**
- `/asset-simulator` と同様に `src/app/hojin/` のようなルートを追加するイメージ
- 既存の `toolMetadata.ts` / `blogTopics.ts` / `concerns.ts` パターンを流用・複製する場合、どのファイルを新規作成 or 拡張することになるか
- 既存の `/asset-simulator` 関連コードとの依存関係・共有可能なユーティリティ（例: `blog.ts` の `applyBasePathToHtml()`、simulate.ts等）の洗い出し
- basePath設定がどうなっているか（現状 `/asset-simulator` にbasePathが設定されている場合、`/hojin` は別basePathとして共存できるか）

**パターンB: 独立したVercelゾーン(新規または既存プロジェクト)として /hojin を追加**
- freenough-mainまたは新規リポジトリに `/hojin` をぶら下げる場合の設定変更点
- Multi Zonesのrewrites設定にどの程度手を入れる必要があるか

### 3. 既存パターンの再利用可能性チェック
`/hojin` のブログ記事第一弾を投入するにあたり、以下を確認してください（実装はしない、可否と方法の報告のみ）:
- 記事のMarkdown管理方式（`/asset-simulator/blog` と同じ frontmatter + Markdownファイル方式を `/hojin` でも使えるか）
- `sitemap.ts` の `PUBLISHED_TOOLS` エクスポート方式は blog記事にも同様の一元管理があるか、`/hojin` 記事を将来sitemapに載せる場合の想定変更箇所
- `blogTopics.ts` の TOPIC_GROUPS に「一人法人」を新設する場合の影響範囲(既存記事のtopics frontmatterへの影響有無)

### 4. 最小構成の見積もり
上記を踏まえ、「最初のブログ記事1本を `/hojin/blog/` に置く」ために**最低限必要な変更ファイル一覧**を、パターンA・B それぞれで提示してください。LP・tools・concerns.ts連携は含めず、あくまで記事1本を正しいURL・basePath・sitemap状態で公開するための最小セットです。

## 報告フォーマット
- Multi Zones現状（設定ファイルの実際の記述を引用）
- パターンA / パターンBそれぞれの変更ファイル一覧・実装コスト・リスク
- 推奨があれば添えてよいが、最終判断はこのチャットで行うため断定的な結論は不要
- 不明点・要確認事項があれば明記

## 厳守事項
- ファイルの作成・変更・削除は一切行わないこと
- `docs/fixes/active/` フォルダは空でも rmdir しないこと（対象外だが念のため）
- 技術的な主張には具体的なファイルパス・行番号・実際の設定内容を添えること（自己証明ではなく根拠を示す）
