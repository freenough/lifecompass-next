export type ConcernStage = 'saving' | 'deciding' | 'receiving' | 'drawdown';

export const STAGE_LABELS: Record<ConcernStage, string> = {
  saving: '貯める',
  deciding: 'リタイアする',
  receiving: '受け取る',
  drawdown: '取り崩す',
};

export const STAGE_ORDER: ConcernStage[] = ['saving', 'deciding', 'receiving', 'drawdown'];

export type ConcernCTAType = 'lightTool' | 'fullSimulator';

export interface Concern {
  id: string;
  stage: ConcernStage;
  question: string;
  outcome: string;
  ctaType: ConcernCTAType;
  ctaLabel: string;
  ctaUrl: string;
  articleUrl?: string;
  featured: boolean;
}

// URLはbasePath('/asset-simulator')を含めずに書く。<Link>がbasePathを自動付与するため、
// 含めると二重prefixになる（docs/fixes/active/spec_concern_blocks.md 4章参照）。
export const CONCERNS: Concern[] = [
  {
    id: 'fire-age',
    stage: 'saving',
    question: '今のペースで資産は足りる?',
    outcome: '今の積立ペースなら何歳でFIRE達成できるか分かります',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/fire-age?utm_source=lp&utm_medium=concern_card&utm_campaign=fire_age',
    articleUrl: '/blog/nisa-achievement-age',
    featured: true,
  },
  {
    id: 'semi-retirement',
    stage: 'deciding',
    question: '55歳で辞めても生活できる?',
    outcome: '退職年齢を変えて、資産寿命と破綻確率まで確認できます',
    ctaType: 'fullSimulator',
    ctaLabel: '詳しく試算する',
    ctaUrl: '/app?utm_source=lp&utm_medium=concern_card&utm_campaign=semi_retirement',
    articleUrl: '/blog/semi-retirement-blank-period',
    featured: true,
  },
  {
    id: 'pension-timing',
    stage: 'receiving',
    question: '年金は繰上げ・繰下げどっちが得?',
    outcome: '損益分岐年齢と、運用に回した場合の資産全体への影響まで分かります',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/pension-timing?utm_source=lp&utm_medium=concern_card&utm_campaign=pension_timing',
    articleUrl: '/blog/pension-timing',
    featured: true,
  },
  {
    id: 'withdrawal-order',
    stage: 'drawdown',
    question: '資産は何年持つ?',
    outcome: '取り崩す順番によって、資産が何年持つかが変わることを確認できます',
    ctaType: 'fullSimulator',
    ctaLabel: '詳しく試算する',
    ctaUrl: '/app?utm_source=lp&utm_medium=concern_card&utm_campaign=withdrawal_order',
    articleUrl: '/blog/withdrawal-strategy-comparison',
    featured: true,
  },
  {
    id: 'monthly-investment',
    stage: 'saving',
    question: '毎月いくら積み立てればいい?',
    outcome: '4つの条件から、必要な毎月積立額を逆算できます',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/monthly-investment?utm_source=concerns&utm_medium=concern_card&utm_campaign=monthly_investment',
    articleUrl: '/blog/nisa-monthly-investment',
    featured: false,
  },
  {
    id: 'compound',
    stage: 'saving',
    question: '積み立てたら将来いくらになる?',
    outcome: '積立額・利回り・年数から将来の資産額を試算できます',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/compound?utm_source=concerns&utm_medium=concern_card&utm_campaign=compound',
    articleUrl: '/blog/compound-interest-rate-vs-years',
    featured: false,
  },
  {
    id: 'ideco-nisa',
    stage: 'saving',
    question: 'NISAとiDeCo、どっちを優先すべき?',
    outcome: '目的別の優先順位の考え方が分かります',
    ctaType: 'fullSimulator',
    ctaLabel: '詳しく試算する',
    ctaUrl: '/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=ideco_nisa',
    articleUrl: '/blog/ideco-nisa',
    featured: false,
  },
  {
    id: 'dual-income',
    stage: 'deciding',
    question: '夫婦どちらがいつ辞めるべき?',
    outcome: '退職時期の組み合わせによる資産推移の違いを比較できます',
    ctaType: 'fullSimulator',
    ctaLabel: '詳しく試算する',
    ctaUrl: '/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=dual_income',
    articleUrl: '/blog/dual-income-couple-fire',
    featured: false,
  },
  {
    id: 'retirement-tax',
    stage: 'receiving',
    question: '退職金はいくら手元に残る?',
    outcome: '退職金の税引き後の手取り額を試算できます',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/retirement-tax?utm_source=concerns&utm_medium=concern_card&utm_campaign=retirement_tax',
    featured: false,
  },
  {
    id: 'ideco-withdrawal',
    stage: 'receiving',
    question: 'iDeCoは一時金・年金・併用どれが得?',
    outcome: '受け取り方式ごとの手取り額の差を試算できます',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/ideco-withdrawal?utm_source=concerns&utm_medium=concern_card&utm_campaign=ideco_withdrawal',
    featured: false,
  },
  {
    id: 'education-cost',
    stage: 'drawdown',
    question: '教育費があると何歳まで働く必要がある?',
    outcome: '教育費のピーク時期と、資産計画への影響を試算できます',
    ctaType: 'lightTool',
    ctaLabel: '60秒で試算する',
    ctaUrl: '/tools/education-cost?utm_source=concerns&utm_medium=concern_card&utm_campaign=education_cost',
    articleUrl: '/blog/education-cost-fire-simulation',
    featured: false,
  },
  {
    id: 'inflation',
    stage: 'drawdown',
    question: '物価上昇で資産はどれだけ減る?',
    outcome: 'インフレ率の違いによる資産寿命への影響を確認できます',
    ctaType: 'fullSimulator',
    ctaLabel: '詳しく試算する',
    ctaUrl: '/app?utm_source=concerns&utm_medium=concern_card&utm_campaign=inflation',
    articleUrl: '/blog/fire-inflation-sensitivity',
    featured: false,
  },
];
