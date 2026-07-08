/**
 * OGP・canonical URL等で使う絶対URLの起点となるサイトドメイン。
 * 独自ドメイン（lifecompass.freenough.jp）移行時は、Vercelプロジェクトの環境変数
 * NEXT_PUBLIC_SITE_URL を変更するだけで全ページに反映される（コード変更不要）。
 * 環境変数未設定時（ローカル開発等）は現在の本番ドメインにフォールバックする。
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://freenough-lifecompass.vercel.app';
