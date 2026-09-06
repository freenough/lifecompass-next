# 実装指示書: 一人法人セクションのURL Rewrite本実装

## 背景

`investigation_hitorihojin_url_rewrite.md` の調査結果を踏まえた本実装。

判明している事実(前提として扱ってよい):
- freenough-mainの `next.config.ts` に `/hitori-hojin` のrewrite設定は実装済みだが未コミット。
- rewriteをデプロイしても、lifecompass-next側の `next/link` がbasePath(`/asset-simulator`)を自動付与するため、hitori-hojin内のリンクをクリックするとURLバーが `/asset-simulator/hitori-hojin/...` に戻ってしまう。
- `/hitori-hojin/assets` は既存仕様により `redirect('/assets')` する薄いページで、これはバグではない(今回のスコープ外、現状維持)。

今回のゴールは、「**一人法人セクションを、URL上も独立した空間として完成させる**」こと。具体的には:
- `/hitori-hojin` に直接アクセスしても、そこからリンクを辿っても、常に `/hitori-hojin/...` の世界に留まること。
- ただし `/asset-simulator` 本体や FREENOUGH トップへ戻るリンク、外部リンク、共通ヘッダー/フッターは今回の変更対象に含めない。

## Phase 0: 実装前の確認(必須、ここで止まって報告)

以下を確認し、**このチャットに報告してから次に進んでください**。ここは実装ではなく確認です。

1. `next.config.ts` の未コミット差分について、`git log -p --follow`、`git reflog`、`git stash list` を確認し、この変更がいつ・どのような経緯で生まれた形跡があるか(何も出てこない場合は「履歴からは追跡不可、ファイルの更新日時のみ報告」でよい)。
2. lifecompass-next内で、hitori-hojinセクションのページ(`src/app/hitori-hojin/**`、`src/components/hitori-hojin/**` 相当)から `next/link` の `href` に `/hitori-hojin` 配下のパスを渡している箇所を **全て** 列挙する(grepなどで網羅的に。前回調査で見つかった3ファイルに限定せず、見落としがないか再確認)。
3. `SITE_URL` を参照している箇所のうち、hitori-hojinセクション配下のページ(`src/app/hitori-hojin/**`)で使われているものを全て列挙する。`alternates.canonical` だけでなく、`openGraph.url`、`twitter` 関連、`generateMetadata` 内のその他URL生成箇所も含める。

## Phase 1: 実装

### 1-1. freenough-mainのrewrite

- Phase 0-1の確認結果に問題がなければ(履歴上、意図的なロールバック等の形跡がなければ)、既存の未コミット差分をそのままコミット・pushしてよい。
- コミットメッセージには「なぜ今コミットするか」(クリーンURL化対応の一環である旨)を明記する。

### 1-2. hitori-hojin内部リンクの絶対URL化

**対象を厳密に限定すること**:
- 対象:hitori-hojinページ内で、**hitori-hojin配下の別ページへ遷移するリンク**(記事一覧→記事、記事→別記事、パンくず等)。
- 対象外:
  - `/asset-simulator` 本体(シミュレーター、ツール、お悩み、ブログ、使い方ガイド等)へ戻るリンク
  - FREENOUGHトップ(`https://www.freenough.com/`)へのリンク
  - 外部リンク(note.com等)
  - 共通ヘッダー/フッターのナビゲーション
  - `/hitori-hojin/assets` へのリンク(既存仕様通りredirectするページなので、`next/link`のままで変更不要。むしろ`<a>`化すると不要な挙動変化を招く可能性があるため触らない)

対象と判定したリンクについて、`next/link` の `href="/hitori-hojin/xxx"` を、絶対URLを持つ通常の `<a href="https://www.freenough.com/hitori-hojin/xxx">` に置き換える。

- 絶対URLの組み立てには、1-3で追加する `HITORI_HOJIN_SITE_URL` を使うこと(ハードコード文字列を各所に埋め込まない)。

### 1-3. canonical / OGP専用定数の追加

- `src/lib/siteConfig.ts` に `HITORI_HOJIN_SITE_URL = 'https://www.freenough.com/hitori-hojin'` (末尾のパス構造は実装に合わせて調整)を追加する。
- **既存の `SITE_URL` は一切変更しない**。他ページのcanonical/OGPに影響が出るため。
- Phase 0-3で列挙した「hitori-hojinセクション配下でSITE_URLを参照している箇所」全てを、`HITORI_HOJIN_SITE_URL` を使う形に置き換える。canonicalだけでなくOGP `url` 等も含める。

## Phase 2: 検証(証跡必須)

以下を全て実施し、スクリーンショットまたはURLバーの文字列を明記して報告すること。「問題なし」の一言での報告は受け取りません。

**直接アクセス確認**:
- `https://www.freenough.com/hitori-hojin` に直接アクセス → 200、URLは `/hitori-hojin` のまま
- `https://www.freenough.com/hitori-hojin/blog` に直接アクセス → 200、URLは `/hitori-hojin/blog` のまま
- `https://www.freenough.com/hitori-hojin/blog/what-is` (または実在する記事slug)に直接アクセス → 200、URLは `/hitori-hojin/blog/xxx` のまま

**遷移チェーンの確認**:
- `/hitori-hojin` トップから記事一覧へ → 記事へ → 別記事へ、と実際にクリックで辿り、**一度もURLバーが `/asset-simulator/hitori-hojin/...` に変化しないこと**を確認。各ステップのURLバーをスクリーンショットで記録。

**metadata確認**:
- 上記3つの直接アクセスページそれぞれで、`document.querySelector('link[rel=canonical]').href` の値が `https://www.freenough.com/hitori-hojin/...` になっていること。
- 同ページのOGP `url` も同様にクリーンURLになっていること。

**既存ページへの影響がないことの確認**:
- `/asset-simulator` トップ、`/asset-simulator/blog` など、hitori-hojin以外の代表的なページのcanonicalが従来通り(`https://www.freenough.com/asset-simulator/...`)のままであることを確認(`SITE_URL`を変更していないことの裏付け)。

**`/hitori-hojin/assets` の現状維持確認**:
- 引き続き `/asset-simulator/assets` にredirectされる従来仕様のままであることを確認(今回の変更で意図せず壊れていないか)。

## 対象外(このスコープでは対応しない)

- `/hitori-hojin/assets` のクリーンURL化自体(既存仕様として現状維持)
- Multi Zonesによるセクション独立化などの大規模再設計
- モノレポ移行

## やってはいけないこと

- Phase 0の報告なしにPhase 1(特にrewriteのコミット)へ進まないこと。
- `SITE_URL` そのものを変更しないこと。
- 対象外リンク(asset-simulator本体、FREENOUGHトップ、外部リンク、共通ヘッダー/フッター、`/hitori-hojin/assets`)を機械的に`<a>`化しないこと。
- 証跡なしの完了報告をしないこと。

---

## 実施結果(2026-09-06・完了)

### Phase 0(報告済み・GO判断あり)

1. `next.config.ts`の未コミット差分: `git log -p --follow`・`git reflog`(直近10コミット)・`git stash list`のいずれにも意図的ロールバックの形跡なし。ファイル更新日時2026-08-17 12:56から一度もコミットされていない状態。「実装したがコミットし忘れた」以外の経緯なしと判断し、Phase 1へ進行(ユーザー承認済み)。
2. hitori-hojinセクション内の`next/link` href一覧(grep網羅済み、前回調査の3ファイルに加え2ファイル追加で判明):
   - `src/app/hitori-hojin/page.tsx`: `/hitori-hojin/blog`(「すべての記事を見る」)、`footerLink.href`経由の`/hitori-hojin/blog?series=...`
   - `src/app/hitori-hojin/blog/[slug]/page.tsx`: パンくず`/hitori-hojin`・`/hitori-hojin/blog`
   - `src/components/hitori-hojin/HitoriHojinArticleCard.tsx`: `/hitori-hojin/blog/${post.slug}`
   - `src/components/hitori-hojin/HitoriHojinBlogListClient.tsx`: `/hitori-hojin/blog/${post.slug}`
   - `src/components/hitori-hojin/HitoriHojinContentSection.tsx`: `footerLink.href`(呼び出し元はpage.tsx)
   - 対象外として維持: `HitoriHojinManageSection.tsx`の`HOJIN_ASSET_MANAGEMENT_PATH`(`/hitori-hojin/assets`)、page.tsxの`/?utm_source=...`(asset-simulator本体CTA)
3. hitori-hojinセクション内`SITE_URL`参照箇所(4箇所・3ファイル): `hitori-hojin/page.tsx`(canonical)、`hitori-hojin/blog/page.tsx`(canonical)、`hitori-hojin/blog/[slug]/page.tsx`(openGraph.url・canonicalの2箇所)。

### Phase 1(実装・デプロイ)

- freenough-main: 既存の未コミット差分(`next.config.ts`)のみをコミット・push(コミット`ebcde68`)。他の未コミット変更(.gitignore等)は無関係のため含めていない。
- lifecompass-next: `HITORI_HOJIN_SITE_URL`定数を`src/lib/siteConfig.ts`に追加し、上記Phase 0-2/0-3で列挙した箇所を全て置き換え(コミット`5476f22`)。`tsc --noEmit`・`npm run build`ともに成功を確認した上でpush。
- 両リポジトリともmainへのpushによりVercel本番へ自動デプロイ。push前にユーザーへ変更ファイル一覧(`git diff --stat`)を提示し、スコープ内であることの確認を得てから実行した。

### Phase 2(検証・証跡)

**直接アクセス確認**(すべて実機・本番`https://www.freenough.com`で確認、スクリーンショット取得済み):
- `/hitori-hojin` → 200、URL/canonicalとも`https://www.freenough.com/hitori-hojin`
- `/hitori-hojin/blog` → 200、URL/canonicalとも`https://www.freenough.com/hitori-hojin/blog`
- `/hitori-hojin/blog/what-is` → 200、URL/canonical/OGP urlすべて`https://www.freenough.com/hitori-hojin/blog/what-is`

**遷移チェーンの確認**(実機クリックで検証、各ステップのURLバーをスクリーンショットで記録):
`/hitori-hojin`(LP)→「すべての記事を見る」クリック→`/hitori-hojin/blog`→記事「一人法人って、そもそも何？」クリック→`/hitori-hojin/blog/what-is`→パンくず「ブログ」クリック→`/hitori-hojin/blog`→別記事「会社員から一人法人へ。何が変わった？」クリック→`/hitori-hojin/blog/transition`。
**全ステップで一度も`/asset-simulator/hitori-hojin/...`への巻き戻りは発生しなかった。**

**既存ページへの影響がないことの確認**:
- `https://www.freenough.com/asset-simulator` の canonical は従来通り `https://www.freenough.com/asset-simulator`(`SITE_URL`未変更であることの裏付け)。

**`/hitori-hojin/assets` の現状維持確認**:
- `https://www.freenough.com/hitori-hojin/assets` へアクセス → 従来通り `https://www.freenough.com/asset-simulator/assets` にredirectされることを確認(意図せず壊れていない)。

### 対象範囲外(このスコープでは未対応、次点候補)

- `/hitori-hojin/assets`自体のクリーンURL化(既存仕様として現状維持)。
- Multi Zonesによるセクション独立化、モノレポ移行。
