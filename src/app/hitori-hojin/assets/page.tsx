import { redirect } from 'next/navigation';

// フェーズ1（資産管理ツール統合）：法人資産管理ツールは個人資産管理ツール本体（/assets）に
// 「法人資産（一人法人）を含める」トグルとして統合されたため、独立ページとしてのコンテンツは
// 廃止した（hitori-hojin/simulate → /app のリダイレクト前例と同じ扱い）。
export default function HojinAssetsPage() {
  redirect('/assets');
}
