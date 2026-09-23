import type { ReactNode } from 'react';

export type ContainerSize = 'default' | 'narrow' | 'xnarrow';
export type ContainerPaddingX = 'default' | 'tight';

const SIZE_CLASS: Record<ContainerSize, string> = {
  default: 'max-w-(--lp-container-width)', // LP本文の基準幅。globals.cssの--lp-container-widthで一元管理
  narrow: 'max-w-4xl', // 「使い方」セクション専用の意図的な例外（未移行、将来の統一用に用意）
  xnarrow: 'max-w-xl', // CTAセクション専用の意図的な例外（未移行、将来の統一用に用意）
};

// className側でpx-*を後置き上書きするのはTailwindのクラス詳細度上どちらが勝つか不確実なため、
// paddingXをpropとして持たせる（implementation_hero_spacing_chart_aspect_tool_section.md 4節）。
const PADDING_X_CLASS: Record<ContainerPaddingX, string> = {
  default: 'px-6',
  tight: 'px-2', // 「かんたん計算ツール」セクション専用の圧縮版
};

interface ContainerProps {
  size?: ContainerSize;
  paddingX?: ContainerPaddingX;
  className?: string;
  children: ReactNode;
}

export default function Container({ size = 'default', paddingX = 'default', className = '', children }: ContainerProps) {
  return (
    <div className={`mx-auto w-full ${PADDING_X_CLASS[paddingX]} ${SIZE_CLASS[size]}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
