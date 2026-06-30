# 法的ページ実装指示

## 概要

プライバシーポリシー・免責事項・運営者情報の3ページを実装してください。
コンテンツは `legal_pages.md` に記載されています（別途共有）。

## 実装するページ

| URL | ファイル | タイトル |
|---|---|---|
| /privacy-policy | src/app/privacy-policy/page.tsx | プライバシーポリシー |
| /disclaimer | src/app/disclaimer/page.tsx | 免責事項 |
| /about | src/app/about/page.tsx | 運営者情報 |

## デザイン方針

- 背景白・最大幅 max-w-2xl・中央寄せ・上下パディング広め
- 見出しはh1/h2/h3でTailwindのtypographyスタイル
- 外部リンクは target="_blank" rel="noopener noreferrer"
- ヘッダー・フッターは既存レイアウトを流用（layout.tsxがあればそれを使う）

## フッターへのリンク追加

既存のフッター（または layout.tsx）に以下3リンクを追加してください：

```
プライバシーポリシー（/privacy-policy）
免責事項（/disclaimer）
運営者情報（/about）
```

フッターがない場合は、全ページ共通の簡易フッターを
src/app/layout.tsx に追加してください：

```tsx
<footer className="border-t border-slate-100 mt-16 py-8 text-center text-xs text-slate-400 space-x-4">
  <Link href="/privacy-policy">プライバシーポリシー</Link>
  <Link href="/disclaimer">免責事項</Link>
  <Link href="/about">運営者情報</Link>
</footer>
```

## 注意

- サーバーコンポーネントで実装（'use client'不要）
- MDXは使わず、JSXで直接コンテンツを記述
- src/app/simulator/ には触らない
