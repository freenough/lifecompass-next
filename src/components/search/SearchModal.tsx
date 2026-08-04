'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { IconSearch } from '@tabler/icons-react';
import type { SearchIndexItem } from '@/app/search-index.json/route';
import { TOOLS } from '@/lib/toolMetadata';
import { withBasePath } from '@/lib/siteConfig';

const HISTORY_KEY = 'lifeCompassSearchHistory';
const HISTORY_MAX = 5;

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(query: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = loadHistory().filter((q) => q !== trimmed);
  current.push(trimmed);
  if (current.length > HISTORY_MAX) current.splice(0, current.length - HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(current));
}

const TYPE_ORDER: SearchIndexItem['type'][] = ['tool', 'blog', 'page'];
const TYPE_LABELS: Record<SearchIndexItem['type'], string> = {
  tool: 'ツール',
  blog: 'ブログ',
  page: 'ページ',
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [items, setItems] = useState<SearchIndexItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setFocusedIndex(-1);
    setHistory(loadHistory());
    inputRef.current?.focus();
    if (!items) {
      fetch(withBasePath('/search-index.json'))
        .then((res) => res.json())
        .then((data: SearchIndexItem[]) => setItems(data))
        .catch(() => setItems([]));
    }
  }, [open, items]);

  const fuse = useMemo(() => {
    if (!items) return null;
    return new Fuse(items, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'keywords', weight: 0.2 },
        { name: 'description', weight: 0.1 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [items]);

  const groupedResults = useMemo(() => {
    const groups: Record<SearchIndexItem['type'], SearchIndexItem[]> = { tool: [], blog: [], page: [] };
    if (query.trim() && fuse) {
      const flat = fuse.search(query).map((r) => r.item);
      flat.forEach((it) => groups[it.type].push(it));
    } else if (!query.trim() && items) {
      groups.tool = items.filter((it) => it.type === 'tool');
      groups.blog = items.filter((it) => it.type === 'blog' && it.featured === true);
    }
    return groups;
  }, [query, fuse, items]);

  const isSearching = query.trim() !== '';
  const combinedList = TYPE_ORDER.flatMap((t) => groupedResults[t]);

  // 0文字時に履歴がある間は「history系」、それ以外(検索結果・注目)は「result系」。
  // 両者は同時に描画されない(排他)ため、focusedIndexは常にどちらか一方のリストの
  // インデックスとして解釈できる(implementation_search_history_keyboard.md 2節)。
  const isHistoryMode = !isSearching && history.length > 0;
  const displayHistory = history.slice().reverse();
  const focusableCount = isHistoryMode ? displayHistory.length : combinedList.length;

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, combinedList.length);
  }, [combinedList.length]);

  const activate = (q: string) => {
    saveHistory(q);
    onClose();
  };

  const runHistoryQuery = (q: string) => {
    setQuery(q);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => (focusableCount === 0 ? -1 : (i + 1) % focusableCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => (focusableCount === 0 ? -1 : (i - 1 + focusableCount) % focusableCount));
    } else if (e.key === 'Enter') {
      if (focusedIndex < 0 || focusedIndex >= focusableCount) return;
      e.preventDefault();
      if (isHistoryMode) {
        runHistoryQuery(displayHistory[focusedIndex]);
      } else {
        itemRefs.current[focusedIndex]?.click();
      }
    }
  };

  if (!open) return null;

  let renderIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 sm:pt-28 px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col max-h-[70vh] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 shrink-0">
          <IconSearch size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="ブログ・ツール・ページを検索"
            className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isHistoryMode && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs text-slate-400">最近の検索</p>
              {displayHistory.map((q, idx) => {
                const isFocused = idx === focusedIndex;
                return (
                  <button
                    key={q}
                    type="button"
                    onMouseEnter={() => setFocusedIndex(idx)}
                    onClick={() => runHistoryQuery(q)}
                    className={`w-full flex items-center justify-between gap-2 text-left px-2 py-2 rounded-lg text-sm text-slate-600 transition-colors ${
                      isFocused ? 'bg-slate-50' : ''
                    }`}
                  >
                    <span className="truncate">{q}</span>
                    {isFocused && <span className="text-xs text-slate-400 shrink-0">Enterで検索</span>}
                  </button>
                );
              })}
            </div>
          )}

          {!isSearching && history.length === 0 && !items && (
            <p className="px-2 py-4 text-sm text-slate-400">読み込み中...</p>
          )}

          {!isSearching && history.length === 0 && items && (
            <p className="px-2 py-1 text-xs text-slate-400">注目</p>
          )}

          {(isSearching || (history.length === 0 && items)) &&
            TYPE_ORDER.map((type) => {
              const group = groupedResults[type];
              if (group.length === 0) return null;
              return (
                <div key={type} className="mb-2">
                  <h2 className="px-2 py-1 text-lg font-semibold text-slate-700 mb-1">{TYPE_LABELS[type]}</h2>
                  {group.map((it) => {
                    renderIndex += 1;
                    const idx = renderIndex;
                    const tool = it.type === 'tool' ? TOOLS.find((t) => t.href === it.url) : undefined;
                    const isFocused = idx === focusedIndex;
                    return (
                      <Link
                        key={it.url}
                        href={it.url}
                        ref={(el) => {
                          itemRefs.current[idx] = el;
                        }}
                        onMouseEnter={() => setFocusedIndex(idx)}
                        onClick={() => activate(query)}
                        className={`flex items-center justify-between gap-2 px-2 py-2 rounded-lg transition-colors ${
                          isFocused ? 'bg-slate-50' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {tool && <tool.Icon size={20} className="text-slate-500 shrink-0" />}
                          <span className="text-sm text-slate-800 truncate">{it.title}</span>
                        </span>
                        {isFocused && <span className="text-xs text-slate-400 shrink-0">Enterで開く</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

          {isSearching && combinedList.length === 0 && (
            <p className="px-2 py-4 text-sm text-slate-400">「{query}」に一致する結果がありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
