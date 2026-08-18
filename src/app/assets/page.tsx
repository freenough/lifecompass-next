import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { ASSET_MANAGEMENT_PATH } from '@/lib/assetManagement/routes';
import AssetManagementPage from '@/components/assetManagement/AssetManagementPage';

// 実体はsrc/app/assets/（basePath: '/asset-simulator'が自動付与されるため、
// 公開URLは /asset-simulator/assets になる）。src/app/asset-simulator/assets/ には
// 置かない — このリポジトリ自体がbasePath: '/asset-simulator'固定のasset-simulatorアプリのため、
// その配下にさらに'asset-simulator'ディレクトリを作ると公開URLが
// /asset-simulator/asset-simulator/assets という二重パスになってしまう
// （hitori-hojin実装時に確定した同種の既知の注意点と同じ理由）。
export const metadata: Metadata = {
  title: '資産管理 | FREENOUGH 資産シミュレーター',
  description: '保有資産を記録して、毎月のFIRE進捗を確認できる資産管理ツールです。',
  alternates: {
    canonical: `${SITE_URL}${ASSET_MANAGEMENT_PATH}`,
  },
};

export default function AssetsPage() {
  return <AssetManagementPage />;
}
