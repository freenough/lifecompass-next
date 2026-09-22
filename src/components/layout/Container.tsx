import type { ReactNode } from 'react';

export type ContainerSize = 'default' | 'narrow' | 'xnarrow';

const SIZE_CLASS: Record<ContainerSize, string> = {
  default: 'max-w-(--lp-container-width)', // LP本文の基準幅。globals.cssの--lp-container-widthで一元管理
  narrow: 'max-w-4xl', // 「使い方」セクション専用の意図的な例外（未移行、将来の統一用に用意）
  xnarrow: 'max-w-xl', // CTAセクション専用の意図的な例外（未移行、将来の統一用に用意）
};

interface ContainerProps {
  size?: ContainerSize;
  className?: string;
  children: ReactNode;
}

export default function Container({ size = 'default', className = '', children }: ContainerProps) {
  return (
    <div className={`mx-auto w-full px-6 ${SIZE_CLASS[size]}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
