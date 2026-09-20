import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// next@14.2.35に同梱の@vercel/ogが、ビルド時の静的プリレンダリングでフォント読込に
// import.meta.urlをpath.joinしており、Windows上のnext buildでは不正なURLになり失敗する
// (Linux上のVercelビルドでは発生しない既知の環境依存バグ)。force-dynamicでリクエスト時
// レンダリングに切り替えてビルド時プリレンダリングを回避する。
//
// opengraph-image.tsxのファイル規約ではなく通常のRoute Handlerとして実装している理由:
// basePath設定時、ファイル規約はルートの絶対パス(basePath込み)をmetadataBase(これ自体
// basePath込み)にそのまま連結してしまいbasePathが二重になったURLになる上、
// metadata.openGraph.imagesを明示指定してもopenGraph側だけファイル規約の自動解決が
// 優先されてしまう挙動を実機検証で確認した。Route Handlerなら他の絶対URL(canonical等)
// と同様にSITE_URLから自分でURLを組み立てられ、この問題を避けられる。
export const dynamic = 'force-dynamic';

export async function GET() {
  const logo = await readFile(join(process.cwd(), 'public/images/compass_logo.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={100} height={100} alt="" />
        <div
          style={{
            display: 'flex',
            fontSize: 80,
            fontWeight: 700,
            color: '#0F2A4A',
            marginTop: 32,
          }}
        >
          FRE
          <span style={{ color: '#2563EB' }}>E</span>
          NOUGH
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            fontWeight: 500,
            color: '#555555',
            marginTop: 16,
          }}
        >
          資産シミュレーター
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
