import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}

// 一覧ページ共通のページ見出し（パンくず＋h1＋説明文）。現在はお悩み一覧・ツール一覧のみに適用
// （claude_instruction_index_pages_implementation.md A-2）。h1のサイズは従来の一覧ページのまま、
// 色だけLPの見出しに合わせてtext-slate-900にしている。
export default function PageHeader({ title, description, breadcrumbs }: PageHeaderProps) {
  return (
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">{title}</h1>
      {description && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{description}</p>}
    </div>
  );
}
