import type { Metadata } from 'next';
import { getHitoriHojinPostsBySeries } from '@/lib/hitoriHojinBlog';
import HitoriHojinGuideSection from '@/components/hitori-hojin/HitoriHojinGuideSection';
import HitoriHojinManageSection from '@/components/hitori-hojin/HitoriHojinManageSection';
import HitoriHojinSimulatorCta from '@/components/hitori-hojin/HitoriHojinSimulatorCta';
import HitoriHojinForkDiagram from '@/components/hitori-hojin/HitoriHojinForkDiagram';
import Container from '@/components/layout/Container';
import Reveal from '@/components/motion/Reveal';
import PhraseBreak from '@/components/text/PhraseBreak';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';
import { FREE_NO_SIGNUP_NOTE } from '@/lib/ctaCopy';
import { CTA_BUTTON_CLASS } from '@/lib/ctaButtonClass';

const SERIES = 'hitori-hojin-intro';

export const metadata: Metadata = {
  title: '一人法人を、FIREの選択肢に。 | FREENOUGH',
  description:
    '税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。',
  openGraph: {
    title: '一人法人を、FIREの選択肢に。 | FREENOUGH',
    description:
      '税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。',
    url: HITORI_HOJIN_SITE_URL,
  },
  alternates: {
    canonical: HITORI_HOJIN_SITE_URL,
  },
};

export default function HitoriHojinLandingPage() {
  const posts = getHitoriHojinPostsBySeries(SERIES);
  const knowledgePosts = posts.filter((post) => post.category === 'knowledge');
  const considerPosts = posts.filter((post) => post.category === 'consider');

  // ルートレイアウト（src/app/layout.tsx）がすでに<main>で包んでいるため、ここは<div>にして入れ子を避ける
  // （impl_hitori_hojin_lp_ui.md 5-4節）。
  return (
    <div>
      {/* Hero（implementation_hitori_hojin_hero_redesign.md 1節）。背景は白。
          PC・スマホ共通の1つのJSXを、grid-template-areasの並び替えで出し分ける：
          lg未満は1列で「見出し→説明文→分かれ道の図→CTA」、lg以上は左に「見出し・説明文・CTA」、右に図。
          2列にするのは資産シミュレーターLPのHeroと同じlg（1024px）から。
          左列はminmax(min-content,1fr)で、見出しの「FIREの選択肢に。」（66pxで約526px）が折り返さない幅を必ず確保し、
          図の列（最大520px）のほうが縮む（1024px幅で約410px。図の中の人物・ラベルは割合で置いているため崩れない）。
          資産シミュレーターLPは右列が520px固定のため、1024〜1099px幅で右端がはみ出すが、ここでは図を縮めて収める。
          左列の上下にある1frの空き行で、左列を図に対して上下中央に置く。
          揃え：sm未満（スマホ）は見出し・説明文・CTAまわりを中央揃え、sm以上は左揃え（資産シミュレーターLPの
          Heroと同じ切り替え。implementation_hitori_hojin_hero_redesign.md 背景・判断結果6番）。 */}
      <section className="pt-10 pb-8 lg:pt-16 lg:pb-12">
        <Container>
          <div className="grid gap-y-6 text-center sm:text-left [grid-template-areas:'title'_'desc'_'fig'_'cta'] lg:grid-cols-[minmax(min-content,1fr)_minmax(0,520px)] lg:grid-rows-[1fr_auto_auto_auto_1fr] lg:gap-x-10 lg:[grid-template-areas:'._fig'_'title_fig'_'desc_fig'_'cta_fig'_'._fig']">
            {/* 見出しのサイズ・字間は資産シミュレーターLP（src/app/page.tsx）の見出しと同じクラス。
                word-break: keep-all + wbrで「一人法人を、」/「FIREの選択肢に。」の意味の区切りでのみ改行させる。
                360px幅では「FIREの選択肢に。」が数pxはみ出すが、資産シミュレーターLPと同じ扱いとして許容する。
                360px未満だけは下限を33px（2.0625rem）に下げる。40pxのままだと「FIREの選択肢に。」（約318px）が
                320px幅の本文（272px）を超え、グリッドごと広がって横スクロールが出るため。33pxで約263px（余り約9px）。
                34pxでは約271px（余り約1px）しか残らない */}
            <h1 className="[grid-area:title] text-[clamp(2.5rem,1.5094rem+4.2264vw,3.2rem)] max-[360px]:text-[2.0625rem] sm:text-[clamp(2.625rem,8vw,4.125rem)] font-bold tracking-tight text-slate-900 [word-break:keep-all]">
              一人法人を、<wbr />FIREの選択肢に。
            </h1>
            <p className="[grid-area:desc] text-base text-slate-600 leading-relaxed [line-break:strict]">
              これから法人化を考える人にも、すでに一人法人を運営している人にも。税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。
            </p>
            <div className="[grid-area:fig] lg:self-center">
              <HitoriHojinForkDiagram />
            </div>
            {/* ボタンの見た目は一人法人LPのCTA共通クラス（CTA_BUTTON_CLASS）に余白mt-6を足したもの。文言はSIMULATOR_CTA_LABEL。
                クリックはGA4イベント hojin_lp_cta_click（location: 'hero'）で計測し、下部CTA（'bottom'）と区別する。 */}
            <div className="[grid-area:cta]">
              {/* 2列表示の左列（1024px幅で約526px）では「す。」だけが2行目に残るため、下部CTAの説明文と同じく
                  BudouX（PhraseBreak）で文節の区切りにだけ<wbr />を入れ、keep-allでその位置だけで折り返させる。 */}
              <p className="mt-3 text-base font-bold text-[#16202e] leading-relaxed [line-break:strict] [word-break:keep-all] [overflow-wrap:anywhere]">
                <PhraseBreak text="法人からの取り崩しも織り込んで、あなたのFIREの時期を試算できます。" />
              </p>
              <HitoriHojinSimulatorCta
                location="hero"
                className={`mt-6 ${CTA_BUTTON_CLASS}`}
              />
              <p className="mt-2 text-sm text-slate-400">{FREE_NO_SIGNUP_NOTE}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* 導入（Heroと同じコンテナ幅いっぱい・左揃え。文字の大きさはHeroの本文と同じ）。
          [line-break:strict]は和文の禁則処理。text-prettyは付けない：Safari（WebKit）では段落全体の行長を
          そろえる挙動になり、375px幅ですべての行が右端の50〜60px手前で折り返されていた
          （fix_hitori_hojin_intro_safari.md）。 */}
      <section className="pb-12">
        <Container>
          {/* スクロール表示演出は段落ごとに分けず1つにまとめる（space-y-4の間隔を変えないため。
              implementation_hitori_hojin_scroll_reveal.md 3節）。 */}
          <Reveal className="text-base text-slate-700 leading-relaxed space-y-4 [line-break:strict]">
            <p>
              FIREというと、「完全に働くのをやめること」だけをイメージしがちです。でも、完全リタイアと会社員の間には、仕事を続けながら働き方や収入の持ち方を変え、資産形成を続けるという選択肢もあります。その選択肢の一つとして、一人法人があります。
            </p>
            <p>
              このシリーズでは、「法人化すれば得をする」という切り口ではなく、一人法人特有の論点を、自分のFIRE計画の中でどう位置づけるかという視点で整理します。
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 「一人法人を知る」「一人法人を考える」の記事一覧（薄いグレー背景。資産シミュレーター側の
          白/グレー切り替え構成に合わせる）。 */}
      <HitoriHojinGuideSection knowledgePosts={knowledgePosts} considerPosts={considerPosts} />

      {/* 管理する（法人資産管理ツールPhase1への導線）。計算する（CompanyState実装待ち）は
          引き続き非表示のままにする。 */}
      <HitoriHojinManageSection />

      {/* FIRE資産シミュレーターへのCTA。資産シミュレーター側の最終CTAセクション（「まず、
          自分の数字を入れてみる。」）と同じく、角丸・枠線付きの箱ではなく画面幅いっぱいの
          背景帯にし、コンテンツのみ中央寄せ・幅を制限する。-mb-16はFooter.tsxのmt-16
          (margin-top: 4rem)を打ち消すための負のマージン（asset-simulator側page.tsxの
          CTAセクションと同じ理由。bodyがflex flex-colのためmain/footer間のmarginは
          相殺されず、Footerのmt-16がそのまま本セクション背景色の外側の白い隙間になる）。 */}
      <section className="bg-slate-50 py-16 -mb-16">
        {/* 説明文はmax-w-xlに絞り、[line-break:strict]で和文の禁則処理をかける（impl_hitori_hojin_lp_ui.md 5-3節）。
            ボタン文言はctaCopy.tsの定数（お悩みカード・SimulatorCtaCardと同じ「シミュレーターで試算」、
            SimulatorCtaCardに合わせて矢印なし）。行き先はLPトップではなくシミュレーター本体（/app）。
            説明文は文の切れ目で改行する（全幅で有効。1文目はmax-w-xlで1440・768px幅なら1行に収まる。
            impl_hitori_hojin_lp_ui_followup.md 5節）。
            text-prettyは付けない：Safari（WebKit）では行が不自然に短くなるため（fix_hitori_hojin_intro_safari.md）。
            代わりにBudouX（PhraseBreak）で文節の区切りに<wbr />を入れ、keep-allでその位置だけで折り返させる
            （overflow-wrap:anywhereは長すぎる文節の保険。experiment_budoux_hitori_hojin.md）。 */}
        <div className="mx-auto max-w-xl px-6 text-center">
          <Reveal as="p" className="text-sm text-slate-600 leading-relaxed mb-6 [line-break:strict] [word-break:keep-all] [overflow-wrap:anywhere]">
            <PhraseBreak text="一人法人を考える前に、まずは自分の必要資産額を確認してみてください。" />
            <br />
            <PhraseBreak text="一人法人はFIREを実現するための選択肢の一つです。" />
          </Reveal>
          {/* ボタンのホバー用transition（transition-all）と干渉しないよう、Revealは外側に付ける */}
          <Reveal>
            <HitoriHojinSimulatorCta />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
