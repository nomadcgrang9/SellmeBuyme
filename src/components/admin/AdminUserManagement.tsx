import { useEffect, useMemo, useState } from 'react';
import StatCard from '@/components/admin/dashboard/StatCard';
import { supabase } from '@/lib/supabase/client';

type AdminUserRole = '교사' | '강사' | '학교행정' | '업체';

type AdminUserStatus = '정상' | '휴면' | '비활성' | '차단';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  teacherLevel?: string;
  regions: string[];
  lastLoginAt: string;
  joinedAt: string;
  status: AdminUserStatus;
  isAdmin: boolean;
  intro?: string;
  preferredJobTypes?: string[];
  preferredSubjects?: string[];
  profileCompletion?: number;
}


type RoleFilter = '전체' | AdminUserRole;

type SortKey = 'joinedAt' | 'lastLoginAt';

type RegionFilter = string; // 지역 필터

export default function AdminUserManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('전체');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('전체');
  const [sortKey, setSortKey] = useState<SortKey>('joinedAt');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedFilters, setExpandedFilters] = useState<{ role: boolean; region: boolean }>({
    role: true,
    region: false
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [kpi, setKpi] = useState({ totalUsers: 0, newLast7Days: 0, activeLast30Days: 0 });
  const [loading, setLoading] = useState(true);

  // DB에서 사용자 데이터 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // auth.users에서 모든 가입자 조회
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        // user_profiles에서 프로필 정보 조회
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*');
        if (profileError) throw profileError;

        // user_activity_logs에서 최근 활동 조회
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: activityLogs, error: activityError } = await supabase
          .from('user_activity_logs')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo.toISOString());
        if (activityError) throw activityError;

        const activeUserIds = new Set(activityLogs?.map(log => log.user_id) || []);

        // 데이터 병합
        const mergedUsers: AdminUser[] = (authUsers?.users || []).map(authUser => {
          const profile = profiles?.find(p => p.user_id === authUser.id);
          const isActive = activeUserIds.has(authUser.id);

          return {
            id: authUser.id,
            name: profile?.display_name || authUser.email?.split('@')[0] || '미설정',
            email: authUser.email || '',
            role: (profile?.roles?.[0] || '강사') as AdminUserRole,
            teacherLevel: profile?.teacher_level || undefined,
            regions: profile?.interest_regions || [],
            lastLoginAt: authUser.last_sign_in_at || authUser.created_at,
            joinedAt: authUser.created_at,
            status: isActive ? '정상' : '휴면',
            isAdmin: profile?.roles?.includes('admin') || false,
            intro: profile?.intro || undefined,
            preferredJobTypes: profile?.preferred_job_types || undefined,
            preferredSubjects: profile?.preferred_subjects || undefined,
            profileCompletion: profile?.profile_completion || 0
          };
        });

        setUsers(mergedUsers);

        // KPI 계산
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newLast7Days = mergedUsers.filter(user => {
          const joined = new Date(user.joinedAt);
          return joined >= sevenDaysAgo;
        }).length;

        const activeLast30Days = mergedUsers.filter(user => activeUserIds.has(user.id)).length;

        setKpi({
          totalUsers: mergedUsers.length,
          newLast7Days,
          activeLast30Days
        });
      } catch (error) {
        console.error('사용자 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((user) => {
      user.regions.forEach((region) => {
        set.add(region);
      });
    });
    return Array.from(set);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    let filtered = users.filter((user) => {
      // 역할 필터
      if (roleFilter !== '전체' && user.role !== roleFilter) {
        return false;
      }

      // 지역 필터
      if (regionFilter !== '전체' && !user.regions.includes(regionFilter)) {
        return false;
      }

      // 검색어 필터
      if (!keyword) {
        return true;
      }

      const targets = [
        user.name,
        user.email,
        user.teacherLevel ?? '',
        user.regions.join(', ')
      ];

      return targets.some((value) => value.toLowerCase().includes(keyword));
    });

    filtered = [...filtered].sort((a, b) => {
      const aDate = new Date(a[sortKey]);
      const bDate = new Date(b[sortKey]);
      return bDate.getTime() - aDate.getTime();
    });

    return filtered;
  }, [search, roleFilter, regionFilter, sortKey, users]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null,
    [filteredUsers, selectedUserId]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="전체 가입자" value={`${kpi.totalUsers.toLocaleString()}명`} />
        <StatCard icon="🆕" label="최근 7일 신규 가입" value={`${kpi.newLast7Days.toLocaleString()}명`} />
        <StatCard icon="📅" label="최근 30일 활성 사용자" value={`${kpi.activeLast30Days.toLocaleString()}명`} />
      </div>

      {/* 검색창 */}
      <div className="flex-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 이메일, 학교급, 지역으로 검색..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* 필터 섹션 - 세로 정렬 */}
      <div className="flex flex-col gap-3">
        {/* 역할 필터 */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            onClick={() => setExpandedFilters({ ...expandedFilters, role: !expandedFilters.role })}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-medium text-slate-800">역할</span>
            <span className="text-slate-400">
              {expandedFilters.role ? '▼' : '▶'}
            </span>
          </button>
          {expandedFilters.role && (
            <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
              {(['전체', '교사', '강사', '학교행정', '업체'] as RoleFilter[]).map((role) => {
                const isActive = roleFilter === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 지역 필터 */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            onClick={() => setExpandedFilters({ ...expandedFilters, region: !expandedFilters.region })}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-medium text-slate-800">지역</span>
            <span className="text-slate-400">
              {expandedFilters.region ? '▼' : '▶'}
            </span>
          </button>
          {expandedFilters.region && (
            <div className="border-t border-slate-100 px-4 py-3">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="전체">전체 지역</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 정렬 기준 */}
        <div className="border border-slate-200 rounded-lg bg-white px-4 py-3">
          <label className="text-xs text-slate-600 block mb-2">정렬 기준</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="joinedAt">가입일 최신순</option>
            <option value="lastLoginAt">최근 로그인 순</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">사용자 목록</div>
            <div className="text-xs text-slate-400">
              총 {filteredUsers.length.toLocaleString()}명
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">이름</th>
                  <th className="px-4 py-2 font-medium">이메일</th>
                  <th className="px-4 py-2 font-medium">역할</th>
                  <th className="px-4 py-2 font-medium">학교급/자격</th>
                  <th className="px-4 py-2 font-medium">선호 지역</th>
                  <th className="px-4 py-2 font-medium">최근 로그인</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">관리자</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-xs text-slate-400"
                    >
                      검색 조건에 해당하는 사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    return (
                      <tr
                        key={user.id}
                        className={`cursor-pointer border-t border-slate-100 text-[11px] hover:bg-slate-50 ${
                          isSelected ? 'bg-primary/5' : 'bg-white'
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <td className="px-4 py-2 text-slate-900 font-medium">
                          {user.name}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-2 text-slate-700">
                          {user.role}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {user.teacherLevel ?? '-'}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {user.regions.join(', ')}
                        </td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {new Date(user.lastLoginAt).toLocaleString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              user.status === '정상'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : user.status === '휴면'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : user.status === '비활성'
                                ? 'bg-slate-50 text-slate-600 border border-slate-200'
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          {selectedUser ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">선택한 사용자</div>
                  <div className="text-base font-semibold text-slate-900">
                    {selectedUser.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedUser.email}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                    {selectedUser.role}
                  </span>
                  {selectedUser.teacherLevel && (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                      {selectedUser.teacherLevel}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 mb-1">가입일</div>
                  <div className="text-slate-800">
                    {new Date(selectedUser.joinedAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">최근 로그인</div>
                  <div className="text-slate-800">
                    {new Date(selectedUser.lastLoginAt).toLocaleString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">프로필 완성도</div>
                  <div className="text-slate-800">{selectedUser.profileCompletion}%</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">선호 지역</div>
                  <div className="text-slate-800">
                    {selectedUser.regions.join(', ')}
                  </div>
                </div>
              </div>

              {selectedUser.preferredJobTypes && selectedUser.preferredJobTypes.length > 0 && (
                <div className="text-xs">
                  <div className="text-slate-500 mb-1">선호 직종</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.preferredJobTypes.map((job) => (
                      <span
                        key={job}
                        className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {job}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.preferredSubjects && selectedUser.preferredSubjects.length > 0 && (
                <div className="text-xs">
                  <div className="text-slate-500 mb-1">전문 분야 / 과목</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.preferredSubjects.map((subject) => (
                      <span
                        key={subject}
                        className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.intro && (
                <div className="text-xs">
                  <div className="text-slate-500 mb-1">자기소개</div>
                  <div className="whitespace-pre-line rounded-md bg-slate-50 px-3 py-2 text-slate-800">
                    {selectedUser.intro}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400">
              <div className="mb-2 text-lg">👈</div>
              <div>왼쪽 목록에서 사용자를 선택해 주세요.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
