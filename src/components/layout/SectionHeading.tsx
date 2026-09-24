import Link from 'next/link';
import SectionRule from './SectionRule';

interface SectionHeadingProps {
  label: string;
  heading: string;
  body?: string;
  linkHref: string;
  linkLabel: string;
  // ケーススタディ(note.com)のみ外部リンクのためtarget="_blank"の<a>で描画する
  linkExternal?: boolean;
  // 同じタブで開く<a>で描画する（linkHrefは絶対URLを渡す）。next/linkはbasePath('/asset-simulator')を
  // 自動付与するため、一人法人LPから一人法人ブログ（クリーンURL）へ移動するときに使う
  // （Header.tsxのabsolute: trueと同じ理由。impl_hitori_hojin_lp_ui.md 2節）。
  linkAbsolute?: boolean;
}

// instruction_asset_simulator_lp_polish_addendum2.md 修正1: 線とラベルは
// 同一のflex行の直接の子として横並びにする(別々のブロック要素にしない)。
//
// instruction_asset_simulator_lp_polish_addendum4.md 修正2: Hero見出しの縮小率に合わせた
// モバイルサイズ(21.6px)は本文(14px)との差が小さくセクション区切りとして機能しにくかったため、
// Heroとの比率連動をやめ、モバイル32px/sm以上36pxの2段階固定に変更する
// (現状比で約1.5倍・目安28〜32pxの範囲に収める)。
//
// instruction_asset_simulator_lp_polish_addendum5.md 修正1: 上記32pxは実機(iPhone SE幅)で
// 見ると大きすぎたため、28px(現状比87.5%)に縮小する。sm以上の36pxは変更なし。
//
// instruction_asset_simulator_lp_polish_addendum3.md 修正1: 「○○一覧を見る→」リンクは
// 見出し本体の行ではなく、ラベル行(線+ラベル)と同じ行に右寄せ配置する(justify-between)。
// 見出し本体・補足文は全幅の別行になるため、見出しの文字数がリンクの位置に影響しない
// (見出し側の折り返し対応・flex-wrap/ml-autoの仕組みは不要になったため撤去した)。
export default function SectionHeading({ label, heading, body, linkHref, linkLabel, linkExternal, linkAbsolute }: SectionHeadingProps) {
  const linkClassName = 'shrink-0 whitespace-nowrap text-sm font-semibold hover:underline text-accent';

  return (
    <div className="mb-10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionRule />
          {/* claude_instruction_lp_polish_round2.md 2節: text-slate-500はコントラストが低く
              可読性に欠けるため、1段階濃いslate-600に変更（新規トークン追加なし） */}
          <span className="text-sm font-medium text-slate-600">{label}</span>
        </div>
        {linkExternal ? (
          <a href={linkHref} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            {linkLabel}
          </a>
        ) : linkAbsolute ? (
          <a href={linkHref} className={linkClassName}>
            {linkLabel}
          </a>
        ) : (
          <Link href={linkHref} className={linkClassName}>
            {linkLabel}
          </Link>
        )}
      </div>
      <h2 className="text-[1.75rem] sm:text-4xl font-bold text-slate-900">{heading}</h2>
      {body && <p className="mt-3 text-sm text-slate-500 leading-relaxed">{body}</p>}
    </div>
  );
}
