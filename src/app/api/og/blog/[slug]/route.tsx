import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPostBySlug } from '@/lib/blog';

// force-dynamic・Route Handlerとして実装している理由はsrc/app/api/og/route.tsx参照。
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const title = post?.title ?? 'FREENOUGH 資産シミュレーター';

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
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          padding: '64px 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.4,
            color: '#0F2A4A',
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={56} height={56} alt="" />
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 700,
              color: '#0F2A4A',
              marginLeft: 16,
            }}
          >
            FRE
            <span style={{ color: '#2563EB' }}>E</span>
            NOUGH
            <span style={{ fontWeight: 500, color: '#555555', marginLeft: 12 }}>
              資産シミュレーター
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
