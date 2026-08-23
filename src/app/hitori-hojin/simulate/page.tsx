import { redirect } from 'next/navigation';

// 最終版指示書3.10節：CompanyState（法人資産を含めたFIRE試算）は個人シミュレーター本体
// （/app）の左側「個人設定欄」に統合されたため、独立ページとしてのコンテンツは廃止した。
// 外部からのリンクはまだ存在しない認識だが、念のため404にはせずリダイレクトする。
export default function HojinSimulatePage() {
  redirect('/app');
}
