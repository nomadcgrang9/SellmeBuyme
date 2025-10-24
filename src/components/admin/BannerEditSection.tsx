import { useState } from 'react';
import {
  IconChevronDown,
  IconDeviceFloppy,
  IconCheck,
  IconRotate,
  IconBrandGoogle,
  IconMessage,
  IconChartBar,
  IconBell
} from '@tabler/icons-react';

type BannerFormState = {
  isActive: boolean;
  rotationSpeed: number; // 초 단위
  banners: {
    id: string;
    type: 'stats' | 'review' | 'notice';
    content: string;
    subContent?: string;
    bgColor: string;
    textColor: string;
    icon?: string;
    isActive: boolean;
  }[];
};

const DEFAULT_FORM_STATE: BannerFormState = {
  isActive: true,
  rotationSpeed: 5, // 5초마다 회전
  banners: [
    {
      id: '1',
      type: 'stats',
      content: '오늘 등록된 상품',
      subContent: '1,234개',
      bgColor: '#3b82f6',
      textColor: '#ffffff',
      icon: 'chart',
      isActive: true
    },
    {
      id: '2',
      type: 'review',
      content: '"정말 좋은 플랫폼이에요!"',
      subContent: '- 김철수님',
      bgColor: '#10b981',
      textColor: '#ffffff',
      icon: 'message',
      isActive: true
    },
    {
      id: '3',
      type: 'notice',
      content: '신규 기능 업데이트',
      subContent: '알림 설정이 추가되었습니다',
      bgColor: '#8b5cf6',
      textColor: '#ffffff',
      icon: 'bell',
      isActive: true
    }
  ]
};

function BannerPreview({ data }: { data: BannerFormState }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeBanners = data.banners.filter(b => b.isActive);
  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  const getIcon = (type: string) => {
    switch(type) {
      case 'stats': return <IconChartBar size={16} />;
      case 'review': return <IconMessage size={16} />;
      case 'notice': return <IconBell size={16} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-600">미리보기</span>
        <span>{data.isActive ? '노출 중' : '비활성화'}</span>
      </div>

      {currentBanner && (
        <div
          className="relative overflow-hidden rounded-lg px-4 py-3 shadow-sm transition-all"
          style={{ backgroundColor: currentBanner.bgColor }}
        >
          <div className="flex items-center gap-3">
            <div style={{ color: currentBanner.textColor }}>
              {getIcon(currentBanner.type)}
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: currentBanner.textColor }}
              >
                {currentBanner.content}
              </p>
              {currentBanner.subContent && (
                <p
                  className="text-xs opacity-90"
                  style={{ color: currentBanner.textColor }}
                >
                  {currentBanner.subContent}
                </p>
              )}
            </div>
          </div>

          {/* 인디케이터 */}
          <div className="absolute bottom-1 right-2 flex gap-1">
            {activeBanners.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 w-1 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-3 bg-white/80'
                    : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {activeBanners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
              idx === currentIndex
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            배너 {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BannerEditSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [form, setForm] = useState<BannerFormState>(DEFAULT_FORM_STATE);
  const [selectedBannerId, setSelectedBannerId] = useState(form.banners[0].id);

  const selectedBanner = form.banners.find(b => b.id === selectedBannerId);

  const updateBanner = (id: string, updates: Partial<typeof form.banners[0]>) => {
    setForm(prev => ({
      ...prev,
      banners: prev.banners.map(banner =>
        banner.id === id ? { ...banner, ...updates } : banner
      )
    }));
  };

  const handleSave = () => {
    console.log('띠지 배너 저장:', form);
    // TODO: Supabase 저장 로직 구현
  };

  const handleApply = () => {
    console.log('띠지 배너 적용:', form);
    // TODO: Supabase 적용 로직 구현
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
            <h3 className="text-base font-semibold text-slate-900">띠지 배너 편집</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              실시간 통계와 공지사항, 후기를 슬라이드로 표시합니다.
            </p>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            최근 적용: Oct 23 14:25
          </span>
        </div>
      </button>

      {/* 펼쳐진 콘텐츠 */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isExpanded && (
          <div className="border-t border-slate-200 p-6">
            {/* 액션 버튼 */}
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setForm(DEFAULT_FORM_STATE)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <IconRotate size={16} stroke={1.8} />
                기본값 불러오기
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
              >
                <IconDeviceFloppy size={16} stroke={1.8} />
                임시저장
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
              >
                <IconCheck size={16} stroke={1.8} />
                적용하기
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
              {/* 편집 폼 */}
              <div className="space-y-5">
                {/* 기본 설정 */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                  <h4 className="text-sm font-semibold text-slate-800">기본 설정</h4>

                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                      <span className="text-slate-600">띠지 배너 노출</span>
                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={form.isActive}
                          onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        활성화
                      </label>
                    </div>

                    <label className="flex flex-col text-sm text-slate-600">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        회전 속도 (초)
                      </span>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={form.rotationSpeed}
                        onChange={(e) => setForm(prev => ({ ...prev, rotationSpeed: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </section>

                {/* 배너 선택 탭 */}
                <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2">
                  {form.banners.map(banner => (
                    <button
                      key={banner.id}
                      onClick={() => setSelectedBannerId(banner.id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        selectedBannerId === banner.id
                          ? 'bg-primary text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {banner.type === 'stats' && '통계'}
                      {banner.type === 'review' && '후기'}
                      {banner.type === 'notice' && '공지'}
                    </button>
                  ))}
                </div>

                {/* 선택된 배너 편집 */}
                {selectedBanner && (
                  <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {selectedBanner.type === 'stats' && '통계 배너'}
                      {selectedBanner.type === 'review' && '후기 배너'}
                      {selectedBanner.type === 'notice' && '공지 배너'}
                    </h4>

                    <div className="mt-3 space-y-4">
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                        <span className="text-slate-600">이 배너 활성화</span>
                        <label className="flex items-center gap-2 font-medium">
                          <input
                            type="checkbox"
                            checked={selectedBanner.isActive}
                            onChange={(e) => updateBanner(selectedBanner.id, { isActive: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-primary"
                          />
                          활성화
                        </label>
                      </div>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          메인 텍스트
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.content}
                          onChange={(e) => updateBanner(selectedBanner.id, { content: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="flex flex-col text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          서브 텍스트
                        </span>
                        <input
                          type="text"
                          value={selectedBanner.subContent || ''}
                          onChange={(e) => updateBanner(selectedBanner.id, { subContent: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex flex-col text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            배경색
                          </span>
                          <input
                            type="color"
                            value={selectedBanner.bgColor}
                            onChange={(e) => updateBanner(selectedBanner.id, { bgColor: e.target.value })}
                            className="mt-1 h-12 w-full cursor-pointer rounded-lg border border-slate-200"
                          />
                        </label>

                        <label className="flex flex-col text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            텍스트색
                          </span>
                          <input
                            type="color"
                            value={selectedBanner.textColor}
                            onChange={(e) => updateBanner(selectedBanner.id, { textColor: e.target.value })}
                            className="mt-1 h-12 w-full cursor-pointer rounded-lg border border-slate-200"
                          />
                        </label>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* 미리보기 */}
              <div className="lg:sticky lg:top-6 lg:h-fit">
                <BannerPreview data={form} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}