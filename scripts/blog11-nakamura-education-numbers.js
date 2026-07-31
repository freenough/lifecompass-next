/**
 * scripts/blog11-nakamura-education-numbers.js
 * ブログ記事11本目「教育費はFIREの足かせになるのか」用の実機シミュレーション(再検証版v2)。
 * 指示書「ブログ11本目 数値関連の確認・修正(4点)」に基づく。
 *
 * v1からの変更点(②③への対応):
 * - 子供の現在の学年をpreK(両者とも就学前)からelem2(子1)/kinder2(子2)に修正。
 *   元の小説の大学費用イベント(子1:49-53歳、子2:52-56歳)から誕生タイミングを逆算すると、
 *   38歳時点で子1は小学2年・子2は幼稚園年中であり、両者ともまだ幼稚園に入っていないという
 *   前提(v1)は誤りだった。elem2/kinder2で計算すると大学開始年齢が49歳/52歳と完全に一致する
 *   ことを確認済み(検算はチャット上で提示済み)。
 * - MC破綻率の算出を、独自ループ(v1のrunSharedShockMC)から、本番runMC()への
 *   shockOverrides引数注入に置き換えた(montecarlo.tsに後方互換の任意5引数目を追加)。
 *   独自のモンテカルロループ再実装をやめ、3パターンで同一のショック列をrunMC()に
 *   渡すことでノイズを排除しつつ、本番関数のみを使う形にした。
 *
 * 使い捨てスクリプト（本番の calcChildYearlyCosts()/profileToSimParams()/simulate()/
 * analyze()/runMC() をそのままimportして使う。独自の再計算ロジックは含まない）。
 * 実行: node scripts/blog11-nakamura-education-numbers.js
 */

require('ts-node').register({
  project: require('path').join(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});
const fs = require('fs');
const path = require('path');
const { simulate, runMC } = require('../src/lib');
const { analyze } = require('../src/lib/analyze');
const { profileToSimParams } = require('../src/lib/profile');
const { calcChildYearlyCosts } = require('../src/lib/educationCostCalc');
const { randNorm } = require('../src/lib/helpers');

const PROFILE_PATH = path.join(__dirname, '..', 'docs', 'fixes', 'done', 'lifecompass_中村夫婦①_split.json');
const baseProfile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));

const MC_N = 1000;

// ── 教育費ステージ→ライフイベント変換 ──
// calcChildYearlyCosts()が返す年次配列(index 0 = currentGradeの学年の「今年」)を、
// 幼稚園/小学校/中学校/高校/大学の5ステージ境界で合算し、各ステージ1本の
// 定額ライフイベントに変換する(大学は4年分の合計を4で割った年額に均す)。
// currentGradeが「その学年の途中」の場合、最初のセグメントの長さはそのステージの
// 残り年数になる(例: elem2なら小学校の残りは5年)。境界はcalcChildYearlyCosts()の
// resolveSegments()と同じ考え方をここでも踏襲し、ステージ名と実際の年数配列から
// 動的に切り出す(ハードコードした年数ではなく、実際の残り年数を使う)。
function buildChildEducationEvents(currentGrade, curParentAge, stageSelections, childLabel) {
  const yearly = calcChildYearlyCosts({ currentGrade, stageSelections, livingAlone: false });

  // ステージ境界をcurrentGradeから動的に算出する。
  // GRADE_POSITIONSはeducationCostCalc.ts内部にしかないため、ここではSTAGE_DURATIONS
  // (定数、Spec/実装指示書に明記の値)とcurrentGradeの命名規則から同じロジックを再現する。
  const STAGE_ORDER = ['kindergarten', 'elementary', 'juniorHigh', 'highSchool', 'university'];
  const STAGE_DURATION = { kindergarten: 3, elementary: 6, juniorHigh: 3, highSchool: 3, university: 4 };
  const GRADE_STAGE_INDEX = {
    preK: 0,
    kinder1: 0, kinder2: 0, kinder3: 0,
    elem1: 1, elem2: 1, elem3: 1, elem4: 1, elem5: 1, elem6: 1,
    jhs1: 2, jhs2: 2, jhs3: 2,
    hs1: 3, hs2: 3, hs3: 3,
    univ1: 4, univ2: 4, univ3: 4, univ4: 4,
  };
  const GRADE_YEAR_WITHIN_STAGE = {
    preK: 1,
    kinder1: 1, kinder2: 2, kinder3: 3,
    elem1: 1, elem2: 2, elem3: 3, elem4: 4, elem5: 5, elem6: 6,
    jhs1: 1, jhs2: 2, jhs3: 3,
    hs1: 1, hs2: 2, hs3: 3,
    univ1: 1, univ2: 2, univ3: 3, univ4: 4,
  };

  const startStageIndex = GRADE_STAGE_INDEX[currentGrade];
  const yearWithinStage = currentGrade === 'preK' ? 1 : GRADE_YEAR_WITHIN_STAGE[currentGrade];

  const segments = [];
  let offset = 0;
  for (let i = startStageIndex; i < STAGE_ORDER.length; i++) {
    const stageKey = STAGE_ORDER[i];
    const fullDuration = STAGE_DURATION[stageKey];
    const years = i === startStageIndex ? fullDuration - yearWithinStage + 1 : fullDuration;
    segments.push({ key: stageKey, startOffset: offset, years });
    offset += years;
  }

  const STAGE_LABEL = { kindergarten: '幼稚園', elementary: '小学校', juniorHigh: '中学校', highSchool: '高校', university: '大学' };

  return segments.map(seg => {
    const yenSum = yearly.slice(seg.startOffset, seg.startOffset + seg.years).reduce((a, b) => a + b, 0);
    const annualMan = yenSum / seg.years / 10_000; // 万円/年（大学は残り年数分の平均、他は元々一定額）
    return {
      category: 'expense',
      subtype: 'education',
      name: `教育費(${childLabel}・${STAGE_LABEL[seg.key]})`,
      age: curParentAge + seg.startOffset,
      years: seg.years,
      amount: annualMan,
    };
  });
}

// ── 進路パターン ──
const PATTERNS = {
  A: {
    label: 'パターンA(オール公立中心)',
    stageSelections: { kindergarten: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'national' },
  },
  B: {
    label: 'パターンB(私立中心)',
    stageSelections: { kindergarten: 'private', elementary: 'private', juniorHigh: 'private', highSchool: 'private', university: 'privateArts' },
  },
  C: {
    label: 'パターンC(大学のみ私立・要因分解用)',
    stageSelections: { kindergarten: 'public', elementary: 'public', juniorHigh: 'public', highSchool: 'public', university: 'privateArts' },
  },
};

// 子供の現在の学年(38歳時点)。元の小説の大学費用イベント(子1:49-53歳、子2:52-56歳)から
// 誕生タイミングを逆算して一意に決まる値(子1:小学2年=elem2、子2:幼稚園年中=kinder2)。
// これで大学開始年齢が49歳/52歳と完全に一致することを確認済み。
const CHILD1_GRADE = 'elem2';
const CHILD2_GRADE = 'kinder2';

function fmt(v) { return Math.round(v).toLocaleString('ja-JP'); }

console.log('='.repeat(90));
console.log('ベース設定:中村夫婦シリーズ 第10話最終確定設定');
console.log('='.repeat(90));
console.log(`  プロファイル: ${PROFILE_PATH}`);
console.log(`  積立額: 翔太NISA${baseProfile.params.cNisa}万+特定${baseProfile.params.cTax}万=${baseProfile.params.cNisa + baseProfile.params.cTax}万円/年・美咲NISA${baseProfile.params.spNisaCon}万円/年(小説通り、補正なし)`);
console.log(`  翔太退職${baseProfile.params.retAge}歳・美咲退職${baseProfile.params.spRetAge}歳`);
console.log(`  子供1: 38歳時点で${CHILD1_GRADE}(小学2年) / 子供2: 38歳時点で${CHILD2_GRADE}(幼稚園年中) ※大学開始49歳/52歳から逆算した一意の値`);

const results = {};
const patternRunners = [];

for (const key of Object.keys(PATTERNS)) {
  const { label, stageSelections } = PATTERNS[key];
  console.log('\n' + '='.repeat(90));
  console.log(label);
  console.log('='.repeat(90));

  const child1Events = buildChildEducationEvents(CHILD1_GRADE, baseProfile.params.curAge, stageSelections, '子1');
  const child2Events = buildChildEducationEvents(CHILD2_GRADE, baseProfile.params.curAge, stageSelections, '子2');

  console.log('  子1のステージ別ライフイベント:');
  child1Events.forEach(ev => console.log(`    ${ev.name}: ${ev.age}歳〜${ev.years}年間、${ev.amount.toFixed(2)}万円/年`));
  console.log('  子2のステージ別ライフイベント:');
  child2Events.forEach(ev => console.log(`    ${ev.name}: ${ev.age}歳〜${ev.years}年間、${ev.amount.toFixed(2)}万円/年`));

  // 元の教育費イベント(education)だけを除外し、他の全イベント(住宅ローン・介護費・
  // 退職金×2・68歳生活費見直し)はそのまま残す。新しい教育費イベントを追加する。
  const nonEducationEvents = baseProfile.events.filter(ev => ev.subtype !== 'education');
  const events = [...nonEducationEvents, ...child1Events, ...child2Events];

  const p = profileToSimParams(baseProfile);
  const snaps = simulate(p, events, 'proportional');
  const a = analyze(snaps, p);

  const snap58 = snaps.find(s => s.age === baseProfile.params.retAge);
  const snap90 = snaps.find(s => s.age === 90);

  console.log(`\n  58歳時点資産: ${fmt(snap58.totalAssets)}万円`);
  console.log(`  90歳時点資産: ${fmt(snap90.totalAssets)}万円`);
  console.log(`  参考: FIRE達成年齢(安心定義)=${a.fA !== null ? a.fA + '歳' : '未達成'} / 資産寿命=${a.dA !== null ? a.dA + '歳で枯渇' : '枯渇なし'}`);

  results[key] = { asset58: snap58.totalAssets, asset90: snap90.totalAssets, fA: a.fA, dA: a.dA };
  patternRunners.push({ key, p, evs: events });
}

console.log('\n' + '='.repeat(90));
console.log(`3パターン共通のショック列でMC実行中 (N=${MC_N}、本番runMC()にshockOverridesを注入)...`);
console.log('='.repeat(90));
// 3パターンで同一のショック列を使うことで、教育費パターンの違いによる差と
// 乱数由来のノイズが混ざらないようにする(montecarlo.tsのCRN機構と同じ考え方を
// パターン間比較にも適用したもの。runMC()自体は本番のまま、shockOverridesとして
// 外部から注入するだけで、モンテカルロループ自体の再実装はしていない)。
const lifeEx = baseProfile.params.lifeEx || 90;
const mcYears = lifeEx - baseProfile.params.curAge + 1;
const sharedShocks = Array.from({ length: MC_N }, () =>
  Array.from({ length: mcYears }, () => randNorm(0, 1))
);
patternRunners.forEach(({ key, p, evs }) => {
  const mc = runMC(p, evs, ['proportional'], MC_N, sharedShocks);
  results[key].bankruptcyRate = mc.strategies.proportional.bankruptcyRate;
  console.log(`  ${PATTERNS[key].label}: MC破綻率 ${mc.strategies.proportional.bankruptcyRate.toFixed(1)}%`);
});

console.log('\n' + '='.repeat(90));
console.log('報告フォーマット');
console.log('='.repeat(90));
console.log(`\nベース設定:中村夫婦シリーズ 第10話最終確定設定`);
console.log(`積立額:翔太${baseProfile.params.cNisa + baseProfile.params.cTax}万円/年・美咲${baseProfile.params.spNisaCon}万円/年(小説通り、補正なし)`);

for (const key of Object.keys(PATTERNS)) {
  const r = results[key];
  console.log(`\n${PATTERNS[key].label}:`);
  console.log(`  58歳時点資産:${fmt(r.asset58)}万円`);
  console.log(`  90歳時点資産:${fmt(r.asset90)}万円`);
  console.log(`  MC破綻率:${r.bankruptcyRate.toFixed(1)}%`);
  console.log(`  (参考)FIRE達成年齢:${r.fA !== null ? r.fA + '歳' : '未達成'} / 資産寿命:${r.dA !== null ? r.dA + '歳' : '枯渇なし'}`);
}

console.log('\n比較:');
function d58(a, b) { return results[b].asset58 - results[a].asset58; }
function dRate(a, b) { return results[b].bankruptcyRate - results[a].bankruptcyRate; }
console.log(`  A→Bの差(全体):        58歳時点${fmt(d58('A','B'))}万円 / 破綻率${dRate('A','B') >= 0 ? '+' : ''}${dRate('A','B').toFixed(1)}pt`);
console.log(`  A→Cの差(大学要因のみ): 58歳時点${fmt(d58('A','C'))}万円 / 破綻率${dRate('A','C') >= 0 ? '+' : ''}${dRate('A','C').toFixed(1)}pt`);
console.log(`  C→Bの差(小中高要因):   58歳時点${fmt(d58('C','B'))}万円 / 破綻率${dRate('C','B') >= 0 ? '+' : ''}${dRate('C','B').toFixed(1)}pt`);

console.log('\n' + '='.repeat(90));
console.log('完了');
console.log('='.repeat(90));
