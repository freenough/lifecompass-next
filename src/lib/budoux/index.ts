// サーバー専用。クライアントコンポーネントからimportされた時点でビルドエラーにする
// （BudouXのモデルがブラウザ向けのJSに含まれないようにするため）。
// 'server-only'はパッケージを追加せず、Next.jsのビルド時エイリアス
// （next/dist/compiled/server-only）で解決される。
import 'server-only';

export { segmentJapanese } from './segment';
