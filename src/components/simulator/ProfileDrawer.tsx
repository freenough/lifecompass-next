'use client';

import { useState, useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { loadProfiles, saveProfile, deleteProfile, encodeProfileUrl, decodeProfileUrl } from '@/lib/storage';
import type { ProfileV3 } from '@/lib/profile';

interface ProfileDrawerProps {
  /** トリガーボタンの見た目を呼び出し元で差し替えるためのクラス。省略時は従来の見た目。 */
  triggerClassName?: string;
}

export default function ProfileDrawer({ triggerClassName }: ProfileDrawerProps) {
  const { profile, loadProfile } = useSimulatorStore();
  const [open, setOpen]         = useState(false);
  const [profiles, setProfiles] = useState<ProfileV3[]>([]);
  const [saveName, setSaveName] = useState('');
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    if (open) {
      setSaveName(profile.name || '');
      setProfiles(loadProfiles());
    }
  }, [open]);

  const handleSave = () => {
    const name = saveName.trim() || '名称なし';
    const existing = profiles.find(p => p.name === name);
    if (existing) {
      const confirmed = window.confirm(`「${name}」はすでに存在します。上書きしますか？`);
      if (!confirmed) return;
    }
    const id = existing ? existing.id : Date.now();
    const toSave: ProfileV3 = { ...profile, id, name };
    saveProfile(toSave);
    setProfiles(loadProfiles());
  };

  const isUpdate = profiles.some(p => p.name === saveName.trim() && saveName.trim() !== '');

  const handleDelete = (id: number) => {
    deleteProfile(id);
    setProfiles(loadProfiles());
  };

  const handleShare = () => {
    const encoded = encodeProfileUrl(profile);
    const url = `${window.location.origin}/simulator?s=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as ProfileV3;
        loadProfile(parsed);
        setOpen(false);
      } catch {
        alert('JSONの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifecompass_${profile.name || 'profile'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName ?? 'rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors'}
      >
        保存 / 読み込み
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-80 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-800">プロファイル管理</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2 mb-4">
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="プロファイル名を入力"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button onClick={handleSave} className="w-full rounded-lg bg-slate-800 py-2 text-sm text-white hover:bg-slate-700">
                  {isUpdate ? '上書き保存' : '新規保存'}
                </button>
                <button onClick={handleShare} className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  {copied ? 'コピーしました！' : 'URLで共有'}
                </button>
                <button onClick={handleExport} className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-50">JSONでエクスポート</button>
                <label className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 text-center hover:border-slate-400">
                  JSONをインポート
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>

              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">保存済みプロファイル</h3>
              {profiles.length === 0 && <p className="text-xs text-slate-400">保存済みプロファイルなし</p>}
              {profiles.map(pr => (
                <div key={pr.id} className="flex items-center justify-between border-b border-slate-100 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{pr.name || '名称なし'}</p>
                    <p className="text-[10px] text-slate-400">{pr.savedAt ? new Date(pr.savedAt).toLocaleDateString('ja-JP') : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { loadProfile(pr); setOpen(false); }} className="text-xs text-blue-600 hover:text-blue-800">読込</button>
                    <button onClick={() => handleDelete(pr.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
