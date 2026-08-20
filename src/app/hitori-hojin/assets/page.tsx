import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { HOJIN_ASSET_MANAGEMENT_PATH } from '@/lib/hojinAssetManagement/routes';
import HojinAssetManagementPage from '@/components/hojinAssetManagement/HojinAssetManagementPage';

// 実体はsrc/app/hitori-hojin/assets/（basePath: '/asset-simulator'が自動付与されるため、
// 公開URLは/asset-simulator/hitori-hojin/assetsになる）。hitori-hojin LP実装時に確定した
// 「src/app/asset-simulator/配下に置くと二重パスになる」注意点と同じ理由でこの配置にしている。
export const metadata: Metadata = {
  title: '法人資産管理 | 一人法人',
  description: '一人法人の保有資産と個人資産をまとめて記録し、毎月の推移を確認できる資産管理ツールです。',
  alternates: {
    canonical: `${SITE_URL}${HOJIN_ASSET_MANAGEMENT_PATH}`,
  },
};

export default function HojinAssetsPage() {
  return <HojinAssetManagementPage />;
}
