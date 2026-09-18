import Link from 'next/link';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';

// instruction_header_logo_text_lockup.md: コンパスアイコンを廃止し、「FREENOUGH ｜ セクション名」の
// テキストのみのロックアップに変更。旧実装（コンパスアイコン+セクション名のみ）からの切り戻しを
// 容易にするため、独立コンポーネントとして新規追加しHeader.tsx側で差し替える形にしている。
interface HeaderLogoProps {
  isHitoriHojin: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function HeaderLogo({ isHitoriHojin, className, onClick }: HeaderLogoProps) {
  const sectionLabel = isHitoriHojin ? '一人法人' : '資産シミュレーター';
  // instruction_header_logo_underline_accent.md: FREENOUGH TOP側(freenough-main/
  // app/components/Header.tsx)の「2つ目のE」に緑下線を入れる実装をそのまま踏襲
  // （underline decoration-2 underline-offset-4 decoration-[#3F9C6D]）。
  const content = (
    <>
      <span className="font-extrabold">
        FRE
        <span className="underline decoration-2 underline-offset-4 decoration-[#3F9C6D]">E</span>
        NOUGH
      </span>
      <span className="mx-1.5 font-normal text-slate-300" aria-hidden="true">｜</span>
      <span className="font-medium">{sectionLabel}</span>
    </>
  );

  // リンク先は従来通りセクションのハブページのまま（FREENOUGH TOPには飛ばさない）。
  if (isHitoriHojin) {
    return (
      <a href={HITORI_HOJIN_SITE_URL} onClick={onClick} className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href="/" onClick={onClick} className={className}>
      {content}
    </Link>
  );
}
