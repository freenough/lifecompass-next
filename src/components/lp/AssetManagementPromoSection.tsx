import Link from 'next/link';
import { IconChartDonut, IconTarget, IconTrendingUp } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { ASSET_MANAGEMENT_PATH } from '@/lib/assetManagement/routes';

const features: { label: string; Icon: Icon }[] = [
  { label: 'カテゴリ別に資産を入力するだけ', Icon: IconChartDonut },
  { label: '目標資産との差分・進捗率を表示', Icon: IconTarget },
  { label: '前回記録との増減がひと目でわかる', Icon: IconTrendingUp },
];

// 右側のミニダッシュボードは実データ非連動の静的モック（2.4節）。資産管理ツール本体の
// 実装が変わってもLP側の修正が不要になるよう、固定値のみで構成する。
const DONUT_SLICES: { label: string; color: string; deg: number }[] = [
  { label: '株式・投信', color: 'rgba(59,130,246,0.45)', deg: 158 },
  { label: '現金', color: 'rgba(147,197,253,0.55)', deg: 94 },
  { label: 'iDeCo', color: 'rgba(148,163,184,0.4)', deg: 54 },
  { label: 'その他', color: 'rgba(74,222,128,0.45)', deg: 54 },
];

function buildDonutGradient(): string {
  let acc = 0;
  const stops = DONUT_SLICES.map((s) => {
    const start = acc;
    acc += s.deg;
    return `${s.color} ${start}deg ${acc}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export default function AssetManagementPromoSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">

            {/* 左：テキスト＋CTA */}
            <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 text-balance">
                毎月の資産を、記録する。
              </h2>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed text-balance sm:text-base">
                シミュレーションで描いた未来と、実際の資産を突き合わせる。目標との差分がひと目でわかります。
              </p>

              <ul className="mt-6 flex flex-col gap-3 w-full max-w-sm">
                {features.map((f) => (
                  <li key={f.label} className="flex items-center gap-3">
                    <f.Icon size={22} className="text-slate-600 shrink-0" />
                    <span className="text-sm text-slate-600 text-left">{f.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={ASSET_MANAGEMENT_PATH}
                className="mt-8 inline-block rounded-lg px-8 py-4 text-base font-semibold text-white shadow transition-colors whitespace-nowrap"
                style={{ backgroundColor: '#334155' }}
              >
                資産管理ツールを開く →
              </Link>
              <p className="mt-4 text-sm text-slate-400">無料・登録不要・データは端末内に保存</p>
            </div>

            {/* 右：ミニダッシュボード（イラスト風の静的モック） */}
            <div className="w-full lg:w-[340px] lg:shrink-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold text-slate-500 mb-4">資産の内訳</p>

                <div className="flex items-center justify-center mb-4">
                  <div
                    className="relative rounded-full"
                    style={{ width: 140, height: 140, background: buildDonutGradient() }}
                  >
                    <div className="absolute inset-[24px] rounded-full bg-slate-50" />
                  </div>
                </div>

                <ul className="flex flex-col gap-1.5 mb-4">
                  {DONUT_SLICES.map((s) => (
                    <li key={s.label} className="flex items-center gap-2 text-xs text-slate-600">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                        aria-hidden="true"
                      />
                      {s.label}
                    </li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-slate-400">目標達成率</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">68%</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-slate-400">前回比</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">+3.2%</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
