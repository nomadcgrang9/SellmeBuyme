// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 사용자 검색 (새 채팅 시작)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useCallback, useRef } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { searchUsers } from '@/lib/supabase/chat';
import type { ChatSearchResult } from '@/lib/supabase/chat';

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  teacher: { label: '구직', cls: 'bg-sky-50 text-sky-600' },
  instructor: { label: '강사', cls: 'bg-amber-50 text-amber-600' },
  talent: { label: '인력', cls: 'bg-emerald-50 text-emerald-600' },
};

interface Props {
  onSelectUser: (userId: string) => void;
}

export default function ChatUserSearch({ onSelectUser }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const imgErrorIds = useRef(new Set<string>());
  const [, forceUpdate] = useState(0);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await searchUsers(q.trim());
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    <div className="px-4 py-2">
      {/* 검색 입력 */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="이름, 닉네임으로 검색"
          className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-400 focus:outline-none focus:border-gray-300"
        />
      </div>

      {/* 검색 결과 */}
      {query.trim().length >= 2 && (
        <div className="mt-2 max-h-48 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            </div>
          )}

          {!isSearching && results.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">검색 결과가 없습니다</p>
          )}

          {results.map((u) => {
            const badge = SOURCE_BADGE[u.source];
            return (
              <button
                key={u.user_id}
                onClick={() => onSelectUser(u.user_id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {u.profile_image_url && !imgErrorIds.current.has(u.user_id) ? (
                    <img
                      src={u.profile_image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => {
                        imgErrorIds.current.add(u.user_id);
                        forceUpdate((n) => n + 1);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                      {u.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-700 truncate">{u.display_name}</span>
                    {badge && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  {u.subtitle && (
                    <p className="text-[11px] text-gray-400 truncate">{u.subtitle}</p>
                  )}
                </div>
                <MessageCircle size={14} className="text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
