import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/siteConfig';
import { IconChevronRight } from '@tabler/icons-react';
import { PUBLISHED_TOOLS, type ToolGroup } from '@/lib/toolMetadata';
import Container from '@/components/layout/Container';
import PageHeader from '@/components/layout/PageHeader';
import JumpChips from '@/components/layout/JumpChips';
import ListSectionHeading from '@/components/layout/ListSectionHeading';

export const metadata: Metadata = {
  title: 'ツール | FREENOUGH 資産シミュレーター',
  description: 'シミュレーターの前に、気になる数字だけサクッと試せます。詳しい分析は本格シミュレーターへ。',
  alternates: {
    canonical: `${SITE_URL}/tools`,
  },
};

const GROUP_LABELS: Record<ToolGroup, string> = {
  accumulate: '資産を増やす',
  receive: '資産を受け取る',
  optimize: '税金・家計を最適化する',
};

const GROUP_ORDER: ToolGroup[] = ['accumulate', 'receive', 'optimize'];

export default function ToolsPage() {
  return (
    <Container className="py-12">
      <PageHeader
        title="かんたん計算ツール"
        description="シミュレーターの前に、気になる数字だけサクッと試せます"
        breadcrumbs={[
          { name: '資産シミュレーター', href: '/' },
          { name: 'かんたん計算ツール', href: '/tools' },
        ]}
      />

      <div className="mt-6">
        <JumpChips items={GROUP_ORDER.map((group) => ({ id: group, label: GROUP_LABELS[group] }))} />
      </div>

      {GROUP_ORDER.map((group) => (
        <div key={group} className="mt-10">
          <ListSectionHeading id={group}>{GROUP_LABELS[group]}</ListSectionHeading>
          {/* lg未満はカード内が縦2段のレイアウトになるため1列にする。2列だと768px幅でタイトル列が
              226pxしかなく、10件中6件のタイトルが折り返していた（claude_instruction_index_pages_followup.md 1節） */}
          <div className="grid gap-5 lg:grid-cols-2">
            {PUBLISHED_TOOLS.filter((tool) => tool.group === group).map((tool) => (
              // 1つのDOMをgridの配置替えだけで2通りに並べる（claude_instruction_index_pages_implementation.md B-4）。
              // lg未満：1行目 アイコン＋タイトル＋シェブロン／2行目 説明文を全幅（line-clampなし）。
              // lg以上：アイコン（2行分）｜タイトル＋説明文（line-clamp-2）｜シェブロン（2行分）の横並び。
              // Tailwind v4の-translate-y-*はtransformではなくtranslateプロパティを使うため、
              // 動きを減らす設定ではtransform-noneではなくtranslate-noneで打ち消す。
              // タイトル・説明文の[line-break:strict]は、「ー」や小書きの仮名（ゃ・ゅ・ょ・っ等）が行頭に
              // 来るのを防ぐ和文の禁則処理（ツールカード限定。text-balanceは和文見出しで改行が崩れた経緯があるため使わない）。
              <Link
                key={tool.href}
                href={tool.href}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 lg:gap-x-4 rounded border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 motion-reduce:hover:translate-none"
              >
                <tool.Icon size={32} className="col-start-1 row-start-1 lg:row-[1/3] text-slate-600" />
                <h3 className="col-start-2 row-start-1 lg:self-end text-base font-semibold text-slate-900 [line-break:strict]">{tool.title}</h3>
                <p className="col-span-3 row-start-2 mt-2 lg:col-[2/3] lg:self-start lg:mt-1 lg:line-clamp-2 [line-break:strict] text-sm text-slate-500 leading-relaxed">
                  {tool.description}
                </p>
                <IconChevronRight size={18} className="col-start-3 row-start-1 lg:row-[1/3] text-slate-400" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </Container>
  );
}
