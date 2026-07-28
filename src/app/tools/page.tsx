import type { Metadata } from 'next';
import Link from 'next/link';
import { IconCalculator, IconHourglass, IconTrendingUp, IconClockDollar, IconReceipt2 } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export const metadata: Metadata = {
  title: 'ツール | FREENOUGH 資産シミュレーター',
  description: '気になる数字を30秒でチェック。詳しい分析は本格シミュレーターへ。',
};

interface ToolItem {
  title: string;
  description: string;
  href: string;
  Icon: Icon;
}

const TOOLS: ToolItem[] = [
  {
    title: '積立額逆算ツール',
    description: '目標資産額から、毎月の積立額を逆算します',
    href: '/tools/monthly-investment',
    Icon: IconCalculator,
  },
  {
    title: '目標資産到達年齢シミュレーター',
    description: '今の積立額を続けたら、目標資産に何歳で到達するかを計算します',
    href: '/tools/fire-age',
    Icon: IconHourglass,
  },
  {
    title: '積立(複利)計算機',
    description: '現在の資産・毎月の積立額・利回り・期間から、将来の資産額を試算します',
    href: '/tools/compound',
    Icon: IconTrendingUp,
  },
  {
    title: '年金 繰上げ・繰下げ 比較シミュレーター',
    description: '受給開始年齢を早める・遅らせる場合の年額・損益分岐年齢を試算します',
    href: '/tools/pension-timing',
    Icon: IconClockDollar,
  },
  {
    title: '退職金手取り計算ツール',
    description: '退職金の額と勤続年数から、税引き後の手取り額を試算します',
    href: '/tools/retirement-tax',
    Icon: IconReceipt2,
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] leading-snug">ツール</h1>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
        気になる数字を30秒でチェック。詳しい分析は本格シミュレーターへ
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <tool.Icon size={32} className="text-slate-600 mb-3" />
            <h2 className="text-base font-semibold text-slate-900">{tool.title}</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
