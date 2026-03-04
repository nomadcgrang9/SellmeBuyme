import { useState, useEffect } from 'react';
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

  // 배너 필드 업데이트 헬퍼
  const updateBannerField = (field: string, value: string | number | boolean) => {
    if (!selectedBanner) return;
    setState(prev => ({
      ...prev,
      banners: prev.banners.map(b =>
        b.id === selectedBanner.id ? { ...b, [field]: value } : b
      )
    }));
  };

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
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isExpanded && !state.loading && (
          <div className="border-t border-slate-200 p-6 space-y-5">

            {/* ━━━ 상단: 설정바 (한 줄) ━━━ */}
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-xs font-medium text-slate-500">회전속도</span>
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
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center"
                    />
                    <span className="text-xs text-slate-400">초</span>
                  </label>
                </div>
                <button
                  onClick={handleSaveAll}
                  disabled={state.saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {state.saving ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      저장 중...
                    </>
                  ) : (
                    '모두 저장'
                  )}
                </button>
              </div>
            </section>

            {/* ━━━ 중단: 배너 카드 리스트 ━━━ */}
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">배너 목록</h4>
                <button
                  onClick={handleAddBanner}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <IconPlus size={14} />
                  새 배너 추가
                </button>
              </div>

              <div className="space-y-2">
                {state.banners.map((banner, idx) => {
                  const isSelected = selectedBannerId === banner.id;
                  return (
                    <div key={banner.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      {/* 배너 요약 행 */}
                      <button
                        type="button"
                        onClick={() => setSelectedBannerId(isSelected ? null : banner.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className="w-6 h-6 rounded flex-shrink-0"
                          style={{ backgroundColor: banner.bgColor }}
                        />
                        <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                          #{idx + 1} {banner.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          banner.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {banner.isActive ? '활성' : '비활성'}
                        </span>
                        <IconChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform duration-200 ${
                            isSelected ? '' : '-rotate-90'
                          }`}
                        />
                      </button>

                      {/* 펼쳐진 편집 폼 - 3단 배열 */}
                      {isSelected && (
                        <div className="border-t border-slate-100 px-4 py-4">
                          {/* 상단: 활성화 + 삭제 */}
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={banner.isActive}
                                onChange={(e) => updateBannerField('isActive', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-primary"
                              />
                              활성화
                            </label>
                            <button
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <IconTrash size={14} />
                              삭제
                            </button>
                          </div>

                          {/* 3단 그리드: 텍스트+링크 | 색상+순서 | 미리보기 */}
                          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                            {/* 1단: 텍스트 + 링크 */}
                            <div className="space-y-2">
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">제목 *</span>
                                <input
                                  type="text"
                                  value={banner.title}
                                  onChange={(e) => updateBannerField('title', e.target.value)}
                                  placeholder="14자 이내"
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">부제목</span>
                                <input
                                  type="text"
                                  value={banner.subtitle || ''}
                                  onChange={(e) => updateBannerField('subtitle', e.target.value)}
                                  placeholder="14자 이내"
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">링크 URL</span>
                                <input
                                  type="text"
                                  value={banner.linkUrl || ''}
                                  onChange={(e) => updateBannerField('linkUrl', e.target.value)}
                                  placeholder="https://..."
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">순서</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={banner.displayOrder}
                                  onChange={(e) => updateBannerField('displayOrder', Number(e.target.value))}
                                  className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                            </div>

                            {/* 2단: 배경색 + 텍스트색 */}
                            <div className="space-y-3">
                              <div>
                                <span className="text-xs font-medium text-slate-500">배경색</span>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {PRESET_COLORS.map(preset => (
                                    <button
                                      key={preset.hex}
                                      type="button"
                                      onClick={() => updateBannerField('bgColor', preset.hex)}
                                      className={`w-7 h-7 rounded border-2 transition-colors ${
                                        banner.bgColor === preset.hex
                                          ? 'border-primary scale-110'
                                          : 'border-slate-200 hover:border-slate-300'
                                      }`}
                                      style={{ backgroundColor: preset.hex }}
                                      title={preset.name}
                                    />
                                  ))}
                                </div>
                                <ColorInputField
                                  label=""
                                  value={banner.bgColor}
                                  onChange={(color) => updateBannerField('bgColor', color)}
                                />
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">텍스트색</span>
                                <div className="mt-1.5 flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateBannerField('textColor', '#FFFFFF')}
                                    className={`w-7 h-7 rounded border-2 bg-white ${
                                      banner.textColor === '#FFFFFF'
                                        ? 'border-primary scale-110'
                                        : 'border-slate-200'
                                    }`}
                                    title="흰색"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateBannerField('textColor', '#1F2937')}
                                    className={`w-7 h-7 rounded border-2 bg-gray-800 ${
                                      banner.textColor === '#1F2937'
                                        ? 'border-primary scale-110'
                                        : 'border-slate-200'
                                    }`}
                                    title="검정"
                                  />
                                </div>
                                <ColorInputField
                                  label=""
                                  value={banner.textColor}
                                  onChange={(color) => updateBannerField('textColor', color)}
                                />
                              </div>
                            </div>

                            {/* 3단: 실시간 미리보기 */}
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-500 mb-1.5">미리보기</span>
                              <div
                                className="flex-1 rounded-lg px-4 py-3 shadow-sm flex flex-col justify-center min-h-[100px]"
                                style={{ backgroundColor: banner.bgColor }}
                              >
                                <div className="flex items-start gap-2">
                                  {banner.icon && ICON_MAP[banner.icon] && (
                                    <div style={{ color: banner.textColor }} className="mt-0.5 flex-shrink-0">
                                      {ICON_MAP[banner.icon]}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className="text-sm font-semibold leading-snug break-keep"
                                      style={{ color: banner.textColor }}
                                    >
                                      {banner.title || '제목 미입력'}
                                      {banner.subtitle && (
                                        <>
                                          <br />
                                          <span className="opacity-95 text-[13px]">{banner.subtitle}</span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {state.banners.length === 0 && (
                  <div className="text-center py-8 text-sm text-slate-500">
                    배너가 없습니다. 새 배너를 추가하세요.
                  </div>
                )}
              </div>
            </section>

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
