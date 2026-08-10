import { IconCalculator, IconHourglass, IconTrendingUp, IconClockDollar, IconReceipt2, IconArrowsSplit, IconSchool, IconScale, IconCalendarDollar } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export type ToolGroup = 'accumulate' | 'receive' | 'optimize';

export interface ToolItem {
  slug: string;
  title: string;
  description: string;
  href: string;
  Icon: Icon;
  group: ToolGroup;
  primaryTopic: string;
  topics: string[];
}

export const TOOLS: ToolItem[] = [
  {
    slug: 'compound',
    title: '積立(複利)計算機',
    description: '現在の資産・毎月の積立額・利回り・期間から、将来の資産額を試算します',
    href: '/tools/compound',
    Icon: IconTrendingUp,
    group: 'accumulate',
    primaryTopic: 'compound_interest',
    topics: ['compound_interest'],
  },
  {
    slug: 'monthly-investment',
    title: '積立額逆算ツール',
    description: '目標資産額から、毎月の積立額を逆算します',
    href: '/tools/monthly-investment',
    Icon: IconCalculator,
    group: 'accumulate',
    primaryTopic: 'compound_interest',
    topics: ['nisa', 'compound_interest'],
  },
  {
    slug: 'fire-age',
    title: '目標資産到達年齢シミュレーター',
    description: '今の積立額を続けたら、目標資産に何歳で到達するかを計算します',
    href: '/tools/fire-age',
    Icon: IconHourglass,
    group: 'accumulate',
    primaryTopic: 'fire_age',
    topics: ['fire_age'],
  },
  {
    slug: 'pension-timing',
    title: '年金 繰上げ・繰下げ 比較シミュレーター',
    description: '受給開始年齢を早める・遅らせる場合の年額・損益分岐年齢を試算します',
    href: '/tools/pension-timing',
    Icon: IconClockDollar,
    group: 'receive',
    primaryTopic: 'pension',
    topics: ['pension'],
  },
  {
    slug: 'retirement-tax',
    title: '退職金手取り計算ツール',
    description: '退職金の額と勤続年数から、税引き後の手取り額を試算します',
    href: '/tools/retirement-tax',
    Icon: IconReceipt2,
    group: 'receive',
    primaryTopic: 'retirement_tax',
    topics: ['retirement_tax'],
  },
  {
    slug: 'ideco-withdrawal',
    title: 'iDeCo/DC出口戦略シミュレーター',
    description: '一時金・年金・併用のどの方法で受け取ると手取りが最大になるかを比較します',
    href: '/tools/ideco-withdrawal',
    Icon: IconArrowsSplit,
    group: 'receive',
    primaryTopic: 'ideco',
    topics: ['ideco', 'withdrawal'],
  },
  {
    slug: 'prepay-vs-invest',
    title: '繰上返済 vs 投資 比較シミュレーター',
    description: '住宅ローンの繰上返済と投資、どちらが適しているかの判断材料を比較します',
    href: '/tools/prepay-vs-invest',
    Icon: IconScale,
    group: 'optimize',
    primaryTopic: 'housing_loan',
    topics: ['housing_loan'],
  },
  {
    slug: 'education-cost',
    title: '教育費シミュレーター',
    description: 'お子さんの教育費、いつ・いくらかかるか試算します',
    href: '/tools/education-cost',
    Icon: IconSchool,
    group: 'optimize',
    primaryTopic: 'education_cost',
    topics: ['education_cost'],
  },
  {
    slug: 'retirement-ideco-timing',
    title: '退職金×iDeCo 受給タイミング比較',
    description: '退職金とiDeCo一時金、受け取る年齢の組み合わせで手取り額がどう変わるかを比較します',
    href: '/tools/retirement-ideco-timing',
    Icon: IconCalendarDollar,
    group: 'receive',
    primaryTopic: 'retirement_tax',
    topics: ['retirement_tax', 'ideco'],
  },
];

export const TOOL_MAP: Record<string, ToolItem> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t])
);
