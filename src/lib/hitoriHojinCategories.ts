import { IconBook2, IconBulb } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export const HITORI_HOJIN_CATEGORIES: Record<
  'knowledge' | 'consider',
  { label: string; subtitle: string; ListIcon: Icon }
> = {
  knowledge: {
    label: '一人法人を知る',
    subtitle: 'まずは基本を知りたい方へ',
    ListIcon: IconBook2,
  },
  consider: {
    label: '一人法人を考える',
    subtitle: '自分に合うかどうかを考えたい方へ',
    ListIcon: IconBulb,
  },
};
