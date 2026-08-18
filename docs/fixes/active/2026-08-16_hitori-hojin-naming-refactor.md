# 実装タスク：hitori-hojin 命名統一リファクタリング

## 位置づけ
これは実装タスクです。前回実装(`docs/fixes/active/2026-08-16_hitori-hojin-implementation.md`)で作成したコードに対する、命名統一のためのリファクタリングです。

**commit/pushは行わないこと。実装・ビルド確認まで完了したら、変更内容を報告して指示を待つこと。**

## 背景
前回実装では、ルート・URLは`hojin`、外部クリーンURLは`hitori-hojin`という不一致がありました。まだ未公開・未デプロイのため、このタイミングで全て`hitori-hojin`に統一します。あわせて、ファイル種別ごとの命名規則(camelCase/PascalCase/kebab-case)がバラついていたため、既存コードベースの規則に合わせて統一します。

## 命名規則(このプロジェクトの既存パターンに準拠)
- ディレクトリ・ルート・URL slug:**kebab-case**(例:`src/app/hitori-hojin/`, `src/content/hitori-hojin-blog/`)
- `.ts`ライブラリファイル:**camelCase**(既存の`blogTopics.ts`・`toolMetadata.ts`と同じ規則。例:`hitoriHojinBlog.ts`)
- `.tsx`コンポーネントファイル:**PascalCase**(既存の`ConcernCard.tsx`・`BlogListClient.tsx`と同じ規則。例:`HitoriHojinContentSection.tsx`)

## リネーム対象一覧

### ディレクトリ・ルート
| 変更前 | 変更後 |
|---|---|
| `src/app/hojin/` | `src/app/hitori-hojin/` |
| `src/content/hojin-blog/` | `src/content/hitori-hojin-blog/` |
| `src/components/hojin/` | `src/components/hitori-hojin/` |

### ライブラリファイル(camelCase)
| 変更前 | 変更後 |
|---|---|
| `src/lib/hojinBlog.ts` | `src/lib/hitoriHojinBlog.ts` |
| `src/lib/hojinCategories.ts` | `src/lib/hitoriHojinCategories.ts` |

### コンポーネントファイル(PascalCase)
| 変更前 | 変更後 |
|---|---|
| `src/components/hojin/HojinContentSection.tsx` | `src/components/hitori-hojin/HitoriHojinContentSection.tsx` |
| `src/components/hojin/HojinArticleCard.tsx` | `src/components/hitori-hojin/HitoriHojinArticleCard.tsx` |
| `src/components/hojin/HojinBlogListClient.tsx` | `src/components/hitori-hojin/HitoriHojinBlogListClient.tsx` |

対応するコンポーネント名(export名・JSX上のタグ名)・型名(`HojinBlogPostMeta`→`HitoriHojinBlogPostMeta`等)・関数名(`getAllHojinPosts`→`getAllHitoriHojinPosts`、`getHojinPostsBySeries`→`getHitoriHojinPostsBySeries`、`getHojinPostBySlug`→`getHitoriHojinPostBySlug`)もあわせて統一してください。`HOJIN_CATEGORIES`定数も`HITORI_HOJIN_CATEGORIES`に変更してください。

### 記事コンテンツファイル・slug
| 変更前(ファイル名) | 変更後(ファイル名) | 変更後(slug frontmatter値) |
|---|---|---|
| hitori-hojin-01-what-is.md | what-is.md | what-is |
| hitori-hojin-02-middle-ground.md | middle-ground.md | middle-ground |
| hitori-hojin-03-tax-social-insurance.md | tax-social-insurance.md | tax-social-insurance |
| hitori-hojin-04-compensation.md | compensation.md | compensation |
| hitori-hojin-05-allocation.md | allocation.md | allocation |
| hitori-hojin-06-maintenance-cost.md | maintenance-cost.md | maintenance-cost |
| hitori-hojin-07-transition.md | transition.md | transition |
| hitori-hojin-08-timing.md | timing.md | timing |

**あわせて、8記事の本文中にある記事間の内部リンク(前回実装で`/hojin/blog/hitori-hojin-XX-...`のような形に既に変換済みのはず)を、新しいslug(`/hitori-hojin/blog/what-is`等の相対パス形式、前回同様basePathはレンダリング時付与)に更新してください。**

### ルーティングファイル
| 変更前 | 変更後 |
|---|---|
| `src/app/hojin/page.tsx` | `src/app/hitori-hojin/page.tsx` |
| `src/app/hojin/blog/page.tsx` | `src/app/hitori-hojin/blog/page.tsx` |
| `src/app/hojin/blog/[slug]/page.tsx` | `src/app/hitori-hojin/blog/[slug]/page.tsx` |

### freenough-main側のrewrite
```typescript
{
  source: '/hitori-hojin',
  destination: 'https://freenough-lifecompass.vercel.app/asset-simulator/hitori-hojin',
},
{
  source: '/hitori-hojin/:path*',
  destination: 'https://freenough-lifecompass.vercel.app/asset-simulator/hitori-hojin/:path*',
},
```
(前回実装で追加した2ルールの`destination`側パスを`/hojin`→`/hitori-hojin`に更新)

### sitemap.ts
`src/app/sitemap.ts`内の該当URLエントリ(`/hojin`、`/hojin/blog`、記事URL)を、新しいルート・slugに合わせて更新してください。

## 確認事項
1. 前回実装で修正した「searchParamsをサーバーコンポーネントのpropとして受け取る」という設計(`useSearchParams()`のSSR問題対応)は、このリファクタリングでも維持してください(挙動は変えず、パスと名称のみ変更)
2. `series`のfrontmatter値(`hitori-hojin-intro`)は既にkebab-caseのため変更不要です
3. 前回実装のHTMLコメント削除・basePath付与ロジック(`applyBasePathToHtml`相当、`href`にも正しく付与される実装)はそのまま維持してください

## 検証
- `tsc --noEmit`が通ることを確認
- `npm run build`が成功し、`/hitori-hojin`配下のページが正しく生成されることを確認
- `node scripts/full-verify.js`を実行し、既存機能に影響がないことを確認
- ローカルで(可能であれば`freenough-main`経由、または一時的なrewrite先変更で)`/hitori-hojin`のURLで正しくアクセスできることを確認
- 記事内の内部リンク(`href`)が新しいslugパスで正しく生成されているか確認

## 厳守事項
- `src/lib/blog.ts`・`src/lib/blogTopics.ts`・`src/data/concerns.ts`・`src/components/concerns/*`・`src/lib/simulate.ts`・`src/lib/analyze.ts`は一切変更しないこと(前回同様)
- `docs/fixes/active/`フォルダは空でも`rmdir`しないこと
- commit/pushは行わず、実装完了後は報告のみ行うこと
- リネームに伴うimport文の更新漏れがないか、`tsc`のエラーがゼロになるまで確認すること
