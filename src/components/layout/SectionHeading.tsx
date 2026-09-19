import Link from 'next/link';

interface SectionHeadingProps {
  label: string;
  heading: string;
  body?: string;
  linkHref: string;
  linkLabel: string;
  // ケーススタディ(note.com)のみ外部リンクのためtarget="_blank"の<a>で描画する
  linkExternal?: boolean;
}

// instruction_asset_simulator_lp_polish_addendum.md 修正1: 見出し+一覧リンクを同じ行に
// 横並び(baseline揃え・リンクは右寄せ)、補足文はその下に全幅で配置する。
// flex-wrap + 見出しflex-1 + リンクml-autoにより、1行に収まらない幅では見出しが先に折り返し、
// リンクは自身の行内でml-autoにより右寄せのまま次の行に落ちる。
//
// instruction_asset_simulator_lp_polish_addendum2.md 修正2: 見出し本体のモバイル縮小率は、
// Hero見出し(page.tsxのh1、clamp(2.25rem,8vw,3.75rem))の実測縮小率(36px/60px=60%)と
// 同じ比率・同じvw係数(閾値幅450px/750pxを維持)で追随させる。
export default function SectionHeading({ label, heading, body, linkHref, linkLabel, linkExternal }: SectionHeadingProps) {
  const linkClassName = 'ml-auto shrink-0 whitespace-nowrap text-sm font-semibold hover:underline text-accent';

  return (
    <div className="mb-10">
      {/* instruction_asset_simulator_lp_polish_addendum2.md 修正1: 線とラベルは
          同一のflex行の直接の子として横並びにする(別々のブロック要素にしない) */}
      <div className="mb-2 flex items-center gap-3">
        <span className="h-px w-6 bg-slate-300" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h2 className="flex-1 min-w-[12rem] text-[clamp(1.35rem,4.8vw,2.25rem)] font-bold text-slate-900">{heading}</h2>
        {linkExternal ? (
          <a href={linkHref} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            {linkLabel}
          </a>
        ) : (
          <Link href={linkHref} className={linkClassName}>
            {linkLabel}
          </Link>
        )}
      </div>
      {body && <p className="mt-3 text-sm text-slate-500 leading-relaxed">{body}</p>}
    </div>
  );
}
