import { useState, useEffect, useRef } from 'react';
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconPhoto,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react';
import {
  getNativeBannerConfig,
  getNativeBanners,
  updateNativeBannerConfig,
  updateNativeBanner,
  createNativeBanner,
  deleteNativeBanner,
  uploadNativeBannerImage,
} from '@/lib/supabase/hero-banner';
import type {
  NativeBannerConfig,
  NativeBanner,
} from '@/types/hero-banner';
import { useToastStore } from '@/stores/toastStore';
import ColorInputField from './ColorInputField';

const PRESET_COLORS = [
  { name: '파랑', hex: '#3B82F6' },
  { name: '소프트레드', hex: '#F87171' },
  { name: '녹색', hex: '#10B981' },
  { name: '노랑', hex: '#FBBF24' },
];

interface FormState {
  config: NativeBannerConfig | null;
  banners: NativeBanner[];
  loading: boolean;
  saving: boolean;
}

export default function NativeBannerManager() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<FormState>({
    config: null,
    banners: [],
    loading: true,
    saving: false,
  });
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) loadData();
  }, [isExpanded]);

  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const [config, banners] = await Promise.all([
        getNativeBannerConfig(),
        getNativeBanners(),
      ]);
      setState(prev => ({ ...prev, config, banners, loading: false }));
      if (banners.length > 0 && !selectedBannerId) {
        setSelectedBannerId(banners[0].id);
      }
    } catch (error) {
      console.error('Failed to load native banner data:', error);
      showToast('데이터 로드 실패', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleAddBanner = async () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleAddTextBanner = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));
      const newBanner = await createNativeBanner({
        title: '새 텍스트 배너',
        bgColor: '#3B82F6',
        textColor: '#FFFFFF',
        displayOrder: state.banners.length,
      });
      if (newBanner) {
        setState(prev => ({ ...prev, banners: [...prev.banners, newBanner] }));
        setSelectedBannerId(newBanner.id);
        showToast('텍스트 배너가 추가되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to add text banner:', error);
      showToast('배너 추가 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleFileSelected = async (file: File) => {
    try {
      setState(prev => ({ ...prev, saving: true }));
      const url = await uploadNativeBannerImage(file);
      if (!url) {
        showToast('이미지 업로드 실패', 'error');
        return;
      }
      const newBanner = await createNativeBanner({
        imageUrl: url,
        displayOrder: state.banners.length,
      });
      if (newBanner) {
        setState(prev => ({ ...prev, banners: [...prev.banners, newBanner] }));
        setSelectedBannerId(newBanner.id);
        showToast('배너가 추가되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to add native banner:', error);
      showToast('배너 추가 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleReplaceImage = async (bannerId: string, file: File) => {
    try {
      setState(prev => ({ ...prev, saving: true }));
      const url = await uploadNativeBannerImage(file);
      if (url) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.map(b =>
            b.id === bannerId ? { ...b, imageUrl: url } : b
          ),
        }));
        showToast('이미지가 교체되었습니다', 'success');
      }
    } catch (error) {
      console.error('Image replace failed:', error);
      showToast('이미지 교체 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return;
    try {
      setState(prev => ({ ...prev, saving: true }));
      const success = await deleteNativeBanner(bannerId);
      if (success) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.filter(b => b.id !== bannerId),
        }));
        if (selectedBannerId === bannerId) {
          setSelectedBannerId(state.banners.find(b => b.id !== bannerId)?.id || null);
        }
        showToast('배너가 삭제되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to delete native banner:', error);
      showToast('배너 삭제 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const moveOrder = (bannerId: string, direction: 'up' | 'down') => {
    setState(prev => {
      const idx = prev.banners.findIndex(b => b.id === bannerId);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.banners.length) return prev;

      const newBanners = [...prev.banners];
      const tempOrder = newBanners[idx].displayOrder;
      newBanners[idx] = { ...newBanners[idx], displayOrder: newBanners[swapIdx].displayOrder };
      newBanners[swapIdx] = { ...newBanners[swapIdx], displayOrder: tempOrder };
      newBanners.sort((a, b) => a.displayOrder - b.displayOrder);
      return { ...prev, banners: newBanners };
    });
  };

  const handleSaveAll = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      if (state.config) {
        await updateNativeBannerConfig({
          isActive: state.config.isActive,
          insertionInterval: state.config.insertionInterval,
        });
      }

      for (const banner of state.banners) {
        await updateNativeBanner(banner.id, {
          imageUrl: banner.imageUrl,
          title: banner.title || '',
          description: banner.description || '',
          bgColor: banner.bgColor || '',
          textColor: banner.textColor || '',
          linkUrl: banner.linkUrl,
          displayOrder: banner.displayOrder,
          isActive: banner.isActive,
        });
      }

      showToast('모든 변경사항이 저장되었습니다', 'success');
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('저장 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const updateBannerField = (bannerId: string, field: string, value: string | number | boolean) => {
    setState(prev => ({
      ...prev,
      banners: prev.banners.map(b =>
        b.id === bannerId ? { ...b, [field]: value } : b
      ),
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
            className={`text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
          />
          <div>
            <h3 className="text-base font-semibold text-slate-900">카드배너 관리</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              공고 카드 목록 사이에 삽입되는 광고 배너를 관리합니다.
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

      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
                          config: prev.config ? { ...prev.config, isActive: e.target.checked } : null,
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    활성화
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-xs font-medium text-slate-500">삽입간격</span>
                    <input
                      type="number"
                      min={1}
                      value={state.config?.insertionInterval || 5}
                      onChange={(e) => {
                        setState(prev => ({
                          ...prev,
                          config: prev.config ? { ...prev.config, insertionInterval: Number(e.target.value) } : null,
                        }));
                      }}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center"
                    />
                    <span className="text-xs text-slate-400">카드마다</span>
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
                  ) : '모두 저장'}
                </button>
              </div>
            </section>

            {/* ━━━ 배너 카드 리스트 (아코디언) ━━━ */}
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">배너 목록</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddTextBanner}
                    className="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded-lg text-xs font-medium hover:bg-primary/5 transition-colors"
                  >
                    <IconPlus size={14} />
                    텍스트 배너
                  </button>
                  <button
                    onClick={handleAddBanner}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <IconPhoto size={14} />
                    이미지 배너
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="space-y-2">
                {state.banners.map((banner, idx) => {
                  const isSelected = selectedBannerId === banner.id;
                  const hasImage = !!banner.imageUrl;
                  return (
                    <div key={banner.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      {/* 배너 요약 행 */}
                      <button
                        type="button"
                        onClick={() => setSelectedBannerId(isSelected ? null : banner.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        {/* 썸네일 또는 색상칩 */}
                        {hasImage ? (
                          <img
                            src={banner.imageUrl}
                            alt=""
                            className="w-10 h-6 object-cover rounded flex-shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div
                            className="w-10 h-6 rounded flex-shrink-0 border border-slate-200"
                            style={{ backgroundColor: banner.bgColor || '#3B82F6' }}
                          />
                        )}
                        <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                          #{idx + 1} {banner.title || (hasImage ? '이미지 배너' : '텍스트 배너')}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => moveOrder(banner.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            <IconArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveOrder(banner.id, 'down')}
                            disabled={idx === state.banners.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            <IconArrowDown size={14} />
                          </button>
                        </div>
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
                                onChange={(e) => updateBannerField(banner.id, 'isActive', e.target.checked)}
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

                          {/* 3단 그리드 */}
                          <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                            {/* 1단: 텍스트 + 링크 + 이미지 */}
                            <div className="space-y-2">
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">제목</span>
                                <input
                                  type="text"
                                  value={banner.title || ''}
                                  onChange={(e) => updateBannerField(banner.id, 'title', e.target.value)}
                                  placeholder="배너 문구 (선택)"
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">부제목</span>
                                <input
                                  type="text"
                                  value={banner.description || ''}
                                  onChange={(e) => updateBannerField(banner.id, 'description', e.target.value)}
                                  placeholder="부가 설명 (선택)"
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="flex flex-col text-sm">
                                <span className="text-xs font-medium text-slate-500 mb-1">링크 URL</span>
                                <input
                                  type="text"
                                  value={banner.linkUrl || ''}
                                  onChange={(e) => updateBannerField(banner.id, 'linkUrl', e.target.value)}
                                  placeholder="https://..."
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </label>
                              {/* 이미지 업로드/교체 */}
                              <div className="pt-1">
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) handleReplaceImage(banner.id, file);
                                    };
                                    input.click();
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <IconPhoto size={14} />
                                  {hasImage ? '이미지 교체' : '이미지 추가'}
                                </button>
                              </div>
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
                                      onClick={() => updateBannerField(banner.id, 'bgColor', preset.hex)}
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
                                  value={banner.bgColor || '#3B82F6'}
                                  onChange={(color) => updateBannerField(banner.id, 'bgColor', color)}
                                />
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-500">텍스트색</span>
                                <div className="mt-1.5 flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateBannerField(banner.id, 'textColor', '#FFFFFF')}
                                    className={`w-7 h-7 rounded border-2 bg-white ${
                                      banner.textColor === '#FFFFFF'
                                        ? 'border-primary scale-110'
                                        : 'border-slate-200'
                                    }`}
                                    title="흰색"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateBannerField(banner.id, 'textColor', '#1F2937')}
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
                                  value={banner.textColor || '#FFFFFF'}
                                  onChange={(color) => updateBannerField(banner.id, 'textColor', color)}
                                />
                              </div>
                            </div>

                            {/* 3단: 실시간 미리보기 */}
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-500 mb-1.5">미리보기</span>
                              <div className="flex-1 flex flex-col justify-center">
                                <CardBannerPreview banner={banner} />
                                <p className="mt-1.5 text-[10px] text-slate-400">
                                  {hasImage ? '이미지 + 캡션' : '텍스트 전용'} 모드
                                </p>
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
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-2 text-sm text-slate-600">데이터 로딩 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** 인라인 미리보기 (CardBannerItem과 동일 로직) */
function CardBannerPreview({ banner }: { banner: NativeBanner }) {
  const hasImage = !!banner.imageUrl;
  const hasText = !!banner.title;

  // 텍스트 전용
  if (!hasImage && hasText) {
    return (
      <div
        className="rounded-lg overflow-hidden shadow-sm"
        style={{ backgroundColor: banner.bgColor || '#3B82F6' }}
      >
        <div className="px-4 py-3">
          <p className="text-sm font-semibold leading-snug" style={{ color: banner.textColor || '#FFFFFF' }}>
            {banner.title}
          </p>
          {banner.description && (
            <p className="text-xs mt-1 opacity-90" style={{ color: banner.textColor || '#FFFFFF' }}>
              {banner.description}
            </p>
          )}
        </div>
        <div className="text-right pr-2 pb-1">
          <span className="text-[10px] opacity-50" style={{ color: banner.textColor || '#FFFFFF' }}>광고</span>
        </div>
      </div>
    );
  }

  // 이미지 모드
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
      {hasImage && (
        <img src={banner.imageUrl} alt="" className="w-full object-cover" style={{ height: '60px' }} />
      )}
      {hasText ? (
        <div
          className="px-3 py-1.5 flex items-center justify-between"
          style={{ backgroundColor: banner.bgColor || '#F8FAFC' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: banner.textColor || '#334155' }}>
              {banner.title}
            </p>
            {banner.description && (
              <p className="text-[11px] truncate mt-0.5 opacity-80" style={{ color: banner.textColor || '#64748B' }}>
                {banner.description}
              </p>
            )}
          </div>
          <span className="text-[10px] ml-2 flex-shrink-0 opacity-50" style={{ color: banner.textColor || '#94A3B8' }}>광고</span>
        </div>
      ) : (
        <div className="text-right pr-2 pb-1">
          <span className="text-[10px] text-gray-400">광고</span>
        </div>
      )}
    </div>
  );
}
