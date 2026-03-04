import { useState, useEffect, useRef } from 'react';
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconPhoto,
} from '@tabler/icons-react';
import {
  getPopupBannerConfig,
  getAllPopupBanners,
  updatePopupBannerConfig,
  updatePopupBanner,
  createPopupBanner,
  deletePopupBanner,
  uploadPopupBannerImage,
} from '@/lib/supabase/popup-banner';
import type {
  PopupBannerConfig,
  PopupBanner,
  DismissPolicy,
} from '@/types/popup-banner';
import { useToastStore } from '@/stores/toastStore';

const DISMISS_POLICY_OPTIONS: { value: DismissPolicy; label: string }[] = [
  { value: 'once', label: '확인 후 다시 안뜸' },
  { value: '7days', label: '7일간 보지 않기' },
  { value: '1day', label: '오늘 하루 보지 않기' },
  { value: 'always', label: '매번 표시' },
];

interface FormState {
  config: PopupBannerConfig | null;
  banners: PopupBanner[];
  loading: boolean;
  saving: boolean;
}

// ━━━ 배너 행 내 축소 미리보기 ━━━
function MiniPreview({ banner }: { banner: PopupBanner }) {
  return (
    <div
      className="rounded-lg border border-gray-200 shadow-sm overflow-hidden text-center"
      style={{ backgroundColor: banner.bgColor, minHeight: 120 }}
    >
      <div className="p-3 relative">
        <button className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/10 text-gray-400 text-[10px] leading-none">
          x
        </button>
        <h4
          className="text-xs font-bold mb-0.5 truncate"
          style={{ color: banner.textColor }}
        >
          {banner.title}
        </h4>
        <div className="w-10 h-px bg-red-400 mx-auto mb-1" />
        {banner.body && (
          <p
            className="text-[10px] line-clamp-2 mb-1"
            style={{ color: banner.textColor, opacity: 0.7 }}
          >
            {banner.body}
          </p>
        )}
        {banner.imageUrl && (
          <img src={banner.imageUrl} alt="" className="w-full max-h-10 object-cover rounded mb-1" />
        )}
        {banner.linkUrl && (
          <p className="text-[9px] text-blue-500 mb-1 truncate">
            {banner.linkText || '자세히 보기'} &rarr;
          </p>
        )}
        <div className="space-y-0.5">
          <div className="bg-blue-500 text-white text-[9px] py-1 rounded">닫기</div>
          <div className="bg-gray-100 text-gray-500 text-[9px] py-0.5 rounded">7일간 안보기</div>
        </div>
      </div>
    </div>
  );
}

// ━━━ 배너 1행 편집 컴포넌트 ━━━
function BannerRow({
  banner,
  index,
  onUpdate,
  onDelete,
  onImageUpload,
}: {
  banner: PopupBanner;
  index: number;
  onUpdate: (id: string, field: string, value: unknown) => void;
  onDelete: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* 행 헤더: 번호 + 활성 + 순서 + 삭제 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {index + 1}
          </span>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={banner.isActive}
              onChange={(e) => onUpdate(banner.id, 'isActive', e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
            />
            <span className="text-slate-600">활성</span>
          </label>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>순서</span>
            <input
              type="number"
              min={0}
              value={banner.displayOrder}
              onChange={(e) => onUpdate(banner.id, 'displayOrder', Number(e.target.value))}
              className="w-12 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-center"
            />
          </div>
        </div>
        <button
          onClick={() => onDelete(banner.id)}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="배너 삭제"
        >
          <IconTrash size={15} />
        </button>
      </div>

      {/* 3단 그리드: 내용 | 스타일/링크 | 미리보기 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
        {/* 1열: 제목 + 본문 */}
        <div className="space-y-2">
          <label className="flex flex-col text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">제목 *</span>
            <input
              type="text"
              value={banner.title}
              onChange={(e) => onUpdate(banner.id, 'title', e.target.value)}
              placeholder="배너 제목"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">본문</span>
            <textarea
              value={banner.body || ''}
              onChange={(e) => onUpdate(banner.id, 'body', e.target.value)}
              placeholder="내용 입력"
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm resize-none"
            />
          </label>
          {/* 이미지 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <IconPhoto size={13} />
              이미지
            </button>
            {banner.imageUrl && (
              <>
                <img src={banner.imageUrl} alt="" className="h-6 w-6 rounded object-cover border border-slate-200" />
                <button
                  onClick={() => onUpdate(banner.id, 'imageUrl', '')}
                  className="text-[10px] text-red-400 hover:text-red-600"
                >
                  제거
                </button>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload(banner.id, file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* 2열: 색상 + 링크 */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">배경색</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={banner.bgColor || '#ffffff'}
                  onChange={(e) => onUpdate(banner.id, 'bgColor', e.target.value)}
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={banner.bgColor || '#ffffff'}
                  onChange={(e) => onUpdate(banner.id, 'bgColor', e.target.value)}
                  className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                />
              </div>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">글자색</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={banner.textColor || '#333333'}
                  onChange={(e) => onUpdate(banner.id, 'textColor', e.target.value)}
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={banner.textColor || '#333333'}
                  onChange={(e) => onUpdate(banner.id, 'textColor', e.target.value)}
                  className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                />
              </div>
            </label>
          </div>
          <label className="flex flex-col text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">링크 URL</span>
            <input
              type="text"
              value={banner.linkUrl || ''}
              onChange={(e) => onUpdate(banner.id, 'linkUrl', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">링크 텍스트</span>
            <input
              type="text"
              value={banner.linkText || '자세히 보기'}
              onChange={(e) => onUpdate(banner.id, 'linkText', e.target.value)}
              placeholder="자세히 보기"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
            />
          </label>
        </div>

        {/* 3열: 축소 미리보기 */}
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">미리보기</span>
          <MiniPreview banner={banner} />
        </div>
      </div>
    </div>
  );
}

// ━━━ 메인 컴포넌트 ━━━
export default function PopupBannerManager() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<FormState>({
    config: null,
    banners: [],
    loading: true,
    saving: false,
  });
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isExpanded) loadData();
  }, [isExpanded]);

  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const [config, banners] = await Promise.all([
        getPopupBannerConfig(),
        getAllPopupBanners(),
      ]);
      setState(prev => ({ ...prev, config, banners, loading: false }));
    } catch (error) {
      console.error('Failed to load popup banner data:', error);
      showToast('데이터 로드 실패', 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleAddBanner = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));
      const newBanner = await createPopupBanner({
        title: '새 접속배너',
        body: '내용을 입력하세요.',
        displayOrder: state.banners.length,
      });
      if (newBanner) {
        setState(prev => ({ ...prev, banners: [...prev.banners, newBanner] }));
        showToast('배너가 추가되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to add popup banner:', error);
      showToast('배너 추가 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return;
    try {
      setState(prev => ({ ...prev, saving: true }));
      const success = await deletePopupBanner(bannerId);
      if (success) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.filter(b => b.id !== bannerId),
        }));
        showToast('배너가 삭제되었습니다', 'success');
      }
    } catch (error) {
      console.error('Failed to delete popup banner:', error);
      showToast('배너 삭제 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleImageUpload = async (bannerId: string, file: File) => {
    try {
      setState(prev => ({ ...prev, saving: true }));
      const url = await uploadPopupBannerImage(file);
      if (url) {
        setState(prev => ({
          ...prev,
          banners: prev.banners.map(b =>
            b.id === bannerId ? { ...b, imageUrl: url } : b
          ),
        }));
        showToast('이미지가 업로드되었습니다', 'success');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      showToast('이미지 업로드 실패', 'error');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleSaveAll = async () => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      if (state.config) {
        await updatePopupBannerConfig({
          isActive: state.config.isActive,
          dismissPolicy: state.config.dismissPolicy,
        });
      }

      for (const banner of state.banners) {
        await updatePopupBanner(banner.id, {
          title: banner.title,
          body: banner.body,
          imageUrl: banner.imageUrl,
          linkUrl: banner.linkUrl,
          linkText: banner.linkText,
          bgColor: banner.bgColor,
          textColor: banner.textColor,
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

  const updateBannerField = (bannerId: string, field: string, value: unknown) => {
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
            <h3 className="text-base font-semibold text-slate-900">접속배너 관리</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              사이트 접속 시 사용자에게 표시되는 팝업 배너를 관리합니다.
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
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {isExpanded && !state.loading && (
          <div className="border-t border-slate-200 p-6 space-y-4">
            {/* 상단 바: 전역설정 + 저장 (한 줄) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
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
                  <span className="font-medium text-slate-700">접속배너 활성화</span>
                </label>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-slate-500">닫기 정책:</span>
                  <select
                    value={state.config?.dismissPolicy || 'once'}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        config: prev.config
                          ? { ...prev.config, dismissPolicy: e.target.value as DismissPolicy }
                          : null,
                      }));
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
                  >
                    {DISMISS_POLICY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddBanner}
                  disabled={state.saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <IconPlus size={14} />
                  새 배너
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={state.saving}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {state.saving ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      저장 중...
                    </>
                  ) : '모두 저장'}
                </button>
              </div>
            </div>

            {/* 배너 행 목록 */}
            {state.banners.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                배너가 없습니다. 새 배너를 추가하세요.
              </div>
            ) : (
              <div className="space-y-3">
                {state.banners.map((banner, idx) => (
                  <BannerRow
                    key={banner.id}
                    banner={banner}
                    index={idx}
                    onUpdate={updateBannerField}
                    onDelete={handleDeleteBanner}
                    onImageUpload={handleImageUpload}
                  />
                ))}
              </div>
            )}
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
