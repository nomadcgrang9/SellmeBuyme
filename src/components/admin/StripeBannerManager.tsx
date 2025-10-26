import { useState, useEffect, useMemo } from 'react';
import {
  IconChevronDown,
  IconDeviceFloppy,
  IconCheck,
  IconRotate,
  IconMessage,
  IconChartBar,
  IconBell,
  IconCalendarEvent,
  IconPlus,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconSettings,
  IconHash,
  IconRefresh
} from '@tabler/icons-react';
import {
  getStripeBannerConfig,
  getActiveBanners,
  getAllBanners,
  getTodayStripeStatistics,
  getActivePopularKeywords,
  getAllPopularKeywords,
  getAutoStatistics,
  updateStripeBannerConfig,
  updateStripeBanner,
  createStripeBanner,
  deleteStripeBanner,
  updateTodayStatistics,
  updatePopularKeyword,
  createPopularKeyword,
  deletePopularKeyword
} from '@/lib/supabase/stripe-banner';
import type {
  StripeBannerConfig,
  StripeBanner,
  StripeStatistics,
  PopularKeyword,
  BannerType,
  StatsMode,
  KeywordsMode,
  ColorMode
} from '@/types';
import { useToastStore } from '@/stores/toastStore';
import ColorInputField from './ColorInputField';
import { normalizeHex } from '@/lib/colorUtils';

const DEFAULT_BANNER_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

function ColorModeToggle({ value, onChange }: { value: ColorMode; onChange: (mode: ColorMode) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold text-slate-500">
      {(['single', 'gradient'] as ColorMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`flex-1 px-3 py-1.5 transition-colors ${
            value === mode ? 'bg-primary text-white' : 'bg-white hover:bg-slate-100'
          }`}
        >
          {mode === 'single' ? '단일 색상' : '그라데이션'}
        </button>
      ))}
    </div>
  );
}

interface StripeBannerFormState {
  config: StripeBannerConfig | null;
  banners: StripeBanner[];
  statistics: StripeStatistics | null;
  keywords: PopularKeyword[];
  autoStats: {
    newJobsCount: number;
    urgentJobsCount: number;
    newTalentsCount: number;
  } | null;
  loading: boolean;
  saving: boolean;
}

function BannerPreview({
  config,
  banners,
  statistics,
  keywords
}: {
  config: StripeBannerConfig | null;
  banners: StripeBanner[];
  statistics: StripeStatistics | null;
  keywords: PopularKeyword[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeBanners = banners.filter(b => b.isActive);
  const currentBanner = activeBanners[currentIndex % activeBanners.length];

  // 자동 회전
  useEffect(() => {
    if (config?.rotationSpeed && activeBanners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % activeBanners.length);
      }, config.rotationSpeed * 1000);
      return () => clearInterval(interval);
    }
  }, [config?.rotationSpeed, activeBanners.length]);

  const getIcon = (type: BannerType) => {
    switch(type) {
      case 'event': return <IconCalendarEvent size={16} />;
      case 'review': return <IconMessage size={16} />;
      case 'notice': return <IconBell size={16} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-600">실제 메인페이지 미리보기</span>
        <span>{config?.isActive ? '노출 중' : '비활성화'}</span>
      </div>

      {/* 메인페이지 AIInsightBox 스타일로 미리보기 */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex gap-4 h-[96px] items-center">
        {/* 좌측: 띠지 (50%) */}
        <div className="basis-1/2 space-y-2">
          {/* 실시간 통계 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <IconChartBar size={16} stroke={1.5} className="text-[#7db8a3]" />
              <span className="font-semibold text-gray-800">
                오늘 신규 공고 {statistics?.newJobsCount || 0}건
              </span>
            </div>
            <div className="text-gray-300 text-lg leading-none">·</div>
            <div className="flex items-center gap-1.5">
              <IconBell size={16} stroke={1.5} className="text-orange-600" />
              <span className="text-gray-700">
                마감임박 {statistics?.urgentJobsCount || 0}건
              </span>
            </div>
            <div className="text-gray-300 text-lg leading-none">·</div>
            <div className="flex items-center gap-1.5">
              <IconMessage size={16} stroke={1.5} className="text-[#7aa3cc]" />
              <span className="text-gray-700">
                신규 인력 {statistics?.newTalentsCount || 0}명 등록
              </span>
            </div>
          </div>

          {/* 인기 검색어 */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-gray-700">인기:</span>
            {keywords.filter(k => k.isActive).slice(0, 5).map((keyword) => (
              <span
                key={keyword.id}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {keyword.keyword}
              </span>
            ))}
          </div>
        </div>

        {/* 우측: 배너 (50%) */}
        <div className="basis-1/2 h-full">
          {currentBanner && (
            <BannerPreviewItem banner={currentBanner} getIcon={getIcon} />
          )}
        </div>
      </div>
    </div>
  );
}

function BannerPreviewItem({ banner, getIcon }: { banner: StripeBanner; getIcon: (type: BannerType) => React.ReactNode }) {
  const backgroundStyle = useMemo(() => {
    if (banner.bgColorMode === 'gradient') {
      const start = pickGradientValue(banner.bgGradientStart, DEFAULT_BANNER_GRADIENT[0]);
      const end = pickGradientValue(banner.bgGradientEnd, DEFAULT_BANNER_GRADIENT[1]);
      return { backgroundImage: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` };
    }
    return { backgroundColor: banner.bgColor };
  }, [banner.bgColor, banner.bgColorMode, banner.bgGradientStart, banner.bgGradientEnd]);

  return (
    <div
      className="h-full rounded-lg px-4 py-3 shadow-sm relative overflow-hidden flex items-center"
      style={backgroundStyle}
    >
      <div className="flex items-center gap-3">
        <div style={{ color: banner.textColor }}>
          {getIcon(banner.type)}
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: banner.textColor }}>
            {banner.title}
          </h3>
          {banner.description && (
            <p className="text-xs opacity-90" style={{ color: banner.textColor }}>
              {banner.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StripeBannerManager() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<StripeBannerFormState>({
    config: null,
    banners: [],
    statistics: null,
    keywords: [],
    autoStats: null,
    loading: true,
    saving: false
  });
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const { showToast } = useToastStore();

  // 초기 데이터 로드
  useEffect(() => {
    if (isExpanded) {
      loadData();
    }
  }, [isExpanded]);

  // Auto 모드일 때 통계 자동 갱신
  useEffect(() => {
    if (state.config?.statsMode === 'auto' && isExpanded) {
      loadAutoStats();
      const interval = setInterval(loadAutoStats, 30000); // 30초마다 갱신
      return () => clearInterval(interval);
    }
  }, [state.config?.statsMode, isExpanded]);

  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const [config, banners, statistics, keywords] = await Promise.all([
        getStripeBannerConfig(),
        getAllBanners(),
        getTodayStripeStatistics(),
        getAllPopularKeywords()
      ]);

      setState(prev => ({
        ...prev,
        config,
        banners,
        statistics,
        keywords,
        loading: false
      }));

      if (banners.length > 0 && !selectedBannerId) {
        setSelectedBannerId(banners[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('데이터 로드 실패', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const loadAutoStats = async () => {
    try {
      const autoStats = await getAutoStatistics();

      // autoStats 업데이트
      setState(prev => ({
        ...prev,
        autoStats
      }));

      showToast('통계가 새로고침되었습니다', 'success');
    } catch (error) {
      console.error('Failed to load auto stats:', error);
      showToast('통계 새로고침 실패', 'error');
    }
  };

  const handleConfigUpdate = async (updates: Partial<StripeBannerConfig>) => {
    if (!state.config) return;

    try {
      setState(prev => ({ ...prev, saving: true }));

      const updated = await updateStripeBannerConfig({
        isActive: updates.isActive,
        rotationSpeed: updates.rotationSpeed,
        statsMode: updates.statsMode as StatsMode,
        keywordsMode: updates.keywordsMode as KeywordsMode
      });

      if (updated) {
        setState(prev => ({ ...prev, config: updated }));
        showToast('설정이 저장되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      showToast('설정 저장 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleBannerUpdate = async (bannerId: string, updates: Partial<StripeBanner>) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const updated = await updateStripeBanner(bannerId, {
        type: updates.type,
        title: updates.title,
        description: updates.description,
        link: updates.link,
        bgColor: updates.bgColor,
        textColor: updates.textColor,
        displayOrder: updates.displayOrder,
        isActive: updates.isActive
      });

      if (updated) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.map(b => b.id === bannerId ? updated : b)
        }));
        showToast('배너가 업데이트되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to update banner:', error);
      showToast('배너 업데이트 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleAddBanner = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const newBanner = await createStripeBanner({
        type: 'notice',
        title: '새 배너',
        description: '설명을 입력하세요',
        link: '/',
        bgColor: '#3b82f6',
        textColor: '#ffffff',
        displayOrder: state.banners.length
      });

      if (newBanner) {
        setState(prev => ({
          ...prev,
          banners: [...prev.banners, newBanner]
        }));
        setSelectedBannerId(newBanner.id);
        showToast('배너가 추가되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to add banner:', error);
      showToast('배너 추가 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('배너를 삭제하시겠습니까?')) return;

    try {
      setState(prev => ({ ...prev, saving: true }));

      const success = await deleteStripeBanner(bannerId);
      if (success) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.filter(b => b.id !== bannerId)
        }));

        if (selectedBannerId === bannerId) {
          setSelectedBannerId(state.banners[0]?.id || null);
        }

        showToast('배너가 삭제되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to delete banner:', error);
      showToast('배너 삭제 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleStatsUpdate = async (updates: Partial<StripeStatistics>) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      // 현재 상태와 업데이트 병합
      const currentStats = state.statistics || {
        statsDate: new Date().toISOString().split('T')[0],
        newJobsCount: 0,
        urgentJobsCount: 0,
        newTalentsCount: 0
      };

      const updated = await updateTodayStatistics({
        newJobsCount: updates.newJobsCount ?? currentStats.newJobsCount,
        urgentJobsCount: updates.urgentJobsCount ?? currentStats.urgentJobsCount,
        newTalentsCount: updates.newTalentsCount ?? currentStats.newTalentsCount
      });

      if (updated) {
        setState(prev => ({ ...prev, statistics: updated }));
        showToast('통계가 저장되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
      showToast('통계 저장 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  // 통합 저장 함수 (모든 변경사항을 한번에 저장)
  const handleSaveAll = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      // 1. 설정 저장
      if (state.config) {
        await handleConfigUpdate(state.config);
      }

      // 2. 통계 저장 (수동 모드일 때만)
      if (state.config?.statsMode === 'manual' && state.statistics) {
        await handleStatsUpdate(state.statistics);
      }

      // 3. 배너 저장 (변경된 배너들만)
      for (const banner of state.banners) {
        await updateStripeBanner(banner.id, banner);
      }

      showToast('모든 변경사항이 저장되었습니다', 'success');
    } catch (error) {
      console.error('Failed to save all changes:', error);
      showToast('저장 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleAddKeyword = async (keyword: string) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      // # 붙이기 (없으면)
      const formattedKeyword = keyword.startsWith('#') ? keyword : `#${keyword}`;

      const newKeyword = await createPopularKeyword({
        keyword: formattedKeyword,
        displayOrder: state.keywords.filter(k => k.isManual).length,
        isManual: true
      });

      if (newKeyword) {
        setState(prev => ({
          ...prev,
          keywords: [...prev.keywords, newKeyword]
        }));
        showToast('키워드가 추가되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to add keyword:', error);
      showToast('키워드 추가 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const success = await deletePopularKeyword(keywordId);
      if (success) {
        setState(prev => ({
          ...prev,
          keywords: prev.keywords.filter(k => k.id !== keywordId)
        }));
        showToast('키워드가 삭제되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to delete keyword:', error);
      showToast('키워드 삭제 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const selectedBanner = state.banners.find(b => b.id === selectedBannerId);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300">
      {/* 토글 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <IconChevronDown
            size={20}
            className={`text-slate-400 transition-transform duration-200 ${
              isExpanded ? '' : '-rotate-90'
            }`}
          />
          <div>
            <h3 className="text-base font-semibold text-slate-900">띠지배너 관리</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              메인페이지 상단의 통계, 인기키워드, 배너를 관리합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.config?.isActive && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              활성화
            </span>
          )}
          {state.config?.updatedAt && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              최근 수정: {new Date(state.config.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </button>

      {/* 펼쳐진 콘텐츠 */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* 관리 UI */}
        {isExpanded && !state.loading && (
          <div className="border-t border-slate-200 p-6">
            {/* 통합 저장 버튼 - 상단에 배치 */}
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleSaveAll}
                disabled={state.saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {state.saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    저장 중...
                  </>
                ) : (
                  '모두 저장'
                )}
              </button>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)]">
              {/* 편집 폼 */}
              <div className="space-y-5">
                {/* 기본 설정 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <h4 className="text-sm font-semibold text-slate-800">기본 설정</h4>

                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                      <span className="text-slate-600">띠지배너 노출</span>
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={state.config?.isActive || false}
                          onChange={(e) => handleConfigUpdate({ ...state.config!, isActive: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        활성화
                      </label>
                    </div>

                    <label className="flex flex-col text-sm text-slate-600">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        배너 회전 속도 (초)
                      </span>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={state.config?.rotationSpeed || 3}
                        onChange={(e) => handleConfigUpdate({ ...state.config!, rotationSpeed: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </section>

                {/* 통계 설정 섹션 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">통계 설정</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfigUpdate({ ...state.config!, statsMode: 'auto' })}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          state.config?.statsMode === 'auto'
                            ? 'bg-primary text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        자동 집계
                      </button>
                      <button
                        onClick={() => handleConfigUpdate({ ...state.config!, statsMode: 'manual' })}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          state.config?.statsMode === 'manual'
                            ? 'bg-primary text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        수동 입력
                      </button>
                    </div>
                  </div>

                  {state.config?.statsMode === 'auto' ? (
                    <div className="space-y-2 bg-white rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">오늘 신규 공고</span>
                        <span className="font-semibold">{state.autoStats?.newJobsCount || 0}건</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">마감임박 공고 (7일 이내)</span>
                        <span className="font-semibold">{state.autoStats?.urgentJobsCount || 0}건</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">오늘 신규 인력</span>
                        <span className="font-semibold">{state.autoStats?.newTalentsCount || 0}건</span>
                      </div>
                      <button
                        onClick={loadAutoStats}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                      >
                        <IconRefresh size={14} />
                        새로고침
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white rounded-lg p-3">
                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          오늘 신규 공고
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={state.statistics?.newJobsCount ?? 0}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            // 로컬 상태 즉시 업데이트
                            setState(prev => ({
                              ...prev,
                              statistics: {
                                ...(prev.statistics || {
                                  statsDate: new Date().toISOString().split('T')[0],
                                  newJobsCount: 0,
                                  urgentJobsCount: 0,
                                  newTalentsCount: 0
                                } as StripeStatistics),
                                newJobsCount: newValue
                              }
                            }));
                          }}
                          onBlur={(e) => {
                            // 포커스 잃을 때 DB 저장
                            handleStatsUpdate({
                              newJobsCount: Number(e.target.value)
                            });
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          마감임박 공고
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={state.statistics?.urgentJobsCount ?? 0}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            setState(prev => ({
                              ...prev,
                              statistics: {
                                ...(prev.statistics || {
                                  statsDate: new Date().toISOString().split('T')[0],
                                  newJobsCount: 0,
                                  urgentJobsCount: 0,
                                  newTalentsCount: 0
                                } as StripeStatistics),
                                urgentJobsCount: newValue
                              }
                            }));
                          }}
                          onBlur={(e) => {
                            handleStatsUpdate({
                              urgentJobsCount: Number(e.target.value)
                            });
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          오늘 신규 인력
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={state.statistics?.newTalentsCount ?? 0}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            setState(prev => ({
                              ...prev,
                              statistics: {
                                ...(prev.statistics || {
                                  statsDate: new Date().toISOString().split('T')[0],
                                  newJobsCount: 0,
                                  urgentJobsCount: 0,
                                  newTalentsCount: 0
                                } as StripeStatistics),
                                newTalentsCount: newValue
                              }
                            }));
                          }}
                          onBlur={(e) => {
                            handleStatsUpdate({
                              newTalentsCount: Number(e.target.value)
                            });
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  )}
                </section>

                {/* 인기 키워드 설정 섹션 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">인기 키워드</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfigUpdate({ ...state.config!, keywordsMode: 'auto' })}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          state.config?.keywordsMode === 'auto'
                            ? 'bg-primary text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        자동 집계
                      </button>
                      <button
                        onClick={() => handleConfigUpdate({ ...state.config!, keywordsMode: 'manual' })}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          state.config?.keywordsMode === 'manual'
                            ? 'bg-primary text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        수동 입력
                      </button>
                    </div>
                  </div>

                  {state.config?.keywordsMode === 'auto' ? (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">
                        job_postings의 tags에서 자동 추출됩니다.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {state.keywords.filter(k => !k.isManual).slice(0, 10).map((keyword) => (
                          <span
                            key={keyword.id}
                            className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                          >
                            {keyword.keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-white rounded-lg p-3">
                      <div className="flex flex-wrap gap-2">
                        {state.keywords.filter(k => k.isManual).map((keyword) => (
                          <div
                            key={keyword.id}
                            className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                          >
                            <span>{keyword.keyword}</span>
                            <button
                              onClick={() => handleDeleteKeyword(keyword.id)}
                              className="hover:bg-red-100 rounded p-0.5"
                            >
                              <IconTrash size={12} className="text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="키워드 입력 (예: #코딩강사)"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              if (input.value.trim()) {
                                handleAddKeyword(input.value.trim());
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input.value.trim()) {
                              handleAddKeyword(input.value.trim());
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          추가
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* 미리보기 + 배너 관리 */}
              <div className="space-y-5">
                <BannerPreview
                  config={state.config}
                  banners={state.banners}
                  statistics={state.config?.statsMode === 'auto' && state.autoStats
                    ? { ...state.statistics!, ...state.autoStats }
                    : state.statistics}
                  keywords={state.keywords}
                />

                {state.saving && (
                  <div className="text-center text-sm text-slate-600">
                    저장 중...
                  </div>
                )}

                {/* 배너 관리 섹션 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">배너 관리</h4>
                    <button
                      onClick={handleAddBanner}
                      className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <IconPlus size={14} />
                      새 배너 추가
                    </button>
                  </div>

                  {/* 배너 선택 탭 */}
                  <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 mb-3">
                    {state.banners.map(banner => (
                      <button
                        key={banner.id}
                        onClick={() => setSelectedBannerId(banner.id)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          selectedBannerId === banner.id
                            ? 'bg-primary text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {banner.type === 'event' && '이벤트'}
                        {banner.type === 'review' && '후기'}
                        {banner.type === 'notice' && '공지'}
                      </button>
                    ))}
                  </div>

                  {/* 선택된 배너 편집 */}
                  {selectedBanner && (
                    <div className="space-y-4 bg-white rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={selectedBanner.isActive}
                            onChange={(e) => handleBannerUpdate(selectedBanner.id, {
                              isActive: e.target.checked
                            })}
                            className="h-4 w-4 rounded border-slate-300 text-primary"
                          />
                          이 배너 활성화
                        </label>
                        <button
                          onClick={() => handleDeleteBanner(selectedBanner.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="배너 삭제"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          배너 타입
                        </span>
                        <select
                          value={selectedBanner.type}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, type: e.target.value as BannerType } : b
                              )
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="event">이벤트</option>
                          <option value="notice">공지</option>
                          <option value="review">후기</option>
                        </select>
                      </label>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          제목
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.title}
                          onChange={(e) => {
                            // 로컬 상태만 업데이트 (실시간 저장 X)
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, title: e.target.value } : b
                              )
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          설명
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.description || ''}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, description: e.target.value } : b
                              )
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          링크
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.link || ''}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, link: e.target.value } : b
                              )
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      {/* 배경 색상 모드 */}
                      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">배경 색상</span>
                          <ColorModeToggle 
                            value={selectedBanner.bgColorMode} 
                            onChange={(mode) => {
                              setState(prev => ({
                                ...prev,
                                banners: prev.banners.map(b =>
                                  b.id === selectedBanner.id 
                                    ? {
                                        ...b,
                                        bgColorMode: mode,
                                        bgGradientStart: mode === 'gradient' 
                                          ? pickGradientValue(b.bgGradientStart, DEFAULT_BANNER_GRADIENT[0])
                                          : b.bgGradientStart,
                                        bgGradientEnd: mode === 'gradient'
                                          ? pickGradientValue(b.bgGradientEnd, DEFAULT_BANNER_GRADIENT[1])
                                          : b.bgGradientEnd
                                      }
                                    : b
                                )
                              }));
                            }}
                          />
                        </div>
                        <div className={`mt-3 grid gap-3 ${selectedBanner.bgColorMode === 'gradient' ? 'sm:grid-cols-2' : ''}`}>
                          {selectedBanner.bgColorMode === 'gradient' ? (
                            <>
                              <ColorInputField
                                label="시작 색상"
                                value={selectedBanner.bgGradientStart ?? DEFAULT_BANNER_GRADIENT[0]}
                                onChange={(next) => {
                                  setState(prev => ({
                                    ...prev,
                                    banners: prev.banners.map(b =>
                                      b.id === selectedBanner.id ? { ...b, bgGradientStart: next } : b
                                    )
                                  }));
                                }}
                              />
                              <ColorInputField
                                label="끝 색상"
                                value={selectedBanner.bgGradientEnd ?? DEFAULT_BANNER_GRADIENT[1]}
                                onChange={(next) => {
                                  setState(prev => ({
                                    ...prev,
                                    banners: prev.banners.map(b =>
                                      b.id === selectedBanner.id ? { ...b, bgGradientEnd: next } : b
                                    )
                                  }));
                                }}
                              />
                            </>
                          ) : (
                            <ColorInputField
                              label="단일 색상"
                              value={selectedBanner.bgColor}
                              onChange={(next) => {
                                setState((prev) => ({
                                  ...prev,
                                  banners: prev.banners.map((b) =>
                                    b.id === selectedBanner.id ? { ...b, bgColor: next } : b
                                  )
                                }));
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* 텍스트 색상 */}
                      <ColorInputField
                        label="텍스트색"
                        value={selectedBanner.textColor}
                        onChange={(next) => {
                          setState((prev) => ({
                            ...prev,
                            banners: prev.banners.map((b) =>
                              b.id === selectedBanner.id ? { ...b, textColor: next } : b
                            )
                          }));
                        }}
                      />

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          표시 순서
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={selectedBanner.displayOrder}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, displayOrder: Number(e.target.value) } : b
                              )
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {isExpanded && state.loading && (
          <div className="border-t border-slate-200 p-12 text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]" />
            <p className="mt-2 text-sm text-slate-600">데이터 로딩 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}