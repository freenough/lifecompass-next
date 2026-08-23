// 法人の取崩額を個人シミュレーションへ注入する変換処理（実装指示書4.2節）。
// 純粋なイベント変換のみを行う（simulate.ts/analyze.tsの呼び出しはmc.tsに移した。
// 最終版指示書以降、法人側コードから個人側ロックファイルへの唯一の接続点はmc.tsになる）。

import type { LifeEvent } from '../types';
import type { CorporateLifeEvent, CorporateYearSnap } from './types';

const GENERATED_EVENT_LABEL = '法人取崩（自動生成）';

// 年齢→税引後金額のMapを、連続する同額の年をまとめたLifeEvent[]へエンコードする共通ロジック
// （buildCorporateGeneratedEvents・buildCorporateGeneratedEventsFromSnapsの両方で使う）。
function encodeAgeAmountsToEvents(netByAge: Map<number, number>): LifeEvent[] {
  if (netByAge.size === 0) return [];
  const ages = Array.from(netByAge.keys()).sort((a, b) => a - b);
  const generated: LifeEvent[] = [];
  let i = 0;
  while (i < ages.length) {
    const startAge = ages[i];
    const amount = netByAge.get(startAge)!;
    let j = i;
    while (j + 1 < ages.length && ages[j + 1] === ages[j] + 1 && netByAge.get(ages[j + 1]) === amount) {
      j++;
    }
    generated.push({
      category: 'income',
      subtype: 'other_inc',
      name: GENERATED_EVENT_LABEL,
      age: startAge,
      years: ages[j] - startAge + 1,
      amount,
    });
    i = j + 1;
  }
  return generated;
}

// 1〜3: kind:'withdrawal'のイベントを年齢ごとに集計し、税引き後の個人収入(other_inc)イベントに変換する。
// 複数年で税引き後金額が変わるたびに新しいother_incイベントを生成する（連続する同額の年はまとめる）。
// 生成イベントのみ（personalEventsを含まない）を返す。
//
// 注意（2026-08-23）：この関数はイベントの「要求額」をそのまま使う静的な変換であり、
// 法人資産が実際に不足して取崩額が減額される（corporateGrowth.tsのactualWithdrawal）
// ケースを反映しない。法人残高が枯渇した年以降も満額の収入が個人側に注入され続けてしまう
// バグの原因だったため、実際のシミュレーション結果（CorporateYearSnap[]）を必要とする箇所
// （mc.ts・CorporateSettingsSection.tsx）は下のbuildCorporateGeneratedEventsFromSnapsを使う。
// この関数自体は現在どこからも呼ばれていないが、テスト（verify-companystate.js）の回帰確認用に残す。
export function buildCorporateGeneratedEvents(
  corporateEvents: CorporateLifeEvent[],
  effectiveTaxRate: number,
): LifeEvent[] {
  const grossByAge = new Map<number, number>();
  for (const ev of corporateEvents) {
    if (ev.kind !== 'withdrawal') continue;
    for (let age = ev.startAge; age < ev.startAge + ev.years; age++) {
      grossByAge.set(age, (grossByAge.get(age) ?? 0) + ev.amount);
    }
  }
  const netByAge = new Map<number, number>(
    Array.from(grossByAge.entries()).map(([age, gross]) => [age, gross * (1 - effectiveTaxRate / 100)]),
  );
  return encodeAgeAmountsToEvents(netByAge);
}

// 法人の実際のシミュレーション結果（CorporateYearSnap[]、corporateGrowth.tsのactualWithdrawalを
// 反映済み）から、税引き後の個人収入(other_inc)イベントへ変換する。法人残高が不足して
// 取崩額が減額された年は、その減額後の実額だけが個人側に注入される（2026-08-23バグ修正）。
export function buildCorporateGeneratedEventsFromSnaps(
  corporateSnaps: CorporateYearSnap[],
  effectiveTaxRate: number,
): LifeEvent[] {
  const netByAge = new Map<number, number>();
  for (const snap of corporateSnaps) {
    if (snap.withdrawal > 0) {
      netByAge.set(snap.age, snap.withdrawal * (1 - effectiveTaxRate / 100));
    }
  }
  return encodeAgeAmountsToEvents(netByAge);
}

// 4: 個人側のprofile.events（ユーザー入力の本来のイベント）と、法人取崩から生成したイベント配列を
// 「その場でマージした一時配列」として結合する。生成したイベントをprofile.eventsストア
// （永続化・ユーザー編集対象）に書き込むことはしない——呼び出し元がこの戻り値をsimulate()に渡す
// 一時的な配列としてのみ使うこと。
export function buildCombinedSimulationInput(
  personalEvents: LifeEvent[],
  corporateEvents: CorporateLifeEvent[],
  effectiveTaxRate: number,
): LifeEvent[] {
  const generated = buildCorporateGeneratedEvents(corporateEvents, effectiveTaxRate);
  return [...personalEvents, ...generated];
}
