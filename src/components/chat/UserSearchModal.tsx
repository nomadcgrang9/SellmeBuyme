import { useState } from 'react';
import { X, Search, MessageCircle, User, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { createOrGetChatRoom } from '@/lib/supabase/chat';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserSearchResult {
  id: string;
  display_name: string | null;
  profile_image_url: string | null;
}

export default function UserSearchModal({ isOpen, onClose }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('검색어를 입력해주세요');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // user_profiles에서 display_name 또는 phone으로 검색
      const { data, error: searchError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, profile_image_url')
        .or(`display_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);

      if (searchError) throw searchError;

      if (!data || data.length === 0) {
        setError('검색 결과가 없습니다');
        setSearchResults([]);
        return;
      }

      setSearchResults(data.map(user => ({
        id: user.user_id,
        display_name: user.display_name,
        profile_image_url: user.profile_image_url
      })));
    } catch (err) {
      console.error('사용자 검색 실패:', err);
      setError('검색 중 오류가 발생했습니다');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const { data: roomId, error } = await createOrGetChatRoom({
        other_user_id: userId,
        context_type: undefined,
        context_card_id: undefined,
      });

      if (error || !roomId) {
        alert('채팅방을 생성할 수 없습니다');
        return;
      }

      window.location.href = `/chat/${roomId}`;
    } catch (err) {
      console.error('채팅 시작 오류:', err);
      alert('채팅을 시작할 수 없습니다');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">사용자 검색</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 검색창 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="사용자 이름 또는 전화번호 입력"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF]"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-[#68B2FF] text-white rounded-lg hover:bg-[#58A8FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? '검색중...' : '검색'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* 검색 결과 */}
        <div className="max-h-96 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  {user.profile_image_url ? (
                    <img
                      src={user.profile_image_url}
                      alt={user.display_name || '사용자'}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user.display_name || '이름 없음'}
                    </h3>
                  </div>
                  <MessageCircle className="w-5 h-5 text-[#68B2FF]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <UserPlus className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">
                {searchQuery ? '검색 결과가 없습니다' : '사용자 이름 또는 전화번호로 검색하세요'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
