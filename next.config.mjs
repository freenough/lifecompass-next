/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/asset-simulator',
  async redirects() {
    // 注意: Next.jsはbasePath設定時、redirectsのsource/destinationに新basePathを
    // 自動的に前置する(例: '/lifecompass/:path*' → '/asset-simulator/lifecompass/:path*')。
    // ここではsource(旧basePath)・destination(新basePathを明示指定)のどちらも
    // 自動前置されると二重になり意図通り動かないため、全ルールでbasePath: falseにする。
    return [
      {
        source: '/lifecompass/simulator/:path*',
        destination: '/asset-simulator/app/:path*',
        permanent: true,
        basePath: false,
      },
      {
        source: '/lifecompass/:path*',
        destination: '/asset-simulator/:path*',
        permanent: true,
        basePath: false,
      },
      // 保険: 新basePath配下で旧ルート名(/simulator)にアクセスされた場合の転送
      {
        source: '/asset-simulator/simulator/:path*',
        destination: '/asset-simulator/app/:path*',
        permanent: true,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
