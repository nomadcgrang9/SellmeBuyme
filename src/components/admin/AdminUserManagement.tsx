import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type UserStatus = 'active' | 'suspended';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

interface KpiData {
  totalUsers: number;
  newLast7Days: number;
  todaySignups: number;
}

export default function AdminUserManagement() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'created_at' | 'updated_at'>('created_at');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [kpi, setKpi] = useState<KpiData>({ totalUsers: 0, newLast7Days: 0, todaySignups: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        setCurrentUserEmail(user.email || null);

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('roles')
          .eq('user_id', user.id)
          .single();

        if (profile?.roles && 'admin' === (profile.roles as string[])[0]) {
          setIsAdmin(true);
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // email 컬럼 제거 - 존재하지 않음
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, display_name, roles, status, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (profileError) {
          console.error('user_profiles 조회 실패:', profileError);
          setError(`조회 실패: ${profileError.message}`);
          return;
        }

        const userList: UserProfile[] = (profiles || []).map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          roles: p.roles,
          status: (p.status as UserStatus) || 'active',
          created_at: p.created_at,
          updated_at: p.updated_at
        }));

        setUsers(userList);

        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const newLast7Days = userList.filter((user) => {
          const joined = new Date(user.created_at);
          return joined >= sevenDaysAgo;
        }).length;

        const todaySignups = userList.filter((user) => {
          const joined = new Date(user.created_at);
          return joined >= todayStart;
        }).length;

        setKpi({
          totalUsers: userList.length,
          newLast7Days,
          todaySignups
        });
      } catch (err) {
        console.error('데이터 조회 중 오류:', err);
        setError('데이터 조회 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isLoggedIn]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    let filtered = users.filter((user) => {
      if (!keyword) return true;
      // display_name 또는 user_id로 검색
      const name = user.display_name?.toLowerCase() || '';
      const id = user.user_id.toLowerCase();
      return name.includes(keyword) || id.includes(keyword);
    });

    filtered = [...filtered].sort((a, b) => {
      const aDate = new Date(a[sortKey]);
      const bDate = new Date(b[sortKey]);
      return bDate.getTime() - aDate.getTime();
    });

    return filtered;
  }, [search, sortKey, users]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.user_id === selectedUserId) ?? null,
    [filteredUsers, selectedUserId]
  );

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    if (!isAdmin) {
      alert('관리자만 상태를 변경할 수 있습니다.');
      return;
    }

    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    try {
      setUpdatingStatus(true);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (updateError) {
        console.error('상태 변경 실패:', updateError);
        alert(`상태 변경 실패: ${updateError.message}`);
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, status: newStatus } : u
        )
      );
    } catch (err) {
      console.error('상태 변경 중 오류:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isLoggedIn && !loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-800 text-sm font-medium mb-2">로그인 필요</p>
        <p className="text-gray-600 text-sm">
          사용자 목록을 조회하려면 소셜 로그인이 필요합니다.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-red-600 text-sm font-medium mb-2">오류 발생</p>
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-600">
        <span className="font-medium">로그인:</span> {currentUserEmail || '-'} |
        <span className="font-medium ml-2">권한:</span> {isAdmin ? '관리자' : '조회만 가능'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">총 가입자</p>
          <p className="text-2xl font-bold text-gray-800">{kpi.totalUsers.toLocaleString()}명</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">7일 신규</p>
          <p className="text-2xl font-bold text-gray-800">+{kpi.newLast7Days.toLocaleString()}명</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">오늘 가입</p>
          <p className="text-2xl font-bold text-gray-800">+{kpi.todaySignups.toLocaleString()}명</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름으로 검색..."
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as 'created_at' | 'updated_at')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="created_at">가입일 최신순</option>
          <option value="updated_at">최근 수정순</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">사용자 목록</span>
            <span className="text-xs text-gray-500">총 {filteredUsers.length.toLocaleString()}명</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">이름</th>
                  <th className="px-4 py-2 font-medium">가입일</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">관리자</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400">
                      사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?.user_id === user.user_id;
                    return (
                      <tr
                        key={user.user_id}
                        className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : 'bg-white'
                          }`}
                        onClick={() => setSelectedUserId(user.user_id)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {user.display_name || user.user_id.slice(0, 8) + '...'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${user.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-red-50 text-red-700 border border-red-100'
                              }`}
                          >
                            {user.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.roles && 'admin' === (user.roles as string[])[0] ? (
                            <span className="text-blue-600 font-medium">Admin</span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {selectedUser ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">선택된 사용자</p>
                <p className="text-base font-semibold text-gray-800">
                  {selectedUser.display_name || selectedUser.user_id.slice(0, 12) + '...'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-500 mb-1">가입일</p>
                  <p className="text-gray-800">
                    {new Date(selectedUser.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">상태</p>
                  <p className={selectedUser.status === 'active' ? 'text-emerald-600' : 'text-red-600'}>
                    {selectedUser.status === 'active' ? '활성' : '비활성'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">ID</p>
                  <p className="text-gray-800 text-[10px] break-all">
                    {selectedUser.user_id}
                  </p>
                </div>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => handleToggleStatus(selectedUser.user_id, selectedUser.status)}
                  disabled={updatingStatus}
                  className={`w-full font-medium px-4 py-2 rounded-lg transition-colors ${selectedUser.status === 'active'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-[#3B82F6] text-white hover:bg-blue-600'
                    } disabled:opacity-50`}
                >
                  {updatingStatus
                    ? '처리 중...'
                    : selectedUser.status === 'active'
                      ? '비활성화'
                      : '활성화'}
                </button>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  수정 권한이 없습니다
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-gray-400 py-10">
              <p>왼쪽 목록에서 사용자를 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
