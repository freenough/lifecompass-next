import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteConfig';
import { PUBLISHED_TOOLS, type ToolGroup } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: 'ツール | FREENOUGH 資産シミュレーター',
  description: 'シミュレーターの前に、気になる数字だけサクッと試せます。詳しい分析は本格シミュレーターへ。',
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
};

const GROUP_LABELS: Record<ToolGroup, string> = {
  accumulate: '資産を増やす',
  receive: '資産を受け取る',
  optimize: '税金・家計を最適化する',
};

const GROUP_ORDER: ToolGroup[] = ['accumulate', 'receive', 'optimize'];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] leading-snug">かんたん計算ツール</h1>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
        シミュレーターの前に、気になる数字だけサクッと試せます
      </p>

      {GROUP_ORDER.map((group) => (
        <div key={group} className="mt-10 first:mt-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">{GROUP_LABELS[group]}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {PUBLISHED_TOOLS.filter((tool) => tool.group === group).map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <tool.Icon size={32} className="text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-900">{tool.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{tool.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
