import Link from 'next/link';
import { IconBuildingBank, IconChartDonut, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { HOJIN_ASSET_MANAGEMENT_PATH } from '@/lib/hojinAssetManagement/routes';

// 資産シミュレーター側の導線セクション（src/components/lp/AssetManagementPromoSection.tsx、
// ロック対象ではないが複製方針によりimportしない）と外枠のスタイル（角丸・ボーダー・
// カード背景）は統一感を持たせつつ、独立したファイルとして実装する。
const FEATURES: { label: string; Icon: Icon }[] = [
  { label: '法人預金・証券口座など、法人特有の資産を記録', Icon: IconBuildingBank },
  { label: '個人資産と合算して、FIRE進捗をまとめて確認', Icon: IconChartDonut },
  { label: '将来の手取り目安を、自分で設定して試算', Icon: IconAdjustmentsHorizontal },
];

// 濃紺（CTAボタンと同色）。法人資産管理ツール本体の実装が変わってもLP側の修正が
// 不要になるよう、右側のイラストは実データ非連動の固定値モックとする（4章）。
const NAVY = '#0F2A4A';
const PERSONAL_PCT = 68;
const HOJIN_PCT = 14;

export default function HitoriHojinManageSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10">

            {/* 左：テキスト＋CTA */}
            <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 text-balance">
                法人の資産も、FIREの進捗に。
              </h2>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed text-balance sm:text-base">
                法人に保有している資産を記録し、個人資産と合わせたFIRE進捗を確認できます。
              </p>

              <ul className="mt-6 flex flex-col gap-3 w-full max-w-sm">
                {FEATURES.map((f) => (
                  <li key={f.label} className="flex items-center gap-3">
                    <f.Icon size={22} className="text-slate-600 shrink-0" />
                    <span className="text-sm text-slate-600 text-left">{f.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={HOJIN_ASSET_MANAGEMENT_PATH}
                className="mt-8 inline-block rounded-lg px-8 py-4 text-base font-semibold text-white shadow transition-colors whitespace-nowrap"
                style={{ backgroundColor: NAVY }}
              >
                法人資産管理ツールを開く →
              </Link>
              <p className="mt-4 text-sm text-slate-400">無料・登録不要・データは端末内に保存</p>
            </div>

            {/* 右：積み上げバーのイラスト風静的モック（個人＋法人 合算） */}
            <div className="w-full lg:w-[340px] lg:shrink-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold text-slate-500 mb-4">個人＋法人 合算</p>

                <div className="relative w-full h-5 rounded-full bg-slate-200 overflow-hidden flex">
                  <div style={{ width: `${PERSONAL_PCT}%`, backgroundColor: NAVY }} aria-hidden="true" />
                  <div
                    style={{
                      width: `${HOJIN_PCT}%`,
                      backgroundImage: `repeating-linear-gradient(45deg, ${NAVY}, ${NAVY} 3px, transparent 3px, transparent 6px)`,
                      backgroundColor: 'rgba(15,42,74,0.2)',
                    }}
                    aria-hidden="true"
                  />
                  <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ right: 0 }} aria-hidden="true" />
                </div>

                <ul className="mt-3 flex flex-col gap-1.5 mb-4">
                  <li className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NAVY }} aria-hidden="true" />
                    個人資産
                  </li>
                  <li className="flex items-center gap-2 text-xs text-slate-600">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, ${NAVY}, ${NAVY} 2px, transparent 2px, transparent 4px)`,
                        backgroundColor: 'rgba(15,42,74,0.2)',
                      }}
                      aria-hidden="true"
                    />
                    法人保有資産
                  </li>
                </ul>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-slate-400">目標までの進捗</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">68%</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[11px] text-slate-400">個人化想定比率</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">70%</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
