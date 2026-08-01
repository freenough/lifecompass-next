import type { Metadata } from 'next';
import Link from 'next/link';
import { IconCalculator, IconHourglass, IconTrendingUp, IconClockDollar, IconReceipt2, IconArrowsSplit, IconSchool } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { SITE_URL } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'ツール | FREENOUGH 資産シミュレーター',
  description: 'シミュレーターの前に、気になる数字だけサクッと試せます。詳しい分析は本格シミュレーターへ。',
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
};

type ToolGroup = 'accumulate' | 'receive' | 'optimize';

const GROUP_LABELS: Record<ToolGroup, string> = {
  accumulate: '資産を増やす',
  receive: '資産を受け取る',
  optimize: '税金・家計を最適化する',
};

const GROUP_ORDER: ToolGroup[] = ['accumulate', 'receive', 'optimize'];

interface ToolItem {
  title: string;
  description: string;
  href: string;
  Icon: Icon;
  group: ToolGroup;
  primaryTopic: string;
  topics: string[];
}

const TOOLS: ToolItem[] = [
  {
    title: '積立(複利)計算機',
    description: '現在の資産・毎月の積立額・利回り・期間から、将来の資産額を試算します',
    href: '/tools/compound',
    Icon: IconTrendingUp,
    group: 'accumulate',
    primaryTopic: 'compound_interest',
    topics: ['compound_interest'],
  },
  {
    title: '積立額逆算ツール',
    description: '目標資産額から、毎月の積立額を逆算します',
    href: '/tools/monthly-investment',
    Icon: IconCalculator,
    group: 'accumulate',
    primaryTopic: 'compound_interest',
    topics: ['nisa', 'compound_interest'],
  },
  {
    title: '目標資産到達年齢シミュレーター',
    description: '今の積立額を続けたら、目標資産に何歳で到達するかを計算します',
    href: '/tools/fire-age',
    Icon: IconHourglass,
    group: 'accumulate',
    primaryTopic: 'fire_age',
    topics: ['fire_age'],
  },
  {
    title: '年金 繰上げ・繰下げ 比較シミュレーター',
    description: '受給開始年齢を早める・遅らせる場合の年額・損益分岐年齢を試算します',
    href: '/tools/pension-timing',
    Icon: IconClockDollar,
    group: 'receive',
    primaryTopic: 'pension',
    topics: ['pension'],
  },
  {
    title: '退職金手取り計算ツール',
    description: '退職金の額と勤続年数から、税引き後の手取り額を試算します',
    href: '/tools/retirement-tax',
    Icon: IconReceipt2,
    group: 'receive',
    primaryTopic: 'retirement_tax',
    topics: ['retirement_tax'],
  },
  {
    title: 'iDeCo/DC出口戦略シミュレーター',
    description: '一時金・年金・併用のどの方法で受け取ると手取りが最大になるかを比較します',
    href: '/tools/ideco-withdrawal',
    Icon: IconArrowsSplit,
    group: 'receive',
    primaryTopic: 'ideco',
    topics: ['ideco', 'withdrawal'],
  },
  {
    title: '教育費シミュレーター',
    description: 'お子さんの教育費、いつ・いくらかかるか試算します',
    href: '/tools/education-cost',
    Icon: IconSchool,
    group: 'optimize',
    primaryTopic: 'education_cost',
    topics: ['education_cost'],
  },
];

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
            {TOOLS.filter((tool) => tool.group === group).map((tool) => (
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
