'use client';

import Peep from 'react-peeps';
import type {
  BustPoseType,
  HairType,
  FaceType,
  AccessoryType,
} from 'react-peeps';

interface PersonaAvatarProps {
  body: BustPoseType;
  hair: HairType;
  face: FaceType;
  accessory: AccessoryType;
  backgroundColor: string;
  strokeColor: string;
  /** 佐々木さん（近日公開）用：点線フレームでグレーアウト表現を追加する */
  dashed?: boolean;
  className?: string;
}

/**
 * ケーススタディセクションの人物アバター。react-peepsのPeepコンポーネントを
 * 72px円形フレームにクロップして表示する。viewBoxは実機検証済みの固定値
 * （頭部〜肩が自然に収まり、下半分が見切れない構図）を全ペルソナ共通で使う。
 */
export default function PersonaAvatar({
  body,
  hair,
  face,
  accessory,
  backgroundColor,
  strokeColor,
  dashed = false,
  className = '',
}: PersonaAvatarProps) {
  return (
    <div
      className={`relative w-[72px] h-[72px] shrink-0 rounded-full overflow-hidden ${
        dashed ? 'border-2 border-dashed border-slate-300' : ''
      } ${className}`}
      style={{ backgroundColor }}
    >
      <Peep
        body={body}
        hair={hair}
        face={face}
        accessory={accessory}
        strokeColor={strokeColor}
        backgroundColor={backgroundColor}
        viewBox={{ x: '125', y: '0', width: '600', height: '700' }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
