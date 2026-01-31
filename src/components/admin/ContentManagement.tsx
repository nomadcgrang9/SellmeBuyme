import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, MoreVertical, X, Eye, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { TeacherMarker, PrimaryCategory } from '@/types/markers';
import type { InstructorMarker, InstructorSpecialty } from '@/types/instructorMarkers';

// ============================================
// 타입 정의
// ============================================
interface JobPosting {
  id: string;
  user_id: string | null;
  organization: string;
  title: string;
  content: string | null;
  primary_category: string | null;
  sub_categories: string[] | null;
  school_level: string | null;
  deadline: string | null;
  is_urgent: boolean;
  work_period: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  attachment_url: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

type ContentType = 'jobs' | 'teachers' | 'instructors';
type ContentStatus = 'all' | 'active' | 'inactive';

interface ContentFilters {
  search: string;
  status: ContentStatus;
  category: string;
}

// ============================================
// 유틸 함수
// ============================================
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState<ContentType>('jobs');
  const [filters, setFilters] = useState<ContentFilters>({
    search: '',
    status: 'all',
    category: ''
  });

  // 데이터 상태
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [teachers, setTeachers] = useState<TeacherMarker[]>([]);
  const [instructors, setInstructors] = useState<InstructorMarker[]>([]);

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JobPosting | TeacherMarker | InstructorMarker | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // 카운트
  const [counts, setCounts] = useState({ jobs: 0, teachers: 0, instructors: 0 });

  // ============================================
  // 데이터 로드
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 공고 로드 (사용자 등록만)
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('source', 'user_posted')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // 구직자 로드
      const { data: teachersData, error: teachersError } = await supabase
        .from('teacher_markers')
        .select('*')
        .order('created_at', { ascending: false });

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // 강사 로드
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructor_markers')
        .select('*')
        .order('created_at', { ascending: false });

      if (instructorsError) throw instructorsError;
      setInstructors(instructorsData || []);

      // 카운트 업데이트
      setCounts({
        jobs: jobsData?.length || 0,
        teachers: teachersData?.length || 0,
        instructors: instructorsData?.length || 0
      });

    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshToken]);

  // ============================================
  // 필터링
  // ============================================
  const getFilteredData = useCallback(() => {
    let data: (JobPosting | TeacherMarker | InstructorMarker)[] = [];

    if (activeTab === 'jobs') {
      data = jobs;
    } else if (activeTab === 'teachers') {
      data = teachers;
    } else {
      data = instructors;
    }

    // 검색 필터
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter(item => {
        if (activeTab === 'jobs') {
          const job = item as JobPosting;
          return (
            job.title?.toLowerCase().includes(searchLower) ||
            job.organization?.toLowerCase().includes(searchLower)
          );
        } else if (activeTab === 'teachers') {
          const teacher = item as TeacherMarker;
          return (
            teacher.nickname?.toLowerCase().includes(searchLower) ||
            teacher.email?.toLowerCase().includes(searchLower)
          );
        } else {
          const instructor = item as InstructorMarker;
          return (
            instructor.display_name?.toLowerCase().includes(searchLower) ||
            instructor.email?.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // 상태 필터
    if (filters.status !== 'all') {
      data = data.filter(item => {
        if (activeTab === 'jobs') {
          // 공고는 마감일 기준
          const job = item as JobPosting;
          const isActive = !job.deadline || new Date(job.deadline) >= new Date();
          return filters.status === 'active' ? isActive : !isActive;
        } else {
          // 구직자/강사는 is_active 기준
          const marker = item as TeacherMarker | InstructorMarker;
          return filters.status === 'active' ? marker.is_active : !marker.is_active;
        }
      });
    }

    return data;
  }, [activeTab, jobs, teachers, instructors, filters]);

  // ============================================
  // 액션 핸들러
  // ============================================
  const handleView = (item: JobPosting | TeacherMarker | InstructorMarker) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    setActionMenuId(null);
  };

  const handleToggleActive = async (item: TeacherMarker | InstructorMarker) => {
    const table = activeTab === 'teachers' ? 'teacher_markers' : 'instructor_markers';
    const newStatus = !item.is_active;

    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: newStatus })
        .eq('id', item.id);

      if (error) throw error;
      setRefreshToken(t => t + 1);
    } catch (err) {
      console.error('상태 변경 실패:', err);
      alert('상태 변경에 실패했습니다.');
    }
    setActionMenuId(null);
  };

  const handleDelete = async (item: JobPosting | TeacherMarker | InstructorMarker) => {
    const confirmMsg = activeTab === 'jobs'
      ? '이 공고를 삭제하시겠습니까?'
      : activeTab === 'teachers'
        ? '이 구직자 정보를 삭제하시겠습니까?'
        : '이 강사 정보를 삭제하시겠습니까?';

    if (!window.confirm(confirmMsg)) return;

    const table = activeTab === 'jobs'
      ? 'job_postings'
      : activeTab === 'teachers'
        ? 'teacher_markers'
        : 'instructor_markers';

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setRefreshToken(t => t + 1);
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다. 권한을 확인해주세요.');
    }
    setActionMenuId(null);
  };

  // ============================================
  // 렌더링
  // ============================================
  const filteredData = getFilteredData();

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${
            activeTab === 'jobs'
              ? 'text-[#3B82F6] font-medium border-[#3B82F6]'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          공고 ({counts.jobs})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${
            activeTab === 'teachers'
              ? 'text-[#3B82F6] font-medium border-[#3B82F6]'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          구직 ({counts.teachers})
        </button>
        <button
          onClick={() => setActiveTab('instructors')}
          className={`px-4 py-2 text-sm border-b-2 transition-colors ${
            activeTab === 'instructors'
              ? 'text-[#3B82F6] font-medium border-[#3B82F6]'
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          강사 ({counts.instructors})
        </button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="검색어 입력..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                       placeholder:text-gray-400 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as ContentStatus }))}
          className="px-3 py-2 text-sm rounded-lg border bg-white border-gray-200
                     text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>

        <button
          onClick={() => setRefreshToken(t => t + 1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          {activeTab === 'jobs' && (
            <div className="grid grid-cols-7 gap-4 text-xs font-medium text-gray-600">
              <span className="col-span-2">공고제목</span>
              <span>조직명</span>
              <span>지역</span>
              <span>마감일</span>
              <span>상태</span>
              <span className="text-right">관리</span>
            </div>
          )}
          {activeTab === 'teachers' && (
            <div className="grid grid-cols-7 gap-4 text-xs font-medium text-gray-600">
              <span>닉네임</span>
              <span className="col-span-2">이메일</span>
              <span>분류</span>
              <span>등록일</span>
              <span>상태</span>
              <span className="text-right">관리</span>
            </div>
          )}
          {activeTab === 'instructors' && (
            <div className="grid grid-cols-7 gap-4 text-xs font-medium text-gray-600">
              <span>닉네임</span>
              <span className="col-span-2">전문분야</span>
              <span>대상</span>
              <span>등록일</span>
              <span>상태</span>
              <span className="text-right">관리</span>
            </div>
          )}
        </div>

        {/* 테이블 본문 */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              로딩 중...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              데이터가 없습니다.
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="relative">
                {/* 공고 행 */}
                {activeTab === 'jobs' && (
                  <div className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
                    <span className="col-span-2 text-sm text-gray-800 truncate">
                      {(item as JobPosting).is_urgent && (
                        <span className="text-xs font-bold text-red-600 mr-1">긴급</span>
                      )}
                      {(item as JobPosting).title}
                    </span>
                    <span className="text-sm text-gray-600 truncate">{(item as JobPosting).organization}</span>
                    <span className="text-sm text-gray-500 truncate">{(item as JobPosting).location || '-'}</span>
                    <span className="text-sm text-gray-500">{(item as JobPosting).deadline ? formatDate((item as JobPosting).deadline!) : '-'}</span>
                    <span className={`text-xs font-medium ${
                      !(item as JobPosting).deadline || new Date((item as JobPosting).deadline!) >= new Date()
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}>
                      {!(item as JobPosting).deadline || new Date((item as JobPosting).deadline!) >= new Date() ? '활성' : '마감'}
                    </span>
                    <div className="text-right">
                      <ActionMenu
                        itemId={item.id}
                        isOpen={actionMenuId === item.id}
                        onToggle={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                        onView={() => handleView(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    </div>
                  </div>
                )}

                {/* 구직자 행 */}
                {activeTab === 'teachers' && (
                  <div className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
                    <span className="text-sm text-gray-800 truncate">{(item as TeacherMarker).nickname}</span>
                    <span className="col-span-2 text-sm text-gray-500 truncate">{maskEmail((item as TeacherMarker).email)}</span>
                    <span className="text-sm text-gray-600 truncate">{(item as TeacherMarker).primary_category || '-'}</span>
                    <span className="text-sm text-gray-500">{formatDate((item as TeacherMarker).created_at)}</span>
                    <span className={`text-xs font-medium ${(item as TeacherMarker).is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {(item as TeacherMarker).is_active ? '활성' : '비활성'}
                    </span>
                    <div className="text-right">
                      <ActionMenu
                        itemId={item.id}
                        isOpen={actionMenuId === item.id}
                        onToggle={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                        onView={() => handleView(item)}
                        onToggleActive={() => handleToggleActive(item as TeacherMarker)}
                        onDelete={() => handleDelete(item)}
                        isActive={(item as TeacherMarker).is_active}
                      />
                    </div>
                  </div>
                )}

                {/* 강사 행 */}
                {activeTab === 'instructors' && (
                  <div className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
                    <span className="text-sm text-gray-800 truncate">{(item as InstructorMarker).display_name}</span>
                    <span className="col-span-2 text-sm text-gray-600 truncate">
                      {(item as InstructorMarker).specialties?.slice(0, 2).join(', ') || '-'}
                      {((item as InstructorMarker).specialties?.length || 0) > 2 && ' ...'}
                    </span>
                    <span className="text-sm text-gray-500 truncate">
                      {(item as InstructorMarker).target_audience?.join(', ') || '-'}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate((item as InstructorMarker).created_at)}</span>
                    <span className={`text-xs font-medium ${(item as InstructorMarker).is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {(item as InstructorMarker).is_active ? '활성' : '비활성'}
                    </span>
                    <div className="text-right">
                      <ActionMenu
                        itemId={item.id}
                        isOpen={actionMenuId === item.id}
                        onToggle={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                        onView={() => handleView(item)}
                        onToggleActive={() => handleToggleActive(item as InstructorMarker)}
                        onDelete={() => handleDelete(item)}
                        isActive={(item as InstructorMarker).is_active}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 결과 카운트 */}
      <div className="text-sm text-gray-500 text-right">
        총 {filteredData.length}건
      </div>

      {/* 상세 보기 모달 */}
      {showDetailModal && selectedItem && (
        <DetailModal
          item={selectedItem}
          type={activeTab}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedItem(null);
          }}
          onToggleActive={activeTab !== 'jobs' ? () => handleToggleActive(selectedItem as TeacherMarker | InstructorMarker) : undefined}
          onDelete={() => handleDelete(selectedItem)}
        />
      )}
    </div>
  );
}

// ============================================
// 액션 메뉴 컴포넌트
// ============================================
interface ActionMenuProps {
  itemId: string;
  isOpen: boolean;
  onToggle: () => void;
  onView: () => void;
  onToggleActive?: () => void;
  onDelete: () => void;
  isActive?: boolean;
}

function ActionMenu({ isOpen, onToggle, onView, onToggleActive, onDelete, isActive }: ActionMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
      >
        <MoreVertical size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20">
          <button
            onClick={onView}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye size={14} />
            상세보기
          </button>
          {onToggleActive && (
            <button
              onClick={onToggleActive}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 size={14} />
              {isActive ? '비활성화' : '활성화'}
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// 상세 보기 모달 컴포넌트
// ============================================
interface DetailModalProps {
  item: JobPosting | TeacherMarker | InstructorMarker;
  type: ContentType;
  onClose: () => void;
  onToggleActive?: () => void;
  onDelete: () => void;
}

function DetailModal({ item, type, onClose, onToggleActive, onDelete }: DetailModalProps) {
  const renderJobDetail = (job: JobPosting) => (
    <>
      <Section title="기본 정보">
        <InfoRow label="공고제목" value={job.title} />
        <InfoRow label="조직명" value={job.organization} />
        <InfoRow label="등록자 ID" value={job.user_id || '-'} />
        <InfoRow label="등록일" value={formatDate(job.created_at)} />
      </Section>

      <Section title="분류 정보">
        <InfoRow label="1차 분류" value={job.primary_category || '-'} />
        <InfoRow label="2차 분류" value={job.sub_categories?.join(', ') || '-'} />
        <InfoRow label="학교급" value={job.school_level || '-'} />
      </Section>

      <Section title="모집 조건">
        <InfoRow label="마감일" value={job.deadline ? formatDate(job.deadline) : '-'} />
        <InfoRow label="긴급" value={job.is_urgent ? '긴급공고' : '-'} highlight={job.is_urgent} />
        <InfoRow label="근무기간" value={job.work_period || '-'} />
      </Section>

      <Section title="상세 내용">
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {job.content || '내용 없음'}
        </div>
      </Section>

      <Section title="연락처 / 첨부">
        <InfoRow label="연락처" value={job.contact_phone || '-'} />
        {job.attachment_url && (
          <InfoRow
            label="첨부파일"
            value={
              <a href={job.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                다운로드
              </a>
            }
          />
        )}
      </Section>

      <Section title="위치 정보">
        <InfoRow label="주소" value={job.location || '-'} />
        <InfoRow label="좌표" value={job.latitude && job.longitude ? `${job.latitude}, ${job.longitude}` : '-'} />
      </Section>
    </>
  );

  const renderTeacherDetail = (teacher: TeacherMarker) => (
    <>
      <Section title="기본 정보">
        <div className="flex items-center gap-4 mb-4">
          {teacher.profile_image_url ? (
            <img src={teacher.profile_image_url} alt="프로필" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
              ?
            </div>
          )}
          <div>
            <p className="text-lg font-medium text-gray-800">{teacher.nickname}</p>
            <p className="text-sm text-gray-500">{maskEmail(teacher.email)}</p>
            <p className="text-xs text-gray-400">등록일: {formatDate(teacher.created_at)}</p>
          </div>
        </div>
      </Section>

      <Section title="분류 정보">
        <InfoRow label="1차 분류" value={teacher.primary_category || '-'} />
        <InfoRow label="2차 분류" value={teacher.sub_categories?.join(', ') || '-'} />
        <InfoRow label="희망 학교급" value={teacher.preferred_school_levels?.join(', ') || '-'} />
      </Section>

      <Section title="활동 정보">
        <InfoRow label="경력" value={teacher.experience_years || '-'} />
        <InfoRow label="활동가능 지역" value={teacher.available_regions?.join(', ') || '-'} />
      </Section>

      <Section title="자기소개">
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {teacher.introduction || '내용 없음'}
        </div>
      </Section>

      <Section title="위치 정보">
        <InfoRow label="좌표" value={`${teacher.latitude}, ${teacher.longitude}`} />
      </Section>

      <Section title="상태">
        <InfoRow label="현재 상태" value={teacher.is_active ? '활성' : '비활성'} highlight={!teacher.is_active} />
      </Section>
    </>
  );

  const renderInstructorDetail = (instructor: InstructorMarker) => (
    <>
      <Section title="기본 정보">
        <div className="flex items-center gap-4 mb-4">
          {instructor.profile_image_url ? (
            <img src={instructor.profile_image_url} alt="프로필" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
              ?
            </div>
          )}
          <div>
            <p className="text-lg font-medium text-gray-800">{instructor.display_name}</p>
            <p className="text-sm text-gray-500">{maskEmail(instructor.email)}</p>
            <p className="text-xs text-gray-400">등록일: {formatDate(instructor.created_at)}</p>
          </div>
        </div>
      </Section>

      <Section title="전문분야">
        <InfoRow label="전문분야" value={instructor.specialties?.join(', ') || '-'} />
        <InfoRow label="기타 전문분야" value={instructor.custom_specialty || '-'} />
      </Section>

      <Section title="연수 대상">
        <InfoRow label="대상" value={instructor.target_audience?.join(', ') || '-'} />
      </Section>

      <Section title="활동 정보">
        <InfoRow label="경력" value={instructor.experience_years || '-'} />
        <InfoRow label="활동가능 지역" value={instructor.available_regions?.join(', ') || '-'} />
      </Section>

      <Section title="활동내용">
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {instructor.activity_history || '내용 없음'}
        </div>
      </Section>

      <Section title="상태">
        <InfoRow label="현재 상태" value={instructor.is_active ? '활성' : '비활성'} highlight={!instructor.is_active} />
      </Section>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {type === 'jobs' ? '공고' : type === 'teachers' ? '구직자' : '강사'} 상세 정보
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          {type === 'jobs' && renderJobDetail(item as JobPosting)}
          {type === 'teachers' && renderTeacherDetail(item as TeacherMarker)}
          {type === 'instructors' && renderInstructorDetail(item as InstructorMarker)}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            닫기
          </button>
          {onToggleActive && (
            <button
              onClick={onToggleActive}
              className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {(item as TeacherMarker | InstructorMarker).is_active ? '비활성화' : '활성화'}
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 유틸 컴포넌트
// ============================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <p className="text-sm text-gray-800">
      <span className="text-gray-500">{label}:</span>{' '}
      <span className={highlight ? 'font-bold text-red-600' : ''}>{value}</span>
    </p>
  );
}
