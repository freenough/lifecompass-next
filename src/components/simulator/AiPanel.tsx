'use client';

import { useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import type { AnalysisResult } from '@/lib/types';

const STORAGE_KEY = 'lc_gemini_apikey';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function buildPrompt(analysis: AnalysisResult, retAge: number, baseExp: number): string {
  const fmt = (v: number | null) => v == null ? '不明' : `${Math.round(v).toLocaleString()}万円`;
  const ageStr = (v: number | null) => v == null ? '不明' : `${v}歳`;
  return `あなたはFIRE専門のファイナンシャルプランナーです。以下のシミュレーション結果を分析し、課題・改善策・注意点を400字程度で解説してください。

【シミュレーション結果】
- 退職年齢: ${retAge}歳
- 目標生活費: ${fmt(baseExp)}/年
- FIREライン: ${fmt(baseExp * 25)}
- 終端資産: ${fmt(analysis.last)}
- 資産ピーク: ${fmt(analysis.pV)}（${ageStr(analysis.pA)}）
- FIRE達成（安心）: ${ageStr(analysis.fA)}
- 資産枯渇年齢: ${ageStr(analysis.dA)}
- 収支転換年齢: ${ageStr(analysis.breakEven)}

分析結果を日本語でわかりやすく解説してください。`;
}

export default function AiPanel() {
  const { analysis, profile, activeStrategies } = useSimulatorStore();
  const strategy = activeStrategies[0] ?? 'proportional';
  const a = analysis[strategy];

  const [apiKey, setApiKey]     = useState('');
  const [result, setResult]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showKey, setShowKey]   = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const saveKey = () => localStorage.setItem(STORAGE_KEY, apiKey);

  const run = async () => {
    if (!apiKey) { setError('APIキーを入力してください'); return; }
    saveKey();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const prompt = buildPrompt(a, profile.params.retAge, profile.params.baseExp);
      const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '結果を取得できませんでした';
      setResult(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const [open, setOpen] = useState(false);

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
      <div className="px-4 pb-4">
      <div className="flex gap-2 mb-3">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder="Gemini API キー"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-slate-500"
        />
        <button onClick={() => setShowKey(s => !s)} className="text-xs text-slate-400 px-2">
          {showKey ? '隠す' : '表示'}
        </button>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '分析中…' : '分析を生成'}
      </button>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
          {result}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
