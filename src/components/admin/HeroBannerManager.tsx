import { useState, useEffect, useMemo } from 'react';
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconSearch,
  IconSchool,
  IconSpeakerphone,
  IconConfetti,
  IconBriefcase
} from '@tabler/icons-react';
import {
  getHeroBannerConfig,
  getAllHeroBanners,
  updateHeroBannerConfig,
  updateHeroBanner,
  createHeroBanner,
  deleteHeroBanner
} from '@/lib/supabase/hero-banner';
import type {
  HeroBannerConfig,
  HeroBanner
} from '@/types/hero-banner';
import { useToastStore } from '@/stores/toastStore';
import ColorInputField from './ColorInputField';

// 아이콘 맵 (HeroCard와 동일)
const ICON_MAP: Record<string, React.ReactNode> = {
  'search': <IconSearch size={20} />,
  'school': <IconSchool size={20} />,
  'notice': <IconSpeakerphone size={20} />,
  'party': <IconConfetti size={20} />,
  'bag': <IconBriefcase size={20} />,
};

// 프리셋 색상
const PRESET_COLORS = [
  { name: '파랑', hex: '#3B82F6' },
  { name: '소프트레드', hex: '#F87171' },
  { name: '녹색', hex: '#10B981' },
  { name: '노랑', hex: '#FBBF24' },
];

interface HeroBannerFormState {
  config: HeroBannerConfig | null;
  banners: HeroBanner[];
  loading: boolean;
  saving: boolean;
}

// 배너 미리보기 컴포넌트 (실제 HeroCard 스타일)
function HeroBannerPreview({
  config,
  banners
}: {
  config: HeroBannerConfig | null;
  banners: HeroBanner[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeBanners = banners.filter(b => b.isActive);
  const currentBanner = activeBanners[currentIndex % Math.max(activeBanners.length, 1)];

  // 자동 회전
  useEffect(() => {
    if (config?.rotationSpeed && activeBanners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % activeBanners.length);
      }, config.rotationSpeed * 1000);
      return () => clearInterval(interval);
    }
  }, [config?.rotationSpeed, activeBanners.length]);

  if (!currentBanner) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-600">실제 메인페이지 미리보기</span>
          <span className="text-slate-400">배너 없음</span>
        </div>
        <div className="rounded-lg bg-slate-100 px-4 py-6 text-center text-sm text-slate-500">
          활성화된 배너가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-600">실제 메인페이지 미리보기</span>
        <span>{config?.isActive ? '노출 중' : '비활성화'}</span>
      </div>

      {/* HeroCard 스타일 미리보기 */}
      <div
        className="rounded-lg px-4 py-4 transition-all duration-500 ease-in-out relative overflow-hidden shadow-sm"
        style={{ backgroundColor: currentBanner.bgColor }}
      >
        <div className="flex items-start gap-3">
          {/* 아이콘 */}
          {currentBanner.icon && ICON_MAP[currentBanner.icon] && (
            <div style={{ color: currentBanner.textColor }} className="mt-0.5 flex-shrink-0">
              {ICON_MAP[currentBanner.icon]}
            </div>
          )}

          {/* 텍스트 */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold leading-snug break-keep"
              style={{ color: currentBanner.textColor }}
            >
              {currentBanner.title}
              {currentBanner.subtitle && (
                <>
                  <br />
                  <span className="opacity-95 text-[13px]">{currentBanner.subtitle}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* 인디케이터 */}
        {activeBanners.length > 1 && (
          <div className="flex gap-1.5 mt-3 justify-center">
            {activeBanners.map((_, idx) => (
              <div
                key={idx}
                className={`
                  h-1.5 rounded-full transition-all duration-300
                  ${idx === currentIndex ? 'w-4 opacity-100' : 'w-1.5 opacity-40'}
                `}
                style={{ backgroundColor: currentBanner.textColor }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HeroBannerManager() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<HeroBannerFormState>({
    config: null,
    banners: [],
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

  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const [config, banners] = await Promise.all([
        getHeroBannerConfig(),
        getAllHeroBanners()
      ]);

      setState(prev => ({
        ...prev,
        config,
        banners,
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

  const handleConfigUpdate = async (updates: Partial<HeroBannerConfig>) => {
    if (!state.config) return;

    try {
      setState(prev => ({ ...prev, saving: true }));

      const updated = await updateHeroBannerConfig({
        isActive: updates.isActive,
        rotationSpeed: updates.rotationSpeed
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

  const handleBannerUpdate = async (bannerId: string, updates: Partial<HeroBanner>) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const updated = await updateHeroBanner(bannerId, {
        title: updates.title,
        subtitle: updates.subtitle,
        bgColor: updates.bgColor,
        textColor: updates.textColor,
        linkUrl: updates.linkUrl,
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

      const newBanner = await createHeroBanner({
        title: '새 배너',
        subtitle: '설명을 입력하세요',
        bgColor: '#3B82F6',
        textColor: '#FFFFFF',
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

      const success = await deleteHeroBanner(bannerId);
      if (success) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.filter(b => b.id !== bannerId)
        }));

        if (selectedBannerId === bannerId) {
          setSelectedBannerId(state.banners.find(b => b.id !== bannerId)?.id || null);
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

  // 모두 저장
  const handleSaveAll = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      // 1. 설정 저장
      if (state.config) {
        await updateHeroBannerConfig({
          isActive: state.config.isActive,
          rotationSpeed: state.config.rotationSpeed
        });
      }

      // 2. 배너들 저장
      for (const banner of state.banners) {
        await updateHeroBanner(banner.id, {
          title: banner.title,
          subtitle: banner.subtitle,
          bgColor: banner.bgColor,
          textColor: banner.textColor,
          linkUrl: banner.linkUrl,
          displayOrder: banner.displayOrder,
          isActive: banner.isActive
        });
      }

      showToast('모든 변경사항이 저장되었습니다', 'success');
    } catch (error) {
      console.error('Failed to save all changes:', error);
      showToast('저장 실패', 'error');
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
            <h3 className="text-base font-semibold text-slate-900">히어로배너 관리</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              공고 목록 왼쪽 패널 상단 배너를 관리합니다.
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
            {/* 통합 저장 버튼 */}
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
              {/* 좌측: 편집 폼 */}
              <div className="space-y-5">
                {/* 기본 설정 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <h4 className="text-sm font-semibold text-slate-800">기본 설정</h4>

                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                      <span className="text-slate-600">배너 시스템 활성화</span>
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={state.config?.isActive || false}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              config: prev.config ? { ...prev.config, isActive: e.target.checked } : null
                            }));
                          }}
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
                        value={state.config?.rotationSpeed || 5}
                        onChange={(e) => {
                          setState(prev => ({
                            ...prev,
                            config: prev.config ? { ...prev.config, rotationSpeed: Number(e.target.value) } : null
                          }));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </section>
              </div>

              {/* 우측: 미리보기 + 배너 관리 */}
              <div className="space-y-5">
                <HeroBannerPreview
                  config={state.config}
                  banners={state.banners}
                />

                {state.saving && (
                  <div className="text-center text-sm text-slate-600">
                    저장 중...
                  </div>
                )}

                {/* 배너 관리 섹션 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">배너 목록</h4>
                    <button
                      onClick={handleAddBanner}
                      className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <IconPlus size={14} />
                      새 배너 추가
                    </button>
                  </div>

                  {/* 배너 선택 탭 */}
                  {state.banners.length > 0 && (
                    <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 mb-3 overflow-x-auto">
                      {state.banners.map((banner, idx) => (
                        <button
                          key={banner.id}
                          onClick={() => setSelectedBannerId(banner.id)}
                          className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            selectedBannerId === banner.id
                              ? 'bg-primary text-white'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          배너 #{idx + 1}
                          {!banner.isActive && (
                            <span className="ml-1 text-xs opacity-70">(비활성)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 선택된 배너 편집 */}
                  {selectedBanner ? (
                    <div className="space-y-4 bg-white rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={selectedBanner.isActive}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                banners: prev.banners.map(b =>
                                  b.id === selectedBanner.id ? { ...b, isActive: e.target.checked } : b
                                )
                              }));
                            }}
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
                          제목 *
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.title}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, title: e.target.value } : b
                              )
                            }));
                          }}
                          placeholder="배너 제목 (권장 14자 이내)"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          부제목 (선택)
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.subtitle || ''}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, subtitle: e.target.value } : b
                              )
                            }));
                          }}
                          placeholder="부제목 (권장 14자 이내)"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      {/* 배경색 */}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          배경색 *
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2 mb-2">
                          {PRESET_COLORS.map(preset => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => {
                                setState(prev => ({
                                  ...prev,
                                  banners: prev.banners.map(b =>
                                    b.id === selectedBanner.id ? { ...b, bgColor: preset.hex } : b
                                  )
                                }));
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${
                                selectedBanner.bgColor === preset.hex
                                  ? 'border-primary bg-primary/10'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: preset.hex }}
                              />
                              {preset.name}
                            </button>
                          ))}
                        </div>
                        <ColorInputField
                          label=""
                          value={selectedBanner.bgColor}
                          onChange={(color) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, bgColor: color } : b
                              )
                            }));
                          }}
                          helperText="커스텀 색상을 직접 입력할 수 있어요."
                        />
                      </div>

                      {/* 텍스트 색상 */}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          텍스트 색상 *
                        </span>
                        <div className="mt-2 flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setState(prev => ({
                                ...prev,
                                banners: prev.banners.map(b =>
                                  b.id === selectedBanner.id ? { ...b, textColor: '#FFFFFF' } : b
                                )
                              }));
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${
                              selectedBanner.textColor === '#FFFFFF'
                                ? 'border-primary bg-primary/10'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-4 h-4 rounded border border-slate-200 bg-white" />
                            흰색
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setState(prev => ({
                                ...prev,
                                banners: prev.banners.map(b =>
                                  b.id === selectedBanner.id ? { ...b, textColor: '#1F2937' } : b
                                )
                              }));
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${
                              selectedBanner.textColor === '#1F2937'
                                ? 'border-primary bg-primary/10'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-4 h-4 rounded bg-gray-800" />
                            검정
                          </button>
                        </div>
                        <ColorInputField
                          label=""
                          value={selectedBanner.textColor}
                          onChange={(color) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, textColor: color } : b
                              )
                            }));
                          }}
                        />
                      </div>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          링크 URL (선택)
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.linkUrl || ''}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              banners: prev.banners.map(b =>
                                b.id === selectedBanner.id ? { ...b, linkUrl: e.target.value } : b
                              )
                            }));
                          }}
                          placeholder="https://..."
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

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
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-500">
                      배너를 선택하거나 새 배너를 추가하세요.
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
