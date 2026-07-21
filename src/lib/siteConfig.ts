/**
 * next.config.mjsのbasePathと同じ値。クライアント側でbasePathを含むURL/パスを
 * 手動で組み立てる必要がある箇所（next/link・next/imageの自動付与が効かない
 * window.location起点の文字列結合や、Markdown→HTML変換後の生<img>タグ等）でのみ使う。
 */
export const BASE_PATH = '/asset-simulator';

/**
 * OGP・canonical URL等で使う絶対URLの起点となるサイトドメイン（basePath込み）。
 * Multi Zones移行後は freenough.com/asset-simulator 配下がこのアプリの実際の公開場所になる。
 * 独自ドメイン移行時は、Vercelプロジェクトの環境変数 NEXT_PUBLIC_SITE_URL を変更するだけで
 * 全ページに反映される（コード変更不要）。環境変数未設定時（ローカル開発等）は
 * 現在の本番デプロイ先（basePath込み）にフォールバックする。
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://freenough-lifecompass.vercel.app${BASE_PATH}`;

/**
 * ルート相対パス（例: "/images/blog/xxx.png"）の先頭にbasePathを付与する。
 * next/image・next/linkはbasePathを自動付与するが、Markdown由来の生<img>タグや
 * frontmatterのeyecatchパスなど、それらを経由しない箇所ではこのヘルパーで明示的に付与する。
 */
export function withBasePath<T extends string | undefined>(path: T): T {
  if (!path) return path;
  return `${BASE_PATH}${path}` as T;
}
