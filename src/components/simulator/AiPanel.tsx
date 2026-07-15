'use client';

import { useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { simulate, analyze } from '@/lib';
import { profileToSimParams } from '@/lib/profile';
import { STRATEGY_LABELS } from '@/components/simulator/AssetChart';
import { buildRetirementExtension } from '@/lib/improvement-search';
import type { MCResult, WithdrawalStrategy } from '@/lib/types';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_TEMPERATURE = 0.2;
const GEMINI_TIMEOUT_MS = 45000;
const STORAGE_KEY = 'geminiApiKey';

const DANGER_BANKRUPTCY = 15;
const WARNING_BANKRUPTCY = 5;
const DANGER_ASSET_MARGIN = 5;

function calcRiskLevel(
  bankruptcyRate: number | null,
  assetLifeYears: number | null,
  lifeExYears: number,
): 'good' | 'warning' | 'danger' {
  if (bankruptcyRate !== null && bankruptcyRate > DANGER_BANKRUPTCY) return 'danger';
  if (assetLifeYears !== null && assetLifeYears + DANGER_ASSET_MARGIN < lifeExYears) return 'danger';
  if (bankruptcyRate !== null && bankruptcyRate > WARNING_BANKRUPTCY) return 'warning';
  if (assetLifeYears !== null && assetLifeYears < lifeExYears) return 'warning';
  return 'good';
}

function buildBankruptcyRateLabel(r: number | null): string | null {
  if (r === null) return null;
  if (r === 0) return '全試行で枯渇なし（0%）';
  if (r < 1) return '1%未満の確率';
  const thresholds = [90, 80, 70, 60, 50, 40, 30, 20, 10];
  for (const t of thresholds) {
    if (r > t) return `${t / 10}割を超える確率`;
    if (r >= t - 5) return `約${t / 10}割の確率`;
  }
  return '1割未満の確率';
}

function buildAIPayload(
  strategy: WithdrawalStrategy,
  store: ReturnType<typeof useSimulatorStore.getState>,
) {
  const { profile, snaps, analysis, mcResult } = store;
  const p = profileToSimParams(profile);
  const events = profile.events;
  const snapList = snaps[strategy] ?? [];
  const a = analysis[strategy];

  // Key-age snapshots
  const rawAges = [p.curAge, p.retAge, p.penAge, 80, 90, p.lifeEx];
  const uniqueAges = [...new Set(rawAges)].sort((x, y) => x - y);
  const snapshots = uniqueAges
    .map(age => {
      const s = snapList.find(sn => sn.age === age);
      if (!s) return null;
      return {
        age: s.age,
        total: Math.round(s.totalAssets),
        income: Math.round(s.income),
        expense: Math.round(s.expense),
        cf: Math.round(s.cashFlow),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // MC data
  const mcStrat = (mcResult as MCResult | null)?.strategies[strategy] ?? null;
  const bankruptcyRate =
    mcStrat !== null ? Math.round(mcStrat.bankruptcyRate * 10) / 10 : null;
  const pctLen = mcStrat ? mcStrat.percentiles.p10.length : 0;

  // Risk level
  const assetLifeYears = a.dA !== null ? a.dA - p.curAge : null;
  const lifeExYears = p.lifeEx - p.curAge;
  const riskLevel = calcRiskLevel(bankruptcyRate, assetLifeYears, lifeExYears);

  // Improvements (synchronous re-simulation)
  const improvements: {
    type: string;
    label: string;
    finalAssetDelta: number;
    effectHint: string;
  }[] = [];

  // 1. Expense -10%
  const pExp = { ...p, baseExp: Math.round(p.baseExp * 0.9) };
  const aExp = analyze(simulate(pExp, events, strategy), pExp);
  const expDelta = Math.round(aExp.last - a.last);
  improvements.push({
    type: 'expense',
    label: `支出を10%削減した場合（月${Math.round(pExp.baseExp / 12)}万円）`,
    finalAssetDelta: expDelta,
    effectHint: `最終資産 +${expDelta.toLocaleString()}万円`,
  });

  // 2. RetAge +2
  if (p.curAge < p.retAge) {
    const { params: pRet, extraEvents: retExtraEvents } = buildRetirementExtension(p, 2);
    const aRet = analyze(simulate(pRet, [...events, ...retExtraEvents], strategy), pRet);
    const retDelta = Math.round(aRet.last - a.last);
    improvements.push({
      type: 'retirement',
      label: `退職を2年延ばした場合（${p.retAge + 2}歳退職）`,
      finalAssetDelta: retDelta,
      effectHint: `最終資産 +${retDelta.toLocaleString()}万円`,
    });
  }

  // 3. Saving: invest surplus cash
  const curSnap = snapList.find(s => s.age === p.curAge);
  if (curSnap && p.curAge < p.retAge) {
    const totalCon = p.acct.nisa.con + p.acct.ideco.con + p.acct.tax.con;
    const surplus = Math.max(0, Math.round(curSnap.cashFlow - totalCon));
    if (surplus >= 12) {
      const pSav = {
        ...p,
        acct: { ...p.acct, tax: { ...p.acct.tax, con: p.acct.tax.con + surplus } },
      };
      const aSav = analyze(simulate(pSav, events, strategy), pSav);
      const savDelta = Math.round(aSav.last - a.last);
      if (savDelta > 0) {
        improvements.push({
          type: 'saving',
          label: `余剰CF（${surplus}万円/年）を全額追加投資した場合`,
          finalAssetDelta: savDelta,
          effectHint: `最終資産 +${savDelta.toLocaleString()}万円`,
        });
      }
    }
  }

  // KPI
  const finalAssetsZero = a.dA !== null && a.dA >= p.lifeEx;
  const kpi = {
    assetLife: a.dA !== null ? a.dA - p.retAge : null,
    bankruptcyAge: a.dA !== null && a.dA < p.lifeEx ? a.dA : null,
    finalAssetsZero,
    finalAssetsZeroAge: finalAssetsZero && a.dA !== null ? a.dA - 1 : null,
    fireAge: a.fA,
    bankruptcyRate,
    mcEnabled: mcResult !== null,
    turningPointAge: a.breakEven,
    firstWithdrawalRate:
      a.withdrawalRate !== null
        ? Math.round((a.withdrawalRate ?? 0) * 10) / 10
        : null,
    finalAssets: Math.round(a.last),
    bankruptcyRateLabel: buildBankruptcyRateLabel(bankruptcyRate),
    percentiles:
      mcStrat && pctLen > 0
        ? {
            p10Final:    Math.round(mcStrat.percentiles.p10[pctLen - 1]),
            medianFinal: Math.round(mcStrat.percentiles.p50[pctLen - 1]),
            p90Final:    Math.round(mcStrat.percentiles.p90[pctLen - 1]),
          }
        : null,
  };

  return {
    params: {
      curAge:         p.curAge,
      retAge:         p.retAge,
      penAge:         p.penAge,
      lifeEx:         p.lifeEx,
      monthlyExpense: Math.round(p.baseExp / 12),
    },
    note: 'FIREラインは恒久生活費(baseExp)×25。必要資産ラインはその年の総支出×25で期間限定支出(住宅ローン・教育費等)を含む。両者が異なる場合はその旨をコメントに含めること。',
    kpi,
    riskLevel,
    snapshots,
    improvements,
  };
}

function buildPrompt(payload: ReturnType<typeof buildAIPayload>): string {
  const { kpi, riskLevel } = payload;
  const isDanger = riskLevel === 'danger';
  const isGood = riskLevel === 'good';
  const isGoodPerfect = isGood && kpi.bankruptcyRate === 0;

  return `あなたは資産運用シミュレーターの結果を解説するアシスタントです。
以下のJSON形式のシミュレーション結果を分析し、指定されたフォーマットで日本語で回答してください。

# このシミュレーターの世界観（必ず理解してから分析すること）
このシミュレーターは「積立期 → 取り崩し期」を前提として設計されている。
退職後は資産を取り崩しながら生活するため、以下は正常な挙動であり、リスクとして扱ってはならない。
- 退職後の資産減少
- 退職後のキャッシュフロー赤字
- 資産ピークが退職前後に発生すること

# リスク評価の優先順位
1. bankruptcyAge（資産枯渇年齢）：null でない場合は最優先でリスク言及
   - 総評での言及：bankruptcyAge と lifeEx の両方を使い、途中枯渇の事実を具体的な年齢で説明すること
   - bankruptcyAge が null かつ finalAssetsZero が true の場合：寿命時点で資産がほぼ枯渇することを説明すること。lifeEx の1年前まで持つという事実も含めること
2. bankruptcyRate（MC破綻率）：mcEnabled が true の場合のみ言及。null の場合は絶対に言及しない
   - 破綻率の表現基準：5%未満→低い、5〜15%→やや高い、15〜30%→高い、30%以上→非常に高い
3. finalAssets の余裕度：lifeEx 時点で極端に少ない場合（200万円未満）はリスクとして言及可
資産ピーク年齢や退職後赤字は、上記1〜3に該当しない限りリスクとして扱わない。

# 出力フォーマットの厳守ルール
- 入力として与えられた「# データ」セクションのJSON文字列を出力に含めないこと。分析結果のテキストのみを出力すること。
- コードブロック（\`\`\`）を使用しないこと。
- 出力フォーマットに記載されているセクション以外は絶対に追加しないこと。例：good時に【リスク】【改善案】を追加することは禁止。
- フォーマットに「（任意）」と書かれているセクションは、特筆すべき内容がない場合は省略すること。

# 強みのルール
- riskLevel が danger の場合：【強み】セクションを出力しないこと（禁止）。フォーマットに【強み】が含まれていても出力してはならない。
- riskLevel が good / warning の場合：genuine な強みを2点挙げること。一時的なFIREライン到達・資産ピーク年齢・一時的な資産増加は強みとして扱わないこと。
- 「〜可能性が高い」「〜見込みです」「〜維持できる」などの曖昧・推測表現は禁止。snapshots・kpiの具体的な数値（年齢・資産額・CF等）を使って根拠を示すこと。
- 【総評】で述べた内容を【強み】で繰り返さないこと。異なる観点・データから強みを述べること。

# 改善案のルール
- improvements に含まれる改善案のみ評価すること（新しい改善案を発明しないこと）
- 改善案は improvements 配列の順序を維持すること（並び替え禁止）
- 改善案は「最も優先」「次点」「第3位」などの順位付け表現を使わないこと
- riskLevel に応じて以下の軸で有力な改善案を1〜3個紹介すること：
  - good：finalAssetDelta（資産増加効果）を重視して評価
  - warning：finalAssetDelta と brDelta（破綻率改善）をバランス良く評価
  - danger：brDelta（破綻率改善効果）を最優先で評価
- 各改善案の effectHint フィールドをそのまま文末に引用すること。引用時は「effectHint:」というラベルを付けず、内容のみを「（」で括って末尾に付記すること
- effectHint の内容は末尾の（）内にのみ記載すること。文中で同じ数値・内容を言い換えて繰り返すことを禁止。
- 現状で資産寿命・破綻リスクともに問題がない場合は、改善案を「任意の追加改善」として控えめに記述すること
- riskLevel は変更禁止（与えられた値をそのまま使用すること）

# リスクのルール
- bankruptcyAge と lifeEx の両方が存在する場合、枯渇年齢と寿命時点での資金不足を1文で説明すること
- 総評で言及した内容をリスク欄で一字一句同じ表現で繰り返さないこと
- 箇条書きは最大2点に絞ること
- リスク1：bankruptcyAge または finalAssetsZero に基づく寿命時点での資金不足・長寿リスクへの耐性を説明すること
- リスク2：finalAssetsが極めて少ない場合（200万円未満）または中央値（p50）が0の場合、資産バッファがなく長寿化・追加支出への耐性が低い状態であることを説明すること

# データの単位と金額表記ルール
- kpi.finalAssets・kpi.percentiles（p10Final/medianFinal/p90Final）・snapshots の total/income/expense/cf・params.monthlyExpense はすべて「万円」単位
- 金額を文中に記載する場合：すべて「約X,XXX万円」形式の万円表記のみを使うこと
- 数値のカンマは桁区切り記号であり小数点ではない。例：73,190 は「約73,190万円」と読むこと
- 億円への換算・変換は禁止。「X億円」「X.X億円」という表現は使わないこと

# その他のルール
- 分析はすべて与えられたデータから読み取れる状態のみ説明すること
- リスク欄では現在の財務状態から生じる影響を説明してよい（例：資産バッファが薄いため長寿化への耐性が低い）
- ただし市場環境・景気・金利など運用環境の推測は禁止。「予期せぬ支出」「市場悪化」「想定外の事態」などの外部要因への言及は禁止
- 各項目は簡潔に（箇条書き1件あたり50文字以内）

# 出力フォーマット
【総評】
冒頭は必ず riskLevel に応じて「良好。」「注意。」「要改善。」のいずれかで開始すること。
- good の場合（計1〜2文）：${isGoodPerfect ? '{MCシミュレーション全試行で資産が維持されたこと、および資産計画の十分な余裕を自分の言葉で説明すること。「枯渇ゼロ」「全試行」などの数値的根拠を含めること。断言的・肯定的なトーンで記述。}' : '{高い確率で資産を維持できる見込みであることと、一部の厳しいシナリオでは資産が枯渇しうることを自分の言葉で説明すること。bankruptcyRateLabelを使わず「一部のシナリオ」などの表現でトーンを和らげること。}'}
- warning / danger の場合（必ず2文構成）：
  1文目：「基本シナリオでは、」で始めること。基本シナリオにおける資産推移の状況を説明する（確定論）。
    - bankruptcyAge が存在する場合（寿命前に枯渇）：途中枯渇の年齢と寿命時点まで資産が持たないことを説明すること。「枯渇」という表現はbankruptcyAgeが存在する場合のみ使うこと
    - bankruptcyAge が null かつ finalAssetsZero が true の場合（寿命時点でほぼ枯渇）：kpi.finalAssetsZeroAge の年齢まで資産は持つが寿命時点で資産がほぼ枯渇することを説明すること。「枯渇」は使わず「ほぼ枯渇」または「資産がほとんど残らない」と表現すること
    - どちらでもない場合：退職後の資産推移（取り崩し状況・最終資産の余裕度）を説明すること
  2文目：「確率的シミュレーションでは、{kpi.bankruptcyRateLabel}で資産が枯渇するリスクが示されています。」の形式で記載。bankruptcyRateLabelをそのまま使うこと（自分で計算・言い換えをしないこと）。

【確率的評価】
{MCシミュレーションの破綻率を評価。頻度表現は必ず kpi.bankruptcyRateLabel の文字列をそのまま使うこと（自分で「1割未満」「ほぼゼロ」などと言い換えることを禁止）。bankruptcyRateLabelが「全試行で枯渇なし（0%）」の場合は全試行で資産が維持されたと説明してよい。【総評】の文をそのままコピーしないこと。p10/中央値/p90の具体的数値を用いて破綻率の意味を補足的に説明すること}
{kpi.percentilesが存在する場合：p10/中央値/p90の最終資産を説明する。p10または中央値が0万円の場合は、中央値シナリオでも資産が枯渇する深刻さと、資産維持が好調な運用結果に依存している状況を説明すること}

${isDanger ? '' : `【強み】
・{強み1}
・{強み2}

`}${isGood ? `【留意点】（任意）
・{長寿化・大きな支出イベントなど、数値では表れにくいが将来起こりうる要因を1点のみ挙げること。現在のデータから読み取れる範囲に限定すること。特に懸念がなければこのセクションは省略すること}

【さらに伸ばすなら】（任意）
・{finalAssetDeltaが最大の改善案：施策の内容と効果を自分の言葉で1文説明した上で、effectHintをそのまま末尾の（）内に付記すること。「〜という選択肢もあります」「〜も考えられます」程度のトーンで。「すべき」「必須」などの強い表現は禁止}
・{finalAssetDeltaが2番目に大きい改善案：同様に説明。improvementsに2件以上ある場合は必ず2件出力すること}` : `【リスク】
・{リスク1：bankruptcyAgeまたはfinalAssetsZeroに基づき、寿命時点での資金不足・長寿リスクへの耐性をデータから説明すること}
・{リスク2：finalAssetsが極めて少ないまたは中央値が0の場合、資産バッファがなく長寿化・追加支出への耐性が低い状態をデータから説明すること。外部要因への言及は禁止}

【改善案】
・{有力な改善案1：順位付けせず内容を説明。effectHintをそのまま末尾に付記}
・{有力な改善案2：同様に説明（存在すれば）}
・{有力な改善案3：同様に説明（存在すれば）}`}

# データ
${JSON.stringify(payload, null, 2)}

# percentiles（万円）の読み方（上記JSONの数値をそのまま万円として使うこと）
${
    payload.kpi.percentiles
      ? `- p10（下位10%）最終資産: ${payload.kpi.percentiles.p10Final}万円
- 中央値（p50）最終資産: ${payload.kpi.percentiles.medianFinal}万円
- p90（上位10%）最終資産: ${payload.kpi.percentiles.p90Final}万円
※これらの数値はそのまま「万円」単位。例：${payload.kpi.percentiles.medianFinal}万円 → 「約${payload.kpi.percentiles.medianFinal.toLocaleString()}万円」と表記すること`
      : '- percentilesデータなし（MCシミュレーション未実行）'
  }`;
}

export default function AiPanel() {
  const store = useSimulatorStore();
  const { mcResult, mcError, isMcRunning, runMonteCarlo, analysis, displayStrategy } = store;
  const strategy = (displayStrategy ?? 'proportional') as WithdrawalStrategy;
  const a = analysis[strategy];

  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState<string | null>(null);
  // 生成済みresultがどの表示戦略を基準にしたものかを記録する。表示戦略が
  // その後切り替わった場合、resultは古い基準のまま残るため、strategyとの
  // 不一致を検知して「古い可能性がある」旨の案内を出す。
  const [resultStrategy, setResultStrategy] = useState<WithdrawalStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const saveKey = () => {
    localStorage.setItem(STORAGE_KEY, apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const run = async () => {
    const key = apiKey.trim() || localStorage.getItem(STORAGE_KEY) || '';
    if (!key) { setError('Gemini APIキーを入力してください'); return; }
    if (!a) { setError('シミュレーション結果がありません'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = buildAIPayload(strategy, useSimulatorStore.getState());
      const promptText = buildPrompt(payload);

      const MAX_RETRY = 3;
      const RETRY_DELAYS = [0, 5000, 15000];
      let res: Response | undefined;

      for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
        if (RETRY_DELAYS[attempt] > 0) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        }
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
        try {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: GEMINI_TEMPERATURE },
              }),
            },
          );
          clearTimeout(tid);
          if ((res.status === 503 || res.status === 429) && attempt < MAX_RETRY - 1) continue;
          break;
        } catch (e) {
          clearTimeout(tid);
          if (attempt < MAX_RETRY - 1) continue;
          throw e;
        }
      }

      if (!res) throw new Error('リクエストに失敗しました');
      if (!res.ok) {
        if (res.status === 401) throw new Error('APIキーが無効です');
        if (res.status === 429) throw new Error('レート制限に達しました。しばらく待ってから再試行してください');
        throw new Error(`生成に失敗しました（エラーコード: ${res.status}）`);
      }

      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('生成に失敗しました。再試行してください');
      setResult(text);
      setResultStrategy(strategy);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.name === 'AbortError'
            ? '生成に失敗しました。再試行してください（タイムアウト）'
            : e.message
          : '生成に失敗しました。再試行してください';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const hasApiKey = !!apiKey.trim();
  const mcReady = mcResult !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>AI分析（Gemini）</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* API key input */}
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Gemini API Key (AIza...)"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-slate-500"
            />
            <button
              onClick={saveKey}
              className="text-xs text-slate-600 border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {saved ? '保存済' : '保存'}
            </button>
          </div>

          {!hasApiKey && (
            <p className="text-xs text-slate-400 leading-relaxed">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-600"
              >
                Google AI Studio
              </a>{' '}
              でAPIキーを取得してください（無料）。キーはこの端末にのみ保存され、サーバーには送信されません。
            </p>
          )}

          {/* MC gate */}
          {!mcReady ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-2">
              <p>破綻確率を含む精度の高い分析のため、先にMCシミュレーションを実行してください。</p>
              <button
                onClick={() => runMonteCarlo()}
                disabled={isMcRunning}
                className="rounded bg-slate-700 text-white px-3 py-1.5 text-xs hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                {isMcRunning ? '実行中…' : '1,000試行を実行'}
              </button>
            </div>
          ) : (
            <button
              onClick={run}
              disabled={loading || !hasApiKey}
              className="w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '分析中…（最大45秒）' : '分析を生成'}
            </button>
          )}

          {(error || mcError) && <p className="text-xs text-red-600">{error || mcError}</p>}

          {result && resultStrategy != null && resultStrategy !== strategy && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
              表示戦略が「{STRATEGY_LABELS[resultStrategy] ?? resultStrategy}」から「{STRATEGY_LABELS[strategy] ?? strategy}」に変更されました。この分析結果は古い可能性があります。最新の内容にするには再実行してください。
            </p>
          )}

          {result && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {result}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
