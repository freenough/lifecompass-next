interface SectionHeadingProps {
  label: string;
  heading: string;
  body?: string;
}

// instruction_asset_simulator_lp_polish.md 2節: 中央寄せの単一見出しを、
// キオミル社LPの「短い横線+ラベル+左寄せ見出し / 補足文」型の2カラムに変更する共通コンポーネント。
// 4セクション(悩み/FIREガイド/ツール/ケーススタディ)すべてから呼び出す。
export default function SectionHeading({ label, heading, body }: SectionHeadingProps) {
  return (
    <div className="mb-10 grid gap-4 md:grid-cols-[35%_1fr] md:gap-16">
      <div>
        <div className="mb-2 h-px w-6 bg-slate-300" aria-hidden="true" />
        <p className="mb-1 text-sm font-medium text-slate-500">{label}</p>
        <h2 className="text-2xl font-bold text-slate-900">{heading}</h2>
      </div>
      {body && (
        <p className="text-sm text-slate-500 leading-relaxed md:self-end md:pb-1">{body}</p>
      )}
    </div>
  );
}
