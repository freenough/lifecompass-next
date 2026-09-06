# 調査指示書: 一人法人セクションのURL Rewrite設定確認

## 背景

現状、一人法人セクションの実体URLは `https://www.freenough.com/asset-simulator/hitori-hojin` (lifecompass-next、basePath: `/asset-simulator` 固定)。

あるべき姿は `https://www.freenough.com/hitori-hojin` というクリーンURL。freenough-main側のrewriteで整形する方針だったが、本番の canonical タグを確認したところ `https://www.freenough.com/asset-simulator/hitori-hojin` のままであり、**クリーンURL化が完了していない可能性が高い**。

これは**調査のみ**の指示書です。設定ファイルの変更は行わないでください。

## 調査してほしいこと

（省略・元の指示は末尾に保持）

---

## 調査結果（2026-09-06）

### 1. freenough-main の next.config.ts の rewrite設定

**存在する。ただし本番には未反映（未コミット）。**

`C:\Users\kenzo.kakinuma\projects\freenough-main\next.config.ts` に以下が実装済み：

```ts
{
  source: "/hitori-hojin",
  destination:
    "https://freenough-lifecompass.vercel.app/asset-simulator/hitori-hojin",
},
{
  source: "/hitori-hojin/:path*",
  destination:
    "https://freenough-lifecompass.vercel.app/asset-simulator/hitori-hojin/:path*",
},
```

しかし `git status` を確認したところ、この差分は **`next.config.ts` に対する未コミットのローカル変更**であることが判明した（`git diff` で上記2ブロックが `+` として表示され、`git log -3` の直近3コミットにも一切含まれていない）。つまりこのrewriteはリポジトリにコミットされておらず、当然Vercel本番環境にもデプロイされていない。これが本番で `/hitori-hojin` が机上のrewrite通りに動作していない直接の原因である（詳細は2.参照）。

`/hitori-hojin/:path*` のワイルドカードは `/hitori-hojin/blog`、`/hitori-hojin/blog/[slug]`、`/hitori-hojin/assets` を含む配下パス全てをカバーする設計にはなっている（後述の通りローカルでの動作確認でも配下パスは問題なくカバーされていた）。

### 2. 実機での動作確認

**(a) `https://www.freenough.com/hitori-hojin` に本番で直接アクセス**

→ **404**。スクリーンショット確認済み。ページタイトルは「FREENOUGH — Design Your Enough.」で、**freenough-main自身の404ページ**が表示されている（lifecompass-next側の404ではない）。これはrewriteルール自体が本番に存在しないため、freenough-mainのNext.jsルーターがそのまま「該当ページなし」として404を返している状態。1.の「未コミット」という発見と整合する。

比較のため `https://www.freenough.com/asset-simulator/hitori-hojin`（現行の実体URL）にアクセスしたところ、正常にLPが表示され、canonicalタグは `https://www.freenough.com/asset-simulator/hitori-hojin` だった（4.参照）。

**(b) 記事リンククリック後の遷移**

本番では(a)が404のため直接検証不可。そこで freenough-main を**ローカルdevサーバー**（`npm run dev`、port 3000）で起動して検証した。ローカルdevはnext.config.tsの**未コミットのワーキングツリー内容**を読むため、rewrite先である本番の `freenough-lifecompass.vercel.app` に対して実際にプロキシが機能するかを検証できる（destinationが本番URL固定のため、freenough-main自体をどこで動かしてもproxy先は本番backend）。

- `http://localhost:3000/hitori-hojin` に直接アクセス → 正常にLP表示、URLバーは `/hitori-hojin` のまま（rewriteは機能している）。
- LP内の記事リンク「一人法人って、そもそも何？」をクリック → 遷移後のURLバーは **`http://localhost:3000/asset-simulator/hitori-hojin/blog/what-is`** に変化した。スクリーンショット確認済み。

### 3. 【重要】basePath + Next.js Link によるURL巻き戻り

**実際に発生することを確認した。** 2-(b)で観測した通り、クリーンURL(`/hitori-hojin`)でページを開いていても、ページ内の `next/link` によるクリック遷移1回で `/asset-simulator/hitori-hojin/...` にURLバーが戻る。

原因はコードで確認済み：
- `next.config.mjs`（lifecompass-next）で `basePath: '/asset-simulator'` が固定設定されている。
- `src/app/hitori-hojin/page.tsx`、`HitoriHojinArticleCard.tsx`、`blog/[slug]/page.tsx` 等のリンクは全て `next/link` に `href="/hitori-hojin/blog/xxx"` のようなルート相対パスを渡している。
- basePathが設定されている場合、`next/link`（および `router.push`/`redirect()`）は**自動的にhrefの先頭にbasePathを付与する**。これはNext.jsのbasePath機能の仕様であり、ページ単位・リンク単位で無効化するオプションはない。
- `middleware.ts` はlifecompass-nextに存在せず、このbasePath付与を打ち消す仕組みは現状ない。

**対応方針の見立て**：
- freenough-main側のrewrite設定だけでは解決しない（想定通り）。
- 根本対応にはlifecompass-next側の変更が必要。実務的な選択肢は主に2つ：
  1. **hitori-hojinセクション内の内部リンクを `next/link` から生の `<a>` タグ（絶対URL、例: `https://www.freenough.com/hitori-hojin/blog/xxx`）に置き換える。** `<a>`タグはNext.jsのbasePath自動付与の対象外のため、これだけでURLバーは巻き戻らない。ただしクリック毎にフルページリロードになりSPA的な遷移体験は失われる（記事間ナビゲーションが主用途なので実害は小さい可能性はあるが要検討）。
  2. Multi Zones的にhitori-hojinセクションを独立したNext.jsアプリ（basePathなし）として切り出す。影響範囲・実装コストは大きい。
- どちらも「調査のみ」の指示範囲を超えるため、実装はまだ行っていない。方針についてはこのチャットで相談したい。

**付随して判明した論点**：`/hitori-hojin/assets` は `src/app/hitori-hojin/assets/page.tsx` が `redirect('/assets')` するだけの薄いページ（資産管理ツール統合に伴う既存の意図的な仕様、バグではない）。このため、たとえ上記のリンク巻き戻り問題を解消しても、**「法人資産管理ツールを開く」導線は最終的に `/asset-simulator/assets` に着地する**（`/hitori-hojin/assets`のクリーンURLには留まらない）設計になっている。対象範囲に挙げられていた3パスのうち、`/hitori-hojin/assets` は他の2つ（LPトップ・ブログ）と性質が異なる点として明記しておく。

### 4. canonical / OGP設定

現状 `/hitori-hojin` ページの canonical は `https://www.freenough.com/asset-simulator/hitori-hojin`（実機で確認済み、`document.querySelector('link[rel=canonical]').href` で取得）。

rewrite実装後にクリーンURLへ変更する必要が**ある**。理由：`src/lib/siteConfig.ts` の `SITE_URL` は `NEXT_PUBLIC_SITE_URL`（本番では `https://www.freenough.com/asset-simulator` とみなす値）をそのまま使っており、各ページの `alternates.canonical` は `${SITE_URL}/hitori-hojin` のように組み立てられている。クリーンURL化に合わせてcanonicalも `https://www.freenough.com/hitori-hojin` に変えるなら、`SITE_URL`をそのまま使う現状のロジックでは自動的には変わらない。

変更が必要になる可能性のあるファイル（lifecompass-next側）：
- `src/app/hitori-hojin/page.tsx`（`alternates.canonical`）
- `src/app/hitori-hojin/blog/page.tsx`（同上）
- `src/app/hitori-hojin/blog/[slug]/page.tsx`（`generateMetadata`内の`canonical`・OGP`url`）
- 場合によっては `src/lib/siteConfig.ts` に「hitori-hojinセクション専用のSITE_URL（basePathなし）」のような別定数を追加する形の設計判断が必要になる可能性がある（既存の`SITE_URL`はサイト全体で使われているため、直接書き換えると他ページのcanonicalにも影響する）。

### 5. 作業量・リスクの見積もり

**freenough-main側の設定変更だけでは完結しない。** 内訳：

- freenough-main側：rewrite自体は**実装済みで、コミット・デプロイするだけ**（コード変更は不要、`git add && git commit && push`のみ）。作業量・リスクともに小さい。
- lifecompass-next側：3.で判明した通り、rewriteをデプロイしただけでは「LPに直接アクセスした瞬間は正しいが、1クリックでURLが汚れる」状態になる。これを解消するには最低でもhitori-hojinセクション内リンクの実装変更（`next/link`→`<a>`化、または別アプローチ）が必要。加えて4.のcanonical/OGP修正も必要。
- 影響ファイル数はhitori-hojinセクションに閉じており（`src/app/hitori-hojin/**`、`src/components/hitori-hojin/**`、`src/lib/siteConfig.ts`）、他機能への影響は小さいと見積もる。ただしSITE_URLの扱いを変える場合は設計判断が要る（4.参照）。
- **推奨する順序**：まずfreenough-mainのrewriteをコミット・デプロイして「直接アクセスでのクリーンURL表示」だけ先に成立させ、その上でlifecompass-next側のリンク生成・canonical対応を別タスクとして進める、という2段階分割が現実的。ただし段階1だけをデプロイすると「トップは綺麗だが1クリックで汚れる」という中途半端な状態を一時的にユーザーに見せることになる点は留意。

## 対象範囲（確認結果）

- `/hitori-hojin` トップ：rewrite定義あり（直接アクセスは正常、内部リンククリックで巻き戻り）
- `/hitori-hojin/blog` および配下記事（例: `/hitori-hojin/blog/what-is`）：`:path*`でカバーされている（直接アクセス正常、内部リンククリックで巻き戻り）
- `/hitori-hojin/assets`：`:path*`でrewrite自体はカバーされているが、ページ側が`redirect('/assets')`するため最終着地はクリーンURLにならない設計（3.参照）

## わからなかった項目

- 本番Vercelプロジェクトの環境変数 `NEXT_PUBLIC_SITE_URL` の実際の値は、Vercelダッシュボードへのアクセス権がないため直接確認していない（本番canonical実測値から `https://www.freenough.com/asset-simulator` である可能性が高いと推測したのみ）。
- freenough-main側の `next.config.ts` の未コミット差分が「作業中のまま放置されたもの」なのか「意図的に一旦ロールバックした後の残骸」なのかは、コミット履歴・会話ログの外からは判断できなかった。KENZOに確認が必要。

## やってはいけないこと（遵守）

- next.config.ts、vercel.json、その他設定ファイルは変更していません（freenough-mainの未コミット差分は元々存在していたもので、本調査で作成・変更したものではないことを`git status`で確認済み）。
- ローカル検証用に起動したdevサーバーのプロセスは調査後に停止済み。
