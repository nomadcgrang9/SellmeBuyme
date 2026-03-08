import { useState, useEffect, useRef } from 'react';
import {
  IconChevronDown,
  IconPhoto,
  IconX,
  IconQrcode,
} from '@tabler/icons-react';
import {
  getQrPromoConfig,
  updateQrPromoConfig,
  uploadQrPromoImage,
} from '@/lib/supabase/qr-promo';
import type { QrPromoConfig } from '@/types/qr-promo';
import { useToastStore } from '@/stores/toastStore';

const ROTATION_SPEED_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function QrPromoManager() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<QrPromoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isExpanded) loadData();
  }, [isExpanded]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getQrPromoConfig();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load QR promo config:', error);
      showToast('데이터 로드 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setSaving(true);
      const url = await uploadQrPromoImage(file);
      if (url && config) {
        setConfig({ ...config, imageUrls: [...config.imageUrls, url] });
        showToast('이미지가 업로드되었습니다', 'success');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      showToast('이미지 업로드 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageRemove = (imgIndex: number) => {
    if (!config) return;
    setConfig({
      ...config,
      imageUrls: config.imageUrls.filter((_, i) => i !== imgIndex),
    });
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await updateQrPromoConfig({
        imageUrls: config.imageUrls,
        rotationSpeed: config.rotationSpeed,
        isActive: config.isActive,
      });
      showToast('QR 홍보페이지 설정이 저장되었습니다', 'success');
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('저장 실패', 'error');
    } finally {
      setSaving(false);
    }
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
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <IconQrcode size={18} className="text-blue-500" />
              QR 홍보페이지 관리
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              QR 홍보 페이지 우측에 표시되는 이미지 캐러셀을 관리합니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config?.isActive && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              활성화
            </span>
          )}
          {config?.imageUrls && config.imageUrls.length > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
              이미지 {config.imageUrls.length}장
            </span>
          )}
        </div>
      </button>

      {/* 펼쳐진 콘텐츠 */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {isExpanded && !loading && config && (
          <div className="border-t border-slate-200 p-6 space-y-5">
            {/* 상단 바: 설정 + 저장 */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.isActive}
                    onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="font-medium text-slate-700">이미지 캐러셀 활성화</span>
                </label>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-slate-500">회전 속도:</span>
                  <select
                    value={config.rotationSpeed}
                    onChange={(e) => setConfig({ ...config, rotationSpeed: Number(e.target.value) })}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white"
                  >
                    {ROTATION_SPEED_OPTIONS.map(sec => (
                      <option key={sec} value={sec}>{sec}초</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    저장 중...
                  </>
                ) : '저장'}
              </button>
            </div>

            {/* 안내 */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
              좌측 QR+텍스트 영역은 고정 디자인입니다. 여기서는 <strong>우측 이미지 캐러셀</strong>만 관리합니다.
              이미지가 1장 이상 등록되면 페이지가 좌우 분할 레이아웃으로 전환됩니다.
            </div>

            {/* 이미지 관리 */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 block">
                홍보 이미지 {config.imageUrls.length > 0 && `(${config.imageUrls.length}장)`}
              </span>
              <div className="flex flex-wrap items-start gap-3">
                {config.imageUrls.map((url, imgIdx) => (
                  <div key={imgIdx} className="relative group">
                    <img
                      src={url}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover border border-slate-200"
                    />
                    <button
                      onClick={() => handleImageRemove(imgIdx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="이미지 제거"
                    >
                      <IconX size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {imgIdx + 1}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                  className="flex flex-col items-center justify-center h-24 w-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                  <IconPhoto size={20} />
                  <span className="text-[11px] mt-1">추가</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
              {config.imageUrls.length > 1 && (
                <p className="text-xs text-slate-400">
                  이미지가 {config.rotationSpeed}초 간격으로 자동 순환됩니다.
                </p>
              )}
            </div>

            {/* 미리보기 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 block">페이지 미리보기</span>
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-lg p-4">
                <div className={`max-w-xl mx-auto ${config.imageUrls.length > 0 ? 'grid grid-cols-2 gap-4' : 'max-w-[200px]'}`}>
                  {/* 좌측: 고정 QR 구조 */}
                  <div className="bg-white rounded-lg shadow-sm p-3">
                    <div className="text-center mb-2">
                      <h4 className="text-[10px] font-bold text-gray-900 leading-tight">학교일자리<br />한번 등록해보세요</h4>
                      <div className="w-6 h-px bg-red-400 mx-auto mt-1" />
                    </div>
                    <div className="space-y-1.5 mb-2">
                      <div className="flex gap-1 items-start">
                        <div className="w-0.5 shrink-0 self-stretch rounded-full bg-blue-500" />
                        <div>
                          <p className="text-[7px] text-gray-400">방과후, 정규시간 등</p>
                          <p className="text-[8px] font-semibold text-gray-800">학생 대상 교육으로...</p>
                        </div>
                      </div>
                      <div className="border-t border-gray-100" />
                      <div className="flex gap-1 items-start">
                        <div className="w-0.5 shrink-0 self-stretch rounded-full bg-red-400" />
                        <div>
                          <p className="text-[7px] text-gray-400">에듀테크, 학급세우기 등</p>
                          <p className="text-[8px] font-semibold text-gray-800">교직원, 학부모 대상...</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                        <IconQrcode size={14} className="text-gray-400" />
                      </div>
                      <p className="text-[7px] text-gray-400 mt-0.5">QR 코드</p>
                    </div>
                  </div>
                  {/* 우측: 이미지 캐러셀 */}
                  {config.imageUrls.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col items-center justify-center">
                      <img src={config.imageUrls[0]} alt="" className="w-full h-20 object-cover rounded mb-2" />
                      {config.imageUrls.length > 1 && (
                        <div className="flex gap-1">
                          {config.imageUrls.map((_, i) => (
                            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-center text-[10px] text-blue-500 font-bold mt-2">학교일자리.com</p>
              </div>
            </div>
          </div>
        )}

        {isExpanded && loading && (
          <div className="border-t border-slate-200 p-12 text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-2 text-sm text-slate-600">데이터 로딩 중...</p>
          </div>
        )}

        {isExpanded && !loading && !config && (
          <div className="border-t border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500 mb-3">QR 홍보페이지 설정이 없습니다.</p>
            <button
              onClick={async () => {
                setSaving(true);
                const created = await updateQrPromoConfig({ isActive: true });
                if (created) setConfig(created);
                setSaving(false);
              }}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              초기 설정 생성
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
