import type { ComponentProps } from 'react';
import PersonaAvatar from '@/components/lp/PersonaAvatar';

// 一人法人LP Heroの「分かれ道」の図（implementation_hitori_hojin_hero_redesign.md 1節）。
// 「会社員」と「完全リタイア」を1本の線で結び、途中で2本の点線（別の選択肢）が分かれ、1本だけ実線・強調色で
// 分かれて「一人法人」に至る。線・点の座標はClaude Designキャンバス（Main.dc.html＝PC 600×480、
// MainMobile.dc.html＝スマホ 342×290）の値をそのまま使う。
// - 線（装飾のSVG）はスマホとPCで形が違うため、2つ用意してsm境界で出し分ける（aria-hidden）。
// - 人物・ラベルは1組だけ置き、枠に対する割合（元のpx÷342・290、または÷600・480）で位置と大きさを
//   sm境界で切り替える。枠はaspect-ratioで元の比率を保つため、割合指定で図と重なる位置がずれない。

const ACCENT = '#0F2A4A';
const LINE = '#C9D3DF';

type PersonaParts = Omit<ComponentProps<typeof PersonaAvatar>, 'dashed' | 'className' | 'sizeClassName'>;

const PEOPLE: {
  label: string;
  persona: PersonaParts;
  // 位置・大きさ（スマホ／PC）。Tailwindのクラスはビルド時に文字列から拾われるため、完全なクラス名で書く。
  avatarClass: string;
  labelClass: string;
  emphasis: boolean;
}[] = [
  {
    label: '会社員',
    persona: { body: 'ButtonShirt', hair: 'Short', face: 'Smile', accessory: 'None', backgroundColor: '#DCEEF5', strokeColor: ACCENT },
    avatarClass: 'left-[1.17%] top-[8.28%] w-[21.05%] sm:left-[2.33%] sm:top-[19.58%] sm:w-[18.67%]',
    labelClass: 'left-0 top-[35.17%] w-[23.39%] sm:top-[45.42%] sm:w-[23.33%]',
    emphasis: false,
  },
  {
    label: '完全リタイア',
    persona: { body: 'PoloSweater', hair: 'GrayShort', face: 'Smile', accessory: 'None', backgroundColor: '#DCEEF5', strokeColor: ACCENT },
    avatarClass: 'left-[77.78%] top-[8.28%] w-[21.05%] sm:left-[79%] sm:top-[19.58%] sm:w-[18.67%]',
    labelClass: 'left-[73.68%] top-[35.17%] w-[26.32%] sm:left-[76.67%] sm:top-[45.42%] sm:w-[23.33%]',
    emphasis: false,
  },
  {
    label: '一人法人',
    persona: { body: 'Sweater', hair: 'ShortMessy', face: 'Smile', accessory: 'None', backgroundColor: '#DCEEF5', strokeColor: ACCENT },
    avatarClass: 'left-[49.71%] top-[52.41%] w-[25.73%] sm:left-[49.33%] sm:top-[57.5%] sm:w-[21.33%]',
    labelClass: 'left-[47.95%] top-[85.52%] w-[29.24%] sm:left-[46.67%] sm:top-[86.67%] sm:w-[26.67%]',
    emphasis: true,
  },
];

export default function HitoriHojinForkDiagram() {
  return (
    <div
      role="img"
      aria-label="会社員と完全リタイアを結ぶ線の途中から分かれた道の先に、一人法人がある図"
      className="relative mx-auto w-full max-w-[600px] aspect-[342/290] sm:aspect-[600/480]"
    >
      {/* スマホ（sm未満）：MainMobile.dc.html 342×290 */}
      <svg viewBox="0 0 342 290" className="absolute inset-0 h-full w-full sm:hidden" aria-hidden="true">
        <line x1="76" y1="60" x2="266" y2="60" stroke={LINE} strokeWidth="2" />
        <path d="M112 60 C 160 60, 190 124, 276 142" fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="276" cy="142" r="4" fill={LINE} />
        <path d="M112 60 C 126 100, 112 220, 134 262" fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="134" cy="262" r="4" fill={LINE} />
        <path d="M112 60 C 150 60, 150 196, 172 196" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
        <circle cx="112" cy="60" r="6" fill="#ffffff" stroke={ACCENT} strokeWidth="2.5" />
      </svg>
      {/* PC（sm以上）：Main.dc.html 600×480 */}
      <svg viewBox="0 0 600 480" className="absolute inset-0 hidden h-full w-full sm:block" aria-hidden="true">
        <line x1="126" y1="150" x2="474" y2="150" stroke={LINE} strokeWidth="2" />
        <path d="M190 150 C 270 150, 300 240, 470 262" fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="4 6" />
        <circle cx="470" cy="262" r="5" fill={LINE} />
        <path d="M190 150 C 218 200, 196 370, 232 424" fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="4 6" />
        <circle cx="232" cy="424" r="5" fill={LINE} />
        <path d="M190 150 C 250 150, 250 340, 300 340" fill="none" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
        <circle cx="190" cy="150" r="8" fill="#ffffff" stroke={ACCENT} strokeWidth="3" />
      </svg>

      {PEOPLE.map((p) => (
        <div key={p.label} aria-hidden="true">
          <div
            className={`absolute aspect-square rounded-full border-[3px] sm:border-4 ${p.emphasis ? 'border-[#0F2A4A]' : 'border-white'} ${p.avatarClass}`}
          >
            <PersonaAvatar {...p.persona} sizeClassName="w-full h-full" />
          </div>
          <p
            className={`absolute text-center ${p.emphasis ? 'text-[15px] sm:text-lg font-bold text-[#0F2A4A]' : 'text-xs sm:text-[15px] font-medium text-[#5B6B80]'} ${p.labelClass}`}
          >
            {p.label}
          </p>
        </div>
      ))}
    </div>
  );
}
